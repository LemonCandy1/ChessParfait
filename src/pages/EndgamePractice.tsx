import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard, defaultArrowOptions } from 'react-chessboard';

const customArrowOptions = {
    ...defaultArrowOptions,
    color: '#be185d',
    secondaryColor: '#ea580c',
    tertiaryColor: '#059669',
    opacity: 0.55,
    activeOpacity: 0.45,
};
import {
    RotateCcw,
    ChevronLeft,
    Sparkles,
    CheckCircle2,
    HelpCircle,
    PartyPopper,
    Shield,
    Swords,
    Zap,
    BookOpen,
    Cpu,
    ArrowRight,
    Compass
} from 'lucide-react';
import Navbar from '../components/Navbar/Navbar';
import { playMoveSound, playCaptureSound, playWinSound, playLoseSound } from '../lib/soundEffects';
import endgamesData from '../data/endgames.json';
import { endgameEngine, type EngineDefenseMode } from '../lib/stockfishEngine';
import { ChessCakeSliceIcon, PieIcon, CherryBombIcon } from '../components/Icons';
import QueenVsRookGuide from '../components/QueenVsRookGuide';

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
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [activeEndgame, setActiveEndgame] = useState<EndgamePosition | null>(null);
    const [game, setGame] = useState<Chess>(new Chess());
    const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
    const [defenseMode, setDefenseMode] = useState<EngineDefenseMode>('tablebase_stubborn');
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [liveEval, setLiveEval] = useState<string>('Calculating...');
    const [showTheory, setShowTheory] = useState(true);
    const [showQueenVsRookGuide, setShowQueenVsRookGuide] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'info' | 'success' | 'error' | 'celebrate'; text: string }>({
        type: 'info',
        text: 'Make your move to begin endgame calculation.'
    });
    const [moveCount, setMoveCount] = useState(0);
    const [isSolved, setIsSolved] = useState(false);
    const [showSolvedOverlay, setShowSolvedOverlay] = useState(false);
    const aiTimerRef = useRef<number | null>(null);

    // Filter categories
    const categories = useMemo(() => {
        const set = new Set<string>();
        endgamesData.forEach((e) => set.add(e.category));
        return ['All', ...Array.from(set)];
    }, []);

    const filteredEndgames = useMemo(() => {
        if (selectedCategory === 'All') return endgamesData as EndgamePosition[];
        return (endgamesData as EndgamePosition[]).filter((e) => e.category === selectedCategory);
    }, [selectedCategory]);

    // Select position
    const handleSelectEndgame = (endgame: EndgamePosition) => {
        setActiveEndgame(endgame);
        setPlayerColor(endgame.playerColor);
        const newGame = new Chess(endgame.fen);
        setGame(newGame);
        setMoveCount(0);
        setIsSolved(false);
        setShowSolvedOverlay(false);
        if (endgame.id.startsWith('queen-vs-rook')) {
            setShowQueenVsRookGuide(true);
        }
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
        if (!activeEndgame) return;

        const newGame = new Chess(activeEndgame.fen);
        setGame(newGame);
        setMoveCount(0);
        setIsSolved(false);
        setShowSolvedOverlay(false);
        setIsAiThinking(false);
        setStatusMessage({
            type: 'info',
            text: 'Position reset. Ready for another attempt!'
        });
        updateEvaluation(activeEndgame.fen);
    }, [activeEndgame]);

    // Load position directly from the interactive guide
    const handleLoadGuidePosition = (fen: string, color: 'w' | 'b', title: string) => {
        if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
        const baseEndgame = (endgamesData as EndgamePosition[]).find(e => e.id === 'queen-vs-rook-philidor') || endgamesData[0];
        const newEndgame: EndgamePosition = {
            ...baseEndgame,
            id: 'queen-vs-rook-custom',
            title: `Q vs R: ${title}`,
            fen,
            playerColor: color,
            target: 'win',
            difficulty: 'Cherry Bomb',
            description: `Diagram variation: ${title}. Use Queen geometry to conquer the defending Rook!`,
            theoryNotes: baseEndgame.theoryNotes,
            keyTip: baseEndgame.keyTip
        };
        setActiveEndgame(newEndgame);
        setPlayerColor(color);
        const newGame = new Chess(fen);
        setGame(newGame);
        setMoveCount(0);
        setIsSolved(false);
        setShowSolvedOverlay(false);
        setIsAiThinking(false);
        setShowQueenVsRookGuide(true);
        setStatusMessage({
            type: 'info',
            text: `Position loaded: ${title}. ${newGame.turn() === color ? 'Your turn!' : 'Opponent is thinking...'}`
        });
        updateEvaluation(fen);
        if (newGame.turn() !== color) {
            triggerAiResponse(newGame);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Update live evaluation
    const updateEvaluation = useCallback(async (fen: string) => {
        try {
            const evalResult = await endgameEngine.getEvaluation(fen);
            setLiveEval(evalResult.evalText);
        } catch {
            setLiveEval('In Progress');
        }
    }, []);

    // Switch playing color
    const handleToggleColor = () => {
        const nextColor = playerColor === 'w' ? 'b' : 'w';
        setPlayerColor(nextColor);
        handleResetPosition();
    };

    // Switch engine defense mode
    const handleDefenseModeChange = (mode: EngineDefenseMode) => {
        setDefenseMode(mode);
        endgameEngine.setMode(mode);
    };

    // Check end condition
    const evaluateEndCondition = useCallback((currentGame: Chess) => {
        if (!activeEndgame) return;

        if (currentGame.isCheckmate()) {
            const winner = currentGame.turn() === 'w' ? 'b' : 'w';
            if (winner === playerColor) {
                if (activeEndgame.target === 'win') {
                    playWinSound();
                    setIsSolved(true);
                    setShowSolvedOverlay(true);
                    setStatusMessage({
                        type: 'celebrate',
                        text: 'Victory! Flawless checkmate execution.'
                    });
                } else {
                    playWinSound();
                    setIsSolved(true);
                    setShowSolvedOverlay(true);
                    setStatusMessage({
                        type: 'celebrate',
                        text: 'Outstanding! You checkmated the engine!'
                    });
                }
            } else {
                playLoseSound();
                setStatusMessage({
                    type: 'error',
                    text: 'Defeat. The opponent delivered checkmate. Reset and try again!'
                });
            }
            return true;
        }

        if (currentGame.isDraw()) {
            if (activeEndgame.target === 'draw') {
                playWinSound();
                setIsSolved(true);
                setShowSolvedOverlay(true);
                setStatusMessage({
                    type: 'celebrate',
                    text: 'Draw secured! Masterful defensive technique.'
                });
            } else {
                playLoseSound();
                setStatusMessage({
                    type: 'error',
                    text: 'Position is drawn (Stalemate / 50-move rule). Goal was to win.'
                });
            }
            return true;
        }

        return false;
    }, [activeEndgame, playerColor]);

    // AI Move Trigger
    const triggerAiResponse = useCallback((currentGame: Chess) => {
        if (currentGame.isGameOver()) return;
        setIsAiThinking(true);

        aiTimerRef.current = window.setTimeout(async () => {
            try {
                const fen = currentGame.fen();
                const isDefender = activeEndgame?.target === 'win';
                const recommendation = await endgameEngine.getBestMove(fen, isDefender);

                if (recommendation) {
                    const gameCopy = new Chess(currentGame.fen());
                    const move = gameCopy.move({
                        from: recommendation.from,
                        to: recommendation.to,
                        promotion: recommendation.promotion || 'q'
                    }) || gameCopy.move(recommendation.san);

                    if (move) {
                        if (move.captured) playCaptureSound();
                        else playMoveSound();

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
        }, 450);
    }, [activeEndgame, evaluateEndCondition, updateEvaluation]);

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

            if (move.captured) playCaptureSound();
            else playMoveSound();

            setGame(gameCopy);
            setMoveCount((prev) => prev + 1);
            updateEvaluation(gameCopy.fen());

            const isEnd = evaluateEndCondition(gameCopy);
            if (!isEnd) {
                setStatusMessage({
                    type: 'info',
                    text: 'Great move! Opponent is calculating defense...'
                });
                triggerAiResponse(gameCopy);
            }

            return true;
        } catch {
            return false;
        }
    };

    const themes: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
        'Piece of Cake': { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-600', icon: <ChessCakeSliceIcon size={16} /> },
        'Hard Tart': { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-600', icon: <PieIcon size={16} /> },
        'Cherry Bomb': { bg: 'bg-berry/10 text-berry border-berry/20', text: 'text-berry', icon: <CherryBombIcon size={16} /> }
    };

    return (
        <div className="min-h-screen bg-cream flex flex-col font-sans text-plum relative overflow-x-clip">
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-berry/5 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl -z-10 -translate-x-1/3 translate-y-1/3 pointer-events-none" />

            <Navbar />

            <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 relative z-10">
                {!activeEndgame ? (
                    /* ── Catalog / Selection View ── */
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <header className="text-center max-w-3xl mx-auto space-y-4">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-berry bg-berry/10 rounded-full">
                                <Cpu size={14} />
                                <span>Tablebase & Engine Powered</span>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black font-serif text-plum tracking-tight">
                                Endgame <span className="text-berry italic">Practice</span>
                            </h1>
                            <p className="text-lg text-plum/70 font-medium leading-relaxed">
                                Train technical endgames (Queen vs. Rook, Lucena, Philidor, Bishop + Knight checkmate) against stubborn Syzygy 7-Piece Tablebases and Grandmaster engines.
                            </p>
                        </header>

                        {/* Category Filter Tabs */}
                        <div className="flex items-center justify-center gap-2 flex-wrap pb-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 ${selectedCategory === cat
                                            ? 'bg-plum text-white border-plum shadow-md'
                                            : 'bg-white/80 hover:bg-white text-plum/70 border-plum/10'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Featured Masterclass Banner for Queen vs Rook */}
                        <div className="bg-gradient-to-br from-white/90 via-cream to-amber-50/50 backdrop-blur-md rounded-[2.5rem] p-6 md:p-8 border-2 border-berry/20 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 max-w-6xl mx-auto">
                            <div className="space-y-2 max-w-2xl">
                                <div className="inline-flex items-center gap-2 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-berry bg-berry/10 rounded-full">
                                    <Sparkles size={12} />
                                    <span>Featured Grandmaster Study</span>
                                </div>
                                <h2 className="text-2xl md:text-3xl font-black font-serif text-plum">
                                    Queen vs. Rook: <span className="text-berry italic">Philidor's Position (1777)</span>
                                </h2>
                                <p className="text-xs md:text-sm text-plum/70 font-medium leading-relaxed">
                                    The definitive queen endgame masterclass. Learn how White executes the triangular maneuver (1.Qe5+ Ka7 2.Qa1+ Kb8 3.Qa5!) to pass the move to Black in zugzwang, forcing the rook away to win with decisive geometric forks.
                                </p>
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto shrink-0 flex-wrap">
                                <button
                                    onClick={() => {
                                        const philidor = endgamesData.find((e) => e.id === 'queen-vs-rook-philidor');
                                        if (philidor) handleSelectEndgame(philidor as EndgamePosition);
                                        setShowQueenVsRookGuide(true);
                                    }}
                                    className="flex-1 md:flex-none px-5 py-3 rounded-2xl bg-berry text-white font-black text-xs uppercase tracking-wider hover:bg-berry/90 transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <Swords size={16} />
                                    <span>Train Philidor Position</span>
                                </button>
                                <button
                                    onClick={() => setShowQueenVsRookGuide(!showQueenVsRookGuide)}
                                    className="flex-1 md:flex-none px-5 py-3 rounded-2xl border-2 border-plum/15 bg-white/80 hover:bg-white text-plum font-black text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <BookOpen size={16} className="text-berry" />
                                    <span>{showQueenVsRookGuide ? 'Hide Diagrams Guide' : 'Diagrams Masterclass'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Interactive Guide in Catalog if toggled */}
                        {showQueenVsRookGuide && (
                            <div className="max-w-6xl mx-auto scroll-mt-6">
                                <QueenVsRookGuide
                                    onLoadPosition={handleLoadGuidePosition}
                                    onClose={() => setShowQueenVsRookGuide(false)}
                                />
                            </div>
                        )}

                        {/* Endgames Grid */}
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                            {filteredEndgames.map((eg) => {
                                const diffBadge = themes[eg.difficulty] || themes['Hard Tart'];
                                return (
                                    <div
                                        key={eg.id}
                                        onClick={() => handleSelectEndgame(eg)}
                                        className="bg-white/80 backdrop-blur-md rounded-[2rem] p-6 border-2 border-plum/15 shadow-sm hover:shadow-xl hover:border-berry/40 transition-all cursor-pointer group flex flex-col justify-between gap-5"
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-plum/40 bg-cream px-2.5 py-1 rounded-md border border-plum/10">
                                                    {eg.category}
                                                </span>
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${diffBadge.bg}`}>
                                                    {diffBadge.icon}
                                                    {eg.difficulty}
                                                </span>
                                            </div>

                                            <h3 className="font-serif font-black text-xl text-plum group-hover:text-berry transition-colors leading-tight">
                                                {eg.title}
                                            </h3>

                                            <p className="text-xs text-plum/60 font-medium leading-relaxed">
                                                {eg.description}
                                            </p>
                                        </div>

                                        <div className="pt-3 border-t border-plum/10 flex items-center justify-between text-xs font-black">
                                            <span className={`inline-flex items-center gap-1.5 ${eg.target === 'win' ? 'text-emerald-700' : 'text-amber-700'}`}>
                                                {eg.target === 'win' ? <Swords size={14} /> : <Shield size={14} />}
                                                <span>Goal: {eg.target === 'win' ? 'Force Win' : 'Hold Draw'}</span>
                                            </span>
                                            <span className="text-berry group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                                                <span>Practice</span>
                                                <ArrowRight size={14} />
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    /* ── Active Endgame Trainer Arena ── */
                    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500">
                        {/* Top navigation */}
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={() => setActiveEndgame(null)}
                                    className="inline-flex items-center gap-2 text-plum/60 hover:text-berry font-bold uppercase text-xs tracking-wider transition-colors py-2 px-3 rounded-xl hover:bg-white/60"
                                >
                                    <ChevronLeft size={16} /> Back to Catalog
                                </button>
                                <button
                                    onClick={() => setShowQueenVsRookGuide(!showQueenVsRookGuide)}
                                    className={`inline-flex items-center gap-2 font-bold uppercase text-xs tracking-wider transition-all py-2 px-3.5 rounded-xl border-2 ${showQueenVsRookGuide
                                            ? 'bg-plum text-white border-plum shadow-sm'
                                            : 'border-plum/15 bg-white/70 hover:bg-white text-plum'
                                        }`}
                                >
                                    <BookOpen size={15} className={showQueenVsRookGuide ? 'text-amber-300' : 'text-berry'} />
                                    <span>{showQueenVsRookGuide ? 'Hide Diagrams Guide' : 'Q vs R Diagrams Guide'}</span>
                                </button>
                            </div>

                            {/* Defense Mode Selector */}
                            <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm p-1.5 rounded-2xl border border-plum/15 shadow-sm text-xs">
                                <span className="text-[10px] font-black uppercase tracking-wider text-plum/40 px-2">Engine:</span>
                                <button
                                    onClick={() => handleDefenseModeChange('tablebase_stubborn')}
                                    className={`px-3 py-1 rounded-xl font-black text-[11px] transition-all ${defenseMode === 'tablebase_stubborn'
                                            ? 'bg-plum text-white shadow-sm'
                                            : 'text-plum/60 hover:text-plum'
                                        }`}
                                >
                                    Tablebase (Max Defense)
                                </button>
                                <button
                                    onClick={() => handleDefenseModeChange('stockfish_gm')}
                                    className={`px-3 py-1 rounded-xl font-black text-[11px] transition-all ${defenseMode === 'stockfish_gm'
                                            ? 'bg-plum text-white shadow-sm'
                                            : 'text-plum/60 hover:text-plum'
                                        }`}
                                >
                                    Stockfish GM
                                </button>
                            </div>
                        </div>

                        <div className="grid lg:grid-cols-12 gap-8 items-start">
                            {/* Board Column */}
                            <div className="lg:col-span-6 flex flex-col items-center w-full">
                                {/* Top Status bar above board */}
                                <div className="flex items-center justify-between w-full max-w-[440px] mb-3 px-4 py-2 rounded-2xl bg-white/80 backdrop-blur-sm border-2 border-plum/15 shadow-sm">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-3.5 h-3.5 rounded-full ${game.turn() === 'w' ? 'bg-white border-2 border-plum/40 shadow-inner' : 'bg-plum shadow-inner'}`} />
                                        <span className="font-black text-xs uppercase tracking-wider text-plum/80">
                                            {game.turn() === playerColor ? 'Your Turn' : 'Opponent Calculating...'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-black text-plum/60">
                                        <span title="Moves played">Moves: {moveCount}</span>
                                    </div>
                                </div>

                                {/* Board Container */}
                                <div className="w-full aspect-square max-w-[440px] mx-auto relative group">
                                    <div className="p-4 soft-card shadow-2xl h-full flex flex-col relative overflow-hidden">
                                        <div
                                            className="w-full h-full rounded-2xl overflow-hidden shadow-inner border-2 border-plum/15 bg-white translate-z-0 relative select-none"
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
                                                        bottom: 1.5,
                                                        right: 2.5,
                                                        zIndex: 15,
                                                        pointerEvents: 'none',
                                                        userSelect: 'none'
                                                    },
                                                    numericNotationStyle: {
                                                        fontSize: '9.5px',
                                                        fontWeight: 'bold',
                                                        lineHeight: 1,
                                                        top: 1.5,
                                                        left: 2.5,
                                                        zIndex: 15,
                                                        pointerEvents: 'none',
                                                        userSelect: 'none'
                                                    },
                                                    animationDurationInMs: 200
                                                }}
                                            />

                                            {/* Solved Celebration Overlay */}
                                            {showSolvedOverlay && (
                                                <div className="absolute inset-0 bg-emerald-950/75 backdrop-blur-[2px] z-40 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                                                    <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-3 shadow-xl animate-in zoom-in-75 duration-260 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
                                                        <PartyPopper size={32} />
                                                    </div>
                                                    <h3 className="font-serif font-black text-2xl text-white mb-1">Target Achieved!</h3>
                                                    <p className="text-emerald-200 text-xs font-bold uppercase tracking-wider">
                                                        {activeEndgame.target === 'win' ? 'Checkmate Delivered' : 'Draw Successfully Held'}
                                                    </p>
                                                    <button
                                                        onClick={() => setShowSolvedOverlay(false)}
                                                        className="mt-4 py-2 px-5 rounded-xl bg-white text-emerald-900 font-black text-xs uppercase tracking-wider hover:bg-emerald-50 transition-colors shadow-md"
                                                    >
                                                        Review Position
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Board Action Buttons */}
                                <div className="flex items-center gap-3 w-full max-w-[440px] mt-4">
                                    <button
                                        onClick={handleResetPosition}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-plum/15 bg-white/70 hover:bg-white text-plum font-black text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95"
                                    >
                                        <RotateCcw size={15} />
                                        <span>Reset</span>
                                    </button>
                                    <button
                                        onClick={handleToggleColor}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-plum/15 bg-white/70 hover:bg-white text-plum font-black text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95"
                                        title="Switch sides between White and Black"
                                    >
                                        <Compass size={15} />
                                        <span>Flip Side ({playerColor === 'w' ? 'White' : 'Black'})</span>
                                    </button>
                                </div>
                            </div>

                            {/* Info & Theory Column */}
                            <div className="lg:col-span-6 space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-plum/40 bg-white/70 px-3 py-1 rounded-full border border-plum/10">
                                            {activeEndgame.category}
                                        </span>
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${activeEndgame.target === 'win' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>
                                            {activeEndgame.target === 'win' ? <Swords size={14} /> : <Shield size={14} />}
                                            {activeEndgame.target === 'win' ? 'Goal: Checkmate' : 'Goal: Hold Draw'}
                                        </span>
                                        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-plum/5 border border-plum/10 text-xs font-black text-plum/80">
                                            <Zap size={13} className="text-amber-500" />
                                            <span>Eval: {liveEval}</span>
                                        </div>
                                    </div>

                                    <h2 className="text-3xl md:text-4xl font-serif font-black text-plum tracking-tight">
                                        {activeEndgame.title}
                                    </h2>
                                    <p className="text-base text-plum/70 font-medium leading-relaxed">
                                        {activeEndgame.description}
                                    </p>
                                </div>

                                {/* Status Feedback Card */}
                                <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 border-2 border-plum/15 shadow-sm space-y-3">
                                    <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${statusMessage.type === 'celebrate'
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                            : statusMessage.type === 'error'
                                                ? 'bg-rose-50 border-rose-300 text-rose-900'
                                                : 'bg-cream border-plum/10 text-plum'
                                        }`}>
                                        {statusMessage.type === 'celebrate' ? (
                                            <Sparkles className="text-amber-500 shrink-0" size={18} />
                                        ) : statusMessage.type === 'error' ? (
                                            <HelpCircle className="text-rose-500 shrink-0" size={18} />
                                        ) : (
                                            <CheckCircle2 className="text-emerald-600 shrink-0" size={18} />
                                        )}
                                        <p className="text-xs font-black leading-snug">{statusMessage.text}</p>
                                    </div>
                                </div>

                                {/* Grandmaster Theory Guide Accordion */}
                                <div className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border-2 border-plum/15 shadow-sm space-y-3">
                                    <button
                                        onClick={() => setShowTheory(!showTheory)}
                                        className="w-full flex items-center justify-between text-left group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <BookOpen size={18} className="text-berry" />
                                            <h4 className="font-serif font-black text-base text-plum group-hover:text-berry transition-colors">
                                                Grandmaster Theory & Strategy
                                            </h4>
                                        </div>
                                        <span className="text-xs font-black text-plum/40 uppercase tracking-widest">
                                            {showTheory ? 'Collapse' : 'Expand'}
                                        </span>
                                    </button>

                                    {showTheory && (
                                        <div className="pt-2 text-xs text-plum/80 leading-relaxed font-medium space-y-2 border-t border-plum/10 animate-in fade-in duration-300">
                                            <p>{activeEndgame.theoryNotes}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Philidor Diagrams Callout Banner */}
                                {activeEndgame.id.startsWith('queen-vs-rook') && (
                                    <div className="bg-gradient-to-r from-berry/10 via-amber-50 to-berry/5 p-4 rounded-2xl border-2 border-berry/20 flex items-center justify-between gap-3 shadow-sm">
                                        <div className="flex items-center gap-2.5">
                                            <Sparkles size={18} className="text-berry shrink-0" />
                                            <div>
                                                <h5 className="font-serif font-black text-xs text-plum">Philidor Diagrams & Variations</h5>
                                                <p className="text-[11px] text-plum/70 font-medium">Interactive boards for Triangulation, Zugzwang, and Royal Forks.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setShowQueenVsRookGuide(true);
                                                const el = document.getElementById('queen-vs-rook-guide');
                                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                                            }}
                                            className="px-3.5 py-2 rounded-xl bg-berry text-white font-black text-[10px] uppercase tracking-wider hover:bg-berry/90 transition-all shadow-sm shrink-0 active:scale-95"
                                        >
                                            {showQueenVsRookGuide ? 'Scroll to Guide ↓' : 'Open Guide'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Scrollable Information Section with Interactive Diagrams */}
                        {showQueenVsRookGuide && (
                            <div id="queen-vs-rook-guide" className="pt-6 scroll-mt-6 animate-in fade-in duration-300">
                                <QueenVsRookGuide
                                    onLoadPosition={handleLoadGuidePosition}
                                    onClose={() => setShowQueenVsRookGuide(false)}
                                />
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
