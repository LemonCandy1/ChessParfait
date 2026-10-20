import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import {
    RotateCcw,
    CheckCircle2,
    HelpCircle,
    PartyPopper,
    BookOpen,
    ArrowRight,
    ArrowLeft,
    Compass,
    Volume2,
    VolumeX,
    Maximize2,
    Bell,
    PanelLeftClose,
    PanelLeftOpen,
    Search,
    X,
    Lightbulb,
    Star,
    ChevronDown,
    History
} from '@/lib/lucideOriginal';
import { useSearchParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import EndgameBoard from '../components/EndgameBoard';
import { playMoveSound, playCaptureSound, playWinSound, playLoseSound } from '../lib/soundEffects';
import { drawReason, drillGoalFor, goalAchievedBy } from '../lib/endgameGoals';
import { pointsForDifficulty } from '../lib/endgameRewards';
import { BotAvatar } from '../components/BotAvatars';
import endgamesData from '../data/endgames.json';
import { endgameEngine, OPPONENT_PRESETS, type PracticeOpponent } from '../lib/stockfishEngine';
import { useAuth } from '../context/AuthContext';
import { readLastAccessed, timeAgo, writeLastAccessed } from '../lib/lastAccessed';

export interface EndgamePosition {
    id: string;
    category: string;
    title: string;
    subtitle?: string;
    fen: string;
    playerColor: 'w' | 'b';
    target: 'win' | 'draw';
    difficulty: 'Piece of Cake' | 'Hard Tart' | 'Cherry Bomb';
    iconType?: string;
    description: string;
    theoryNotes: string;
    keyTip: string;
}

/**
 * Check if a proposed move is a pawn promotion move
 */
/** What the player must achieve, matching how the drill is judged. */
function objectiveText(endgame: EndgamePosition): string {
    if (endgame.target !== 'win') return 'Defend precisely and hold the theoretical draw.';
    switch (drillGoalFor(endgame)) {
        case 'pawn-promotion':
            return 'Promote your pawn to a queen safely, where it cannot be captured.';
        case 'queen-wins-rook':
            return 'Win the rook with your queen, without stalemate or allowing a recapture.';
        default:
            return 'Convert the advantage and force checkmate.';
    }
}

/**
 * Return the starting FEN with the player to move, so practice always begins on the
 * player's turn. Falls back to the original FEN if switching the turn is not legal.
 */
/** Copies a game WITH its move history, so threefold repetition can be detected (a FEN copy forgets it). */
function cloneGame(game: Chess): Chess {
    const copy = new Chess();
    copy.loadPgn(game.pgn());
    return copy;
}

function fenForPlayer(fen: string, color: 'w' | 'b'): string {
    const parts = fen.split(' ');
    if (parts[1] === color) return fen;
    parts[1] = color;
    parts[3] = '-';
    const candidate = parts.join(' ');
    try {
        const opponentToMove = new Chess(candidate.replace(/ [wb] /, color === 'w' ? ' b ' : ' w '));
        if (opponentToMove.isCheck()) return fen;
        return new Chess(candidate).fen();
    } catch {
        return fen;
    }
}

// ── Silhouette SVG Icons matching the ChessParfait design ──
const KeyIcon = () => (
    <svg viewBox="0 0 64 64" className="w-10 h-10 md:w-11 md:h-11 fill-plum/80 group-hover:fill-berry transition-colors shrink-0">
        <path d="M48.5 7.5a12.5 12.5 0 0 0-11.8 16.7L11.4 49.5l-3.9 10.6 10.6-3.9 3.5-3.5 4.2 4.2 5.7-5.7-4.2-4.2 5-5 5.7 5.7 5.7-5.7-5.7-5.7 2.3-2.3A12.5 12.5 0 1 0 48.5 7.5zm4 11.5a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
    </svg>
);

const OppositionIcon = () => (
    <svg viewBox="0 0 64 64" className="w-10 h-10 md:w-11 md:h-11 fill-plum/80 group-hover:fill-berry transition-colors shrink-0">
        <rect x="42" y="16" width="12" height="42" rx="3" />
        <circle cx="20" cy="18" r="6" />
        <path d="M26 27l-8 7-5-5-4 4 7 7 6-5 4 12h5l-4-15 5-3 10 3v-5l-11-5z" />
        <path d="M19 45l-7 13h5l4-7 4 7h5l-6-13z" />
        <path d="M38 20l-4-3m4 8l-5-1m5 8l-5 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
);

const RookCastleIcon = () => (
    <svg viewBox="0 0 64 64" className="w-10 h-10 md:w-11 md:h-11 fill-plum/80 group-hover:fill-berry transition-colors shrink-0">
        <path d="M14 54h36v-6H14v6zm4-10h28l-3-18H25l-3 18zm26-22v-8h-6v4h-4v-4h-8v4h-4v-4h-6v8h28z" />
        <path d="M10 58h44v-3H10v3z" />
    </svg>
);

const RookTowerIcon = () => (
    <svg viewBox="0 0 64 64" className="w-10 h-10 md:w-11 md:h-11 fill-plum/80 group-hover:fill-berry transition-colors shrink-0">
        <path d="M16 12h32v8H16zm4 8l-3 32h20l-3-32zm4 6h16v4H24zm-1 8h18v4H23zm-1 8h20v4H22zM12 56h40v6H12z" />
    </svg>
);

const RookKeyholeIcon = () => (
    <svg viewBox="0 0 64 64" className="w-10 h-10 md:w-11 md:h-11 fill-plum/80 group-hover:fill-berry transition-colors shrink-0">
        <path d="M14 54h36v-6H14v6zm4-10h28l-3-18H25l-3 18zm14-14a4 4 0 0 0-3 3.9c0 1.5.8 2.8 2 3.5v3.6h2v-3.6c1.2-.7 2-2 2-3.5a4 4 0 0 0-3-3.9zm12-8v-8h-6v4h-4v-4h-8v4h-4v-4h-6v8h28z" />
        <path d="M10 58h44v-3H10v3z" />
    </svg>
);

const RookBreakIcon = () => (
    <svg viewBox="0 0 64 64" className="w-10 h-10 md:w-11 md:h-11 fill-plum/80 group-hover:fill-berry transition-colors shrink-0">
        <path d="M14 54h24v-6H14v6zm4-10h18l-1-6-6-2 3-10H25l-3 18zm26-22v-8h-6v4h-4v-4h-8v4h-4v-4h-6v8h28z" />
        <rect x="42" y="44" width="7" height="6" rx="1" />
        <rect x="51" y="47" width="5" height="5" rx="1" />
        <rect x="46" y="34" width="6" height="6" rx="1" />
        <rect x="53" y="38" width="5" height="5" rx="1" />
    </svg>
);

const QueenCrownIcon = () => (
    <svg viewBox="0 0 64 64" className="w-10 h-10 md:w-11 md:h-11 fill-plum/80 group-hover:fill-berry transition-colors shrink-0">
        <circle cx="12" cy="18" r="3" />
        <circle cx="22" cy="14" r="3" />
        <circle cx="32" cy="12" r="3.5" />
        <circle cx="42" cy="14" r="3" />
        <circle cx="52" cy="18" r="3" />
        <path d="M12 24l5 22h30l5-22-9 9-11-13-11 13z" />
        <rect x="15" y="48" width="34" height="6" rx="2" />
    </svg>
);

const BishopKnightIcon = () => (
    <svg viewBox="0 0 64 64" className="w-10 h-10 md:w-11 md:h-11 fill-plum/80 group-hover:fill-berry transition-colors shrink-0">
        <path d="M32 10c-5.5 0-10 6-10 13 0 4.5 2.5 8.5 6 10.8V40h8v-6.2c3.5-2.3 6-6.3 6-10.8 0-7-4.5-13-10-13zm-2 6h4v4h-4zm0 6h4v7h-4zM22 44h20v4H22zm-4 6h28v6H18z" />
    </svg>
);

const renderEndgameIcon = (iconType?: string, category?: string) => {
    switch (iconType) {
        case 'key':
            return <KeyIcon />;
        case 'opposition':
            return <OppositionIcon />;
        case 'rook-pawn':
        case 'rook-passive':
            return <RookCastleIcon />;
        case 'rook-tower':
            return <RookTowerIcon />;
        case 'rook-key':
            return <RookKeyholeIcon />;
        case 'rook-break':
            return <RookBreakIcon />;
        case 'queen':
        case 'queen-herd':
            return <QueenCrownIcon />;
        case 'bishop-knight':
        case 'bishops':
        case 'rook-bishop':
            return <BishopKnightIcon />;
        default:
            if (category?.includes('Pawn')) return <KeyIcon />;
            if (category?.includes('Rook')) return <RookCastleIcon />;
            if (category?.includes('Queen')) return <QueenCrownIcon />;
            return <BishopKnightIcon />;
    }
};

export default function EndgamePractice() {
    const endgames = endgamesData as EndgamePosition[];
    const [searchParams, setSearchParams] = useSearchParams();
    const { user, loading: authLoading, updateUserStats } = useAuth();

    // Determine initial endgame from URL param or default
    const paramId = searchParams.get('id');
    const matchedEndgame = paramId ? endgames.find(e => e.id === paramId) : null;

    // View Mode: 'catalog' for home selection, 'arena' for 3-column practice
    const [viewMode, setViewMode] = useState<'catalog' | 'arena'>(matchedEndgame ? 'arena' : 'catalog');
    const [activeEndgame, setActiveEndgame] = useState<EndgamePosition>(matchedEndgame || endgames[0]);

    // Search and filter state for Catalog
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('All');

    // Storage Key for user account progress persistence
    const storageKey = useMemo(() => {
        return user?.username ? `chessparfait_endgame_progress_${user.username}` : 'chessparfait_endgame_progress_guest';
    }, [user]);

    // Solved drills count per endgame: { [endgameId: string]: number }
    const [drillProgress, setDrillProgress] = useState<Record<string, number>>(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) return JSON.parse(saved);
            const guestSaved = localStorage.getItem('chessparfait_endgame_progress_guest');
            if (guestSaved) return JSON.parse(guestSaved);
        } catch {}
        return {};
    });

    // Reload progress when user logs in/out
    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) setDrillProgress(JSON.parse(saved));
        } catch {}
    }, [storageKey]);

    // Chess board and calculation state
    const [game, setGame] = useState<Chess>(() => new Chess(fenForPlayer((matchedEndgame || endgames[0]).fen, (matchedEndgame || endgames[0]).playerColor)));
    const [playerColor, setPlayerColor] = useState<'w' | 'b'>((matchedEndgame || endgames[0]).playerColor);
    const [selectedOpponent, setSelectedOpponent] = useState<PracticeOpponent>(() => {
        try {
            const saved = localStorage.getItem('endgame_practice_opponent');
            if (saved && OPPONENT_PRESETS[saved as PracticeOpponent]) {
                endgameEngine.setOpponent(saved as PracticeOpponent);
                return saved as PracticeOpponent;
            }
        } catch {}
        endgameEngine.setOpponent('stockfish');
        return 'stockfish';
    });
    const [showOpponentModal, setShowOpponentModal] = useState(false);
    // Opponent highlighted in the picker; only applied when the player presses Done.
    const [draftOpponent, setDraftOpponent] = useState<PracticeOpponent>('stockfish');
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [liveEval, setLiveEval] = useState<string>('Calculating...');
    const [statusMessage, setStatusMessage] = useState<{ type: 'info' | 'success' | 'error' | 'celebrate'; text: string }>({
        type: 'info',
        text: 'Make your move to begin endgame calculation.'
    });
    const [moveCount, setMoveCount] = useState(0);
    const [isSolved, setIsSolved] = useState(false);
    // The opponent reached the drill's goal (safe promotion or won the rook): the attempt is over.
    const [isFailed, setIsFailed] = useState(false);
    const [showSolvedOverlay, setShowSolvedOverlay] = useState(false);
    // What the user achieved and the points result, shown on the success overlay
    const [completionInfo, setCompletionInfo] = useState<{ label: string; reward: string | null } | null>(null);
    const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
    // Bumped on every new position or reset so the board clears selections, circles and queued moves.
    const [boardKey, setBoardKey] = useState(0);
    // The opponent's last move, for the message when a queued move is no longer legal.
    const lastOpponentMove = useRef<{ name: string; san: string } | null>(null);

    // Layout states
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState<'learn' | 'review'>('learn');
    const [isSoundMuted, setIsSoundMuted] = useState(false);
    const [revealedHint, setRevealedHint] = useState<string | null>(null);

    const [userRatings, setUserRatings] = useState<Record<string, number>>(() => {
        try {
            const saved = localStorage.getItem('chessparfait_endgame_ratings');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    const aiTimerRef = useRef<number | null>(null);
    // Mirrors isAiThinking so callbacks never act on a stale value from an earlier render
    const aiThinkingRef = useRef(false);
    const gameRef = useRef<Chess>(game);

    /** Stops a pending opponent reply (the board drops any queued move when boardKey changes). */
    const cancelOpponentTimers = useCallback(() => {
        if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
        aiThinkingRef.current = false;
    }, []);

    useEffect(() => {
        gameRef.current = game;
    }, [game]);

    // Sync URL parameter with active endgame
    useEffect(() => {
        const id = searchParams.get('id');
        if (id) {
            const eg = endgames.find(e => e.id === id);
            if (eg && eg.id !== activeEndgame.id) {
                setActiveEndgame(eg);
                setPlayerColor(eg.playerColor);
                setGame(new Chess(fenForPlayer(eg.fen, eg.playerColor)));
                setViewMode('arena');
            }
        }
    }, [searchParams, endgames, activeEndgame.id]);

    // Group endgames by category in strict order
    const orderedCategoryKeys = ['Pawn Endgames', 'Rook Endgames', 'Queen Endgames', 'Minor Piece Endgames'];

    const categorizedEndgames = useMemo(() => {
        const groups: Record<string, EndgamePosition[]> = {};
        orderedCategoryKeys.forEach(cat => { groups[cat] = []; });
        endgames.forEach((eg) => {
            if (!groups[eg.category]) groups[eg.category] = [];
            groups[eg.category].push(eg);
        });
        return groups;
    }, [endgames]);

    // Remember the endgame each user last opened in the arena
    useEffect(() => {
        if (authLoading || viewMode !== 'arena') return;
        writeLastAccessed('practice', user?.username, { endgameId: activeEndgame.id, at: Date.now() });
    }, [activeEndgame.id, authLoading, user?.username, viewMode]);

    // "Continue where you left off": re-read whenever the catalog is shown or the account changes
    const lastPractice = useMemo(() => {
        if (authLoading || viewMode !== 'catalog') return null;
        const last = readLastAccessed('practice', user?.username);
        const endgame = last && endgames.find(e => e.id === last.endgameId);
        return last && endgame ? { endgame, at: last.at } : null;
    }, [authLoading, endgames, user?.username, viewMode]);

    const lastStrategy = useMemo(() => {
        if (authLoading || viewMode !== 'catalog') return null;
        return readLastAccessed('strategy', user?.username);
    }, [authLoading, user?.username, viewMode]);

    // Overall user account progress calculation
    // A drill is complete once the user has finished it successfully one time
    const isCompleted = useCallback((id: string) => (drillProgress[id] || 0) > 0, [drillProgress]);

    const progressStats = useMemo(() => {
        const total = endgames.length;
        const completed = endgames.filter(eg => isCompleted(eg.id)).length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { total, completed, percent };
    }, [endgames, isCompleted]);

    // Filter endgames for catalog search
    const filteredCategorizedEndgames = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const filteredGroups: Record<string, EndgamePosition[]> = {};

        orderedCategoryKeys.forEach((cat) => {
            if (categoryFilter !== 'All' && categoryFilter !== cat) {
                return;
            }
            const list = categorizedEndgames[cat] || [];
            const matching = list.filter((eg) => {
                if (!query) return true;
                return (
                    eg.title.toLowerCase().includes(query) ||
                    (eg.subtitle && eg.subtitle.toLowerCase().includes(query)) ||
                    eg.description.toLowerCase().includes(query) ||
                    eg.theoryNotes.toLowerCase().includes(query) ||
                    eg.keyTip.toLowerCase().includes(query) ||
                    eg.difficulty.toLowerCase().includes(query)
                );
            });
            if (matching.length > 0) {
                filteredGroups[cat] = matching;
            }
        });

        return filteredGroups;
    }, [categorizedEndgames, searchQuery, categoryFilter]);

    // Update live evaluation, always from the player's point of view
    const updateEvaluation = useCallback(async (fen: string, perspective: 'w' | 'b') => {
        try {
            const evalResult = await endgameEngine.getEvaluation(fen, perspective);
            setLiveEval(evalResult.evalText);
        } catch {
            setLiveEval('In Progress');
        }
    }, []);

    // Initial evaluation
    useEffect(() => {
        if (viewMode === 'arena') {
            updateEvaluation(gameRef.current.fen(), playerColor);
        }
    }, [activeEndgame, playerColor, updateEvaluation, viewMode]);

    // Select position and open practice arena
    const handleSelectEndgame = (endgame: EndgamePosition) => {
        cancelOpponentTimers();
        setActiveEndgame(endgame);
        setPlayerColor(endgame.playerColor);
        const newGame = new Chess(fenForPlayer(endgame.fen, endgame.playerColor));
        setGame(newGame);
        gameRef.current = newGame;
        setBoardKey(k => k + 1);
        setMoveCount(0);
        setLastMove(null);
        setIsSolved(false);
        setCompletionInfo(null);
        setIsFailed(false);
        setShowSolvedOverlay(false);
        setIsAiThinking(false);
        setRevealedHint(null);
        setStatusMessage({
            type: 'info',
            text: `Your goal: ${objectiveText(endgame)}`
        });
        updateEvaluation(newGame.fen(), endgame.playerColor);
        setViewMode('arena');
        setSearchParams({ id: endgame.id });
    };

    // Return to catalog
    const handleReturnToCatalog = () => {
        cancelOpponentTimers();
        setViewMode('catalog');
        setSearchParams({});
    };

    // Reset current position
    const handleResetPosition = useCallback((colorArg?: 'w' | 'b') => {
        cancelOpponentTimers();
        const color = colorArg ?? playerColor;
        const newGame = new Chess(fenForPlayer(activeEndgame.fen, color));
        setGame(newGame);
        gameRef.current = newGame;
        setBoardKey(k => k + 1);
        setMoveCount(0);
        setLastMove(null);
        setIsSolved(false);
        setIsFailed(false);
        setShowSolvedOverlay(false);
        setCompletionInfo(null);
        setIsAiThinking(false);
        setRevealedHint(null);
        setStatusMessage({
            type: 'info',
            text: 'Position reset. Ready for another attempt!'
        });
        updateEvaluation(newGame.fen(), color);
    }, [activeEndgame, cancelOpponentTimers, playerColor, updateEvaluation]);

    // Advance to next endgame
    const handleNextEndgame = () => {
        const currentIndex = endgames.findIndex((e) => e.id === activeEndgame.id);
        const nextIndex = (currentIndex + 1) % endgames.length;
        handleSelectEndgame(endgames[nextIndex]);
    };

    // Switch playing color
    const handleToggleColor = () => {
        const nextColor = playerColor === 'w' ? 'b' : 'w';
        setPlayerColor(nextColor);
        setLastMove(null);
        handleResetPosition(nextColor);
    };

    const openOpponentPicker = () => {
        setDraftOpponent(selectedOpponent);
        setShowOpponentModal(true);
    };

    // Switch practice opponent (Maia bots or Stockfish)
    const handleOpponentChange = (opponent: PracticeOpponent) => {
        setSelectedOpponent(opponent);
        endgameEngine.setOpponent(opponent);
        try {
            localStorage.setItem('endgame_practice_opponent', opponent);
        } catch {}
        setShowOpponentModal(false);
        setStatusMessage({
            type: 'info',
            text: `Opponent set to ${OPPONENT_PRESETS[opponent].name} (${OPPONENT_PRESETS[opponent].title}).`
        });
    };

    // Fullscreen toggle
    const handleToggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    };

    // Hint toggle
    const handleToggleHint = () => {
        if (revealedHint) {
            setRevealedHint(null);
        } else {
            setRevealedHint(activeEndgame.keyTip);
        }
    };

    // Rating handler
    const handleRate = (stars: number) => {
        const updated = { ...userRatings, [activeEndgame.id]: stars };
        setUserRatings(updated);
        try {
            localStorage.setItem('chessparfait_endgame_ratings', JSON.stringify(updated));
        } catch {}
    };

    // Mark the drill complete (one successful finish is enough)
    const markSolved = useCallback((id: string) => {
        setDrillProgress((prev) => {
            if ((prev[id] || 0) > 0) return prev;
            const updated = { ...prev, [id]: 1 };
            try {
                localStorage.setItem(storageKey, JSON.stringify(updated));
                // Sync legacy key
                const legacy = localStorage.getItem('chessparfait_solved_endgames');
                const list: string[] = legacy ? JSON.parse(legacy) : [];
                if (!list.includes(id)) {
                    list.push(id);
                    localStorage.setItem('chessparfait_solved_endgames', JSON.stringify(list));
                }
            } catch {}
            return updated;
        });
    }, [storageKey]);

    // Award points for the first completion. The server decides the amount and only pays once per account.
    const awardCompletion = useCallback(async (endgame: EndgamePosition) => {
        const points = pointsForDifficulty(endgame.difficulty);
        if (!user) {
            setCompletionInfo((prev) => prev && { ...prev, reward: `Sign in to earn +${points} points for this endgame.` });
            return;
        }
        try {
            const res = await fetch('/api/endgames/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endgameId: endgame.id })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            updateUserStats(data.totalPoints, user.solvedPuzzles ?? []);
            setCompletionInfo((prev) => prev && {
                ...prev,
                reward: data.alreadyCompleted ? 'Already completed: points were awarded the first time.' : `+${data.pointsAwarded} points earned!`
            });
        } catch {
            setCompletionInfo((prev) => prev && { ...prev, reward: 'Completed, but the points could not be saved. Check your connection.' });
        }
    }, [updateUserStats, user]);

    /** Shared success handling for every way of finishing a drill. */
    const completeDrill = useCallback((label: string, statusText: string) => {
        if (!isSoundMuted) playWinSound();
        setIsSolved(true);
        setShowSolvedOverlay(true);
        setCompletionInfo({ label, reward: null });
        markSolved(activeEndgame.id);
        setStatusMessage({ type: 'celebrate', text: statusText });
        void awardCompletion(activeEndgame);
    }, [activeEndgame, awardCompletion, isSoundMuted, markSolved]);

    // Check end condition
    const evaluateEndCondition = useCallback((currentGame: Chess) => {
        if (currentGame.isCheckmate()) {
            const winner = currentGame.turn() === 'w' ? 'b' : 'w';
            if (winner === playerColor) {
                completeDrill('Checkmate delivered', 'Victory! Flawless checkmate execution.');
            } else {
                if (!isSoundMuted) playLoseSound();
                setIsFailed(true);
                setStatusMessage({
                    type: 'error',
                    text: 'Defeat. The opponent delivered checkmate. Reset and try again!'
                });
            }
            return true;
        }

        if (currentGame.isDraw()) {
            const reason = drawReason(currentGame) ?? 'agreement';
            if (activeEndgame.target === 'draw') {
                completeDrill(`Draw held by ${reason}`, `Draw secured by ${reason}! Masterful defensive technique.`);
            } else {
                if (!isSoundMuted) playLoseSound();
                setIsFailed(true);
                setStatusMessage({
                    type: 'error',
                    text: `Draw by ${reason}. The goal was to win: reset and try again!`
                });
            }
            return true;
        }

        // Pawn endgames end on a safe promotion; queen vs rook ends when the queen safely wins the rook.
        const goal = drillGoalFor(activeEndgame);
        const achievedBy = goalAchievedBy(goal, currentGame, currentGame.history({ verbose: true }).at(-1));
        if (achievedBy) {
            const promoted = goal === 'pawn-promotion';
            if (achievedBy === playerColor) {
                completeDrill(
                    promoted ? 'Pawn queened safely' : 'Rook won safely',
                    promoted
                        ? 'Success! Your pawn queened safely. The rest is a textbook win.'
                        : 'Success! Your queen won the rook and is safe. Queen vs king is a textbook win.'
                );
            } else {
                if (!isSoundMuted) playLoseSound();
                setIsFailed(true);
                setStatusMessage({
                    type: 'error',
                    text: promoted
                        ? 'The opponent queened safely. Reset and try again!'
                        : 'The opponent won your rook. Reset and try again!'
                });
            }
            return true;
        }

        return false;
    }, [activeEndgame, completeDrill, isSoundMuted, playerColor]);

    // AI Move Trigger
    const triggerAiResponse = useCallback((currentGame: Chess) => {
        if (currentGame.isGameOver()) return;
        aiThinkingRef.current = true;
        setIsAiThinking(true);

        aiTimerRef.current = window.setTimeout(async () => {
            try {
                const fen = currentGame.fen();
                const recommendation = await endgameEngine.getBestMove(fen);

                {
                    const gameCopy = cloneGame(currentGame);
                    let move = null;
                    if (recommendation) {
                        try {
                            move = gameCopy.move({
                                from: recommendation.from,
                                to: recommendation.to,
                                promotion: recommendation.promotion || 'q'
                            });
                        } catch {
                            move = null;
                        }
                    }
                    if (!move) {
                        // Guarantee the turn always returns to the player
                        const legal = gameCopy.moves();
                        if (legal.length > 0) move = gameCopy.move(legal[Math.floor(Math.random() * legal.length)]);
                    }

                    if (move) {
                        if (!isSoundMuted) {
                            if (move.captured) playCaptureSound();
                            else playMoveSound();
                        }

                        aiThinkingRef.current = false;
                        setGame(gameCopy);
                        gameRef.current = gameCopy;
                        setLastMove({ from: move.from, to: move.to });
                        updateEvaluation(gameCopy.fen(), playerColor);

                        const gameOver = evaluateEndCondition(gameCopy);
                        if (!gameOver) {
                            const oppName = OPPONENT_PRESETS[selectedOpponent]?.name || 'Opponent';
                            const neuralTag = recommendation?.isNeural ? ' (Neural ONNX)' : '';
                            lastOpponentMove.current = { name: oppName, san: move.san };
                            setStatusMessage({
                                type: 'info',
                                text: `${oppName}${neuralTag} played ${move.san}. Your turn!`
                            });
                        }
                    }
                }
            } catch (err) {
                console.error('AI Move Error:', err);
            } finally {
                aiThinkingRef.current = false;
                setIsAiThinking(false);
            }
        }, 400);
    }, [evaluateEndCondition, isSoundMuted, playerColor, selectedOpponent, updateEvaluation]);

    // Safety net: whenever it is not the player's turn, the opponent replies immediately
    useEffect(() => {
        if (viewMode !== 'arena' || isSolved || isFailed || isAiThinking) return;
        if (game.isGameOver() || game.turn() === playerColor) return;
        triggerAiResponse(game);
    }, [game, isAiThinking, isFailed, isSolved, playerColor, triggerAiResponse, viewMode]);

    // Shared move executor for Click-to-Move and Drag-and-Drop
    const executeMove = useCallback((sourceSquare: string, targetSquare: string, chosenPromotion?: string): boolean => {
        if (isSolved || isFailed) return false;

        const currentGame = gameRef.current;

        try {
            const gameCopy = cloneGame(currentGame);
            const move = gameCopy.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: chosenPromotion || 'q'
            });

            if (move === null) return false;

            if (!isSoundMuted) {
                if (move.captured) playCaptureSound();
                else playMoveSound();
            }

            setGame(gameCopy);
            gameRef.current = gameCopy;
            setMoveCount((prev) => prev + 1);
            setLastMove({ from: move.from, to: move.to });
            updateEvaluation(gameCopy.fen(), playerColor);

            const isEnd = evaluateEndCondition(gameCopy);
            if (!isEnd) {
                const oppName = OPPONENT_PRESETS[selectedOpponent]?.name || 'Opponent';
                setStatusMessage({
                    type: 'info',
                    text: `Good move! ${oppName} is calculating defense...`
                });
                triggerAiResponse(gameCopy);
            }

            return true;
        } catch {
            return false;
        }
    }, [evaluateEndCondition, isFailed, isSolved, isSoundMuted, playerColor, selectedOpponent, triggerAiResponse, updateEvaluation]);

    // Current endgame rating
    const currentRating = userRatings[activeEndgame.id] || 5;

    // Filter endgames for Review tab
    const solvedIds = useMemo(() => {
        return Object.keys(drillProgress).filter(id => (drillProgress[id] || 0) > 0);
    }, [drillProgress]);

    const displayedReviewEndgames = useMemo(() => {
        return endgames.filter((e) => solvedIds.includes(e.id));
    }, [endgames, solvedIds]);

    return (
        <div className="h-screen h-[100dvh] flex flex-col bg-[#FAF1DB] font-sans text-plum overflow-hidden">
            {/* Top Navbar */}
            <Navbar />

            {/* ══════════════════════════════════════════════════════════════
                VIEW 1: HOME CATALOG SELECTION VIEW (Matching reference image)
               ══════════════════════════════════════════════════════════════ */}
            {viewMode === 'catalog' ? (
                <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 bg-[#FAF1DB]">
                    <div className="max-w-5xl mx-auto space-y-6">

                        {/* Top Hero / Search Banner */}
                        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 md:p-8 border-2 border-plum/15 shadow-sm space-y-5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-serif font-black text-plum">
                                        Select an Endgame to Practice
                                    </h1>
                                    <p className="text-xs md:text-sm text-plum/70 font-medium mt-1">
                                        Train theoretical positions against tablebase precision. Progress is automatically saved to your account.
                                    </p>
                                </div>

                                {/* User Progress Summary Badge */}
                                <div className="bg-[#FAF1DB] border-2 border-plum/15 rounded-2xl p-3.5 min-w-[220px] text-right">
                                    <div className="text-[10px] font-black uppercase tracking-wider text-plum/60 flex items-center justify-end gap-1.5">
                                        <CheckCircle2 size={13} className="text-emerald-600" />
                                        <span>{user?.username ? `@${user.username}` : 'Local Account'}</span>
                                    </div>
                                    <div className="text-lg font-black font-mono text-plum mt-0.5">
                                        {progressStats.completed} / {progressStats.total} <span className="text-xs font-bold text-plum/60">Endgames completed ({progressStats.percent}%)</span>
                                    </div>
                                    <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                                        <div
                                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${progressStats.percent}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Comprehensive Search Bar */}
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search endgames (e.g. Key Squares, Opposition, 7th-Rank, Lucena, Philidor, Herding...)"
                                    className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white border-2 border-plum/20 focus:border-berry focus:ring-2 focus:ring-berry/20 outline-none text-plum font-medium text-sm transition-all shadow-xs placeholder:text-plum/40"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                        title="Clear search"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Category Filter Pills */}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className="text-[11px] font-black uppercase tracking-wider text-plum/50 mr-1">
                                    Filter:
                                </span>
                                {['All', 'Pawn Endgames', 'Rook Endgames', 'Queen Endgames', 'Minor Piece Endgames'].map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setCategoryFilter(cat)}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-serif font-black transition-all ${
                                            categoryFilter === cat
                                                ? 'bg-berry text-white shadow-xs'
                                                : 'bg-white hover:bg-berry/5 text-plum/80 border-2 border-plum/15'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Continue where you left off (per signed-in user) */}
                        {(lastPractice || lastStrategy) && (
                            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-4 md:p-5 border-2 border-plum/15 shadow-sm space-y-3">
                                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-plum/60">
                                    <History size={14} className="text-berry" />
                                    <span>Continue where you left off{user?.username ? `, @${user.username}` : ''}</span>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {lastPractice && (
                                        <button
                                            onClick={() => handleSelectEndgame(lastPractice.endgame)}
                                            className="text-left p-3.5 rounded-2xl bg-[#FAF1DB] border-2 border-plum/15 hover:border-berry transition-all group flex items-center justify-between gap-3"
                                        >
                                            <div className="min-w-0">
                                                <div className="text-[10px] font-black uppercase tracking-wider text-berry">
                                                    Last practiced · {timeAgo(lastPractice.at)}
                                                </div>
                                                <div className="font-serif font-black text-plum truncate">{lastPractice.endgame.title}</div>
                                                <div className="text-[11px] font-bold text-plum/60">
                                                    {lastPractice.endgame.category} · {isCompleted(lastPractice.endgame.id) ? 'Completed' : 'Not completed yet'}
                                                </div>
                                            </div>
                                            <span className="shrink-0 inline-flex items-center gap-1 text-xs font-black text-berry">
                                                Resume <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                            </span>
                                        </button>
                                    )}
                                    {lastStrategy && (
                                        <Link
                                            to="/EndgameStrategy"
                                            className="text-left p-3.5 rounded-2xl bg-[#FAF1DB] border-2 border-plum/15 hover:border-berry transition-all group flex items-center justify-between gap-3"
                                        >
                                            <div className="min-w-0">
                                                <div className="text-[10px] font-black uppercase tracking-wider text-berry">
                                                    Last studied · {timeAgo(lastStrategy.at)}
                                                </div>
                                                <div className="font-serif font-black text-plum truncate">{lastStrategy.title}</div>
                                                <div className="text-[11px] font-bold text-plum/60">
                                                    Strategy · step {lastStrategy.step + 1} of {lastStrategy.totalSteps}
                                                </div>
                                            </div>
                                            <span className="shrink-0 inline-flex items-center gap-1 text-xs font-black text-berry">
                                                <BookOpen size={14} /> Continue
                                            </span>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Endgame Sections Ordered by Type */}
                        <div className="space-y-8 pb-12">
                            {orderedCategoryKeys.map((catKey) => {
                                const items = filteredCategorizedEndgames[catKey];
                                if (!items || items.length === 0) return null;

                                return (
                                    <div key={catKey} className="space-y-4">
                                        {/* Section header, matching the site's heading style */}
                                        <h2 className="text-xl md:text-2xl font-serif font-black text-plum leading-tight pt-4 pb-1">
                                            {catKey}
                                        </h2>

                                        {/* 2-Column Cards Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {items.map((endgame) => {
                                                const hasProgress = isCompleted(endgame.id);

                                                return (
                                                    <div
                                                        key={endgame.id}
                                                        onClick={() => handleSelectEndgame(endgame)}
                                                        className={`relative rounded-2xl border-2 p-4 md:p-5 flex items-center justify-between gap-4 cursor-pointer transition-all duration-200 group select-none shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] ${
                                                            hasProgress
                                                                ? 'bg-white/95 border-berry/30 hover:border-berry'
                                                                : 'bg-white/80 border-plum/15 hover:border-plum/30'
                                                        }`}
                                                    >
                                                        {/* Top-Right Angled Completion Rate Ribbon */}
                                                        <div className="absolute top-0 right-0 overflow-hidden rounded-tr-2xl pointer-events-none">
                                                            <div
                                                                className={`px-4 py-1 text-xs font-black font-mono tracking-tight shadow-xs ${
                                                                    hasProgress
                                                                        ? 'bg-berry text-cream'
                                                                        : 'bg-plum/10 text-plum/70'
                                                                }`}
                                                                style={{
                                                                    clipPath: 'polygon(20% 0%, 100% 0%, 100% 100%, 0% 100%)'
                                                                }}
                                                            >
                                                                {hasProgress ? '✓ Done' : `+${pointsForDifficulty(endgame.difficulty)} pts`}
                                                            </div>
                                                        </div>

                                                        {/* Card Content (Icon + Title + Subtitle) */}
                                                        <div className="flex items-center gap-3.5 min-w-0 pr-14">
                                                            {/* Silhouette Icon */}
                                                            <div className="shrink-0 transition-transform group-hover:scale-105 duration-200">
                                                                {renderEndgameIcon(endgame.iconType, endgame.category)}
                                                            </div>

                                                            {/* Text info in ChessParfait font & colours */}
                                                            <div className="min-w-0">
                                                                <h3 className="text-base md:text-lg font-serif font-black text-plum group-hover:text-berry transition-colors tracking-tight leading-snug truncate">
                                                                    {endgame.title}
                                                                </h3>
                                                                <p className="text-xs md:text-sm text-plum/70 font-medium truncate mt-0.5">
                                                                    {endgame.subtitle || endgame.description}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Hover Arrow Hint */}
                                                        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-berry">
                                                            <ArrowRight size={18} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Empty state for search */}
                            {Object.keys(filteredCategorizedEndgames).length === 0 && (
                                <div className="bg-white/80 rounded-3xl p-12 text-center space-y-3 border-2 border-plum/15">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                                        <Search size={22} />
                                    </div>
                                    <h3 className="text-base font-bold text-slate-800">No endgames match &quot;{searchQuery}&quot;</h3>
                                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                        Try searching for another keyword like &quot;Lucena&quot;, &quot;Opposition&quot;, &quot;Queen&quot;, or &quot;Pawn&quot;.
                                    </p>
                                    <button
                                        onClick={() => { setSearchQuery(''); setCategoryFilter('All'); }}
                                        className="mt-2 py-2 px-4 rounded-xl bg-berry text-cream font-bold text-xs hover:bg-berry/90 transition-colors shadow-xs"
                                    >
                                        Clear Search
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* ══════════════════════════════════════════════════════════════
                    VIEW 2: 3-COLUMN ARENA (Single-screen layout, fits on screen)
                   ══════════════════════════════════════════════════════════════ */
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative bg-[#FAF1DB]">
                    
                    {/* ── LEFT COLUMN: Endgames List & Course Hierarchy ── */}
                    <aside
                        className={`hidden md:flex shrink-0 border-r-2 border-plum/15 bg-white flex-col h-full overflow-hidden transition-all duration-300 z-20 ${
                            isSidebarCollapsed ? 'w-14' : 'w-full md:w-[280px] lg:w-[320px]'
                        }`}
                    >
                        {/* Top Back to Catalog Bar */}
                        {!isSidebarCollapsed && (
                            <div className="p-2.5 border-b border-plum/10 bg-slate-50 flex items-center justify-between">
                                <span className="px-2.5 py-1.5 text-xs font-bold text-slate-600">
                                    Overall Progress
                                </span>
                                <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                    {progressStats.completed}/{progressStats.total}
                                </span>
                            </div>
                        )}

                        {/* Sidebar Tabs (Learn / Review) */}
                        <div className="flex items-center border-b-2 border-plum/10 bg-white">
                            {!isSidebarCollapsed ? (
                                <>
                                    <button
                                        onClick={() => setActiveTab('learn')}
                                        className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all text-center relative ${
                                            activeTab === 'learn'
                                                ? 'text-berry font-black'
                                                : 'text-plum/50 hover:text-plum'
                                        }`}
                                    >
                                        Learn
                                        {activeTab === 'learn' && (
                                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-berry" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('review')}
                                        className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all text-center flex items-center justify-center gap-1.5 relative ${
                                            activeTab === 'review'
                                                ? 'text-berry font-black'
                                                : 'text-plum/50 hover:text-plum'
                                        }`}
                                    >
                                        <span>Review</span>
                                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold border border-slate-200">
                                            {solvedIds.length}
                                        </span>
                                        {activeTab === 'review' && (
                                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-berry" />
                                        )}
                                    </button>
                                </>
                            ) : null}

                            {/* Sidebar Collapse Toggle Button */}
                            <button
                                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                                className="p-3 text-plum/60 hover:text-plum hover:bg-slate-50 transition-colors shrink-0"
                                title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                            >
                                {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                            </button>
                        </div>

                        {!isSidebarCollapsed && (
                            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                                {orderedCategoryKeys.map((category) => {
                                    const categoryItems = activeTab === 'review'
                                        ? displayedReviewEndgames.filter(e => e.category === category)
                                        : (categorizedEndgames[category] || []);

                                    if (categoryItems.length === 0) return null;

                                    return (
                                        <div key={category} className="p-3 space-y-1">
                                            <div className="px-2 py-1 text-[11px] font-serif font-black uppercase tracking-wider text-plum/70">
                                                {category}
                                            </div>
                                            <div className="space-y-0.5">
                                                {categoryItems.map((item) => {
                                                    const isSelected = activeEndgame.id === item.id;
                                                    const isItemSolved = isCompleted(item.id);

                                                    return (
                                                        <button
                                                            key={item.id}
                                                            onClick={() => handleSelectEndgame(item)}
                                                            className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between group ${
                                                                isSelected
                                                                    ? 'bg-berry/10 text-berry font-black border border-berry/30'
                                                                    : 'hover:bg-berry/5 text-plum/80 font-medium'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0 pr-2">
                                                                {isItemSolved ? (
                                                                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                                                ) : (
                                                                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                                                                        isSelected ? 'bg-berry' : 'bg-plum/30'
                                                                    }`} />
                                                                )}
                                                                <span className="truncate">{item.title}</span>
                                                            </div>
                                                            <span className="text-[10px] font-mono text-plum/50 shrink-0">
                                                                {isItemSolved ? 'Done' : `+${pointsForDifficulty(item.difficulty)}`}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}

                                {activeTab === 'review' && displayedReviewEndgames.length === 0 && (
                                    <div className="p-6 text-center text-slate-400 space-y-2">
                                        <p className="text-xs font-bold">No completed endgames to review yet.</p>
                                        <p className="text-[11px]">Solve endgames in the Learn tab to build your review deck!</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </aside>

                    {/* ── CENTER COLUMN: Centered Chessboard ── */}
                    <main className="flex-1 flex flex-col items-center justify-start md:justify-center p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:p-3 relative h-full min-w-0 bg-[#f8fafc] overflow-y-auto md:overflow-hidden">
                        {/* Top quick navigation to return to catalog */}
                        <div className="w-full max-w-[min(100%,calc(100dvh-300px),540px)] md:max-w-[min(calc(100vh-175px),calc(100vw-680px),540px)] flex items-center justify-between mb-1.5 px-1">
                            <button
                                onClick={handleReturnToCatalog}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-plum/70 hover:text-berry transition-colors cursor-pointer"
                            >
                                <ArrowLeft size={14} />
                                <span>Back to Endgames Catalog</span>
                            </button>
                            <span className="hidden sm:inline text-[11px] font-bold text-slate-400 font-mono">
                                {isCompleted(activeEndgame.id) ? 'Completed ✓' : `Reward: +${pointsForDifficulty(activeEndgame.difficulty)} points`}
                            </span>
                        </div>

                        {/* Opponent Match Bar */}
                        <div className="w-full max-w-[min(100%,calc(100dvh-300px),540px)] md:max-w-[min(calc(100vh-175px),calc(100vw-680px),540px)] mb-2 px-1 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={openOpponentPicker}
                                    className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border border-slate-200 bg-white hover:border-berry/40 hover:shadow-xs transition-all text-xs font-bold text-slate-700 group cursor-pointer"
                                    title="Choose practice opponent (Maia bots or Stockfish)"
                                >
                                    <BotAvatar opponent={selectedOpponent} size={28} className="shrink-0" />
                                    <span className="font-black text-slate-800 group-hover:text-berry transition-colors">
                                        {OPPONENT_PRESETS[selectedOpponent].name}
                                    </span>
                                    <ChevronDown size={13} className="text-slate-400 group-hover:text-berry transition-colors" />
                                </button>
                                {isAiThinking && (
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-berry animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-berry" />
                                        Thinking...
                                    </span>
                                )}
                            </div>

                            <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                                <span>You:</span>
                                <span className="font-black text-plum px-1.5 py-0.5">
                                    {playerColor === 'w' ? 'White' : 'Black'}
                                </span>
                            </div>
                        </div>

                        {/* Chessboard Container - fits completely on one screen */}
                        <div className="w-full max-w-[min(100%,calc(100dvh-300px),540px)] md:max-w-[min(calc(100vh-175px),calc(100vw-680px),540px)] aspect-square relative flex items-center justify-center">
                            <EndgameBoard
                                game={game}
                                playerColor={playerColor}
                                lastMove={lastMove}
                                canMove={!isSolved && !isFailed}
                                canSelect={!isSolved}
                                opponentBusy={aiThinkingRef}
                                onMove={executeMove}
                                onMoveQueued={() => setStatusMessage({ type: 'info', text: 'Move queued. Executing as soon as opponent moves...' })}
                                onQueuedMoveIllegal={() => {
                                    const last = lastOpponentMove.current;
                                    setStatusMessage({ type: 'info', text: `${last?.name ?? 'Opponent'} played ${last?.san ?? 'a move'}. Your queued move is no longer legal. Your turn!` });
                                }}
                                resetKey={boardKey}
                            >
                                {/* Solved Celebration Overlay */}
                                {showSolvedOverlay && (
                                    <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-[2px] z-40 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                                        <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-3 shadow-xl animate-in zoom-in-75 duration-260">
                                            <PartyPopper size={28} />
                                        </div>
                                        <h3 className="font-serif font-black text-2xl text-white mb-1">Target Achieved!</h3>
                                        <p className="text-emerald-200 text-xs font-bold uppercase tracking-wider mb-4">
                                            {completionInfo?.label ?? (activeEndgame.target === 'win' ? 'Goal achieved' : 'Draw held')}
                                        </p>
                                        {completionInfo?.reward && (
                                            <p className="text-white text-sm font-black mb-4 -mt-2">{completionInfo.reward}</p>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setShowSolvedOverlay(false)}
                                                className="py-2 px-4 rounded-xl border border-white/40 text-white font-black text-xs uppercase tracking-wider hover:bg-white/10 transition-colors"
                                            >
                                                Review Board
                                            </button>
                                            <button
                                                onClick={handleNextEndgame}
                                                className="py-2 px-5 rounded-xl bg-white text-emerald-950 font-black text-xs uppercase tracking-wider hover:bg-emerald-50 transition-colors shadow-md flex items-center gap-1.5"
                                            >
                                                <span>Next Exercise</span>
                                                <ArrowRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </EndgameBoard>
                        </div>

                        {/* Bottom Status Bar Under Board */}
                        <div className="w-full max-w-[min(100%,calc(100dvh-300px),540px)] md:max-w-[min(calc(100vh-175px),calc(100vw-680px),540px)] flex items-center justify-between mt-2 px-2 py-1 text-slate-600 select-none">
                            {/* Hint Button */}
                            <button
                                onClick={handleToggleHint}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all border ${
                                    revealedHint
                                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                                }`}
                            >
                                <Bell size={13} className="text-amber-500" />
                                <span>Hint</span>
                            </button>

                            {/* Turn & Status Message */}
                            <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${game.turn() === 'w' ? 'bg-white border border-slate-400' : 'bg-slate-800'}`} />
                                <span className="text-xs font-black text-slate-700 whitespace-nowrap">
                                    {isAiThinking
                                        ? 'Thinking...'
                                        : game.turn() === playerColor
                                            ? 'Your Move'
                                            : 'Opponent Turn'}
                                </span>
                            </div>

                            {/* Moves count */}
                            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">
                                Moves: {moveCount}
                            </span>
                        </div>

                        {/* Mobile controls: everything the side panels offer, visible without scrolling */}
                        <div className="md:hidden w-full max-w-[min(100%,540px)] mt-1.5 space-y-1.5">
                            <p className="px-2 text-[11px] leading-snug text-slate-600 font-medium text-center line-clamp-2">
                                {statusMessage.text}
                            </p>
                            <div className="grid grid-cols-3 gap-1.5">
                                <button
                                    onClick={() => handleResetPosition()}
                                    className="flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl bg-white border border-slate-200 text-slate-700 text-[10px] font-black active:scale-95 transition-transform"
                                >
                                    <RotateCcw size={16} />
                                    <span>Reset</span>
                                </button>
                                <button
                                    onClick={handleToggleColor}
                                    className="flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl bg-white border border-slate-200 text-slate-700 text-[10px] font-black active:scale-95 transition-transform"
                                >
                                    <Compass size={16} />
                                    <span>Flip</span>
                                </button>
                                <Link
                                    to={`/EndgameStrategy?endgame=${activeEndgame.id}&returnId=${activeEndgame.id}`}
                                    className="flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl bg-berry text-white text-[10px] font-black active:scale-95 transition-transform"
                                >
                                    <BookOpen size={16} />
                                    <span>Strategy</span>
                                </Link>
                            </div>
                        </div>

                        {/* Hint reveal banner */}
                        {revealedHint && (
                            <div className="w-full max-w-[min(100%,calc(100dvh-300px),540px)] md:max-w-[min(calc(100vh-175px),calc(100vw-680px),540px)] mt-1.5 p-2.5 rounded-xl bg-amber-50/95 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 shadow-sm animate-in fade-in duration-150">
                                <Lightbulb size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <span className="font-black">Key Hint: </span>
                                    <span>{revealedHint}</span>
                                </div>
                            </div>
                        )}
                    </main>

                    {/* ── RIGHT COLUMN: Explanations, Strategy Link & Toolbar ── */}
                    <aside className="hidden md:flex w-full md:w-[310px] lg:w-[350px] shrink-0 border-l-2 border-plum/15 bg-white flex-col h-full overflow-hidden justify-between z-20">
                        
                        {/* Header: Title and Actions */}
                        <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <h2 className="font-serif font-black text-plum text-base md:text-lg leading-snug">
                                    {activeEndgame.title}
                                </h2>
                                <span className="text-[10px] font-black uppercase tracking-wider text-berry mt-0.5 block">
                                    {activeEndgame.category} • {activeEndgame.difficulty}
                                </span>
                            </div>

                            {/* Top Right Quick Actions */}
                            <div className="flex items-center gap-1 shrink-0 text-slate-400">
                                <button
                                    onClick={() => markSolved(activeEndgame.id)}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                        isSolved ? 'text-emerald-600' : 'hover:bg-slate-100 hover:text-slate-600'
                                    }`}
                                    title={isSolved ? 'Completed' : 'Mark as Solved'}
                                >
                                    <CheckCircle2 size={17} />
                                </button>
                            </div>
                        </div>

                        {/* Explanations Body Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Simple Explanations */}
                            <div className="space-y-2">
                                <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-normal">
                                    {activeEndgame.description}
                                </p>
                            </div>

                            {/* Prominent "Learn Strategy" Button linking to Diagrams */}
                            <Link
                                to={`/EndgameStrategy?endgame=${activeEndgame.id}&returnId=${activeEndgame.id}`}
                                className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-berry/10 via-amber-50 to-berry/10 border-2 border-berry/30 hover:border-berry text-plum hover:shadow-md transition-all group active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-berry text-white flex items-center justify-center shadow-xs shrink-0">
                                        <BookOpen size={16} />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs font-black uppercase tracking-wider text-berry flex items-center gap-1">
                                            <span>Learn Strategy</span>
                                        </div>
                                        <div className="text-[11px] font-medium text-plum/70">
                                            View interactive diagrams & masterclass
                                        </div>
                                    </div>
                                </div>
                                <ArrowRight size={16} className="text-berry group-hover:translate-x-0.5 transition-transform" />
                            </Link>

                            {/* Objective Callout */}
                            <div className="space-y-1 pt-1">
                                <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                                    Objective
                                </div>
                                <div className="text-sm font-bold text-slate-800">
                                    {playerColor === 'w' ? 'White to play!' : 'Black to play!'}
                                </div>
                                <p className="text-xs text-slate-500 font-medium">
                                    {objectiveText(activeEndgame)}
                                </p>
                            </div>

                            {/* Live Move Status alert */}
                            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                                statusMessage.type === 'celebrate'
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                    : statusMessage.type === 'error'
                                        ? 'bg-rose-50 border-rose-300 text-rose-900 font-medium'
                                        : 'bg-slate-50 border-slate-200 text-slate-700 font-medium'
                            }`}>
                                {statusMessage.type === 'celebrate' ? (
                                    <PartyPopper size={16} className="text-emerald-600 shrink-0" />
                                ) : statusMessage.type === 'error' ? (
                                    <HelpCircle size={16} className="text-rose-600 shrink-0" />
                                ) : (
                                    <CheckCircle2 size={16} className="text-slate-500 shrink-0" />
                                )}
                                <span className="leading-snug">{statusMessage.text}</span>
                            </div>

                            {/* Live Engine Eval Badge */}
                            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                                <span className="font-bold text-slate-500">Live Evaluation:</span>
                                <span className="font-black text-slate-800 font-mono">{liveEval}</span>
                            </div>
                        </div>

                        {/* Bottom Action Controls Toolbar */}
                        <div className="border-t border-slate-100 bg-white p-3 space-y-2 select-none relative">
                            {/* Toolbar Buttons */}
                            <div className="flex items-center justify-between gap-1 text-slate-500">
                                <button
                                    onClick={handleToggleColor}
                                    className="p-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-800 transition-colors"
                                    title="Flip Playing Color"
                                >
                                    <Compass size={17} />
                                </button>
                                <button
                                    onClick={() => handleResetPosition()}
                                    className="p-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-800 transition-colors"
                                    title="Reset Position"
                                >
                                    <RotateCcw size={17} />
                                </button>
                                <button
                                    onClick={handleToggleFullscreen}
                                    className="p-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-800 transition-colors"
                                    title="Fullscreen"
                                >
                                    <Maximize2 size={17} />
                                </button>
                                <button
                                    onClick={() => setIsSoundMuted(!isSoundMuted)}
                                    className="p-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-800 transition-colors"
                                    title={isSoundMuted ? 'Unmute Sound' : 'Mute Sound'}
                                >
                                    {isSoundMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                                </button>
                            </div>

                            {/* Difficulty Rating Stars */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                                <span className="text-[11px] font-bold text-slate-400">Rate exercise:</span>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => handleRate(star)}
                                            className="p-0.5 transition-transform hover:scale-125 focus:outline-none"
                                            aria-label={`Rate ${star} stars`}
                                        >
                                            <Star
                                                size={14}
                                                className={star <= currentRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            )}

            {/* ── OPPONENT SELECTION MODAL ── */}
            {showOpponentModal && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div 
                        className="bg-white border-2 border-plum/15 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-berry/10 text-berry flex items-center justify-center font-bold text-base">
                                        AI
                                    </div>
                                    <h3 className="font-serif font-black text-xl text-plum">
                                        Choose Practice Opponent
                                    </h3>
                                </div>
                                <p className="text-xs text-slate-500 font-medium mt-1">
                                    Select a Maia human-trained neural bot or the full Stockfish engine.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowOpponentModal(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Opponents List */}
                        <div role="radiogroup" aria-label="Practice opponent" className="p-5 overflow-y-auto space-y-3">
                            {(Object.keys(OPPONENT_PRESETS) as PracticeOpponent[]).map((oppId) => {
                                const opp = OPPONENT_PRESETS[oppId];
                                const isSelected = draftOpponent === oppId;
                                return (
                                    <button
                                        key={oppId}
                                        role="radio"
                                        aria-checked={isSelected}
                                        onClick={() => setDraftOpponent(oppId)}
                                        className={`w-full p-4 rounded-2xl border-2 transition-all flex items-start justify-between text-left cursor-pointer group ${
                                            isSelected
                                                ? 'border-berry bg-berry/5 shadow-xs'
                                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4 min-w-0 pr-2">
                                            <BotAvatar opponent={opp.id} size={60} className="shrink-0" />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-black text-slate-800 text-sm group-hover:text-berry transition-colors">
                                                        {opp.name}
                                                    </span>
                                                    <span className="text-[11px] font-bold text-slate-400">
                                                        • {opp.title}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                                    {opp.description}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="shrink-0 self-center">
                                            {isSelected ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-black text-berry bg-berry/10 px-2.5 py-1 rounded-xl">
                                                    <CheckCircle2 size={13} />
                                                    Selected
                                                </span>
                                            ) : (
                                                <span className="text-xs font-bold text-slate-400 group-hover:text-berry transition-colors">
                                                    Select
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
                            <span>Press Done to play against your choice.</span>
                            <button
                                onClick={() => handleOpponentChange(draftOpponent)}
                                className="px-4 py-2 bg-berry text-white rounded-xl font-bold hover:bg-berry/90 transition-colors cursor-pointer"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
