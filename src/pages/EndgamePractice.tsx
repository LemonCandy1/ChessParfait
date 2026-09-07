import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard, defaultArrowOptions } from 'react-chessboard';
import {
    RotateCcw,
    Sparkles,
    CheckCircle2,
    HelpCircle,
    PartyPopper,
    BookOpen,
    ArrowRight,
    Compass,
    Settings,
    Volume2,
    VolumeX,
    Maximize2,
    Eye,
    Bot,
    Bell,
    Check,
    PanelLeftClose,
    PanelLeftOpen,
    Star,
    Layers,
    Lightbulb
} from 'lucide-react';
import Navbar from '../components/Navbar/Navbar';
import { playMoveSound, playCaptureSound, playWinSound, playLoseSound } from '../lib/soundEffects';
import endgamesData from '../data/endgames.json';
import { endgameEngine, type EngineDefenseMode } from '../lib/stockfishEngine';
import EndgameStrategyModal from '../components/EndgameStrategyModal';

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
    fen: string;
    playerColor: 'w' | 'b';
    target: 'win' | 'draw';
    difficulty: 'Piece of Cake' | 'Hard Tart' | 'Cherry Bomb';
    description: string;
    theoryNotes: string;
    keyTip: string;
}

export default function EndgamePractice() {
    const endgames = endgamesData as EndgamePosition[];

    // Active endgame selection (defaults to first endgame)
    const [activeEndgame, setActiveEndgame] = useState<EndgamePosition>(endgames[0]);
    const [game, setGame] = useState<Chess>(() => new Chess(endgames[0].fen));
    const [playerColor, setPlayerColor] = useState<'w' | 'b'>(endgames[0].playerColor);
    const [defenseMode, setDefenseMode] = useState<EngineDefenseMode>('tablebase_stubborn');
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [liveEval, setLiveEval] = useState<string>('Calculating...');
    const [statusMessage, setStatusMessage] = useState<{ type: 'info' | 'success' | 'error' | 'celebrate'; text: string }>({
        type: 'info',
        text: 'Make your move to begin endgame calculation.'
    });
    const [moveCount, setMoveCount] = useState(0);
    const [isSolved, setIsSolved] = useState(false);
    const [showSolvedOverlay, setShowSolvedOverlay] = useState(false);

    // Layout states
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState<'learn' | 'review'>('learn');
    const [showStrategyModal, setShowStrategyModal] = useState(false);
    const [isSoundMuted, setIsSoundMuted] = useState(false);
    const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
    const [revealedHint, setRevealedHint] = useState<string | null>(null);

    // Solved & Ratings persistence
    const [solvedIds, setSolvedIds] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('chessparfait_solved_endgames');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [userRatings, setUserRatings] = useState<Record<string, number>>(() => {
        try {
            const saved = localStorage.getItem('chessparfait_endgame_ratings');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    const aiTimerRef = useRef<number | null>(null);

    // Group endgames by category
    const categorizedEndgames = useMemo(() => {
        const groups: Record<string, EndgamePosition[]> = {};
        endgames.forEach((eg) => {
            if (!groups[eg.category]) groups[eg.category] = [];
            groups[eg.category].push(eg);
        });
        return groups;
    }, [endgames]);

    // Categories list
    const categories = useMemo(() => Object.keys(categorizedEndgames), [categorizedEndgames]);

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
        updateEvaluation(activeEndgame.fen);
    }, [activeEndgame, updateEvaluation]);

    // Select position
    const handleSelectEndgame = (endgame: EndgamePosition) => {
        if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
        setActiveEndgame(endgame);
        setPlayerColor(endgame.playerColor);
        const newGame = new Chess(endgame.fen);
        setGame(newGame);
        setMoveCount(0);
        setIsSolved(solvedIds.includes(endgame.id));
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
        updateEvaluation(endgame.fen);
    };

    // Reset current position
    const handleResetPosition = useCallback(() => {
        if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
        const newGame = new Chess(activeEndgame.fen);
        setGame(newGame);
        setMoveCount(0);
        setIsSolved(false);
        setShowSolvedOverlay(false);
        setIsAiThinking(false);
        setRevealedHint(null);
        setStatusMessage({
            type: 'info',
            text: 'Position reset. Ready for another attempt!'
        });
        updateEvaluation(activeEndgame.fen);
    }, [activeEndgame, updateEvaluation]);

    // Load position from strategy guide diagrams
    const handleLoadGuidePosition = (fen: string, color: 'w' | 'b', title: string) => {
        if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
        const newEndgame: EndgamePosition = {
            ...activeEndgame,
            title: title,
            fen,
            playerColor: color,
            description: `Practice variation: ${title}`,
        };
        setActiveEndgame(newEndgame);
        setPlayerColor(color);
        const newGame = new Chess(fen);
        setGame(newGame);
        setMoveCount(0);
        setIsSolved(false);
        setShowSolvedOverlay(false);
        setIsAiThinking(false);
        setRevealedHint(null);
        setStatusMessage({
            type: 'info',
            text: `Position loaded: ${title}. ${newGame.turn() === color ? 'Your turn!' : 'Opponent is calculating defense...'}`
        });
        updateEvaluation(fen);
        if (newGame.turn() !== color) {
            triggerAiResponse(newGame);
        }
    };

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
        handleResetPosition();
    };

    // Switch defense mode
    const handleDefenseModeChange = (mode: EngineDefenseMode) => {
        setDefenseMode(mode);
        endgameEngine.setMode(mode);
        setShowSettingsDropdown(false);
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

    // Mark endgame solved
    const markSolved = useCallback((id: string) => {
        setSolvedIds((prev) => {
            if (prev.includes(id)) return prev;
            const updated = [...prev, id];
            try {
                localStorage.setItem('chessparfait_solved_endgames', JSON.stringify(updated));
            } catch {}
            return updated;
        });
    }, []);

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

                if (recommendation) {
                    const gameCopy = new Chess(currentGame.fen());
                    const move = gameCopy.move({
                        from: recommendation.from,
                        to: recommendation.to,
                        promotion: recommendation.promotion || 'q'
                    }) || gameCopy.move(recommendation.san);

                    if (move) {
                        if (!isSoundMuted) {
                            if (move.captured) playCaptureSound();
                            else playMoveSound();
                        }

                        setGame(gameCopy);
                        updateEvaluation(gameCopy.fen());

                        const gameOver = evaluateEndCondition(gameCopy);
                        if (!gameOver) {
                            setStatusMessage({
                                type: 'info',
                                text: `Opponent played ${move.san}. Your turn!`
                            });
                        }
                    }
                }
            } catch (err) {
                console.error('AI Move Error:', err);
            } finally {
                setIsAiThinking(false);
            }
        }, 400);
    }, [activeEndgame, evaluateEndCondition, isSoundMuted, updateEvaluation]);

    // Drop piece handler
    const onDrop = ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
        if (!targetSquare || isAiThinking || isSolved) return false;
        if (game.turn() !== playerColor) return false;

        try {
            const gameCopy = new Chess(game.fen());
            const move = gameCopy.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q'
            });

            if (move === null) return false;

            if (!isSoundMuted) {
                if (move.captured) playCaptureSound();
                else playMoveSound();
            }

            setGame(gameCopy);
            setMoveCount((prev) => prev + 1);
            updateEvaluation(gameCopy.fen());

            const isEnd = evaluateEndCondition(gameCopy);
            if (!isEnd) {
                setStatusMessage({
                    type: 'info',
                    text: 'Good move! Opponent is calculating defense...'
                });
                triggerAiResponse(gameCopy);
            }

            return true;
        } catch {
            return false;
        }
    };

    // Current endgame rating
    const currentRating = userRatings[activeEndgame.id] || 5;

    // Filter endgames for Review tab
    const displayedEndgames = activeTab === 'review'
        ? endgames.filter((e) => solvedIds.includes(e.id))
        : endgames;

    return (
        <div className="h-screen flex flex-col bg-[#FAF1DB] font-sans text-plum overflow-hidden">
            {/* Top Navbar */}
            <Navbar />

            {/* Main Single-Screen 3-Column Arena */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative bg-[#FAF1DB]">
                
                {/* ── LEFT COLUMN: Endgames List & Course Hierarchy ── */}
                <aside
                    className={`shrink-0 border-r-2 border-plum/15 bg-white flex flex-col h-full overflow-hidden transition-all duration-300 z-20 ${
                        isSidebarCollapsed ? 'w-14' : 'w-full md:w-[280px] lg:w-[320px]'
                    }`}
                >
                    {/* Sidebar Tabs (Learn / Review) */}
                    <div className="flex items-center border-b-2 border-plum/10 bg-white">
                        {!isSidebarCollapsed ? (
                            <>
                                <button
                                    onClick={() => setActiveTab('learn')}
                                    className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all text-center relative ${
                                        activeTab === 'learn'
                                            ? 'text-[#0284c7] font-black'
                                            : 'text-plum/50 hover:text-plum'
                                    }`}
                                >
                                    Learn
                                    {activeTab === 'learn' && (
                                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0284c7]" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('review')}
                                    className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all text-center flex items-center justify-center gap-1.5 relative ${
                                        activeTab === 'review'
                                            ? 'text-[#0284c7] font-black'
                                            : 'text-plum/50 hover:text-plum'
                                    }`}
                                >
                                    <span>Review</span>
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold border border-slate-200">
                                        {solvedIds.length}
                                    </span>
                                    {activeTab === 'review' && (
                                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0284c7]" />
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
                        <>
                            {/* Course / Arena Header Card */}
                            <div className="p-3.5 border-b border-plum/10 bg-slate-50/60 flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-berry to-plum text-white flex items-center justify-center font-black shadow-sm shrink-0">
                                    <Layers size={20} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-serif font-black text-xs text-plum truncate leading-tight">
                                        Endgame Arena: GM Technique
                                    </h3>
                                    <p className="text-[10px] text-plum/60 font-medium truncate mt-0.5">
                                        Tablebases & Grandmaster Theory
                                    </p>
                                </div>
                            </div>

                            {/* Scrollable Chapter & Exercises List */}
                            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 select-none">
                                {categories.map((category) => {
                                    const items = (activeTab === 'review'
                                        ? categorizedEndgames[category].filter((e) => solvedIds.includes(e.id))
                                        : categorizedEndgames[category]) || [];

                                    if (items.length === 0 && activeTab === 'review') return null;

                                    const totalCategoryItems = categorizedEndgames[category].length;
                                    const solvedCategoryItems = categorizedEndgames[category].filter((e) => solvedIds.includes(e.id)).length;
                                    const categoryPercent = totalCategoryItems > 0
                                        ? Math.round((solvedCategoryItems / totalCategoryItems) * 100)
                                        : 0;

                                    return (
                                        <div key={category} className="space-y-1.5">
                                            {/* Chapter / Category Header */}
                                            <div className="flex items-center justify-between px-2.5 py-1 text-slate-700">
                                                <span className="font-bold text-xs tracking-tight">
                                                    {category}
                                                </span>
                                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full border ${
                                                    categoryPercent === 100
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                                }`}>
                                                    {categoryPercent}%
                                                </span>
                                            </div>

                                            {/* Vertical Timeline Items */}
                                            <div className="space-y-0.5 relative pl-2">
                                                {/* Connecting timeline dotted line */}
                                                <div className="absolute left-[19px] top-3 bottom-3 w-0.5 border-l-2 border-dotted border-slate-300 z-0" />

                                                {items.map((endgame) => {
                                                    const isActive = activeEndgame.id === endgame.id;
                                                    const isItemSolved = solvedIds.includes(endgame.id);

                                                    return (
                                                        <button
                                                            key={endgame.id}
                                                            onClick={() => handleSelectEndgame(endgame)}
                                                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all relative z-10 ${
                                                                isActive
                                                                    ? 'bg-[#0085ff] text-white font-black shadow-sm'
                                                                    : 'hover:bg-slate-100/90 text-slate-700 font-medium'
                                                            }`}
                                                        >
                                                            {/* Checkpoint Dot */}
                                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] transition-all ${
                                                                isActive
                                                                    ? 'bg-white text-[#0085ff] shadow'
                                                                    : isItemSolved
                                                                        ? 'bg-[#0085ff] text-white shadow-xs'
                                                                        : 'border-2 border-slate-300 bg-white'
                                                            }`}>
                                                                {(isActive || isItemSolved) ? <Check size={11} strokeWidth={3.5} /> : null}
                                                            </div>

                                                            {/* Title */}
                                                            <span className="text-xs truncate flex-1 leading-snug">
                                                                {endgame.title}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}

                                {activeTab === 'review' && displayedEndgames.length === 0 && (
                                    <div className="p-6 text-center text-slate-400 space-y-2">
                                        <p className="text-xs font-bold">No completed endgames to review yet.</p>
                                        <p className="text-[11px]">Solve endgames in the Learn tab to build your review deck!</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </aside>

                {/* ── CENTER COLUMN: Centered Chessboard ── */}
                <main className="flex-1 flex flex-col items-center justify-center p-2 md:p-3 relative h-full min-w-0 bg-[#f8fafc] overflow-hidden">
                    {/* Chessboard Container - tightly sized to maximize space without overflow */}
                    <div className="w-full max-w-[min(calc(100vh-175px),calc(100vw-680px),540px)] aspect-square relative flex items-center justify-center">
                        <div
                            className="w-full h-full rounded-xl overflow-hidden shadow-xl border-2 border-slate-300/80 bg-white select-none relative"
                            onContextMenu={(e) => e.preventDefault()}
                        >
                            <Chessboard
                                options={{
                                    position: game.fen(),
                                    boardOrientation: playerColor === 'w' ? 'white' : 'black',
                                    onPieceDrop: onDrop,
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

                            {/* Solved Celebration Overlay */}
                            {showSolvedOverlay && (
                                <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-[2px] z-40 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
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

                    {/* Bottom Status Bar Under Board (matching screenshot Hint & Turn Indicator) */}
                    <div className="w-full max-w-[min(calc(100vh-175px),calc(100vw-680px),540px)] flex items-center justify-between mt-2.5 px-2 py-1 text-slate-600 select-none">
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
                            <span className="text-xs font-black text-slate-700">
                                {isAiThinking
                                    ? 'Opponent Calculating...'
                                    : game.turn() === playerColor
                                        ? 'Your Move'
                                        : 'Opponent Turn'}
                            </span>
                        </div>

                        {/* Moves count */}
                        <span className="text-[11px] font-bold text-slate-500">
                            Moves: {moveCount}
                        </span>
                    </div>

                    {/* Hint reveal banner if active */}
                    {revealedHint && (
                        <div className="w-full max-w-[min(calc(100vh-175px),calc(100vw-680px),540px)] mt-1.5 p-2.5 rounded-xl bg-amber-50/95 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 shadow-sm animate-in fade-in duration-150">
                            <Lightbulb size={16} className="text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <span className="font-black">Key Hint: </span>
                                <span>{revealedHint}</span>
                            </div>
                        </div>
                    )}
                </main>

                {/* ── RIGHT COLUMN: Simple Explanations, Strategy Link & Toolbar ── */}
                <aside className="w-full md:w-[310px] lg:w-[350px] shrink-0 border-l-2 border-plum/15 bg-white flex flex-col h-full overflow-hidden justify-between z-20">
                    
                    {/* Header: Title and Book/Actions */}
                    <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h2 className="font-bold text-slate-900 text-sm md:text-base leading-snug">
                                {activeEndgame.title}
                            </h2>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-0.5 block">
                                {activeEndgame.category} • {activeEndgame.difficulty}
                            </span>
                        </div>

                        {/* Top Right Quick Actions */}
                        <div className="flex items-center gap-1 shrink-0 text-slate-400">
                            <button
                                onClick={() => setShowStrategyModal(true)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-berry transition-colors"
                                title="Open Strategy Diagrams"
                            >
                                <BookOpen size={17} />
                            </button>
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

                    {/* Explanations Body Content (Scrollable if height constrained) */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Simple Explanations (Crisp text matching screenshot) */}
                        <div className="space-y-2">
                            <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-normal">
                                {activeEndgame.description}
                            </p>
                        </div>

                        {/* Prominent "Learn Strategy" Button linking to Diagrams */}
                        <button
                            onClick={() => setShowStrategyModal(true)}
                            className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-berry/10 via-amber-50 to-berry/10 border-2 border-berry/30 hover:border-berry text-plum hover:shadow-md transition-all group active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-berry text-white flex items-center justify-center shadow-xs shrink-0">
                                    <BookOpen size={16} />
                                </div>
                                <div className="text-left">
                                    <div className="text-xs font-black uppercase tracking-wider text-berry flex items-center gap-1">
                                        <span>Learn Strategy</span>
                                        <Sparkles size={12} />
                                    </div>
                                    <div className="text-[11px] font-medium text-plum/70">
                                        View interactive diagrams & masterclass
                                    </div>
                                </div>
                            </div>
                            <ArrowRight size={16} className="text-berry group-hover:translate-x-0.5 transition-transform" />
                        </button>

                        {/* Quiz & Objective Callout */}
                        <div className="space-y-1 pt-1">
                            <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                                Quiz
                            </div>
                            <div className="text-sm font-bold text-slate-800">
                                {playerColor === 'w' ? 'White to play!' : 'Black to play!'}
                            </div>
                            <p className="text-xs text-slate-500 font-medium">
                                {activeEndgame.target === 'win'
                                    ? 'Convert the advantage and force checkmate.'
                                    : 'Hold the theoretical draw against the tablebase engine.'}
                            </p>
                        </div>

                        {/* Live Feedback / Move Status alert */}
                        <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                            statusMessage.type === 'celebrate'
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                : statusMessage.type === 'error'
                                    ? 'bg-rose-50 border-rose-300 text-rose-900 font-medium'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 font-medium'
                        }`}>
                            {statusMessage.type === 'celebrate' ? (
                                <Sparkles size={16} className="text-emerald-600 shrink-0" />
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

                    {/* Bottom Action Controls Toolbar (Matching Screenshot Icons) */}
                    <div className="border-t border-slate-100 bg-white p-3 space-y-2 select-none relative">
                        {/* Engine Mode Settings Dropdown Popup */}
                        {showSettingsDropdown && (
                            <div className="absolute bottom-16 left-3 right-3 bg-white border-2 border-slate-200 rounded-2xl p-3 shadow-xl z-50 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
                                <div className="text-xs font-black text-slate-700 uppercase tracking-wider">
                                    Engine Defense Mode
                                </div>
                                <div className="space-y-1.5">
                                    <button
                                        onClick={() => handleDefenseModeChange('tablebase_stubborn')}
                                        className={`w-full py-2 px-3 rounded-xl text-left text-xs font-bold transition-colors ${
                                            defenseMode === 'tablebase_stubborn'
                                                ? 'bg-[#0085ff] text-white'
                                                : 'hover:bg-slate-100 text-slate-700'
                                        }`}
                                    >
                                        Tablebase (Syzygy Max Defense)
                                    </button>
                                    <button
                                        onClick={() => handleDefenseModeChange('stockfish_gm')}
                                        className={`w-full py-2 px-3 rounded-xl text-left text-xs font-bold transition-colors ${
                                            defenseMode === 'stockfish_gm'
                                                ? 'bg-[#0085ff] text-white'
                                                : 'hover:bg-slate-100 text-slate-700'
                                        }`}
                                    >
                                        Stockfish GM (Maximum Depth)
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Toolbar Icons Row */}
                        <div className="flex items-center justify-between text-slate-500">
                            {/* Settings */}
                            <button
                                onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                                className={`p-2 rounded-lg transition-colors ${showSettingsDropdown ? 'bg-slate-100 text-slate-800' : 'hover:bg-slate-100 hover:text-slate-800'}`}
                                title="Engine & Board Settings"
                            >
                                <Settings size={17} />
                            </button>

                            {/* Next move / Next endgame */}
                            <button
                                onClick={handleNextEndgame}
                                className="p-2 rounded-lg hover:bg-slate-100 hover:text-slate-800 transition-colors"
                                title="Next Endgame Exercise"
                            >
                                <ArrowRight size={17} />
                            </button>

                            {/* Sound Toggle */}
                            <button
                                onClick={() => setIsSoundMuted(!isSoundMuted)}
                                className="p-2 rounded-lg hover:bg-slate-100 hover:text-slate-800 transition-colors"
                                title={isSoundMuted ? 'Unmute Sound' : 'Mute Sound'}
                            >
                                {isSoundMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                            </button>

                            {/* Fullscreen */}
                            <button
                                onClick={handleToggleFullscreen}
                                className="p-2 rounded-lg hover:bg-slate-100 hover:text-slate-800 transition-colors"
                                title="Toggle Fullscreen"
                            >
                                <Maximize2 size={17} />
                            </button>

                            {/* Hint / Peek */}
                            <button
                                onClick={handleToggleHint}
                                className={`p-2 rounded-lg transition-colors ${revealedHint ? 'text-amber-600 bg-amber-50' : 'hover:bg-slate-100 hover:text-slate-800'}`}
                                title="Show Hint"
                            >
                                <Eye size={17} />
                            </button>

                            {/* Bot Engine Toggle */}
                            <button
                                onClick={() => handleDefenseModeChange(defenseMode === 'tablebase_stubborn' ? 'stockfish_gm' : 'tablebase_stubborn')}
                                className="p-2 rounded-lg hover:bg-slate-100 hover:text-slate-800 transition-colors"
                                title={`Engine: ${defenseMode === 'tablebase_stubborn' ? 'Tablebase' : 'Stockfish'}`}
                            >
                                <Bot size={17} />
                            </button>

                            {/* Flip Board */}
                            <button
                                onClick={handleToggleColor}
                                className="p-2 rounded-lg hover:bg-slate-100 hover:text-slate-800 transition-colors"
                                title="Flip Sides (Switch White/Black)"
                            >
                                <Compass size={17} />
                            </button>

                            {/* Reset Position */}
                            <button
                                onClick={handleResetPosition}
                                className="p-2 rounded-lg hover:bg-slate-100 hover:text-slate-800 transition-colors"
                                title="Reset Position"
                            >
                                <RotateCcw size={17} />
                            </button>
                        </div>

                        {/* Interactive Rating Stars Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-400">
                            <span className="font-bold">Rate this endgame:</span>
                            <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => handleRate(star)}
                                        className={`p-0.5 transition-colors ${
                                            star <= currentRating ? 'text-amber-400' : 'text-slate-200 hover:text-amber-300'
                                        }`}
                                    >
                                        <Star size={14} fill={star <= currentRating ? 'currentColor' : 'none'} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* ── Interactive Strategy & Diagrams Modal ── */}
            <EndgameStrategyModal
                isOpen={showStrategyModal}
                onClose={() => setShowStrategyModal(false)}
                activeEndgameId={activeEndgame.id}
                onLoadPosition={handleLoadGuidePosition}
            />
        </div>
    );
}
