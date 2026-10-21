import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Chess } from 'chess.js';
import { ArrowRight, Check, RotateCcw, X } from 'lucide-react';
import { ChevronDown, Lightbulb } from '@/lib/lucideOriginal';
import { GraduationCap, SkipForward, Volume2, VolumeX } from '@/lib/lucideOriginal';
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
    solveScore,
    solveState,
    type Colour,
    type MoveResult
} from '../lib/endgameTrainer';
import { getTrainerStats, nextPosition, preparePosition, sendResult, type TrainerPosition, type TrainerResult, type TrainerStats } from '../lib/endgameTrainerApi';
import { focusRing } from '../lib/calendarFormat';
import themesData from '../data/trainerThemes.json';

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

const colourName = (c: Colour) => (c === 'w' ? 'White' : 'Black');
// A copy that keeps the move history, so threefold repetition is noticed (a FEN alone forgets it).
const withHistory = (g: Chess) => { const copy = new Chess(); copy.loadPgn(g.pgn()); return copy; };
const uciOf = (m: { from: string; to: string; promotion?: string }) => `${m.from}${m.to}${m.promotion ?? ''}`;
const arrowFor = (uci: string, color: string) => ({ startSquare: uci.slice(0, 2), endSquare: uci.slice(2, 4), color });
const signed = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n)}`;

// A full-strength engine for hints: the endgame database's best move, or Stockfish for bigger positions.
const hintEngine = new EndgameEngine();

const THEMES = themesData as { id: string; group: string; name: string }[];
const GROUPS = [...new Set(THEMES.map(t => t.group))];

/** What to play: the rated stream of all types, or unrated practice of chosen themes. Remembered on this device. */
interface Choice { mode: 'rated' | 'practice'; themes: string[] }
const CHOICE_KEY = 'endgameTrainer.choice';
function loadChoice(): Choice {
    try {
        const stored = JSON.parse(localStorage.getItem(CHOICE_KEY) ?? 'null');
        if (stored && (stored.mode === 'rated' || stored.mode === 'practice') && Array.isArray(stored.themes)) {
            return { mode: stored.mode, themes: stored.themes.filter((t: unknown): t is string => typeof t === 'string' && THEMES.some(x => x.id === t)) };
        }
    } catch {
        // No usable stored choice: start with the rated stream.
    }
    return { mode: 'rated', themes: [] };
}
function saveChoice(choice: Choice) {
    try {
        localStorage.setItem(CHOICE_KEY, JSON.stringify(choice));
    } catch {
        // Storage can be unavailable (private windows); the choice then lasts for this visit only.
    }
}

/** A short name for the chosen themes: whole groups by name, otherwise theme names, or a count if many. */
function choiceLabel(themes: string[], counts: Record<string, number>): string {
    const parts: string[] = [];
    for (const group of GROUPS) {
        const available = THEMES.filter(t => t.group === group && counts[t.id]);
        const chosen = available.filter(t => themes.includes(t.id));
        if (!chosen.length) continue;
        if (chosen.length === available.length) parts.push(group);
        else parts.push(...chosen.map(t => t.name));
    }
    return parts.length > 2 ? `${parts.length} types` : parts.join(' and ');
}

/** One result in the session strip. */
interface SessionResult { solved: boolean; practice: boolean; helped: boolean }

/** Rated play or practice, and for practice which groups and themes; counts come from the server. */
function TypePicker({ choice, counts, onMode, onThemes }: {
    choice: Choice;
    counts: Record<string, number>;
    onMode: (mode: Choice['mode']) => void;
    onThemes: (themes: string[]) => void;
}) {
    const [open, setOpen] = useState<string | null>(null);
    const practice = choice.mode === 'practice';
    const toggle = (ids: string[], on: boolean) => onThemes(on ? [...new Set([...choice.themes, ...ids])] : choice.themes.filter(t => !ids.includes(t)));
    const option = (mode: Choice['mode'], title: string, detail: string) => (
        <button
            type="button"
            role="radio"
            aria-checked={choice.mode === mode}
            onClick={() => onMode(mode)}
            className={`w-full text-left rounded-xl px-3.5 py-2.5 border-2 ${choice.mode === mode ? 'border-[#F5B7C6] bg-cream/10' : 'border-cream/15 hover:border-cream/35'} ${focusRing} focus-visible:ring-offset-plum`}
        >
            <span className="block font-bold text-cream">{title}</span>
            <span className="block text-xs text-cream/75">{detail}</span>
        </button>
    );
    return (
        <section className="mt-8 pt-6 border-t border-cream/20" aria-labelledby="play-heading">
            <h3 id="play-heading" className="text-sm font-bold text-cream/80">What to play</h3>
            <div role="radiogroup" aria-labelledby="play-heading" className="mt-3 grid gap-2">
                {option('rated', 'Rated', 'All types, matched to your rating')}
                {option('practice', 'Practice', 'Choose types · unrated')}
            </div>
            {practice && (
                <div className="mt-4 space-y-1.5">
                    {GROUPS.map(group => {
                        const themes = THEMES.filter(t => t.group === group && counts[t.id]);
                        if (!themes.length) return null;
                        const ids = themes.map(t => t.id);
                        const chosen = ids.filter(id => choice.themes.includes(id)).length;
                        const total = themes.reduce((sum, t) => sum + counts[t.id], 0);
                        const groupId = `group-${group.replace(/\W+/g, '-').toLowerCase()}`;
                        return (
                            <div key={group}>
                                <div className="flex items-center gap-2.5">
                                    <input
                                        id={groupId}
                                        type="checkbox"
                                        checked={chosen === ids.length}
                                        ref={el => { if (el) el.indeterminate = chosen > 0 && chosen < ids.length; }}
                                        onChange={e => toggle(ids, e.target.checked)}
                                        className="w-4 h-4 accent-[#F5B7C6] shrink-0"
                                    />
                                    <label htmlFor={groupId} className="font-bold text-sm text-cream cursor-pointer">{group}</label>
                                    <span className="text-xs text-cream/60 tabular-nums">{total}</span>
                                    <button
                                        type="button"
                                        onClick={() => setOpen(o => (o === group ? null : group))}
                                        aria-expanded={open === group}
                                        aria-label={`${open === group ? 'Hide' : 'Show'} ${group} themes`}
                                        className={`ml-auto p-1 rounded text-cream/70 hover:text-cream ${focusRing} focus-visible:ring-offset-plum`}
                                    >
                                        <ChevronDown size={16} className={open === group ? 'rotate-180' : ''} />
                                    </button>
                                </div>
                                {open === group && (
                                    <ul className="ml-6 mt-1 mb-2 space-y-1">
                                        {themes.map(t => (
                                            <li key={t.id} className="flex items-center gap-2.5">
                                                <input
                                                    id={`theme-${t.id}`}
                                                    type="checkbox"
                                                    checked={choice.themes.includes(t.id)}
                                                    onChange={e => toggle([t.id], e.target.checked)}
                                                    className="w-4 h-4 accent-[#F5B7C6] shrink-0"
                                                />
                                                <label htmlFor={`theme-${t.id}`} className="text-sm text-cream/90 cursor-pointer">{t.name}</label>
                                                <span className="ml-auto text-xs text-cream/60 tabular-nums">{counts[t.id]}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        );
                    })}
                    {choice.themes.length === 0 && <p className="text-sm text-[#F5B7C6]" role="status">Tick at least one type to practise.</p>}
                </div>
            )}
        </section>
    );
}

/** The plum rail: rating, what to play, this session, and how positions are scored. */
function Rail({ stats, delta, session, picker }: { stats: TrainerStats | null; delta: number | null; session: SessionResult[]; picker: ReactNode }) {
    const solved = session.filter(r => r.solved && !r.helped).length;
    const helped = session.filter(r => r.solved && r.helped).length;
    return (
        <aside className="order-3 lg:order-none bg-plum text-cream px-6 py-8 lg:overflow-y-auto" aria-label="Your endgame rating">
            <h2 className="text-sm font-bold text-cream/80">Your endgame rating</h2>
            {stats ? (
                <p className="mt-1 font-serif font-black leading-none tabular-nums">
                    <span className="text-6xl">{stats.rating}</span>
                    {stats.provisional && <span className="text-3xl text-[#F5B7C6]" title="Provisional">?</span>}
                    {delta !== null && (
                        <span className={`ml-3 text-3xl ${delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{signed(delta)}</span>
                    )}
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

            {picker}

            <section className="mt-8 pt-6 border-t border-cream/20" aria-labelledby="session-heading">
                <h3 id="session-heading" className="text-sm font-bold text-cream/80">This session</h3>
                {session.length === 0 ? (
                    <p className="mt-2 text-sm text-cream/75">Nothing played yet. Each result lands here.</p>
                ) : (
                    <>
                        <p className="mt-1 text-lg font-bold">
                            {solved} solved{helped ? `, ${helped} with a hint` : ''}, {session.length - solved - helped} missed
                        </p>
                        <ol className="mt-3 flex flex-wrap gap-1.5" aria-label="Results this session, oldest first">
                            {session.map((r, i) => (
                                <li
                                    key={i}
                                    className={`w-7 h-7 rounded-md flex items-center justify-center ${r.solved ? (r.helped ? 'bg-amber-400 text-plum' : 'bg-emerald-500 text-white') : 'bg-cream/15 text-[#F5B7C6]'} ${r.practice ? 'ring-2 ring-inset ring-cream/50' : ''}`}
                                    aria-label={`${r.solved ? (r.helped ? 'Solved with a hint' : 'Solved') : 'Missed'}${r.practice ? ', practice' : ''}`}
                                >
                                    {r.solved ? (r.helped ? <Lightbulb size={15} strokeWidth={2.5} /> : <Check size={15} strokeWidth={3} />) : <X size={15} strokeWidth={3} />}
                                </li>
                            ))}
                        </ol>
                        {session.some(r => r.practice) && <p className="mt-2 text-xs text-cream/70">Outlined: practice, unrated.</p>}
                    </>
                )}
            </section>

            <section className="mt-8 pt-6 border-t border-cream/20" aria-labelledby="rules-heading">
                <h3 id="rules-heading" className="text-sm font-bold text-cream/80">How it's scored</h3>
                <ul className="mt-3 space-y-3 text-sm leading-relaxed text-cream/90">
                    <li><span className="font-bold text-cream">One slip ends it.</span> A move that throws away the win (or loses the draw) fails the position.</li>
                    <li><span className="font-bold text-cream">Faster wins earn more.</span> Matching the quickest mate gains the most; a slow win still gains something.</li>
                    <li><span className="font-bold text-cream">Misses come back.</span> A failed endgame returns for review in 5 minutes, then at growing gaps.</li>
                    <li><span className="font-bold text-cream">Giving up counts as a miss.</span> Leave mid-position and it waits for you, ready to play again.</li>
                    <li><span className="font-bold text-cream">Practice is unrated.</span> It never moves your rating, but misses still come back for review. A solve with a hint counts as a miss.</li>
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
    // The last rating change, shown beside the rating until the next result (as on Lichess puzzles).
    const [delta, setDelta] = useState<number | null>(null);
    const [moveLog, setMoveLog] = useState<LoggedMove[]>([]);
    const [session, setSession] = useState<SessionResult[]>([]);
    const [choice, setChoice] = useState<Choice>({ mode: 'rated', themes: [] });
    const choiceRef = useRef(choice);
    const [themeCounts, setThemeCounts] = useState<Record<string, number>>({});
    // A hint for the move to play: step 1 points at the piece, step 2 shows the move.
    const [hint, setHint] = useState<{ step: 1 | 2; move: string } | null>(null);
    const [hintLoading, setHintLoading] = useState(false);
    // True once a hint was used on the recorded attempt; a solve with help counts as a miss.
    const helped = useRef(false);
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
    // Stops a double click from asking for two positions at once.
    const loadingNext = useRef(false);
    // The next position, requested in the background so "Start" and "Next position" are instant.
    // Safe because an unplayed position is never scored: it is simply handed back next time.
    const prefetched = useRef<Promise<TrainerPosition> | null>(null);
    /** The next position in the current choice: rated, or practice of the chosen themes. */
    const requestNext = (skip = false) => {
        const c = choiceRef.current;
        return nextPosition(skip, c.mode === 'practice' ? c.themes : undefined);
    };
    const prefetch = useCallback(() => {
        if (choiceRef.current.mode === 'practice' && !choiceRef.current.themes.length) return;
        const c = choiceRef.current;
        const request = nextPosition(false, c.mode === 'practice' ? c.themes : undefined);
        request.catch(() => undefined);
        prefetched.current = request;
    }, []);

    // The choice is read after mounting, as storage isn't available while the page is prerendered.
    useEffect(() => {
        const stored = loadChoice();
        choiceRef.current = stored;
        setChoice(stored);
    }, []);

    useEffect(() => {
        if (!user) return;
        getTrainerStats()
            .then(res => { setStats(res); setThemeCounts(res.themeCounts); })
            .catch((err: Error) => setError(err.message));
        prefetch();
    }, [user, prefetch]);

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
        setHint(null);
        helped.current = false;
        setBoardKey(k => k + 1);
        setPhase('playing');
        // Make the following rated position on the server while this one is played, so "Next" is instant.
        if (wasRated && !next.practice) preparePosition().catch(() => undefined);
    };

    /** Shows the next position. `skip` gives up the one being played ("Give up"), which counts as a miss. */
    const loadNext = async (skip = false) => {
        if (loadingNext.current) return;
        const c = choiceRef.current;
        const practice = c.mode === 'practice';
        if (practice && !c.themes.length) {
            setError('Tick at least one type to practise.');
            return;
        }
        loadingNext.current = true;
        run.current++;
        setPhase('loading');
        setError('');
        try {
            // The finished position's result must reach the server before the next position is asked for.
            await savingResult.current;
            const ready = skip ? null : prefetched.current;
            prefetched.current = null;
            let next = ready ? await ready.catch(() => null) : null;
            const fitsChoice = (p: TrainerPosition) => p.practice === practice && (!practice || (!!p.endgame.theme && c.themes.includes(p.endgame.theme)));
            // A background request that raced a result can hand back the position just played, or one from an
            // earlier choice of types; ask again.
            if (!next || next.attemptId === position?.attemptId || !fitsChoice(next)) next = await requestNext(skip);
            setPosition(next);
            setStats(next.stats);
            if (next.missed && !next.practice) setDelta(next.missed.change);
            setNote(next.missed
                ? next.practice ? 'You gave up, so it counts as a miss and will come back for review.' : `You gave up, so it counted as a miss (${signed(next.missed.change)}).`
                : next.resumed ? 'This position was still waiting for you, so here it is from the start.' : '');
            if (next.missed) setSession(s => [...s, { solved: false, practice: next.practice, helped: false }]);
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

    const finish = useCallback(async (solved: boolean, fb: Feedback | null, wasRated: boolean, pos: TrainerPosition) => {
        const { attemptId, practice } = pos;
        const usedHint = helped.current;
        busy.current = false;
        setThinking(false);
        setHint(null);
        setPhase(solved ? 'solved' : 'failed');
        setFeedback(fb);
        sound(solved ? 'win' : 'lose');
        if (!wasRated) return;
        setSession(s => [...s, { solved, practice, helped: usedHint }]);
        // Show the rating change straight away with the server's own formula; its reply then confirms it.
        if (stats && !practice) {
            const change = ratingChange(stats.rating, pos.endgame.rating, solved ? solveScore(playerMoves.current, pos.fastestMate) : 0, stats.played);
            const rating = Math.max(100, stats.rating + change);
            setDelta(rating - stats.rating);
            setStats({ rating, best: Math.max(stats.best, rating), played: stats.played + 1, provisional: stats.played + 1 < LEADERBOARD_MIN_PLAYED });
        }
        const played = [...moves.current];
        const save = async () => {
            // One retry, so a dropped connection doesn't turn a finished position into a miss.
            for (let attempt = 1; ; attempt++) {
                try {
                    const res = await sendResult(attemptId, solved ? 'solved' : 'failed', played, practice && usedHint);
                    setResult(res);
                    if (!practice) {
                        setStats(res);
                        setDelta(res.change);
                    }
                    if (res.rejected) {
                        setPhase('failed');
                        setSession(s => [...s.slice(0, -1), { solved: false, practice, helped: usedHint }]);
                    }
                    void refreshUser();
                    return;
                } catch (err) {
                    if (attempt >= 2) {
                        setError((err as Error).message);
                        // Not saved, so drop the estimate and show what the server has.
                        if (!practice) {
                            setDelta(null);
                            getTrainerStats().then(setStats).catch(() => undefined);
                        }
                        return;
                    }
                }
            }
        };
        const thisRun = run.current;
        savingResult.current = save();
        await savingResult.current;
        // Get the next position ready while the player reads the result (unless they've already moved on).
        if (run.current === thisRun) prefetch();
    }, [prefetch, refreshUser, sound, stats]);

    /** After the player's move: check it with the endgame database, then let Maia reply. */
    const continueAfterMove = async (after: Chess, before: string, uci: string, san: string) => {
        if (!position) return;
        const thisRun = run.current;
        const { endgame, playerColor } = position;
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
                return finish(false, { reason, played: uci, best: tb.bestMove?.uci }, wasRated, position);
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

        if (await checkSolved(after)) return finish(true, null, wasRated, position);
        if (thisRun !== run.current) return;
        if (after.isGameOver()) return finish(false, { reason: 'The game ended without reaching the goal.' }, wasRated, position);

        const reply = await engine.getBestMove(after.fen());
        if (thisRun !== run.current) return;
        const afterReply = withHistory(after);
        let move = null;
        try {
            move = reply ? afterReply.move({ from: reply.from, to: reply.to, promotion: reply.promotion }) : null;
        } catch {
            move = null;
        }
        if (!move) return finish(false, { reason: 'The game ended without reaching the goal.' }, wasRated, position);
        const replySan = move.san;
        moves.current.push(uciOf(move));
        setMoveLog(log => [...log, { san: replySan, byPlayer: false, label: null }]);
        sound(move.captured ? 'capture' : 'move');
        busy.current = false;
        setThinking(false);
        setLastMove({ from: move.from, to: move.to });
        setGame(afterReply);

        if (await checkSolved(afterReply)) return finish(true, null, wasRated, position);
        if (thisRun !== run.current) return;
        if (afterReply.isGameOver()) {
            const reason = afterReply.isCheckmate() ? 'You were checkmated.' : 'The game ended in a draw without reaching the goal.';
            return finish(false, { reason }, wasRated, position);
        }
    };

    /** The board's move handler: plays a legal move straight away and continues the checks in the background. */
    const onMove = (from: string, to: string, promotion?: string): boolean => {
        if (!position || phase !== 'playing' || busy.current) return false;
        const before = game.fen();
        const next = withHistory(game);
        let move;
        try {
            move = next.move({ from, to, promotion: promotion || 'q' });
        } catch {
            return false;
        }
        moves.current.push(uciOf(move));
        playerMoves.current++;
        setHint(null);
        busy.current = true;
        setThinking(true);
        sound(move.captured ? 'capture' : 'move');
        setLastMove({ from: move.from, to: move.to });
        setGame(next);
        void continueAfterMove(next, before, uciOf(move), move.san);
        return true;
    };

    /** First press points at the piece to move, the second shows the move. Using it marks the attempt as helped. */
    const showHint = async () => {
        if (!position || phase !== 'playing' || busy.current || game.turn() !== position.playerColor) return;
        if (hint) {
            setHint({ ...hint, step: 2 });
            return;
        }
        const thisRun = run.current, movesBefore = playerMoves.current;
        setHintLoading(true);
        const best = await hintEngine.getBestMove(game.fen()).catch(() => null);
        setHintLoading(false);
        if (!best || thisRun !== run.current || movesBefore !== playerMoves.current) return;
        if (rated) helped.current = true;
        setHint({ step: 1, move: best.from + best.to });
    };

    /** Switches between rated play and practice, and plays a position in the new mode straight away. */
    const chooseMode = (mode: Choice['mode']) => {
        if (mode === choiceRef.current.mode) return;
        let themes = choiceRef.current.themes;
        if (mode === 'practice' && !themes.length) {
            // Start with the group of the position on the board, or pawn endings.
            const group = THEMES.find(t => t.id === position?.endgame.theme)?.group ?? 'Pawn endings';
            themes = THEMES.filter(t => t.group === group && themeCounts[t.id]).map(t => t.id);
        }
        const next = { mode, themes };
        choiceRef.current = next;
        setChoice(next);
        saveChoice(next);
        prefetched.current = null;
        // A rated position left unfinished waits on the server, ready when the player switches back.
        if (position) void loadNext();
    };

    /** Changes the practice types; it applies from the next position. */
    const chooseThemes = (themes: string[]) => {
        const next = { ...choiceRef.current, themes };
        choiceRef.current = next;
        setChoice(next);
        saveChoice(next);
        prefetched.current = null;
    };

    const done = phase === 'solved' || phase === 'failed';
    const playing = phase === 'playing';
    const endgame = position?.endgame;
    const arrows = feedback
        ? [feedback.played && arrowFor(feedback.played, '#e11d48'), feedback.best && arrowFor(feedback.best, '#059669')].filter((a): a is ReturnType<typeof arrowFor> => !!a)
        : hint?.step === 2 ? [arrowFor(hint.move, '#f59e0b')] : undefined;
    const practicing = position ? position.practice : choice.mode === 'practice';
    const modeLabel = practicing ? `Practice · ${choiceLabel(choice.themes, themeCounts) || 'choose types'} · unrated` : 'Rated';
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
                <Rail
                    stats={stats}
                    delta={delta}
                    session={session}
                    picker={<TypePicker choice={choice} counts={themeCounts} onMode={chooseMode} onThemes={chooseThemes} />}
                />

                {/* The board, framed like a game: the opponent above, you below */}
                <main className="order-1 lg:order-none min-h-0 flex flex-col items-center justify-center gap-3 px-3 sm:px-6 py-5 bg-[#f6ecd2]">
                    <div className={`${boardWidth} flex items-center gap-3`}>
                        <BotAvatar opponent={OPPONENT} size={40} />
                        <p className="min-w-0">
                            <span className="block font-bold leading-tight">{opponentName}</span>
                            <span className="block text-xs text-plum/75">{thinking ? 'Thinking…' : `Maia ${OPPONENT_PRESETS[OPPONENT].elo}, backed by the endgame database`}</span>
                        </p>
                        <span className={`ml-auto min-w-0 truncate rounded-full px-3 py-1 text-xs font-bold ${practicing ? 'bg-amber-100 text-amber-900' : 'bg-plum/10 text-plum'}`} title={modeLabel}>
                            {modeLabel}
                        </span>
                        <button
                            type="button"
                            onClick={() => setMuted(m => !m)}
                            className={`shrink-0 p-2 rounded-lg text-plum/75 hover:text-berry hover:bg-plum/5 ${focusRing}`}
                            aria-label={muted ? 'Turn sound on' : 'Mute sound'}
                            aria-pressed={muted}
                        >
                            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                    </div>

                    <div key={position?.attemptId ?? 'preview'} className={`${boardWidth} aspect-square ${position ? 'animate-board-deal' : ''}`}>
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
                            highlightSquare={hint?.step === 1 ? hint.move.slice(0, 2) : null}
                        >
                            {position && phase === 'loading' && (
                                <div className="absolute inset-0 z-40 bg-plum/45 flex items-center justify-center" role="status">
                                    <p className="rounded-xl bg-cream px-5 py-3 font-bold text-plum shadow-lg">Finding your next position…</p>
                                </div>
                            )}
                            {!position && (
                                <div className="absolute inset-0 z-40 bg-plum/70 backdrop-blur-[1px] flex flex-col items-center justify-center text-center p-6">
                                    <p className="font-serif font-black text-3xl text-cream">Ready when you are</p>
                                    <p className="mt-2 text-sm text-cream/85 max-w-xs">The first position is chosen near your rating.</p>
                                    <button type="button" onClick={() => loadNext()} disabled={phase === 'loading' || !stats || (choice.mode === 'practice' && !choice.themes.length)} className={`mt-5 inline-flex items-center gap-2 py-3 px-7 soft-button-berry text-sm ${focusRing} focus-visible:ring-offset-plum`}>
                                        {phase === 'loading' ? 'Finding a position…' : <>{choice.mode === 'practice' ? 'Start practice' : 'Start training'} <ArrowRight size={16} /></>}
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
                        {playing && position?.practice && (
                            <button
                                type="button"
                                onClick={showHint}
                                disabled={thinking || hintLoading || hint?.step === 2}
                                className={`ml-auto shrink-0 inline-flex items-center gap-1.5 text-sm font-bold text-amber-800 hover:text-amber-950 disabled:opacity-40 ${focusRing}`}
                            >
                                <Lightbulb size={16} /> {hint?.step === 1 ? 'Show move' : 'Hint'}
                            </button>
                        )}
                        {playing && (
                            <button
                                type="button"
                                onClick={() => loadNext(rated)}
                                disabled={thinking}
                                className={`${position?.practice ? '' : 'ml-auto'} shrink-0 inline-flex items-center gap-1.5 text-sm font-bold text-plum/75 hover:text-berry disabled:opacity-40 ${focusRing}`}
                            >
                                <SkipForward size={16} /> {rated ? 'Give up' : 'Next position'}
                            </button>
                        )}
                    </div>
                </main>

                {/* Study panel: the goal, the moves, then the result and the theme */}
                <section className="order-2 lg:order-none bg-white border-l-2 border-plum/10 px-6 py-7 lg:overflow-y-auto" aria-live="polite" aria-labelledby="goal-heading">
                    <div key={position?.attemptId ?? 'preview'} className={position ? 'animate-board-deal-late' : ''}>
                    {endgame && (
                        <p className="text-sm font-bold text-berry">
                            {position?.practice ? <>{endgame.title} · practice</> : <>{endgame.category} · rated {endgame.rating}</>}
                            {!rated && <span className="text-plum/70"> · retry, unrated</span>}
                        </p>
                    )}
                    <h2 id="goal-heading" className="mt-1 text-3xl font-serif font-black leading-tight">{goal}</h2>
                    {position?.review && rated && playing && (
                        <p className="mt-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-2.5">You missed this endgame before. Here it is again in a new position.</p>
                    )}
                    </div>
                    {error && <p className="mt-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3" role="alert">{error}</p>}
                    {note && <p className="mt-4 text-sm text-plum/80" role="status">{note}</p>}

                    {!position && (
                        <div className="mt-4 space-y-4 text-plum/85 leading-relaxed">
                            <p>Each position is a fresh variation of one of the endgames in the Strategy lessons: moved around the board, flipped or with the colours swapped, and checked so the result stays the same.</p>
                            <p>Positions are picked a little below your rating so you solve more than you miss. Your rating moves a lot at first, then settles as you play.</p>
                            <p>The board shows the Lucena position, one of the techniques you'll meet. <Link to="/EndgameStrategy" className="font-bold text-berry hover:underline underline-offset-4">Browse the lessons</Link> any time.</p>
                        </div>
                    )}

                    {playing && position?.fastestMate && (
                        <p className="mt-4 text-sm text-plum/75">Fastest mate: {position.fastestMate} moves</p>
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
                                {rated && !position?.practice && delta !== null && <span className={`ml-2 tabular-nums ${delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{signed(delta)}</span>}
                            </p>
                            {rated && position?.practice && (
                                <p className="mt-1 text-sm text-plum/80">
                                    {phase === 'solved'
                                        ? session.at(-1)?.helped ? 'Solved with a hint, so it counts as a miss and will come back for review.' : 'Practice: no rating change.'
                                        : 'Practice: no rating change. This one will come back for review.'}
                                </p>
                            )}
                            {feedback?.reason && <p className="mt-1 text-plum/85">{feedback.reason}</p>}
                            {feedback?.best && <p className="mt-1 text-sm text-plum/75">Red arrow: your move. Green arrow: the move that kept the result.</p>}
                            {phase === 'solved' && !position?.practice && result?.movesTaken && result.fastestMate && (
                                <p className="mt-1 text-sm text-plum/85">
                                    {result.movesTaken} moves (fastest mate {result.fastestMate}) · {Math.round(result.score * 100)}% of the full gain{result.score < 1 ? ': a faster win earns more' : ''}
                                </p>
                            )}
                            {result && result.pointsAwarded > 0 && <p className="mt-2 font-bold text-emerald-700">New best rating: +{result.pointsAwarded} points!</p>}

                            <div className="mt-5 flex flex-wrap gap-3">
                                <button type="button" onClick={() => loadNext()} className={`inline-flex items-center gap-2 py-2.5 px-6 soft-button-berry text-sm ${focusRing}`}>
                                    Next position <ArrowRight size={16} />
                                </button>
                                {phase === 'failed' && (
                                    <button type="button" onClick={retry} className={`inline-flex items-center gap-2 py-2.5 px-6 soft-button text-sm ${focusRing}`}>
                                        <RotateCcw size={16} /> Try again, unrated
                                    </button>
                                )}
                            </div>

                            {/* The theme: library positions explain it here, the original endgames link to their strategy diagrams */}
                            <article className="mt-8 rounded-xl bg-cream px-5 py-4" aria-labelledby="theme-heading">
                                <h3 id="theme-heading" className="text-xl font-serif font-black">{endgame.title}</h3>
                                {endgame.id.startsWith('lib-') ? (
                                    <p className="mt-2 text-plum/85 leading-relaxed">{endgame.description}</p>
                                ) : (
                                    <Link to={`/EndgameStrategy?endgame=${endgame.id}`} className={`mt-2 inline-flex items-center gap-2 font-bold text-berry hover:underline underline-offset-4 ${focusRing}`}>
                                        <GraduationCap size={18} /> Learn more
                                    </Link>
                                )}
                            </article>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
