import React, { useState, useEffect } from 'react';
import { Chessboard, defaultArrowOptions } from 'react-chessboard';
import {
    X,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Swords,
    Crown,
    Compass,
    CheckCircle2
} from 'lucide-react';
import QueenVsRookGuide from './QueenVsRookGuide';

const customArrowOptions = {
    ...defaultArrowOptions,
    color: '#be185d',
    secondaryColor: '#ea580c',
    tertiaryColor: '#059669',
    opacity: 0.65,
    activeOpacity: 0.55,
};

const HIGHLIGHT_WHITE: React.CSSProperties = { backgroundColor: 'rgba(16, 185, 129, 0.65)' };
const HIGHLIGHT_BLACK: React.CSSProperties = { backgroundColor: 'rgba(220, 38, 38, 0.65)' };

interface StepMove {
    moveNumber: string;
    san: string;
    fen: string;
    comment: string;
    highlights?: Record<string, React.CSSProperties>;
    arrows?: Array<{ startSquare: string; endSquare: string; color: string }>;
}

interface StrategyGuideItem {
    id: string;
    tabName: string;
    title: string;
    subtitle: string;
    keyIdea: string;
    steps: StepMove[];
}

const OTHER_ENDGAME_DIAGRAMS: Record<string, StrategyGuideItem> = {
    'lucena-position': {
        id: 'lucena-position',
        tabName: 'Lucena Bridge',
        title: 'The Lucena Position: Building the Bridge',
        subtitle: 'The quintessential technique to promote a pawn on the 7th rank with a rook.',
        keyIdea: '1. Rook to 4th rank (Rd4) -> 2. King steps out -> 3. Rook interposes checks on the 4th rank (Rb4-e4).',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '1K1k4/1P1r4/8/8/8/8/8/1R6 w - - 0 1',
                comment: 'The White pawn is on the 7th rank (b7), but the White King on b8 is trapped in front of its own pawn. Black’s rook on d7 prevents the King from escaping freely. White must build a bridge!',
                highlights: { b8: HIGHLIGHT_WHITE, b7: HIGHLIGHT_WHITE, d7: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '1',
                san: '1. Rd1+',
                fen: '1K1k4/1P1r4/8/8/8/8/8/3R4 b - - 1 1',
                comment: '1. Rd1+! White checks along the d-file to drive the defending King away from the promotion file.',
                highlights: { d1: HIGHLIGHT_WHITE, d8: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '1...',
                san: '1... Ke7',
                fen: '1K6/1P1rk3/8/8/8/8/8/3R4 w - - 2 2',
                comment: '1... Ke7. Black steps aside.',
                highlights: { e7: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '2',
                san: '2. Rd4!',
                fen: '1K6/1P1rk3/8/8/3R4/8/8/8 b - - 3 2',
                comment: '2. Rd4! THE GOLDEN MOVE! Placing the rook on the 4th rank. This will act as a shield (bridge) when Black gives vertical checks!',
                highlights: { d4: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '2...',
                san: '2... Rd1',
                fen: '1K6/1P2k3/8/8/3R4/8/8/3r4 w - - 4 3',
                comment: '2... Rd1. Black prepares to check the White King from behind once it leaves b8.',
                highlights: { d1: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '3',
                san: '3. Kc7',
                fen: '8/1PK1k3/8/8/3R4/8/8/3r4 b - - 5 3',
                comment: '3. Kc7! The King steps out! Now the pawn threatens to queen.',
                highlights: { c7: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '3...',
                san: '3... Rc1+',
                fen: '8/1PK1k3/8/8/3R4/8/8/2r5 w - - 6 4',
                comment: '3... Rc1+! Black gives a vertical check.',
                highlights: { c1: HIGHLIGHT_BLACK, c7: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '4',
                san: '4. Kb6',
                fen: '8/1P2k3/1K6/8/3R4/8/8/2r5 b - - 7 4',
                comment: '4. Kb6! White steps forward toward the 4th rank.',
                highlights: { b6: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '4...',
                san: '4... Rb1+',
                fen: '8/1P2k3/1K6/8/3R4/8/8/1r6 w - - 8 5',
                comment: '4... Rb1+! Another vertical check.',
                highlights: { b1: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '5',
                san: '5. Kc6',
                fen: '8/1P2k3/2K5/8/3R4/8/8/1r6 b - - 9 5',
                comment: '5. Kc6! Marching down.',
                highlights: { c6: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '5...',
                san: '5... Rc1+',
                fen: '8/1P2k3/2K5/8/3R4/8/8/2r5 w - - 10 6',
                comment: '5... Rc1+!',
                highlights: { c1: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '6',
                san: '6. Kb5',
                fen: '8/1P2k3/8/1K6/3R4/8/8/2r5 b - - 11 6',
                comment: '6. Kb5! Reaching the 5th rank.',
                highlights: { b5: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '6...',
                san: '6... Rb1+',
                fen: '8/1P2k3/8/1K6/3R4/8/8/1r6 w - - 12 7',
                comment: '6... Rb1+! Black thinks checks are perpetual...',
                highlights: { b1: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '7',
                san: '7. Rb4!',
                fen: '8/1P2k3/8/1K6/1R6/8/8/1r6 b - - 13 7',
                comment: '7. Rb4!! THE BRIDGE IS BUILT! The rook intercepts the check on the 4th rank. Black must trade rooks or surrender promotion. White queens next move and wins!',
                highlights: { b4: HIGHLIGHT_WHITE, b1: HIGHLIGHT_BLACK }
            }
        ]
    },
    'philidor-defense': {
        id: 'philidor-defense',
        tabName: 'Philidor 6th Rank',
        title: 'The Philidor Defense: 6th Rank Cut-Off',
        subtitle: 'The most important drawing technique in Rook + Pawn vs Rook endgames.',
        keyIdea: '1. Hold rook on the 6th rank until the pawn advances -> 2. Once pawn advances, swing rook to the 1st rank for endless checks from behind.',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '4k3/8/8/4P3/8/8/r7/4K2R b - - 0 1',
                comment: 'Black to move and draw. White has an extra passed pawn on e5, but White’s King has not reached the 6th rank yet. Black must prevent the White King from advancing.',
                highlights: { e5: HIGHLIGHT_WHITE, a2: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '1...',
                san: '1... Ra6!',
                fen: '4k3/8/r7/4P3/8/8/8/4K2R w - - 1 2',
                comment: '1... Ra6!! The KEY move! The rook patrols the 6th rank. The White King is completely cut off from advancing to e6, f6, or d6.',
                highlights: { a6: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '2',
                san: '2. Rh7',
                fen: '4k3/7R/r7/4P3/8/8/8/4K3 b - - 2 2',
                comment: '2. Rh7. White waits or tries to create mating nets. Black simply stays calm.',
                highlights: { h7: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '2...',
                san: '2... Re6!',
                fen: '4k3/7R/4r3/4P3/8/8/8/4K3 w - - 3 3',
                comment: '2... Re6! Directly attacking the e5 pawn, tying down White’s forces.',
                highlights: { e6: HIGHLIGHT_BLACK, e5: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '3',
                san: '3. e6',
                fen: '4k3/7R/4P3/8/8/8/8/4K3 b - - 0 3',
                comment: '3. e6. White finally advances the pawn to the 6th rank! Since the pawn is now on e6, the White King has no shelter in front of it.',
                highlights: { e6: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '3...',
                san: '3... Re1+!',
                fen: '4k3/7R/4P3/8/8/8/8/4r3 w - - 1 4',
                comment: '3... Re1+!! Immediately drop to the 1st rank! Now Black gives relentless, endless checks from behind (Re2+, Re3+, etc.). Theoretical draw secured!',
                highlights: { e1: HIGHLIGHT_BLACK }
            }
        ]
    },
    'key-squares-opposition': {
        id: 'key-squares-opposition',
        tabName: 'Direct Opposition',
        title: 'Key Squares & King Opposition',
        subtitle: 'Fundamental king and pawn endgame mastery.',
        keyIdea: 'Seize the direct opposition when separated by one square; outflank the enemy king to escort your pawn to queen.',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '8/8/4k3/8/4P3/4K3/8/8 w - - 0 1',
                comment: 'White to move and win. White has an extra pawn on e4. The Kings face each other with 2 squares in between. White must take the opposition.',
                highlights: { e3: HIGHLIGHT_WHITE, e6: HIGHLIGHT_BLACK, e4: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '1',
                san: '1. Ke4!',
                fen: '8/8/4k3/8/4P3/8/4K3/8 w - - 1 1',
                comment: '1. Ke4! White takes the DIRECT OPPOSITION! The Kings are separated by an odd number of squares (1 square), and it is Black’s turn to move.',
                highlights: { e4: HIGHLIGHT_WHITE, e6: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '1...',
                san: '1... Kd6',
                fen: '8/8/3k4/8/4P3/8/4K3/8 w - - 2 2',
                comment: '1... Kd6. Black is forced to yield the center.',
                highlights: { d6: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '2',
                san: '2. Kd4!',
                fen: '8/8/3k4/8/3KP3/8/8/8 b - - 3 2',
                comment: '2. Kd4! Maintaining the opposition.',
                highlights: { d4: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '2...',
                san: '2... Ke6',
                fen: '8/8/4k3/8/3KP3/8/8/8 w - - 4 3',
                comment: '2... Ke6.',
                highlights: { e6: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '3',
                san: '3. e5!',
                fen: '8/8/4k3/4P3/3K4/8/8/8 b - - 0 3',
                comment: '3. e5! The pawn advances safely with the King firmly protecting key infiltration squares.',
                highlights: { e5: HIGHLIGHT_WHITE }
            }
        ]
    },
    'bishop-knight-mate': {
        id: 'bishop-knight-mate',
        tabName: 'B+N Checkmate',
        title: 'Bishop & Knight Checkmate (The W-Manoeuvre)',
        subtitle: 'The hardest fundamental checkmate in chess.',
        keyIdea: '1. Drive enemy king to the corner matching your bishop color. 2. The Knight follows a W-shaped route (f2 -> d3 -> e5 -> c6 -> b8).',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '8/8/8/8/8/4K3/5N2/4B1k1 w - - 0 1',
                comment: 'White has a Light-Squared Bishop and Knight. Checkmate can ONLY be forced in a light-squared corner (h1 or a8). The Black king is on g1.',
                highlights: { g1: HIGHLIGHT_BLACK, e1: HIGHLIGHT_WHITE, f2: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '1',
                san: '1. Ke2',
                fen: '8/8/8/8/8/8/4KN2/4B1k1 b - - 1 1',
                comment: '1. Ke2. Seizing the g-file and h-file control. Black King must step to g2.',
                highlights: { e2: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '1...',
                san: '1... Kg2',
                fen: '8/8/8/8/8/8/4KNk1/4B3 w - - 2 2',
                comment: '1... Kg2.',
                highlights: { g2: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '2',
                san: '2. Nd3!',
                fen: '8/8/8/8/8/3N4/4K1k1/4B3 b - - 3 2',
                comment: '2. Nd3! First step of the W-Manoeuvre! Knight moves to d3 to control dark squares e1 and f4.',
                highlights: { d3: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '2...',
                san: '2... Kh3',
                fen: '8/8/8/8/8/3N3k/4K3/4B3 w - - 4 3',
                comment: '2... Kh3. The King tries to run along the rim.',
                highlights: { h3: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '3',
                san: '3. Kf3!',
                fen: '8/8/8/8/8/3N1K1k/8/4B3 b - - 5 3',
                comment: '3. Kf3! Locking the king against the h-file edge.',
                highlights: { f3: HIGHLIGHT_WHITE }
            }
        ]
    }
};

interface EndgameStrategyModalProps {
    isOpen: boolean;
    onClose: () => void;
    activeEndgameId?: string;
    onLoadPosition: (fen: string, color: 'w' | 'b', title: string) => void;
}

export default function EndgameStrategyModal({
    isOpen,
    onClose,
    activeEndgameId = 'queen-vs-rook-philidor',
    onLoadPosition
}: EndgameStrategyModalProps) {
    const isQvR = activeEndgameId.startsWith('queen-vs-rook');

    // Default tab
    const [selectedTab, setSelectedTab] = useState<string>(() => {
        if (isQvR) return 'qvr';
        if (OTHER_ENDGAME_DIAGRAMS[activeEndgameId]) return activeEndgameId;
        return 'qvr';
    });

    // Custom stepper for other diagrams
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    // Sync selected tab to active endgame whenever modal opens
    useEffect(() => {
        if (isOpen) {
            if (activeEndgameId.startsWith('queen-vs-rook')) {
                setSelectedTab('qvr');
            } else if (OTHER_ENDGAME_DIAGRAMS[activeEndgameId]) {
                setSelectedTab(activeEndgameId);
            }
            setCurrentStepIndex(0);
        }
    }, [isOpen, activeEndgameId]);

    if (!isOpen) return null;

    const currentDiagram = OTHER_ENDGAME_DIAGRAMS[selectedTab];

    const handleNextStep = () => {
        if (!currentDiagram) return;
        if (currentStepIndex < currentDiagram.steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        }
    };

    const handlePrevStep = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    };

    const handleResetStep = () => {
        setCurrentStepIndex(0);
    };

    return (
        <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-hidden animate-in fade-in duration-200">
            <div className="bg-[#FAF1DB] border-2 border-plum/20 w-full max-w-5xl max-h-[92vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden text-plum">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b-2 border-plum/10 bg-white/70">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-berry text-white flex items-center justify-center shadow-md">
                            <BookOpen size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black font-serif text-plum leading-tight">
                                Endgame Strategy <span className="text-berry italic">Diagrams</span>
                            </h2>
                            <p className="text-xs text-plum/60 font-medium">
                                Step-by-step masterclass diagrams, triangulation routes & key theoretical maneuvers.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full hover:bg-plum/10 flex items-center justify-center text-plum/70 hover:text-plum transition-colors"
                        title="Close Strategy Modal"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-2 px-6 py-2.5 bg-cream border-b border-plum/10 overflow-x-auto select-none">
                    <button
                        onClick={() => { setSelectedTab('qvr'); setCurrentStepIndex(0); }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${
                            selectedTab === 'qvr'
                                ? 'bg-berry text-white shadow-sm'
                                : 'bg-white/80 hover:bg-white text-plum/70 border border-plum/10'
                        }`}
                    >
                        <Crown size={14} />
                        <span>Queen vs Rook (Philidor)</span>
                    </button>

                    {Object.values(OTHER_ENDGAME_DIAGRAMS).map((item) => (
                        <button
                            key={item.id}
                            onClick={() => { setSelectedTab(item.id); setCurrentStepIndex(0); }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                selectedTab === item.id
                                    ? 'bg-plum text-white shadow-sm'
                                    : 'bg-white/80 hover:bg-white text-plum/70 border border-plum/10'
                            }`}
                        >
                            <Compass size={14} />
                            <span>{item.tabName}</span>
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white/50">
                    {selectedTab === 'qvr' ? (
                        /* Embedded Queen vs Rook Masterclass */
                        <QueenVsRookGuide
                            onLoadPosition={(fen, color, title) => {
                                onLoadPosition(fen, color, title);
                                onClose();
                            }}
                            onClose={onClose}
                        />
                    ) : currentDiagram ? (
                        /* Standard Diagram Viewer for Other Endgames */
                        <div className="grid lg:grid-cols-12 gap-6 items-start">
                            {/* Diagram Board Column */}
                            <div className="lg:col-span-6 flex flex-col items-center">
                                <div className="w-full max-w-[380px] aspect-square rounded-2xl overflow-hidden shadow-xl border-2 border-plum/15 bg-white relative">
                                    <Chessboard
                                        options={{
                                            position: currentDiagram.steps[currentStepIndex]?.fen || currentDiagram.steps[0].fen,
                                            boardOrientation: 'white',
                                            squareStyles: currentDiagram.steps[currentStepIndex]?.highlights || {},
                                            darkSquareStyle: { backgroundColor: '#b58863' },
                                            lightSquareStyle: { backgroundColor: '#f0d9b5' },
                                            alphaNotationStyle: { fontSize: '9px', fontWeight: 'bold' },
                                            numericNotationStyle: { fontSize: '9px', fontWeight: 'bold' },
                                            arrowOptions: customArrowOptions,
                                            animationDurationInMs: 200
                                        }}
                                    />
                                </div>

                                {/* Step navigation controls */}
                                <div className="flex items-center justify-between w-full max-w-[380px] mt-4 gap-2">
                                    <button
                                        onClick={handleResetStep}
                                        className="p-2.5 rounded-xl border border-plum/15 hover:bg-cream text-plum/70 hover:text-plum transition-colors"
                                        title="Reset"
                                    >
                                        <RotateCcw size={15} />
                                    </button>
                                    <button
                                        onClick={handlePrevStep}
                                        disabled={currentStepIndex === 0}
                                        className="p-2.5 rounded-xl border border-plum/15 hover:bg-cream text-plum/70 hover:text-plum disabled:opacity-40 transition-colors"
                                        title="Previous Move"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="text-xs font-black text-plum/60 px-3">
                                        Step {currentStepIndex + 1} of {currentDiagram.steps.length}
                                    </span>
                                    <button
                                        onClick={handleNextStep}
                                        disabled={currentStepIndex === currentDiagram.steps.length - 1}
                                        className="p-2.5 rounded-xl border border-plum/15 hover:bg-cream text-plum/70 hover:text-plum disabled:opacity-40 transition-colors"
                                        title="Next Move"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Diagram Explanations Column */}
                            <div className="lg:col-span-6 space-y-4">
                                <div>
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-berry/10 text-berry mb-2">
                                        <BookOpen size={12} />
                                        <span>Diagram Walkthrough</span>
                                    </div>
                                    <h3 className="text-2xl font-serif font-black text-plum">
                                        {currentDiagram.title}
                                    </h3>
                                    <p className="text-xs text-plum/70 font-medium mt-1 leading-relaxed">
                                        {currentDiagram.subtitle}
                                    </p>
                                </div>

                                {/* Current Step Card */}
                                <div className="p-4 rounded-2xl bg-white border-2 border-plum/15 shadow-sm space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-wider text-berry">
                                            Move: {currentDiagram.steps[currentStepIndex]?.san}
                                        </span>
                                        <span className="text-[11px] font-bold text-plum/40">
                                            {currentDiagram.steps[currentStepIndex]?.moveNumber}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-plum/90 leading-relaxed">
                                        {currentDiagram.steps[currentStepIndex]?.comment}
                                    </p>
                                </div>

                                {/* Key Idea Callout */}
                                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5">
                                    <div className="flex items-center gap-2 text-amber-800 font-black text-xs uppercase tracking-wider">
                                        <CheckCircle2 size={14} />
                                        <span>Key Principle</span>
                                    </div>
                                    <p className="text-xs text-amber-900/80 font-medium leading-relaxed">
                                        {currentDiagram.keyIdea}
                                    </p>
                                </div>

                                {/* Load into Arena Button */}
                                <button
                                    onClick={() => {
                                        const step = currentDiagram.steps[currentStepIndex];
                                        onLoadPosition(step.fen, 'w', `${currentDiagram.title} (${step.san})`);
                                        onClose();
                                    }}
                                    className="w-full py-3 px-5 rounded-xl bg-berry hover:bg-berry/90 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <Swords size={16} />
                                    <span>Practice This Exact Position in Arena</span>
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
