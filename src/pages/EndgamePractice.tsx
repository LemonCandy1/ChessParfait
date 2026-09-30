import { useState, useCallback, useMemo, useRef, useEffect, type CSSProperties } from 'react';
import { Chess } from 'chess.js';
import { Chessboard, defaultArrowOptions, defaultPieces } from 'react-chessboard';
import {
    RotateCcw,
    CheckCircle2,
    HelpCircle,
    PartyPopper,
    BookOpen,
    ArrowRight,
    ArrowLeft,
    Compass,
    Settings,
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
    ChevronRight
} from '@/lib/lucideOriginal';
import { useSearchParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import { playMoveSound, playCaptureSound, playWinSound, playLoseSound } from '../lib/soundEffects';
import endgamesData from '../data/endgames.json';
import { endgameEngine, OPPONENT_PRESETS, type PracticeOpponent } from '../lib/stockfishEngine';
import { useAuth } from '../context/AuthContext';

const customArrowOptions = {
    ...defaultArrowOptions,
    color: '#0284c7',
    secondaryColor: '#ea580c',
    tertiaryColor: '#059669',
    opacity: 0.65,
    activeOpacity: 0.55,
};

export interface EndgamePosition {
    id: string;
    category: string;
    title: string;
    subtitle?: string;
    fen: string;
    playerColor: 'w' | 'b';
    target: 'win' | 'draw';
    difficulty: 'Piece of Cake' | 'Hard Tart' | 'Cherry Bomb';
    totalDrills?: number;
    iconType?: string;
    description: string;
    theoryNotes: string;
    keyTip: string;
}

/**
 * Check if a proposed move is a pawn promotion move
 */
/**
 * Return the starting FEN with the player to move, so practice always begins on the
 * player's turn. Falls back to the original FEN if switching the turn is not legal.
 */
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

function isPromotionMove(gameInstance: Chess, from: string, to: string): boolean {
    try {
        const piece = gameInstance.get(from as any);
        if (!piece || piece.type !== 'p') return false;

        const targetRank = to[1];
        const isPromoRank = (piece.color === 'w' && targetRank === '8') || (piece.color === 'b' && targetRank === '1');
        if (!isPromoRank) return false;

        const legalMoves = gameInstance.moves({ square: from as any, verbose: true });
        return legalMoves.some((m) => m.to === to && Boolean(m.promotion));
    } catch {
        return false;
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
    const { user } = useAuth();

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
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [liveEval, setLiveEval] = useState<string>('Calculating...');
    const [statusMessage, setStatusMessage] = useState<{ type: 'info' | 'success' | 'error' | 'celebrate'; text: string }>({
        type: 'info',
        text: 'Make your move to begin endgame calculation.'
    });
    const [moveCount, setMoveCount] = useState(0);
    const [isSolved, setIsSolved] = useState(false);
    const [showSolvedOverlay, setShowSolvedOverlay] = useState(false);
    const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
    const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
    const [circledSquares, setCircledSquares] = useState<string[]>([]);

    // Layout states
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState<'learn' | 'review'>('learn');
    const [isSoundMuted, setIsSoundMuted] = useState(false);
    const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
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
    const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string; color: 'w' | 'b' } | null>(null);
    const gameRef = useRef<Chess>(game);
    const pendingMoveRef = useRef<{ from: string; to: string; promotion?: string } | null>(null);
    const executeMoveRef = useRef<(sourceSquare: string, targetSquare: string, chosenPromotion?: string) => boolean>(() => false);

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

    // Overall user account progress calculation
    const progressStats = useMemo(() => {
        let totalDrills = 0;
        let completedDrills = 0;
        let fullyCompletedEndgames = 0;

        endgames.forEach((eg) => {
            const max = eg.totalDrills || 10;
            totalDrills += max;
            const completed = Math.min(max, drillProgress[eg.id] || 0);
            completedDrills += completed;
            if (completed >= max) fullyCompletedEndgames++;
        });

        const percent = totalDrills > 0 ? Math.round((completedDrills / totalDrills) * 100) : 0;
        return { totalDrills, completedDrills, fullyCompletedEndgames, percent };
    }, [endgames, drillProgress]);

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

    // Update live evaluation
    const updateEvaluation = useCallback(async (fen: string) => {
        try {
            const evalResult = await endgameEngine.getEvaluation(fen);
            setLiveEval(evalResult.evalText);
        } catch {
            setLiveEval('In Progress');
        }
    }, []);

    // Initial evaluation
    useEffect(() => {
        if (viewMode === 'arena') {
            updateEvaluation(gameRef.current.fen());
        }
    }, [activeEndgame, updateEvaluation, viewMode]);

    // Select position and open practice arena
    const handleSelectEndgame = (endgame: EndgamePosition) => {
        if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
        setActiveEndgame(endgame);
        setPlayerColor(endgame.playerColor);
        const newGame = new Chess(fenForPlayer(endgame.fen, endgame.playerColor));
        setGame(newGame);
        gameRef.current = newGame;
        pendingMoveRef.current = null;
        setPendingPromotion(null);
        setMoveCount(0);
        setSelectedSquare(null);
        setLastMove(null);
        setCircledSquares([]);
        const isAlreadyDone = (drillProgress[endgame.id] || 0) >= (endgame.totalDrills || 10);
        setIsSolved(isAlreadyDone);
        setShowSolvedOverlay(false);
        setIsAiThinking(false);
        setRevealedHint(null);
        setShowSettingsDropdown(false);
        setStatusMessage({
            type: 'info',
            text: endgame.target === 'win'
                ? 'Your goal: Find the winning technique and deliver checkmate!'
                : 'Your goal: Defend precisely and hold the theoretical draw!'
        });
        updateEvaluation(newGame.fen());
        setViewMode('arena');
        setSearchParams({ id: endgame.id });
    };

    // Return to catalog
    const handleReturnToCatalog = () => {
        if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
        pendingMoveRef.current = null;
        setPendingPromotion(null);
        setViewMode('catalog');
        setSearchParams({});
    };

    // Reset current position
    const handleResetPosition = useCallback((colorArg?: 'w' | 'b') => {
        if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
        const newGame = new Chess(fenForPlayer(activeEndgame.fen, colorArg ?? playerColor));
        setGame(newGame);
        gameRef.current = newGame;
        pendingMoveRef.current = null;
        setPendingPromotion(null);
        setMoveCount(0);
        setSelectedSquare(null);
        setLastMove(null);
        setCircledSquares([]);
        setIsSolved(false);
        setShowSolvedOverlay(false);
        setIsAiThinking(false);
        setRevealedHint(null);
        setStatusMessage({
            type: 'info',
            text: 'Position reset. Ready for another attempt!'
        });
        updateEvaluation(newGame.fen());
    }, [activeEndgame, playerColor, updateEvaluation]);

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
        setSelectedSquare(null);
        setLastMove(null);
        setCircledSquares([]);
        handleResetPosition(nextColor);
    };

    // Switch practice opponent (Maia bots or Stockfish)
    const handleOpponentChange = (opponent: PracticeOpponent) => {
        setSelectedOpponent(opponent);
        endgameEngine.setOpponent(opponent);
        try {
            localStorage.setItem('endgame_practice_opponent', opponent);
        } catch {}
        setShowSettingsDropdown(false);
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

    // Save drill completion rate directly to user's account
    const markSolved = useCallback((id: string) => {
        setDrillProgress((prev) => {
            const cur = prev[id] || 0;
            const targetEg = endgames.find(e => e.id === id);
            const max = targetEg?.totalDrills || 10;
            const next = Math.min(max, cur + 1);
            const updated = { ...prev, [id]: next };
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
    }, [endgames, storageKey]);

    // Check end condition
    const evaluateEndCondition = useCallback((currentGame: Chess) => {
        if (currentGame.isCheckmate()) {
            const winner = currentGame.turn() === 'w' ? 'b' : 'w';
            if (winner === playerColor) {
                if (!isSoundMuted) playWinSound();
                setIsSolved(true);
                setShowSolvedOverlay(true);
                markSolved(activeEndgame.id);
                setStatusMessage({
                    type: 'celebrate',
                    text: 'Victory! Flawless checkmate execution.'
                });
            } else {
                if (!isSoundMuted) playLoseSound();
                setStatusMessage({
                    type: 'error',
                    text: 'Defeat. The opponent delivered checkmate. Reset and try again!'
                });
            }
            return true;
        }

        if (currentGame.isDraw()) {
            if (activeEndgame.target === 'draw') {
                if (!isSoundMuted) playWinSound();
                setIsSolved(true);
                setShowSolvedOverlay(true);
                markSolved(activeEndgame.id);
                setStatusMessage({
                    type: 'celebrate',
                    text: 'Draw secured! Masterful defensive technique.'
                });
            } else {
                if (!isSoundMuted) playLoseSound();
                setStatusMessage({
                    type: 'error',
                    text: 'Position is drawn (Stalemate / 50-move rule). Goal was to win.'
                });
            }
            return true;
        }

        return false;
    }, [activeEndgame, isSoundMuted, markSolved, playerColor]);

    // AI Move Trigger
    const triggerAiResponse = useCallback((currentGame: Chess) => {
        if (currentGame.isGameOver()) return;
        setIsAiThinking(true);

        aiTimerRef.current = window.setTimeout(async () => {
            try {
                const fen = currentGame.fen();
                const isDefender = activeEndgame.target === 'win';
                const recommendation = await endgameEngine.getBestMove(fen, isDefender);

                {
                    const gameCopy = new Chess(currentGame.fen());
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

                        setGame(gameCopy);
                        gameRef.current = gameCopy;
                        setLastMove({ from: move.from, to: move.to });
                        updateEvaluation(gameCopy.fen());

                        // Preserve player's selected piece if it is still on the board and belongs to the player
                        setSelectedSquare((prevSelected) => {
                            if (!prevSelected) return null;
                            const piece = gameCopy.get(prevSelected as any);
                            return (piece && piece.color === playerColor) ? prevSelected : null;
                        });

                        const gameOver = evaluateEndCondition(gameCopy);
                        if (!gameOver) {
                            const oppName = OPPONENT_PRESETS[selectedOpponent]?.name || 'Opponent';
                            const neuralTag = recommendation?.isNeural ? ' (Neural ONNX)' : '';
                            setStatusMessage({
                                type: 'info',
                                text: `${oppName}${neuralTag} played ${move.san}. Your turn!`
                            });

                            // If player queued a move while opponent was calculating, execute it now!
                            if (pendingMoveRef.current) {
                                const pending = pendingMoveRef.current;
                                pendingMoveRef.current = null;
                                // Clear AI thinking flag so executeMove will run the move immediately
                                setIsAiThinking(false);
                                if (!pending.promotion && isPromotionMove(gameCopy, pending.from, pending.to)) {
                                    setPendingPromotion({
                                        from: pending.from,
                                        to: pending.to,
                                        color: playerColor
                                    });
                                } else {
                                    // Execute the queued move (including promotion if needed)
                                    executeMoveRef.current(pending.from, pending.to, pending.promotion);
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('AI Move Error:', err);
            } finally {
                setIsAiThinking(false);
            }
        }, 400);
    }, [activeEndgame, evaluateEndCondition, isSoundMuted, playerColor, selectedOpponent, updateEvaluation]);

    // Safety net: whenever it is not the player's turn, the opponent replies immediately
    useEffect(() => {
        if (viewMode !== 'arena' || isSolved || isAiThinking) return;
        if (game.isGameOver() || game.turn() === playerColor) return;
        triggerAiResponse(game);
    }, [game, isAiThinking, isSolved, playerColor, triggerAiResponse, viewMode]);

    // Shared move executor for Click-to-Move and Drag-and-Drop
    const executeMove = useCallback((sourceSquare: string, targetSquare: string, chosenPromotion?: string): boolean => {
        if (isSolved) return false;

        const currentGame = gameRef.current;

        // If opponent is currently calculating or it's not the player's turn:
        // Queue the move (premove) so it executes as soon as the opponent move lands!
        if (isAiThinking || currentGame.turn() !== playerColor) {
            const movingPiece = currentGame.get(sourceSquare as any);
            if (movingPiece && movingPiece.color === playerColor) {
                pendingMoveRef.current = { from: sourceSquare, to: targetSquare, promotion: chosenPromotion };
                setSelectedSquare(sourceSquare);
                setStatusMessage({
                    type: 'info',
                    text: 'Move queued. Executing as soon as opponent moves...'
                });
                return true;
            }
            return false;
        }

        // Check if this is a pawn promotion and user hasn't selected a piece yet
        if (!chosenPromotion && isPromotionMove(currentGame, sourceSquare, targetSquare)) {
            setPendingPromotion({
                from: sourceSquare,
                to: targetSquare,
                color: playerColor
            });
            setSelectedSquare(sourceSquare);
            return false;
        }

        try {
            const gameCopy = new Chess(currentGame.fen());
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
            setSelectedSquare(null);
            pendingMoveRef.current = null;
            updateEvaluation(gameCopy.fen());

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
    }, [evaluateEndCondition, isAiThinking, isSolved, isSoundMuted, playerColor, selectedOpponent, triggerAiResponse, updateEvaluation]);

    useEffect(() => {
        executeMoveRef.current = executeMove;
    }, [executeMove]);

    // Promotion selection handlers
    const handleSelectPromotion = useCallback((promoPiece: 'q' | 'r' | 'b' | 'n') => {
        if (!pendingPromotion) return;
        const { from, to } = pendingPromotion;
        setPendingPromotion(null);
        executeMove(from, to, promoPiece);
    }, [executeMove, pendingPromotion]);

    const handleCancelPromotion = useCallback(() => {
        setPendingPromotion(null);
        setSelectedSquare(null);
    }, []);

    // Keyboard shortcuts for promotion selection
    useEffect(() => {
        if (!pendingPromotion) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (key === 'q' || key === '1') {
                e.preventDefault();
                handleSelectPromotion('q');
            } else if (key === 'r' || key === '2') {
                e.preventDefault();
                handleSelectPromotion('r');
            } else if (key === 'b' || key === '3') {
                e.preventDefault();
                handleSelectPromotion('b');
            } else if (key === 'n' || key === '4') {
                e.preventDefault();
                handleSelectPromotion('n');
            } else if (key === 'escape') {
                e.preventDefault();
                handleCancelPromotion();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pendingPromotion, handleSelectPromotion, handleCancelPromotion]);

    // Click handler for Click-to-Move (clicking piece then clicking target square)
    const handleSquareOrPieceClick = useCallback((square: string) => {
        // Left click removes all circled squares
        setCircledSquares([]);
        if (isSolved) return;

        const currentGame = gameRef.current;

        if (selectedSquare) {
            // Clicking the same square toggles/deselects
            if (square === selectedSquare) {
                setSelectedSquare(null);
                pendingMoveRef.current = null;
                return;
            }

            // Clicking another friendly piece switches selection
            const pieceOnSquare = currentGame.get(square as any);
            if (pieceOnSquare && pieceOnSquare.color === playerColor) {
                setSelectedSquare(square);
                pendingMoveRef.current = null;
                return;
            }

            // If opponent is calculating or not player's turn, queue move
            if (isAiThinking || currentGame.turn() !== playerColor) {
                executeMove(selectedSquare, square);
                return;
            }

            // Check if the destination is a legal move
            const legalMoves = currentGame.moves({ square: selectedSquare as any, verbose: true });
            const isLegal = legalMoves.some((m) => m.to === square);

            if (isLegal) {
                executeMove(selectedSquare, square);
            } else {
                setSelectedSquare(null);
            }
            return;
        }

        // No piece selected: allow selecting if square contains the player's piece (even during opponent move!)
        const pieceOnSquare = currentGame.get(square as any);
        if (pieceOnSquare && pieceOnSquare.color === playerColor) {
            setSelectedSquare(square);
        }
    }, [executeMove, isAiThinking, isSolved, playerColor, selectedSquare]);

    // Piece drag handler to immediately show legal moves while dragging
    const onPieceDrag = useCallback(({ square }: { square: string | null; isSparePiece?: boolean; piece?: any }) => {
        setCircledSquares([]);
        if (!square || isSolved) return;
        const currentGame = gameRef.current;
        const pieceOnSquare = currentGame.get(square as any);
        if (pieceOnSquare && pieceOnSquare.color === playerColor) {
            setSelectedSquare(square);
        }
    }, [isSolved, playerColor]);

    // Drop piece handler for Drag-and-Drop
    const onPieceDrop = useCallback(({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }): boolean => {
        setCircledSquares([]);
        if (!targetSquare || isSolved) {
            setSelectedSquare(null);
            return false;
        }
        const success = executeMove(sourceSquare, targetSquare);
        if (!isAiThinking) {
            setSelectedSquare(null);
        }
        return success;
    }, [executeMove, isAiThinking, isSolved]);

    // Right-click square handler to toggle circle on/off
    const handleSquareRightClick = useCallback((square: string) => {
        setCircledSquares((prev) =>
            prev.includes(square) ? prev.filter((s) => s !== square) : [...prev, square]
        );
    }, []);

    // Dynamic square styles: Last move + Right-click circles + Selected piece + ONLY its current legal moves
    const squareStyles = useMemo(() => {
        const styles: Record<string, CSSProperties> = {};

        // 1. Previous move highlight (lastMove from and to)
        if (lastMove) {
            styles[lastMove.from] = {
                backgroundColor: 'rgba(205, 210, 106, 0.45)'
            };
            styles[lastMove.to] = {
                backgroundColor: 'rgba(205, 210, 106, 0.45)'
            };
        }

        // 2. Right-click circled squares (toggleable circles)
        circledSquares.forEach((sq) => {
            const existingBg = styles[sq]?.backgroundColor || 'transparent';
            styles[sq] = {
                ...styles[sq],
                background: `radial-gradient(circle, transparent 58%, rgba(235, 87, 87, 0.85) 59%, rgba(235, 87, 87, 0.85) 78%, transparent 79%), ${existingBg}`
            };
        });

        // 3. Currently selected piece and ONLY its current legal moves
        if (selectedSquare) {
            styles[selectedSquare] = {
                backgroundColor: 'rgba(92, 140, 92, 0.6)'
            };

            try {
                const legalMoves = game.moves({ square: selectedSquare as any, verbose: true });
                legalMoves.forEach((move) => {
                    const isCapture = move.captured || Boolean(game.get(move.to as any)) || move.flags.includes('e');
                    if (isCapture) {
                        styles[move.to] = {
                            background: 'radial-gradient(circle, transparent 52%, rgba(82, 116, 68, 0.6) 53%, rgba(82, 116, 68, 0.6) 72%, transparent 73%)',
                            cursor: 'pointer'
                        };
                    } else {
                        styles[move.to] = {
                            background: 'radial-gradient(circle, rgba(92, 126, 78, 0.65) 19%, transparent 20%)',
                            cursor: 'pointer'
                        };
                    }
                });
            } catch (e) {
                console.error('Error generating legal moves:', e);
            }
        }

        return styles;
    }, [game, selectedSquare, lastMove, circledSquares]);

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
                                        {progressStats.completedDrills} / {progressStats.totalDrills} <span className="text-xs font-bold text-plum/60">Drills ({progressStats.percent}%)</span>
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

                        {/* Endgame Sections Ordered by Type */}
                        <div className="space-y-8 pb-12">
                            {orderedCategoryKeys.map((catKey) => {
                                const items = filteredCategorizedEndgames[catKey];
                                if (!items || items.length === 0) return null;

                                // Format category title with spaced out letters: P A W N   E N D G A M E S
                                const spacedTitle = catKey.toUpperCase().split('').join(' ');

                                return (
                                    <div key={catKey} className="space-y-4">
                                        {/* Centered Spaced Section Header in ChessParfait brand styling */}
                                        <h2 className="text-center font-serif font-black text-sm md:text-base tracking-[0.25em] text-plum uppercase select-none pt-4 pb-1">
                                            {spacedTitle}
                                        </h2>

                                        {/* 2-Column Cards Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {items.map((endgame) => {
                                                const completed = drillProgress[endgame.id] || 0;
                                                const total = endgame.totalDrills || 10;
                                                const hasProgress = completed > 0;

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
                                                                {completed} / {total}
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
                                <button
                                    onClick={handleReturnToCatalog}
                                    className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-plum px-2.5 py-1.5 rounded-lg hover:bg-slate-200/70 transition-colors"
                                    title="Back to Endgame Selector"
                                >
                                    <ArrowLeft size={14} />
                                    <span>All Endgames</span>
                                </button>
                                <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                    {progressStats.completedDrills}/{progressStats.totalDrills}
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
                                                    const drillsDone = drillProgress[item.id] || 0;
                                                    const isItemSolved = drillsDone >= (item.totalDrills || 10);

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
                                                                {drillsDone}/{item.totalDrills || 10}
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
                                Drill Progress: {drillProgress[activeEndgame.id] || 0} / {activeEndgame.totalDrills || 10}
                            </span>
                        </div>

                        {/* Opponent Match Bar */}
                        <div className="w-full max-w-[min(100%,calc(100dvh-300px),540px)] md:max-w-[min(calc(100vh-175px),calc(100vw-680px),540px)] mb-2 px-1 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowOpponentModal(true)}
                                    className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border border-slate-200 bg-white hover:border-berry/40 hover:shadow-xs transition-all text-xs font-bold text-slate-700 group cursor-pointer"
                                    title="Choose practice opponent (Maia bots or Stockfish)"
                                >
                                    <span className="text-sm">{OPPONENT_PRESETS[selectedOpponent].icon}</span>
                                    <span className="font-black text-slate-800 group-hover:text-berry transition-colors">
                                        {OPPONENT_PRESETS[selectedOpponent].name}
                                    </span>
                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${OPPONENT_PRESETS[selectedOpponent].badgeColor}`}>
                                        {OPPONENT_PRESETS[selectedOpponent].elo} ELO
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
                                <button
                                    onClick={handleToggleColor}
                                    className="font-black text-plum hover:text-berry transition-colors capitalize cursor-pointer px-1.5 py-0.5 rounded hover:bg-slate-200/60"
                                    title="Click to flip playing color"
                                >
                                    {playerColor === 'w' ? 'White' : 'Black'}
                                </button>
                            </div>
                        </div>

                        {/* Chessboard Container - fits completely on one screen */}
                        <div className="w-full max-w-[min(100%,calc(100dvh-300px),540px)] md:max-w-[min(calc(100vh-175px),calc(100vw-680px),540px)] aspect-square relative flex items-center justify-center">
                            <div
                                className="w-full h-full rounded-xl overflow-hidden shadow-xl border-2 border-slate-300/80 bg-white select-none touch-none relative"
                                onContextMenu={(e) => e.preventDefault()}
                                onClick={() => setCircledSquares([])}
                            >
                                <Chessboard
                                    options={{
                                        position: game.fen(),
                                        boardOrientation: playerColor === 'w' ? 'white' : 'black',
                                        canDragPiece: ({ piece }: any) => {
                                            if (isSolved) return false;
                                            const pieceColor = piece?.pieceType?.[0] || piece?.color;
                                            return pieceColor === playerColor;
                                        },
                                        onPieceDrop: onPieceDrop,
                                        onPieceDrag: onPieceDrag,
                                        onPieceClick: ({ square }: any) => handleSquareOrPieceClick(square),
                                        onSquareClick: ({ square }: any) => handleSquareOrPieceClick(square),
                                        onSquareRightClick: ({ square }: any) => handleSquareRightClick(square),
                                        squareStyles: squareStyles,
                                        darkSquareStyle: { backgroundColor: '#b58863' },
                                        lightSquareStyle: { backgroundColor: '#f0d9b5' },
                                        allowDrawingArrows: true,
                                        clearArrowsOnClick: true,
                                        arrowOptions: customArrowOptions,
                                        alphaNotationStyle: {
                                            fontSize: '9.5px',
                                            fontWeight: 'bold',
                                            lineHeight: 1,
                                            bottom: 2,
                                            right: 3,
                                            zIndex: 15,
                                            pointerEvents: 'none',
                                            userSelect: 'none'
                                        },
                                        numericNotationStyle: {
                                            fontSize: '9.5px',
                                            fontWeight: 'bold',
                                            lineHeight: 1,
                                            top: 2,
                                            left: 3,
                                            zIndex: 15,
                                            pointerEvents: 'none',
                                            userSelect: 'none'
                                        },
                                        animationDurationInMs: 180
                                    }}
                                />

                                {/* Promotion Piece Selector Modal */}
                                {pendingPromotion && (
                                    <div className="absolute inset-0 bg-slate-900/65 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
                                        <div className="bg-[#FAF1DB] border-2 border-plum/20 rounded-2xl shadow-2xl p-5 max-w-xs sm:max-w-sm w-full mx-auto text-center space-y-3.5 animate-in zoom-in-95 duration-150">
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-plum/60 font-mono">
                                                    Pawn Promotion
                                                </div>
                                                <h3 className="font-serif font-black text-xl text-plum mt-0.5">
                                                    Choose Promotion Piece
                                                </h3>
                                                <p className="text-xs text-plum/70 font-medium mt-0.5">
                                                    Click piece or press <kbd className="font-mono bg-white/70 px-1 py-0.5 rounded border border-plum/20 text-[10px]">Q</kbd> <kbd className="font-mono bg-white/70 px-1 py-0.5 rounded border border-plum/20 text-[10px]">R</kbd> <kbd className="font-mono bg-white/70 px-1 py-0.5 rounded border border-plum/20 text-[10px]">B</kbd> <kbd className="font-mono bg-white/70 px-1 py-0.5 rounded border border-plum/20 text-[10px]">N</kbd>
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-4 gap-2 pt-1">
                                                {[
                                                    { type: 'q' as const, name: 'Queen', key: 'Q', score: 'Q' },
                                                    { type: 'r' as const, name: 'Rook', key: 'R', score: 'R' },
                                                    { type: 'b' as const, name: 'Bishop', key: 'B', score: 'B' },
                                                    { type: 'n' as const, name: 'Knight', key: 'N', score: 'N' }
                                                ].map((item) => {
                                                    const pieceCode = `${pendingPromotion.color}${item.type.toUpperCase()}`;
                                                    const PieceSvg = (defaultPieces as any)[pieceCode];

                                                    return (
                                                        <button
                                                            key={item.type}
                                                            onClick={() => handleSelectPromotion(item.type)}
                                                            className="group flex flex-col items-center justify-center p-2 rounded-xl bg-white border-2 border-plum/15 hover:border-berry hover:bg-berry/5 hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer"
                                                        >
                                                            <div className="w-11 h-11 flex items-center justify-center">
                                                                {PieceSvg ? (
                                                                    <PieceSvg svgStyle={{ width: 42, height: 42 }} />
                                                                ) : (
                                                                    <span className="text-3xl">{item.score}</span>
                                                                )}
                                                            </div>
                                                            <span className="text-xs font-black text-plum group-hover:text-berry mt-1">
                                                                {item.name}
                                                            </span>
                                                            <span className="text-[10px] font-mono text-slate-400 font-bold">
                                                                [{item.key}]
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <div className="pt-1 flex justify-center">
                                                <button
                                                    onClick={handleCancelPromotion}
                                                    className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors py-1.5 px-4 rounded-lg hover:bg-black/5 cursor-pointer"
                                                >
                                                    Cancel Move
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Solved Celebration Overlay */}
                                {showSolvedOverlay && (
                                    <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-[2px] z-40 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                                        <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-3 shadow-xl animate-in zoom-in-75 duration-260">
                                            <PartyPopper size={28} />
                                        </div>
                                        <h3 className="font-serif font-black text-2xl text-white mb-1">Target Achieved!</h3>
                                        <p className="text-emerald-200 text-xs font-bold uppercase tracking-wider mb-4">
                                            {activeEndgame.target === 'win' ? 'Checkmate Delivered' : 'Draw Successfully Held'}
                                        </p>
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
                            </div>
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
                            <div className="grid grid-cols-4 gap-1.5">
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
                                <button
                                    onClick={() => setShowOpponentModal(true)}
                                    className="flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl bg-white border border-slate-200 text-slate-700 text-[10px] font-black active:scale-95 transition-transform"
                                >
                                    <Settings size={16} />
                                    <span>Opponent</span>
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
                                <Link
                                    to={`/EndgameStrategy?endgame=${activeEndgame.id}&returnId=${activeEndgame.id}`}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-berry transition-colors"
                                    title="Open Strategy Diagrams"
                                >
                                    <BookOpen size={17} />
                                </Link>
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
                                    {activeEndgame.target === 'win'
                                        ? 'Convert the advantage and force checkmate.'
                                        : 'Hold the theoretical draw against the engine.'}
                                </p>
                            </div>

                            {/* Opponent Selection Card */}
                            <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                                        Opponent
                                    </span>
                                    <button
                                        onClick={() => setShowOpponentModal(true)}
                                        className="text-[10px] font-black text-berry hover:underline uppercase tracking-wide cursor-pointer"
                                    >
                                        Change
                                    </button>
                                </div>
                                <button
                                    onClick={() => setShowOpponentModal(true)}
                                    className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-berry/40 bg-slate-50/70 hover:bg-slate-50 transition-all flex items-center justify-between text-left cursor-pointer group"
                                    title="Choose practice opponent"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm border shrink-0 ${OPPONENT_PRESETS[selectedOpponent].avatarBg}`}>
                                            {OPPONENT_PRESETS[selectedOpponent].icon}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-xs font-black text-slate-800 group-hover:text-berry transition-colors flex items-center gap-1.5">
                                                <span>{OPPONENT_PRESETS[selectedOpponent].name}</span>
                                                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${OPPONENT_PRESETS[selectedOpponent].badgeColor}`}>
                                                    {OPPONENT_PRESETS[selectedOpponent].elo}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-slate-500 truncate">
                                                {OPPONENT_PRESETS[selectedOpponent].title}
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-400 group-hover:text-berry group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                                </button>
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
                            {/* Settings Dropdown Popup */}
                            {showSettingsDropdown && (
                                <div className="absolute bottom-16 left-3 right-3 bg-white border-2 border-slate-200 rounded-2xl p-3 shadow-xl z-50 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs font-black text-slate-700 uppercase tracking-wider">
                                            Select Opponent
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400">
                                            Maia & Stockfish
                                        </span>
                                    </div>
                                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                                        {(Object.keys(OPPONENT_PRESETS) as PracticeOpponent[]).map((oppId) => {
                                            const opp = OPPONENT_PRESETS[oppId];
                                            const isSelected = selectedOpponent === oppId;
                                            return (
                                                <button
                                                    key={oppId}
                                                    onClick={() => handleOpponentChange(oppId)}
                                                    className={`w-full p-2 rounded-xl text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-berry text-white shadow-xs font-bold'
                                                            : 'hover:bg-slate-100 text-slate-700'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="text-base shrink-0">{opp.icon}</span>
                                                        <div className="min-w-0">
                                                            <div className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                                                {opp.name}
                                                            </div>
                                                            <div className={`text-[10px] truncate ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                                                                {opp.title}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                                                        isSelected ? 'bg-white/20 border-white/30 text-white' : opp.badgeColor
                                                    }`}>
                                                        {opp.elo}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

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
                                    onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                                    className={`p-2.5 rounded-xl transition-colors ${
                                        showSettingsDropdown ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-100 hover:text-slate-800'
                                    }`}
                                    title="Engine Settings"
                                >
                                    <Settings size={17} />
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
                        <div className="p-5 overflow-y-auto space-y-3">
                            {(Object.keys(OPPONENT_PRESETS) as PracticeOpponent[]).map((oppId) => {
                                const opp = OPPONENT_PRESETS[oppId];
                                const isSelected = selectedOpponent === oppId;
                                return (
                                    <button
                                        key={oppId}
                                        onClick={() => handleOpponentChange(oppId)}
                                        className={`w-full p-4 rounded-2xl border-2 transition-all flex items-start justify-between text-left cursor-pointer group ${
                                            isSelected
                                                ? 'border-berry bg-berry/5 shadow-xs'
                                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3.5 min-w-0 pr-2">
                                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl border shrink-0 shadow-2xs ${opp.avatarBg}`}>
                                                {opp.icon}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-black text-slate-800 text-sm group-hover:text-berry transition-colors">
                                                        {opp.name}
                                                    </span>
                                                    <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border ${opp.badgeColor}`}>
                                                        {opp.elo} ELO
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

                                        <div className="shrink-0 pt-0.5">
                                            {isSelected ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-black text-berry bg-berry/10 px-2.5 py-1 rounded-xl">
                                                    <CheckCircle2 size={13} />
                                                    Active
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
                            <span>Preferences are saved automatically.</span>
                            <button
                                onClick={() => setShowOpponentModal(false)}
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
