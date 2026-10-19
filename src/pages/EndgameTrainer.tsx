import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess, type Square } from 'chess.js';
import { ArrowRight, BookOpen, RotateCcw } from 'lucide-react';
import { SkipForward } from '@/lib/lucideOriginal';
import Navbar from '../components/Navbar/Navbar';
import { useAuth } from '../context/AuthContext';
import { EndgameEngine } from '../lib/stockfishEngine';
import { flipOutcome, moveKeepsResult, outcomeForMover, outcomeOf, queryTablebase, type TablebaseMove } from '../lib/tablebaseService';
import { TABLEBASE_MAX_PIECES, countPieces, moveLabel, movesToMate, solveState, type Colour, type MoveResult } from '../lib/endgameTrainer';
import { getTrainerStats, nextPosition, sendResult, type TrainerPosition, type TrainerResult, type TrainerStats } from '../lib/endgameTrainerApi';
import { focusRing } from '../lib/calendarFormat';

// The opponent defends with the endgame database (7 pieces or fewer), otherwise Stockfish.
const engine = new EndgameEngine();

type Phase = 'idle' | 'loading' | 'playing' | 'thinking' | 'solved' | 'failed';

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

const colourName = (c: Colour) => (c === 'w' ? 'White' : 'Black');
const uciOf = (m: { from: string; to: string; promotion?: string }) => `${m.from}${m.to}${m.promotion ?? ''}`;
const arrowFor = (uci: string, color: string) => ({ startSquare: uci.slice(0, 2), endSquare: uci.slice(2, 4), color });

function RatingLine({ stats }: { stats: TrainerStats }) {
    return (
        <p className="text-sm text-plum/75">
            Rating <span className="font-black text-plum text-lg tabular-nums">{stats.rating}{stats.provisional ? '?' : ''}</span>
            <span className="mx-2 text-plum/30" aria-hidden="true">·</span>Best {stats.best}
            <span className="mx-2 text-plum/30" aria-hidden="true">·</span>{stats.played} {stats.played === 1 ? 'position' : 'positions'}
        </p>
    );
}

export default function EndgameTrainer() {
    const { user, loading: authLoading, refreshUser } = useAuth();
    const [stats, setStats] = useState<TrainerStats | null>(null);
    const [position, setPosition] = useState<TrainerPosition | null>(null);
    const [game, setGame] = useState<Chess | null>(null);
    const [phase, setPhase] = useState<Phase>('idle');
    const [rated, setRated] = useState(true);
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [result, setResult] = useState<TrainerResult | null>(null);
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [selected, setSelected] = useState<Square | null>(null);
    const [promotion, setPromotion] = useState<{ from: Square; to: Square } | null>(null);
    // Moves of this attempt (both sides, UCI), sent with a "solved" so the server can replay them.
    const moves = useRef<string[]>([]);
    const [moveLog, setMoveLog] = useState<LoggedMove[]>([]);
    const playerMoves = useRef(0);
    // Bumped on every new position or retry so a reply still being computed for an old one is dropped.
    const run = useRef(0);

    useEffect(() => {
        if (user) getTrainerStats().then(setStats).catch((err: Error) => setError(err.message));
    }, [user]);

    const finish = useCallback(async (solved: boolean, fb: Feedback | null, wasRated: boolean, attemptId: string) => {
        setPhase(solved ? 'solved' : 'failed');
        setFeedback(fb);
        if (!wasRated) return;
        try {
            const res = await sendResult(attemptId, solved ? 'solved' : 'failed', moves.current);
            setResult(res);
            setStats(res);
            if (res.rejected) setPhase('failed');
            void refreshUser();
        } catch (err) {
            setError((err as Error).message);
        }
    }, [refreshUser]);

    const loadNext = async () => {
        run.current++;
        setPhase('loading');
        setError('');
        setResult(null);
        setFeedback(null);
        setSelected(null);
        try {
            const next = await nextPosition();
            setPosition(next);
            setStats(next.stats);
            setGame(new Chess(next.fen));
            setRated(true);
            setNote(next.missed ? `Your last position was left unfinished and counted as a miss (${next.missed.change}).` : '');
            moves.current = [];
            setMoveLog([]);
            playerMoves.current = 0;
            setPhase('playing');
        } catch (err) {
            setError((err as Error).message);
            setPhase('idle');
        }
    };

    const retry = () => {
        if (!position) return;
        run.current++;
        setGame(new Chess(position.fen));
        moves.current = [];
        setMoveLog([]);
        playerMoves.current = 0;
        setRated(false);
        setFeedback(null);
        setResult(null);
        setNote('');
        setPhase('playing');
    };

    /** Plays the player's move, checks it with the endgame database, then lets the opponent reply. */
    const playMove = async (from: Square, to: Square, promo?: string) => {
        if (!game || !position || phase !== 'playing') return;
        const before = game.fen();
        const next = new Chess(before);
        let move;
        try {
            move = next.move({ from, to, promotion: promo });
        } catch {
            return;
        }
        const thisRun = run.current;
        const { attemptId, endgame, playerColor } = position;
        const wasRated = rated;
        const uci = uciOf(move);
        moves.current.push(uci);
        playerMoves.current++;
        setGame(next);
        setSelected(null);
        setPhase('thinking');

        // Did that move throw the result away?
        if (countPieces(before) > TABLEBASE_MAX_PIECES) setMoveLog(log => [...log, { san: move.san, byPlayer: true, label: null }]);
        else {
            const tb = await queryTablebase(before);
            if (thisRun !== run.current) return;
            const played = tb?.moves.find(m => m.uci === uci);
            const label = played && tb?.bestMove ? moveLabel(describeMove(played), describeMove(tb.bestMove)) : null;
            setMoveLog(log => [...log, { san: move.san, byPlayer: true, label }]);
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

        if (await checkSolved(next)) return finish(true, null, wasRated, attemptId);
        if (thisRun !== run.current) return;
        if (next.isGameOver()) return finish(false, { reason: 'The game ended without reaching the goal.' }, wasRated, attemptId);

        const reply = await engine.getBestMove(next.fen());
        if (thisRun !== run.current) return;
        if (!reply) return finish(false, { reason: 'The game ended without reaching the goal.' }, wasRated, attemptId);
        const afterReply = new Chess(next.fen());
        afterReply.move({ from: reply.from, to: reply.to, promotion: reply.promotion });
        moves.current.push(uciOf(reply));
        setMoveLog(log => [...log, { san: reply.san, byPlayer: false, label: null }]);
        setGame(afterReply);

        if (await checkSolved(afterReply)) return finish(true, null, wasRated, attemptId);
        if (thisRun !== run.current) return;
        if (afterReply.isGameOver()) {
            const reason = afterReply.isCheckmate() ? 'You were checkmated.' : 'The game ended in a draw without reaching the goal.';
            return finish(false, { reason }, wasRated, attemptId);
        }
        setPhase('playing');
    };

    const tryMove = (from: Square, to: Square): boolean => {
        if (!game || phase !== 'playing' || game.turn() !== position?.playerColor) return false;
        const legal = game.moves({ square: from, verbose: true }).filter(m => m.to === to);
        if (!legal.length) return false;
        if (legal.some(m => m.promotion)) setPromotion({ from, to });
        else void playMove(from, to);
        return true;
    };

    const onSquareClick = (square: Square) => {
        if (!game || phase !== 'playing') return;
        if (selected && tryMove(selected, square)) return;
        const piece = game.get(square);
        setSelected(piece && piece.color === position?.playerColor ? square : null);
    };

    const target = position?.endgame.target;
    const arrows = feedback
        ? [feedback.played && arrowFor(feedback.played, '#e11d48'), feedback.best && arrowFor(feedback.best, '#059669')].filter(Boolean)
        : [];
    const done = phase === 'solved' || phase === 'failed';
    const changeText = result ? `${result.change >= 0 ? '+' : ''}${result.change}` : '';

    return (
        <div className="min-h-screen flex flex-col font-sans text-plum bg-cream">
            <div className="relative z-50"><Navbar /></div>
            <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-8 py-10">
                <h1 className="text-4xl md:text-5xl font-serif font-black tracking-tight">Endgame Trainer</h1>

                {!authLoading && !user && (
                    <section className="mt-4 max-w-prose">
                        <p className="text-plum/80">
                            Endless endgame positions matched to your rating. Solve one and your rating goes up; slip and you'll see the move
                            that kept the result and the diagram that teaches it.
                        </p>
                        <div className="flex gap-3 mt-6">
                            <Link to="/login?next=/endgame-trainer" className="py-3 px-7 soft-button-berry text-sm">Log in</Link>
                            <Link to="/register?next=/endgame-trainer" className="py-3 px-7 soft-button text-sm">Create account</Link>
                        </div>
                    </section>
                )}

                {user && (
                    <>
                        <div className="mt-2">{stats ? <RatingLine stats={stats} /> : <div className="h-7 w-64 rounded bg-plum/5 animate-pulse" />}</div>
                        {stats?.provisional && <p className="text-xs text-plum/70 mt-1">Your rating is provisional (?) until you've played 20 positions.</p>}
                        {error && <p className="mt-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3" role="alert">{error}</p>}
                        {note && <p className="mt-4 text-sm text-plum/80" role="status">{note}</p>}

                        {!position && (
                            <section className="mt-8 max-w-prose">
                                <p className="text-plum/80">
                                    You'll get a random endgame position near your rating. Play the best moves: one slip that throws away the result
                                    ends the attempt. Skipping or leaving a position unfinished counts as a miss.
                                </p>
                                <button type="button" onClick={loadNext} disabled={phase === 'loading'} className={`mt-6 inline-flex items-center gap-2 py-3 px-7 soft-button-berry text-sm ${focusRing}`}>
                                    {phase === 'loading' ? 'Finding a position…' : <>Start training <ArrowRight size={16} /></>}
                                </button>
                            </section>
                        )}

                        {position && game && (
                            <div className="mt-8 grid lg:grid-cols-[minmax(0,560px)_1fr] gap-8 items-start">
                                <div className="w-full max-w-[560px]">
                                    <Chessboard
                                        options={{
                                            position: game.fen(),
                                            boardOrientation: position.playerColor === 'w' ? 'white' : 'black',
                                            canDragPiece: ({ piece }: { piece: { pieceType: string } }) => phase === 'playing' && piece.pieceType[0] === position.playerColor,
                                            onPieceDrop: ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) =>
                                                !!targetSquare && tryMove(sourceSquare as Square, targetSquare as Square),
                                            onSquareClick: ({ square }: { square: string }) => onSquareClick(square as Square),
                                            onPieceClick: ({ square }: { square: string | null }) => square && onSquareClick(square as Square),
                                            squareStyles: selected ? { [selected]: { boxShadow: 'inset 0 0 0 4px rgb(225 29 72 / 0.6)' } } : {},
                                            darkSquareStyle: { backgroundColor: '#b58863' },
                                            lightSquareStyle: { backgroundColor: '#f0d9b5' },
                                            arrows: arrows as { startSquare: string; endSquare: string; color: string }[]
                                        }}
                                    />
                                    {promotion && (
                                        <div className="mt-3 flex items-center gap-2" role="group" aria-label="Promote to">
                                            <span className="text-sm font-bold">Promote to</span>
                                            {(['q', 'r', 'b', 'n'] as const).map(p => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => { const { from, to } = promotion; setPromotion(null); void playMove(from, to, p); }}
                                                    className={`py-2 px-4 soft-button text-sm ${focusRing}`}
                                                >
                                                    {{ q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' }[p]}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <section aria-live="polite">
                                    <p className="text-sm font-bold text-berry">
                                        {position.endgame.category}{rated ? '' : ' · practice, unrated'}
                                        {position.review && rated && <span className="ml-2 rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-xs">Review: you missed this one before</span>}
                                    </p>
                                    <h2 className="mt-1 text-3xl font-serif font-black">
                                        {colourName(position.playerColor)} to play and {target === 'win' ? 'win' : 'draw'}
                                    </h2>
                                    <p className="mt-2 text-plum/80 max-w-prose">
                                        {target === 'win'
                                            ? position.endgame.mateRequired ? 'Deliver checkmate.' : 'Win it: checkmate, or reach a basic won ending such as a queen or rook against a bare king.'
                                            : 'Hold the draw for 15 moves.'}
                                    </p>
                                    {phase === 'thinking' && <p className="mt-4 text-sm text-plum/70">Opponent is thinking…</p>}

                                    {moveLog.length > 0 && (
                                        <ol className="mt-5 flex flex-wrap gap-x-3 gap-y-1 text-sm tabular-nums" aria-label="Moves played">
                                            {moveLog.map((m, i) => (
                                                <li key={i} className={m.byPlayer ? 'font-bold' : 'text-plum/70'}>
                                                    {m.san}
                                                    {done && m.label && <span className="ml-1 text-rose-700 font-semibold">{m.label}</span>}
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                    {done && moveLog.some(m => m.label) && (
                                        <p className="mt-1 text-xs text-plum/70">M10 (M8): mate in 10 when mate in 8 was best. D: a draw. L: being mated.</p>
                                    )}

                                    {done && (
                                        <div className={`mt-6 rounded-2xl px-6 py-5 ${phase === 'solved' ? 'bg-emerald-50 border border-emerald-200' : 'bg-white border-2 border-berry/25'}`}>
                                            <h3 className="text-xl font-serif font-black">
                                                {phase === 'solved' ? 'Solved!' : result?.rejected ? 'That result couldn\'t be confirmed' : 'Not quite'}
                                                {result && <span className={`ml-2 tabular-nums ${result.change >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{changeText}</span>}
                                            </h3>
                                            <p className="mt-1 text-sm font-bold">{position.endgame.title}</p>
                                            {phase === 'solved' && result?.movesTaken && result.fastestMate && (
                                                <p className="mt-2 text-sm text-plum/85">
                                                    {result.movesTaken} {result.movesTaken === 1 ? 'move' : 'moves'} (fastest mate {result.fastestMate})
                                                    {' · '}{Math.round(result.score * 100)}% credit{result.score < 1 ? ': slower wins earn less rating' : ''}
                                                </p>
                                            )}
                                            {feedback?.reason && <p className="mt-2 text-plum/85">{feedback.reason}</p>}
                                            {feedback?.best && <p className="mt-1 text-sm text-plum/75">Red arrow: your move. Green arrow: the move that kept the result.</p>}
                                            {phase === 'failed' && position.endgame.keyTip && <p className="mt-3 text-plum/85"><span className="font-bold">Key idea: </span>{position.endgame.keyTip}</p>}
                                            {result && result.pointsAwarded > 0 && <p className="mt-3 font-bold text-emerald-700">New best rating: +{result.pointsAwarded} points!</p>}
                                            <div className="mt-5 flex flex-wrap gap-3">
                                                <button type="button" onClick={loadNext} className={`inline-flex items-center gap-2 py-2.5 px-6 soft-button-berry text-sm ${focusRing}`}>
                                                    Next position <ArrowRight size={16} />
                                                </button>
                                                <Link to={`/EndgameStrategy?endgame=${position.endgame.id}`} className={`inline-flex items-center gap-2 py-2.5 px-6 soft-button text-sm ${focusRing}`}>
                                                    <BookOpen size={16} /> Study this endgame
                                                </Link>
                                                {phase === 'failed' && (
                                                    <button type="button" onClick={retry} className={`inline-flex items-center gap-2 py-2.5 px-6 soft-button text-sm ${focusRing}`}>
                                                        <RotateCcw size={16} /> Try again (unrated)
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {!done && (
                                        <button type="button" onClick={loadNext} disabled={phase === 'thinking'} className={`mt-6 inline-flex items-center gap-2 text-sm font-bold text-plum/75 hover:text-berry disabled:opacity-40 ${focusRing}`}>
                                            <SkipForward size={16} /> {rated ? 'Skip (counts as a miss)' : 'Next position'}
                                        </button>
                                    )}
                                </section>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
