import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chess } from 'chess.js';
import { ArrowRight, BookOpen, Check, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { SkipForward } from '@/lib/lucideOriginal';
import Navbar from '../components/Navbar/Navbar';
import EndgameBoard from '../components/EndgameBoard';
import { BotAvatar } from '../components/BotAvatars';
import { useAuth } from '../context/AuthContext';
import { EndgameEngine, OPPONENT_PRESETS } from '../lib/stockfishEngine';
import { playCaptureSound, playLoseSound, playMoveSound, playWinSound } from '../lib/soundEffects';
import { flipOutcome, moveKeepsResult, outcomeForMover, outcomeOf, queryTablebase, type TablebaseMove } from '../lib/tablebaseService';
import {
    DRAW_HOLD_MOVES,
    LEADERBOARD_MIN_PLAYED,
    TABLEBASE_MAX_PIECES,
    countPieces,
    moveLabel,
    movesToMate,
    ratingChange,
    solveState,
    type Colour,
    type MoveResult
} from '../lib/endgameTrainer';
import { getTrainerStats, nextPosition, sendResult, type TrainerPosition, type TrainerResult, type TrainerStats } from '../lib/endgameTrainerApi';
import { focusRing } from '../lib/calendarFormat';

// Every trainer position is defended by the strongest Maia bot, with the endgame database as its safety net.
const OPPONENT = 'maia_1900' as const;
const engine = new EndgameEngine();
engine.setOpponent(OPPONENT);
const opponentName = OPPONENT_PRESETS[OPPONENT].name;

// Shown on the board before the first position: the Lucena, one of the techniques in the trainer.
const PREVIEW_FEN = '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1';

type Phase = 'idle' | 'loading' | 'playing' | 'solved' | 'failed';

interface Feedback {
    reason: string;
    played?: string; // UCI
    best?: string;   // UCI
}

/** One move of the attempt, with a ChessTempo-style label (shown once the position is over) if it wasn't the best. */
interface LoggedMove {
    san: string;
    byPlayer: boolean;
    label: string | null;
}

/** A database move as seen by the side playing it: the result, and mate distance counted from before the move. */
function describeMove(m: TablebaseMove): { result: MoveResult; mateIn: number | null } {
    const outcome = outcomeForMover(m);
    const result: MoveResult = outcome === 'win' ? 'win' : outcome === 'loss' ? 'loss' : 'draw';
    if (result === 'draw' || m.dtm === null) return { result, mateIn: null };
    return { result, mateIn: result === 'win' ? movesToMate(Math.abs(m.dtm) + 1) : movesToMate(m.dtm) };
}

/**
 * General principles for each kind of endgame, shown while playing. They teach without naming the
 * technique the position tests (that is revealed, with its diagrams, once the position is over).
 */
const PRINCIPLES: Record<string, string[]> = {
    'Pawn Endgames': [
        'Your king is a fighting piece: bring it forward first.',
        'Opposition decides king and pawn races. With the kings facing each other, the side not to move often wins the duel.',
        "Count before you push: can the defending king still reach the pawn's square?"
    ],
    'Rook Endgames': [
        'An active rook is worth more than a pawn. Avoid passive defence.',
        'Cut the enemy king off along a rank or file before you advance.',
        "Rooks belong behind passed pawns, yours or your opponent's."
    ],
    'Queen Endgames': [
        'Look for forks: queen checks that also hit a loose piece.',
        'Bring your king in. The queen alone rarely finishes the job.',
        'Watch for stalemate tricks every time the defending king runs short of squares.'
    ],
    'Minor Piece Endgames': [
        'Drive the bare king towards the edge, then to the right corner.',
        'Keep your pieces close together so they cover each other.',
        'Take squares away calmly rather than checking: checks often let the king escape.'
    ]
};

/** Splits notes written as "1. ... 2. ..." into steps, so they read as a list. */
const steps = (notes: string) => notes.split(/\s(?=\d+\.\s)/).map(t => t.replace(/^\d+\.\s/, ''));

const colourName = (c: Colour) => (c === 'w' ? 'White' : 'Black');
const uciOf = (m: { from: string; to: string; promotion?: string }) => `${m.from}${m.to}${m.promotion ?? ''}`;
const arrowFor = (uci: string, color: string) => ({ startSquare: uci.slice(0, 2), endSquare: uci.slice(2, 4), color });
const signed = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n)}`;

/** The plum rail: rating, this session, and how positions are scored. */
function Rail({ stats, session }: { stats: TrainerStats | null; session: boolean[] }) {
    const solved = session.filter(Boolean).length;
    return (
        <aside className="order-3 lg:order-none bg-plum text-cream px-6 py-8 lg:overflow-y-auto" aria-label="Your endgame rating">
            <h2 className="text-sm font-bold text-cream/80">Your endgame rating</h2>
            {stats ? (
                <p className="mt-1 font-serif font-black leading-none tabular-nums">
                    <span className="text-6xl">{stats.rating}</span>
                    {stats.provisional && <span className="text-3xl text-[#F5B7C6]" title="Provisional">?</span>}
                </p>
            ) : (
                <div className="mt-2 h-14 w-36 rounded-lg bg-cream/10 animate-pulse" />
            )}
            {stats && (
                <p className="mt-3 text-sm text-cream/85">
                    Best {stats.best} · {stats.played} {stats.played === 1 ? 'position' : 'positions'} played
                    {stats.provisional && <> · on the leaderboard after {LEADERBOARD_MIN_PLAYED}</>}
                </p>
            )}

            <section className="mt-8 pt-6 border-t border-cream/20" aria-labelledby="session-heading">
                <h3 id="session-heading" className="text-sm font-bold text-cream/80">This session</h3>
                {session.length === 0 ? (
                    <p className="mt-2 text-sm text-cream/75">Nothing played yet. Each result lands here.</p>
                ) : (
                    <>
                        <p className="mt-1 text-lg font-bold">{solved} solved, {session.length - solved} missed</p>
                        <ol className="mt-3 flex flex-wrap gap-1.5" aria-label="Results this session, oldest first">
                            {session.map((ok, i) => (
                                <li
                                    key={i}
                                    className={`w-7 h-7 rounded-md flex items-center justify-center ${ok ? 'bg-emerald-500 text-white' : 'bg-cream/15 text-[#F5B7C6]'}`}
                                    aria-label={ok ? 'Solved' : 'Missed'}
                                >
                                    {ok ? <Check size={15} strokeWidth={3} /> : <X size={15} strokeWidth={3} />}
                                </li>
                            ))}
                        </ol>
                    </>
                )}
            </section>

            <section className="mt-8 pt-6 border-t border-cream/20" aria-labelledby="rules-heading">
                <h3 id="rules-heading" className="text-sm font-bold text-cream/80">How it's scored</h3>
                <ul className="mt-3 space-y-3 text-sm leading-relaxed text-cream/90">
                    <li><span className="font-bold text-cream">One slip ends it.</span> A move that throws away the win (or loses the draw) fails the position.</li>
                    <li><span className="font-bold text-cream">Faster wins earn more.</span> Matching the quickest mate gains the most; a slow win still gains something.</li>
                    <li><span className="font-bold text-cream">Misses come back.</span> A failed endgame returns for review in 5 minutes, then at growing gaps.</li>
                    <li><span className="font-bold text-cream">Skipping counts as a miss,</span> and so does leaving a position unfinished.</li>
                </ul>
            </section>
        </aside>
    );
}

export default function EndgameTrainer() {
    const { user, loading: authLoading, refreshUser } = useAuth();
    const [stats, setStats] = useState<TrainerStats | null>(null);
    const [position, setPosition] = useState<TrainerPosition | null>(null);
    const [game, setGame] = useState<Chess>(() => new Chess(PREVIEW_FEN));
    const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
    const [phase, setPhase] = useState<Phase>('idle');
    const [thinking, setThinking] = useState(false);
    const [rated, setRated] = useState(true);
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [result, setResult] = useState<TrainerResult | null>(null);
    const [moveLog, setMoveLog] = useState<LoggedMove[]>([]);
    const [session, setSession] = useState<boolean[]>([]);
    const [boardKey, setBoardKey] = useState(0);
    const [muted, setMuted] = useState(false);
    const [evaluation, setEvaluation] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    // Moves of this attempt (both sides, UCI), sent with a "solved" so the server can replay them.
    const moves = useRef<string[]>([]);
    const playerMoves = useRef(0);
    // True while a move is being checked or Maia is replying; the board queues the player's moves meanwhile.
    const busy = useRef(false);
    // Bumped on every new position or retry so a reply still being computed for an old one is dropped.
    const run = useRef(0);
    // The last result still being saved; "Next position" waits for it.
    const savingResult = useRef<Promise<void>>(Promise.resolve());
    // Stops a double click from asking for two positions (the second would score the first as a miss).
    const loadingNext = useRef(false);

    useEffect(() => {
        if (user) getTrainerStats().then(setStats).catch((err: Error) => setError(err.message));
    }, [user]);

    const sound = useCallback((kind: 'move' | 'capture' | 'win' | 'lose') => {
        if (muted) return;
        ({ move: playMoveSound, capture: playCaptureSound, win: playWinSound, lose: playLoseSound })[kind]();
    }, [muted]);

    // The live evaluation is a learning tool, so it only runs during an unrated retry.
    useEffect(() => {
        if (rated || phase !== 'playing' || !position) return;
        let cancelled = false;
        engine.getEvaluation(game.fen(), position.playerColor)
            .then(e => { if (!cancelled) setEvaluation(e.evalText); })
            .catch(() => { if (!cancelled) setEvaluation(''); });
        return () => { cancelled = true; };
    }, [game, phase, position, rated]);

    const startPosition = (next: TrainerPosition, wasRated: boolean) => {
        run.current++;
        busy.current = false;
        moves.current = [];
        playerMoves.current = 0;
        setGame(new Chess(next.fen));
        setLastMove(null);
        setMoveLog([]);
        setFeedback(null);
        setResult(null);
        setEvaluation('');
        setThinking(false);
        setRated(wasRated);
        setBoardKey(k => k + 1);
        setPhase('playing');
    };

    const loadNext = async () => {
        if (loadingNext.current) return;
        loadingNext.current = true;
        run.current++;
        setPhase('loading');
        setError('');
        try {
            // The finished position's result must reach the server first, or it would be scored as an unfinished miss.
            await savingResult.current;
            const next = await nextPosition();
            setPosition(next);
            setStats(next.stats);
            setNote(next.missed ? `Your last position was left unfinished, so it counted as a miss (${signed(next.missed.change)}).` : '');
            if (next.missed) setSession(s => [...s, false]);
            startPosition(next, true);
        } catch (err) {
            setError((err as Error).message);
            setPhase(position ? 'failed' : 'idle');
        } finally {
            loadingNext.current = false;
        }
    };

    const retry = () => {
        if (!position) return;
        setNote('');
        startPosition(position, false);
    };

    const finish = useCallback(async (solved: boolean, fb: Feedback | null, wasRated: boolean, attemptId: string) => {
        busy.current = false;
        setThinking(false);
        setPhase(solved ? 'solved' : 'failed');
        setFeedback(fb);
        sound(solved ? 'win' : 'lose');
        if (!wasRated) return;
        setSession(s => [...s, solved]);
        const played = [...moves.current];
        const save = async () => {
            // One retry, so a dropped connection doesn't turn a finished position into a miss.
            for (let attempt = 1; ; attempt++) {
                try {
                    const res = await sendResult(attemptId, solved ? 'solved' : 'failed', played);
                    setResult(res);
                    setStats(res);
                    if (res.rejected) {
                        setPhase('failed');
                        setSession(s => [...s.slice(0, -1), false]);
                    }
                    void refreshUser();
                    return;
                } catch (err) {
                    if (attempt >= 2) {
                        setError((err as Error).message);
                        return;
                    }
                }
            }
        };
        savingResult.current = save();
        await savingResult.current;
    }, [refreshUser, sound]);

    /** After the player's move: check it with the endgame database, then let Maia reply. */
    const continueAfterMove = async (after: Chess, before: string, uci: string, san: string) => {
        if (!position) return;
        const thisRun = run.current;
        const { attemptId, endgame, playerColor } = position;
        const wasRated = rated;

        // Did that move throw the result away?
        if (countPieces(before) > TABLEBASE_MAX_PIECES) {
            setMoveLog(log => [...log, { san, byPlayer: true, label: null }]);
        } else {
            const tb = await queryTablebase(before);
            if (thisRun !== run.current) return;
            const played = tb?.moves.find(m => m.uci === uci);
            const label = played && tb?.bestMove ? moveLabel(describeMove(played), describeMove(tb.bestMove)) : null;
            setMoveLog(log => [...log, { san, byPlayer: true, label }]);
            if (tb && played && !moveKeepsResult(played, tb.category)) {
                const reason = endgame.target === 'win' ? 'That move lets the win slip away.' : 'That move loses the draw.';
                return finish(false, { reason, played: uci, best: tb.bestMove?.uci }, wasRated, attemptId);
            }
        }

        const checkSolved = async (g: Chess): Promise<boolean> => {
            const state = solveState(g, endgame, playerColor, playerMoves.current);
            if (state === 'solved') return true;
            if (state !== 'confirm') return false;
            if (countPieces(g.fen()) > TABLEBASE_MAX_PIECES) return true;
            const tb = await queryTablebase(g.fen());
            if (!tb) return true;
            const outcome = g.turn() === playerColor ? outcomeOf(tb.category) : flipOutcome(outcomeOf(tb.category));
            return endgame.target === 'win' ? outcome === 'win' : outcome !== 'win' && outcome !== 'loss';
        };

        if (await checkSolved(after)) return finish(true, null, wasRated, attemptId);
        if (thisRun !== run.current) return;
        if (after.isGameOver()) return finish(false, { reason: 'The game ended without reaching the goal.' }, wasRated, attemptId);

        const reply = await engine.getBestMove(after.fen());
        if (thisRun !== run.current) return;
        const afterReply = new Chess(after.fen());
        let move = null;
        try {
            move = reply ? afterReply.move({ from: reply.from, to: reply.to, promotion: reply.promotion }) : null;
        } catch {
            move = null;
        }
        if (!move) return finish(false, { reason: 'The game ended without reaching the goal.' }, wasRated, attemptId);
        const replySan = move.san;
        moves.current.push(uciOf(move));
        setMoveLog(log => [...log, { san: replySan, byPlayer: false, label: null }]);
        sound(move.captured ? 'capture' : 'move');
        busy.current = false;
        setThinking(false);
        setLastMove({ from: move.from, to: move.to });
        setGame(afterReply);

        if (await checkSolved(afterReply)) return finish(true, null, wasRated, attemptId);
        if (thisRun !== run.current) return;
        if (afterReply.isGameOver()) {
            const reason = afterReply.isCheckmate() ? 'You were checkmated.' : 'The game ended in a draw without reaching the goal.';
            return finish(false, { reason }, wasRated, attemptId);
        }
    };

    /** The board's move handler: plays a legal move straight away and continues the checks in the background. */
    const onMove = (from: string, to: string, promotion?: string): boolean => {
        if (!position || phase !== 'playing' || busy.current) return false;
        const before = game.fen();
        const next = new Chess(before);
        let move;
        try {
            move = next.move({ from, to, promotion: promotion || 'q' });
        } catch {
            return false;
        }
        moves.current.push(uciOf(move));
        playerMoves.current++;
        busy.current = true;
        setThinking(true);
        sound(move.captured ? 'capture' : 'move');
        setLastMove({ from: move.from, to: move.to });
        setGame(next);
        void continueAfterMove(next, before, uciOf(move), move.san);
        return true;
    };

    const done = phase === 'solved' || phase === 'failed';
    const playing = phase === 'playing';
    const endgame = position?.endgame;
    const stakes = useMemo(() => {
        if (!stats || !endgame) return null;
        return { gain: ratingChange(stats.rating, endgame.rating, 1, stats.played), loss: ratingChange(stats.rating, endgame.rating, 0, stats.played) };
    }, [stats, endgame]);
    const arrows = feedback
        ? [feedback.played && arrowFor(feedback.played, '#e11d48'), feedback.best && arrowFor(feedback.best, '#059669')].filter((a): a is ReturnType<typeof arrowFor> => !!a)
        : undefined;
    const playerColor = position?.playerColor ?? 'w';
    const goal = endgame ? `${colourName(playerColor)} to play and ${endgame.target}` : 'Endless endgames at your level';
    const objective = endgame
        ? endgame.target === 'win'
            ? endgame.mateRequired ? 'Deliver checkmate.' : 'Checkmate, or reach a basic won ending such as a queen or rook against a bare king.'
            : `Hold the draw for ${DRAW_HOLD_MOVES} moves.`
        : '';
    const boardWidth = 'w-full max-w-[min(100%,calc(100dvh-13rem))]';

    if (!authLoading && !user) {
        return (
            <div className="min-h-screen flex flex-col font-sans text-plum bg-cream">
                <div className="relative z-50"><Navbar /></div>
                <main className="flex-1 grid lg:grid-cols-2 max-w-6xl mx-auto w-full gap-10 px-5 sm:px-8 py-12 items-center">
                    <div className="w-full max-w-[480px] aspect-square pointer-events-none" aria-hidden="true">
                        <EndgameBoard game={game} playerColor="w" lastMove={null} canMove={false} canSelect={false} opponentBusy={busy} onMove={() => false} />
                    </div>
                    <section>
                        <h1 className="text-5xl font-serif font-black tracking-tight leading-[1.05]">Endgame Trainer</h1>
                        <p className="mt-4 text-lg text-plum/85 max-w-prose">
                            Endless endgame positions matched to your rating, defended by {opponentName}, the strongest Maia bot.
                            Every move is checked against a perfect endgame database: slip once and you'll see the move that kept the result,
                            then study the technique it was teaching.
                        </p>
                        <div className="flex gap-3 mt-7">
                            <Link to="/login?next=/endgame-trainer" className="py-3 px-7 soft-button-berry text-sm">Log in</Link>
                            <Link to="/register?next=/endgame-trainer" className="py-3 px-7 soft-button text-sm">Create account</Link>
                        </div>
                    </section>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen lg:h-dvh flex flex-col font-sans text-plum bg-cream lg:overflow-hidden">
            <div className="relative z-50"><Navbar /></div>
            <h1 className="sr-only">Endgame Trainer</h1>

            <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[280px_minmax(0,1fr)_380px]">
                <Rail stats={stats} session={session} />

                {/* The board, framed like a game: the opponent above, you below */}
                <main className="order-1 lg:order-none min-h-0 flex flex-col items-center justify-center gap-3 px-3 sm:px-6 py-5 bg-[#f6ecd2]">
                    <div className={`${boardWidth} flex items-center gap-3`}>
                        <BotAvatar opponent={OPPONENT} size={40} />
                        <p className="min-w-0">
                            <span className="block font-bold leading-tight">{opponentName}</span>
                            <span className="block text-xs text-plum/75">{thinking ? 'Thinking…' : `Maia ${OPPONENT_PRESETS[OPPONENT].elo}, backed by the endgame database`}</span>
                        </p>
                        <button
                            type="button"
                            onClick={() => setMuted(m => !m)}
                            className={`ml-auto p-2 rounded-lg text-plum/75 hover:text-berry hover:bg-plum/5 ${focusRing}`}
                            aria-label={muted ? 'Turn sound on' : 'Mute sound'}
                            aria-pressed={muted}
                        >
                            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                    </div>

                    <div className={`${boardWidth} aspect-square`}>
                        <EndgameBoard
                            game={game}
                            playerColor={playerColor}
                            lastMove={lastMove}
                            canMove={playing}
                            canSelect={playing}
                            opponentBusy={busy}
                            onMove={onMove}
                            resetKey={boardKey}
                            arrows={arrows}
                        >
                            {!position && (
                                <div className="absolute inset-0 z-40 bg-plum/70 backdrop-blur-[1px] flex flex-col items-center justify-center text-center p-6">
                                    <p className="font-serif font-black text-3xl text-cream">Ready when you are</p>
                                    <p className="mt-2 text-sm text-cream/85 max-w-xs">The first position is chosen near your rating. It counts once you start.</p>
                                    <button type="button" onClick={loadNext} disabled={phase === 'loading' || !stats} className={`mt-5 inline-flex items-center gap-2 py-3 px-7 soft-button-berry text-sm ${focusRing} focus-visible:ring-offset-plum`}>
                                        {phase === 'loading' ? 'Finding a position…' : <>Start training <ArrowRight size={16} /></>}
                                    </button>
                                </div>
                            )}
                        </EndgameBoard>
                    </div>

                    <div className={`${boardWidth} flex items-center gap-3`}>
                        <span className={`w-10 h-10 rounded-full border-2 border-plum/25 shrink-0 ${playerColor === 'w' ? 'bg-white' : 'bg-plum'}`} aria-hidden="true" />
                        <p className="min-w-0">
                            <span className="block font-bold leading-tight">{user?.username ?? 'You'}{position ? `, ${colourName(playerColor).toLowerCase()}` : ''}</span>
                            <span className="block text-xs text-plum/75">{position ? objective : 'Press start for your first position.'}</span>
                        </p>
                        {playing && (
                            <button
                                type="button"
                                onClick={loadNext}
                                disabled={thinking}
                                className={`ml-auto shrink-0 inline-flex items-center gap-1.5 text-sm font-bold text-plum/75 hover:text-berry disabled:opacity-40 ${focusRing}`}
                            >
                                <SkipForward size={16} /> {rated ? 'Skip (a miss)' : 'Next position'}
                            </button>
                        )}
                    </div>
                </main>

                {/* Study panel: the goal and stakes, the moves, then the result and the lesson */}
                <section className="order-2 lg:order-none bg-white border-l-2 border-plum/10 px-6 py-7 lg:overflow-y-auto" aria-live="polite" aria-labelledby="goal-heading">
                    {endgame && (
                        <p className="text-sm font-bold text-berry">
                            {endgame.category} · rated {endgame.rating}
                            {!rated && <span className="text-plum/70"> · practice, unrated</span>}
                        </p>
                    )}
                    <h2 id="goal-heading" className="mt-1 text-3xl font-serif font-black leading-tight">{goal}</h2>
                    {position?.review && rated && playing && (
                        <p className="mt-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-2.5">You missed this endgame before. Here it is again in a new position.</p>
                    )}
                    {error && <p className="mt-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3" role="alert">{error}</p>}
                    {note && <p className="mt-4 text-sm text-plum/80" role="status">{note}</p>}

                    {!position && (
                        <div className="mt-4 space-y-4 text-plum/85 leading-relaxed">
                            <p>Each position is a fresh variation of one of the endgames in the Strategy lessons: moved around the board, flipped or with the colours swapped, and checked so the result stays the same.</p>
                            <p>Positions are picked a little below your rating so you solve more than you miss. Your rating moves a lot at first, then settles as you play.</p>
                            <p>The board shows the Lucena position, one of the techniques you'll meet. <Link to="/EndgameStrategy" className="font-bold text-berry hover:underline underline-offset-4">Browse the lessons</Link> any time.</p>
                        </div>
                    )}

                    {playing && stakes && rated && (
                        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                            <span><span className="font-bold text-emerald-700 tabular-nums">{signed(stakes.gain)}</span> for a solve</span>
                            <span><span className="font-bold text-rose-700 tabular-nums">{signed(stakes.loss)}</span> for a miss</span>
                            {position?.fastestMate && <span className="text-plum/75">Fastest mate: {position.fastestMate} moves</span>}
                        </p>
                    )}

                    {playing && !rated && evaluation && (
                        <p className="mt-4 text-sm"><span className="rounded-lg bg-plum/5 px-3 py-1.5 font-bold tabular-nums">{evaluation}</span></p>
                    )}

                    {moveLog.length > 0 && (
                        <section className="mt-6" aria-labelledby="moves-heading">
                            <h3 id="moves-heading" className="text-sm font-bold text-plum/75">Moves</h3>
                            <ol className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 text-sm tabular-nums">
                                {moveLog.map((m, i) => {
                                    // Half-moves since White's first move, so "1." is White and "1..." is Black starting.
                                    const ply = i + (position?.fen.split(' ')[1] === 'b' ? 1 : 0);
                                    const number = Math.floor(ply / 2) + 1;
                                    const prefix = ply % 2 === 0 ? `${number}.` : i === 0 ? `${number}...` : '';
                                    return (
                                    <li key={i} className={m.byPlayer ? 'font-bold' : 'text-plum/70'}>
                                        {prefix && <span className="mr-1 font-normal text-plum/60">{prefix}</span>}
                                        {m.san}
                                        {done && m.label && <span className="ml-1 text-rose-700 font-semibold">{m.label}</span>}
                                    </li>
                                    );
                                })}
                            </ol>
                            {done && moveLog.some(m => m.label) && (
                                <p className="mt-2 text-xs text-plum/70">M10 (M8): mate in 10 when mate in 8 was best. D: a draw. L: being mated.</p>
                            )}
                        </section>
                    )}

                    {done && endgame && (
                        <div className="mt-6 pt-6 border-t border-plum/12">
                            <p className={`text-2xl font-serif font-black ${phase === 'solved' ? 'text-emerald-700' : 'text-plum'}`}>
                                {phase === 'solved' ? 'Solved' : result?.rejected ? 'That result couldn\'t be confirmed' : 'Not this time'}
                                {result && <span className={`ml-2 tabular-nums ${result.change >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{signed(result.change)}</span>}
                            </p>
                            {feedback?.reason && <p className="mt-1 text-plum/85">{feedback.reason}</p>}
                            {feedback?.best && <p className="mt-1 text-sm text-plum/75">Red arrow: your move. Green arrow: the move that kept the result.</p>}
                            {phase === 'solved' && result?.movesTaken && result.fastestMate && (
                                <p className="mt-1 text-sm text-plum/85">
                                    {result.movesTaken} moves (fastest mate {result.fastestMate}) · {Math.round(result.score * 100)}% of the full gain{result.score < 1 ? ': a faster win earns more' : ''}
                                </p>
                            )}
                            {result && result.pointsAwarded > 0 && <p className="mt-2 font-bold text-emerald-700">New best rating: +{result.pointsAwarded} points!</p>}

                            <div className="mt-5 flex flex-wrap gap-3">
                                <button type="button" onClick={loadNext} className={`inline-flex items-center gap-2 py-2.5 px-6 soft-button-berry text-sm ${focusRing}`}>
                                    Next position <ArrowRight size={16} />
                                </button>
                                {phase === 'failed' && (
                                    <button type="button" onClick={retry} className={`inline-flex items-center gap-2 py-2.5 px-6 soft-button text-sm ${focusRing}`}>
                                        <RotateCcw size={16} /> Try again, unrated
                                    </button>
                                )}
                            </div>

                            {/* The lesson: what this position was teaching */}
                            <article className="mt-8" aria-labelledby="lesson-heading">
                                <h3 id="lesson-heading" className="text-xl font-serif font-black">{endgame.title}</h3>
                                {endgame.description && <p className="mt-2 text-plum/85 leading-relaxed">{endgame.description}</p>}
                                {endgame.theoryNotes && (steps(endgame.theoryNotes).length > 1 ? (
                                    <ol className="mt-3 space-y-2 text-plum/85 leading-relaxed list-decimal pl-5 marker:font-bold marker:text-berry">
                                        {steps(endgame.theoryNotes).map(step => <li key={step}>{step}</li>)}
                                    </ol>
                                ) : (
                                    <p className="mt-3 text-plum/85 leading-relaxed">{endgame.theoryNotes}</p>
                                ))}
                                {endgame.keyTip && (
                                    <p className="mt-4 rounded-xl bg-cream px-4 py-3 text-plum leading-relaxed"><span className="font-bold">Key idea: </span>{endgame.keyTip}</p>
                                )}
                            {PRINCIPLES[endgame.category] && (
                                <section className="mt-5 rounded-xl bg-cream/70 px-5 py-4" aria-labelledby="principles-heading">
                                    <h3 id="principles-heading" className="text-sm font-bold text-plum/80">{endgame.category}: what usually decides them</h3>
                                    <ul className="mt-2 space-y-2 text-sm leading-relaxed text-plum/90">
                                        {PRINCIPLES[endgame.category].map(p => (
                                            <li key={p} className="flex gap-2.5">
                                                <span className="mt-2 w-1.5 h-1.5 rotate-45 bg-berry shrink-0" aria-hidden="true" />
                                                {p}
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}
                                <Link to={`/EndgameStrategy?endgame=${endgame.id}`} className={`mt-5 inline-flex items-center gap-2 font-bold text-berry hover:underline underline-offset-4 ${focusRing}`}>
                                    <BookOpen size={16} /> Study this endgame with diagrams
                                </Link>
                            </article>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
