import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Chessboard, defaultArrowOptions } from 'react-chessboard';
import {
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Swords,
    Volume2,
    VolumeX,
    PanelLeftClose,
    PanelLeftOpen,
    RefreshCw,
    ArrowLeft
} from 'lucide-react';
import Navbar from '../components/Navbar/Navbar';
import { Link, useSearchParams } from 'react-router-dom';
import { playMoveSound } from '../lib/soundEffects';
import endgamesData from '../data/endgames.json';
import {
    TRIANGULATION_STEPS,
    FORK_VARIATIONS,
    HERDING_STEPS,
    WHITE_SQUARE_STYLE,
    BLACK_SQUARE_STYLE,
    type MoveStep
} from '../components/QueenVsRookGuide';

const customArrowOptions = {
    ...defaultArrowOptions,
    color: '#0284c7',
    secondaryColor: '#ea580c',
    tertiaryColor: '#059669',
    opacity: 0.65,
    activeOpacity: 0.55,
};

interface StrategyTopic {
    id: string;
    chapter: string;
    title: string;
    subtitle: string;
    keyIdea: string;
    question: string;
    practiceId: string;
    steps: MoveStep[];
}

const STRATEGY_TOPICS: StrategyTopic[] = [
    // Chapter 1: Queen vs Rook
    {
        id: 'qvr-triangulation',
        chapter: 'Queen vs Rook Mastery',
        title: 'Philidor Triangulation (1777)',
        subtitle: 'Pass the turn to Black via Queen triangulation to force zugzwang.',
        question: 'How does White transfer the move to Black to break down the 7th-rank fortress?',
        keyIdea: 'Maneuver the Queen a5 -> e5 -> a1 -> a5 while the White King holds c6. Black is placed in zugzwang.',
        practiceId: 'queen-vs-rook-philidor',
        steps: TRIANGULATION_STEPS
    },
    {
        id: 'qvr-herding',
        chapter: 'Queen vs Rook Mastery',
        title: 'Herding the King (Diag 13-3 & 13-4)',
        subtitle: 'Center-to-edge technique and driving the King into the decisive Philidor position.',
        question: 'How does White drive the black king away to an edge without allowing perpetual counter-checks?',
        keyIdea: 'Place Queen on optimal squares to restrict mobility, step the King closer with quiet zugzwang moves, and transition to Philidor.',
        practiceId: 'queen-vs-rook-solitary-13-3',
        steps: HERDING_STEPS
    },
    {
        id: 'qvr-fork-rb1',
        chapter: 'Queen vs Rook Mastery',
        title: 'Double Attack: 3... Rb1 Fork',
        subtitle: 'Winning the rook when Black retreats down the b-file.',
        question: 'How does White capitalize after 3... Rb1 abandons the king?',
        keyIdea: 'Check on d8, centralize on d4, push to h8, and strike with the royal fork on h7.',
        practiceId: 'queen-vs-rook-philidor',
        steps: FORK_VARIATIONS[0]?.steps || []
    },
    {
        id: 'qvr-fork-rh7',
        chapter: 'Queen vs Rook Mastery',
        title: 'Double Attack: 3... Rh7 Fork',
        subtitle: 'Winning the rook when Black slides along the 7th rank.',
        question: 'How does White break Black’s 7th-rank defense?',
        keyIdea: 'Diagonal check on e5, back-rank check on a1, and deliver the devastating royal fork on b1.',
        practiceId: 'queen-vs-rook-philidor',
        steps: FORK_VARIATIONS[1]?.steps || []
    },
    {
        id: 'qvr-fork-rb3',
        chapter: 'Queen vs Rook Mastery',
        title: 'Double Attack: 3... Rb3 Fork',
        subtitle: 'Winning the rook when Black defends along the 3rd rank.',
        question: 'How does White punish 3... Rb3?',
        keyIdea: 'Check on d5, penetrate to g8, and deliver the royal fork on d8.',
        practiceId: 'queen-vs-rook-philidor',
        steps: FORK_VARIATIONS[2]?.steps || []
    },
    {
        id: 'qvr-fork-rg7',
        chapter: 'Queen vs Rook Mastery',
        title: 'Double Attack: 3... Rg7 Fork',
        subtitle: 'Winning the rook when Black checks from g7.',
        question: 'How does White refute the flank check 3... Rg7?',
        keyIdea: 'Centralize Queen on e5 to fork the king and rook simultaneously.',
        practiceId: 'queen-vs-rook-philidor',
        steps: FORK_VARIATIONS[3]?.steps || []
    },

    // Chapter 2: Rook Endgames
    {
        id: 'lucena-position',
        chapter: 'Rook Endgames',
        title: 'The Lucena Position: Building the Bridge',
        subtitle: 'The quintessential technique to promote a pawn on the 7th rank with a rook.',
        question: 'How does White safely escort the King out of the b8 promotion square?',
        keyIdea: '1. Rook to 4th rank (Rd4) -> 2. King steps out -> 3. Rook intercepts checks on the 4th rank (Rb4-e4).',
        practiceId: 'lucena-position',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '1K1k4/1P1r4/8/8/8/8/8/1R6 w - - 0 1',
                comment: 'The White pawn is on the 7th rank (b7), but the White King on b8 is trapped in front of its own pawn. Black’s rook on d7 prevents the King from escaping freely. White must build a bridge!'
            },
            {
                moveNumber: '1',
                san: '1. Rd1+',
                fen: '1K1k4/1P1r4/8/8/8/8/8/3R4 b - - 1 1',
                comment: '1. Rd1+! White checks along the d-file to drive the defending King away from the promotion file.',
                highlights: { d1: WHITE_SQUARE_STYLE, d8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '1...',
                san: '1... Ke7',
                fen: '1K6/1P1rk3/8/8/8/8/8/3R4 w - - 2 2',
                comment: '1... Ke7. Black steps aside.',
                highlights: { e7: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2',
                san: '2. Rd4!',
                fen: '1K6/1P1rk3/8/8/3R4/8/8/8 b - - 3 2',
                comment: '2. Rd4! THE GOLDEN MOVE! Placing the rook on the 4th rank. This will act as a shield (bridge) when Black gives vertical checks!',
                highlights: { d4: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '2...',
                san: '2... Rd1',
                fen: '1K6/1P2k3/8/8/3R4/8/8/3r4 w - - 4 3',
                comment: '2... Rd1. Black prepares to check the White King from behind once it leaves b8.',
                highlights: { d1: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '3. Kc7',
                fen: '8/1PK1k3/8/8/3R4/8/8/3r4 b - - 5 3',
                comment: '3. Kc7! The King steps out! Now the pawn threatens to queen.',
                highlights: { c7: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '3...',
                san: '3... Rc1+',
                fen: '8/1PK1k3/8/8/3R4/8/8/2r5 w - - 6 4',
                comment: '3... Rc1+! Black gives a vertical check.',
                highlights: { c1: BLACK_SQUARE_STYLE, c7: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '4',
                san: '4. Kb6',
                fen: '8/1P2k3/1K6/8/3R4/8/8/2r5 b - - 7 4',
                comment: '4. Kb6! White steps forward toward the 4th rank.',
                highlights: { b6: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '4...',
                san: '4... Rb1+',
                fen: '8/1P2k3/1K6/8/3R4/8/8/1r6 w - - 8 5',
                comment: '4... Rb1+! Another vertical check.',
                highlights: { b1: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '5',
                san: '5. Kc6',
                fen: '8/1P2k3/2K5/8/3R4/8/8/1r6 b - - 9 5',
                comment: '5. Kc6! Marching down.',
                highlights: { c6: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '5...',
                san: '5... Rc1+',
                fen: '8/1P2k3/2K5/8/3R4/8/8/2r5 w - - 10 6',
                comment: '5... Rc1+!',
                highlights: { c1: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '6',
                san: '6. Kb5',
                fen: '8/1P2k3/8/1K6/3R4/8/8/2r5 b - - 11 6',
                comment: '6. Kb5! Reaching the 5th rank.',
                highlights: { b5: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '6...',
                san: '6... Rb1+',
                fen: '8/1P2k3/8/1K6/3R4/8/8/1r6 w - - 12 7',
                comment: '6... Rb1+! Black thinks checks are perpetual...',
                highlights: { b1: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '7',
                san: '7. Rb4!',
                fen: '8/1P2k3/8/1K6/1R6/8/8/1r6 b - - 13 7',
                comment: '7. Rb4!! THE BRIDGE IS BUILT! The rook intercepts the check on the 4th rank. Black must trade rooks or surrender promotion. White queens next move and wins!',
                highlights: { b4: WHITE_SQUARE_STYLE, b1: BLACK_SQUARE_STYLE }
            }
        ]
    },
    {
        id: 'philidor-defense',
        chapter: 'Rook Endgames',
        title: 'The Philidor Defense: 6th Rank Cut-Off',
        subtitle: 'The most important drawing technique in Rook + Pawn vs Rook endgames.',
        question: 'How does Black secure a theoretical draw against White’s passed pawn?',
        keyIdea: '1. Hold rook on the 6th rank until the pawn advances -> 2. Once pawn advances, swing rook to the 1st rank for endless checks from behind.',
        practiceId: 'philidor-defense',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '4k3/8/8/4P3/8/8/r7/4K2R b - - 0 1',
                comment: 'Black to move and draw. White has an extra passed pawn on e5, but White’s King has not reached the 6th rank yet. Black must prevent the White King from advancing.'
            },
            {
                moveNumber: '1...',
                san: '1... Ra6!',
                fen: '4k3/8/r7/4P3/8/8/8/4K2R w - - 1 2',
                comment: '1... Ra6!! The KEY move! The rook patrols the 6th rank. The White King is completely cut off from advancing to e6, f6, or d6.',
                highlights: { a6: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2',
                san: '2. Rh7',
                fen: '4k3/7R/r7/4P3/8/8/8/4K3 b - - 2 2',
                comment: '2. Rh7. White waits or tries to create mating nets. Black simply stays calm.',
                highlights: { h7: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '2...',
                san: '2... Re6!',
                fen: '4k3/7R/4r3/4P3/8/8/8/4K3 w - - 3 3',
                comment: '2... Re6! Directly attacking the e5 pawn, tying down White’s forces.',
                highlights: { e6: BLACK_SQUARE_STYLE, e5: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '3. e6',
                fen: '4k3/7R/4P3/8/8/8/8/4K3 b - - 0 3',
                comment: '3. e6. White finally advances the pawn to the 6th rank! Since the pawn is now on e6, the White King has no shelter in front of it.',
                highlights: { e6: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '3...',
                san: '3... Re1+!',
                fen: '4k3/7R/4P3/8/8/8/8/4r3 w - - 1 4',
                comment: '3... Re1+!! Immediately drop to the 1st rank! Now Black gives relentless, endless checks from behind (Re2+, Re3+, etc.). Theoretical draw secured!',
                highlights: { e1: BLACK_SQUARE_STYLE }
            }
        ]
    },

    // Chapter 3: Pawn Endgames
    {
        id: 'key-squares-opposition',
        chapter: 'Pawn Endgames',
        title: 'Key Squares & King Opposition',
        subtitle: 'Fundamental king and pawn endgame mastery.',
        question: 'How does White utilize direct opposition to force pawn promotion?',
        keyIdea: 'Seize the direct opposition when separated by one square; outflank the enemy king to escort your pawn to queen.',
        practiceId: 'pawn-key-squares',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '8/8/4k3/8/4P3/4K3/8/8 w - - 0 1',
                comment: 'White to move and win. White has an extra pawn on e4. The Kings face each other with 2 squares in between. White must take the opposition.'
            },
            {
                moveNumber: '1',
                san: '1. Ke4!',
                fen: '8/8/4k3/8/4P3/8/4K3/8 w - - 1 1',
                comment: '1. Ke4! White takes the DIRECT OPPOSITION! The Kings are separated by an odd number of squares (1 square), and it is Black’s turn to move.',
                highlights: { e4: WHITE_SQUARE_STYLE, e6: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '1...',
                san: '1... Kd6',
                fen: '8/8/3k4/8/4P3/8/4K3/8 w - - 2 2',
                comment: '1... Kd6. Black is forced to yield the center.',
                highlights: { d6: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2',
                san: '2. Kd4!',
                fen: '8/8/3k4/8/3KP3/8/8/8 b - - 3 2',
                comment: '2. Kd4! Maintaining the opposition.',
                highlights: { d4: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '2...',
                san: '2... Ke6',
                fen: '8/8/4k3/8/3KP3/8/8/8 w - - 4 3',
                comment: '2... Ke6.',
                highlights: { e6: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '3. e5!',
                fen: '8/8/4k3/4P3/3K4/8/8/8 b - - 0 3',
                comment: '3. e5! The pawn advances safely with the King firmly protecting key infiltration squares.',
                highlights: { e5: WHITE_SQUARE_STYLE }
            }
        ]
    },
    {
        id: 'pawn-opposition',
        chapter: 'Pawn Endgames',
        title: 'The Opposition: Outflanking & Shouldering',
        subtitle: 'Seize direct opposition to outflank the defending King.',
        question: 'How does White use the opposition to escort the passed pawn?',
        keyIdea: '1. Take direct opposition (Ke3). 2. Use a waiting pawn push (e3!) to force Black to step aside. 3. Shoulder past (Kf4!) to queen.',
        practiceId: 'pawn-opposition',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '8/8/8/3k4/8/3K4/8/4P3 w - - 0 1',
                comment: 'White and Black kings face each other on the d-file. White has an extra pawn on e2. White must seize the opposition or advance purposefully.'
            },
            {
                moveNumber: '1',
                san: '1. Ke3',
                fen: '8/8/8/3k4/8/4K3/8/4P3 b - - 1 1',
                comment: '1. Ke3! White steps in front of the pawn to prepare the advance.',
                highlights: { e3: WHITE_SQUARE_STYLE, d5: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '1...',
                san: '1... Ke5',
                fen: '8/8/8/4k3/8/4K3/8/4P3 w - - 2 2',
                comment: '1... Ke5. Black takes the direct opposition! But White has spare pawn moves to turn the tables.',
                highlights: { e5: BLACK_SQUARE_STYLE, e3: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '2',
                san: '2. e3!',
                fen: '8/8/8/4k3/8/4K3/4P3/8 b - - 0 2',
                comment: '2. e3! WAITING MOVE! A pawn push wastes a tempo and forces Black to yield the opposition!',
                highlights: { e3: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '2...',
                san: '2... Kd5',
                fen: '8/8/8/3k4/8/4K3/4P3/8 w - - 1 3',
                comment: '2... Kd5. Black must step aside to the left.',
                highlights: { d5: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '3. Kf4!',
                fen: '8/8/8/3k4/5K2/4P3/8/8 b - - 2 3',
                comment: '3. Kf4! OUTFLANKING! White shoulders past the Black king on the right flank. The path for the passed pawn is clear to queen!',
                highlights: { f4: WHITE_SQUARE_STYLE }
            }
        ]
    },
    {
        id: 'pawn-7th-rook-pawn',
        chapter: 'Pawn Endgames',
        title: '7th-Rank Rook Pawn vs Queen',
        subtitle: 'Corner stalemate drawing resource against an enemy Queen.',
        question: 'How does the lone defending King force a theoretical draw against a Queen?',
        keyIdea: 'With a rook-pawn (a-pawn or h-pawn) on the 7th rank, retreat into the corner. The Queen cannot deliver checkmate or capture without stalemating the King.',
        practiceId: 'pawn-7th-rook-pawn',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '8/8/8/8/8/1k6/7P/K1Q5 b - - 0 1',
                comment: 'Black to move. White has a Queen and King, but Black has a passed rook pawn on the 7th rank and retreats to the corner.'
            },
            {
                moveNumber: '1',
                san: '1... Ka1',
                fen: '8/8/8/8/8/1k6/7P/k1Q5 w - - 1 2',
                comment: '1... Ka1! Stepping into the corner square. The Black King has no legal moves, and any immediate queen check on the corner square results in a stalemate!',
                highlights: { a1: BLACK_SQUARE_STYLE }
            }
        ]
    },
    {
        id: 'pawn-triangulation',
        chapter: 'Pawn Endgames',
        title: 'Triangulation & Zugzwang',
        subtitle: 'Pass the move to the defender via triangular King maneuvers.',
        question: 'How does the attacker lose a tempo to force Black into zugzwang?',
        keyIdea: 'Execute a 3-step triangular King march around corresponding squares. When you return to the key square, it is Black’s move, forcing them to abandon defense.',
        practiceId: 'pawn-triangulation',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '8/8/4k3/4p3/3pP3/3K4/8/8 w - - 0 1',
                comment: 'White must breach Black’s fortress. A direct advance fails, but losing a tempo forces Black to step away.'
            },
            {
                moveNumber: '1',
                san: '1. Kd2!',
                fen: '8/8/4k3/4p3/3pP3/8/3K4/8 b - - 1 1',
                comment: '1. Kd2! First leg of the King triangle maneuver.',
                highlights: { d2: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '1...',
                san: '1... Kd6',
                fen: '8/8/3k4/4p3/3pP3/8/3K4/8 w - - 2 2',
                comment: '1... Kd6. Black keeps watch on the critical infiltration squares.',
                highlights: { d6: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2',
                san: '2. Kc2!',
                fen: '8/8/3k4/4p3/3pP3/8/2K5/8 b - - 3 2',
                comment: '2. Kc2! Second leg of the triangle.',
                highlights: { c2: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '2...',
                san: '2... Kc6',
                fen: '8/8/2k5/4p3/3pP3/8/2K5/8 w - - 4 3',
                comment: '2... Kc6.',
                highlights: { c6: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '3. Kd3!',
                fen: '8/8/2k5/4p3/3pP3/3K4/8/8 b - - 5 3',
                comment: '3. Kd3! TRIANGLE COMPLETE! White returns to d3, but now it is BLACK’S turn to move. Black is in zugzwang and must cede ground!',
                highlights: { d3: WHITE_SQUARE_STYLE, c6: BLACK_SQUARE_STYLE }
            }
        ]
    },

    // Chapter 4: Minor Piece Endgames
    {
        id: 'bishop-knight-mate',
        chapter: 'Minor Piece Endgames',
        title: 'Bishop & Knight Checkmate (The W-Manoeuvre)',
        subtitle: 'The hardest fundamental checkmate in chess.',
        question: 'How do the Bishop and Knight herd the king to the correct corner?',
        keyIdea: '1. Drive enemy king to the corner matching your bishop color. 2. The Knight follows a W-shaped route (f2 -> d3 -> e5 -> c6 -> b8).',
        practiceId: 'bishop-knight-mate',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '8/8/8/8/8/4K3/5N2/4B1k1 w - - 0 1',
                comment: 'White has a Light-Squared Bishop and Knight. Checkmate can ONLY be forced in a light-squared corner (h1 or a8). The Black king is on g1.'
            },
            {
                moveNumber: '1',
                san: '1. Ke2',
                fen: '8/8/8/8/8/8/4KN2/4B1k1 b - - 1 1',
                comment: '1. Ke2. Seizing the g-file and h-file control. Black King must step to g2.',
                highlights: { e2: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '1...',
                san: '1... Kg2',
                fen: '8/8/8/8/8/8/4KNk1/4B3 w - - 2 2',
                comment: '1... Kg2.',
                highlights: { g2: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2',
                san: '2. Nd3!',
                fen: '8/8/8/8/8/3N4/4K1k1/4B3 b - - 3 2',
                comment: '2. Nd3! First step of the W-Manoeuvre! Knight moves to d3 to control dark squares e1 and f4.',
                highlights: { d3: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '2...',
                san: '2... Kh3',
                fen: '8/8/8/8/8/3N3k/4K3/4B3 w - - 4 3',
                comment: '2... Kh3. The King tries to run along the rim.',
                highlights: { h3: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '3. Kf3!',
                fen: '8/8/8/8/8/3N1K1k/8/4B3 b - - 5 3',
                comment: '3. Kf3! Locking the king against the h-file edge.',
                highlights: { f3: WHITE_SQUARE_STYLE }
            }
        ]
    }
];

export default function EndgameStrategy() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
    const [isSoundMuted, setIsSoundMuted] = useState(false);
    const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');

    // Resolve initial topic ID from URL
    const initialParam = searchParams.get('endgame') || searchParams.get('topic') || '';
    const returnIdParam = searchParams.get('returnId') || searchParams.get('return');

    // Remember the originating practice ID so changing topics in the sidebar doesn't lose the return destination
    const [originPracticeId] = useState<string | null>(() => {
        if (returnIdParam) return returnIdParam;
        if (initialParam && endgamesData.some(e => e.id === initialParam)) {
            return initialParam;
        }
        return null;
    });

    const resolvedInitialTopicId = useMemo(() => {
        if (!initialParam) return 'qvr-triangulation';
        if (initialParam === 'queen-vs-rook' || initialParam === 'queen-vs-rook-philidor') return 'qvr-triangulation';
        if (initialParam === 'queen-vs-rook-solitary-13-3') return 'qvr-herding';
        
        const match = STRATEGY_TOPICS.find(t => t.id === initialParam || t.practiceId === initialParam);
        if (match) return match.id;

        if (initialParam.startsWith('pawn-')) {
            return 'key-squares-opposition';
        }

        if (initialParam.startsWith('rook-')) {
            return 'philidor-defense';
        }

        return 'qvr-triangulation';
    }, [initialParam]);

    const [selectedTopicId, setSelectedTopicId] = useState<string>(resolvedInitialTopicId);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    // Keep active topic synchronized with URL parameter
    useEffect(() => {
        if (initialParam) {
            if (initialParam === 'queen-vs-rook' || initialParam === 'queen-vs-rook-philidor') {
                setSelectedTopicId('qvr-triangulation');
                setCurrentStepIndex(0);
                return;
            }
            if (initialParam === 'queen-vs-rook-solitary-13-3') {
                setSelectedTopicId('qvr-herding');
                setCurrentStepIndex(0);
                return;
            }
            const match = STRATEGY_TOPICS.find(t => t.id === initialParam || t.practiceId === initialParam);
            if (match && match.id !== selectedTopicId) {
                setSelectedTopicId(match.id);
                setCurrentStepIndex(0);
            } else if (!match && initialParam.startsWith('pawn-') && selectedTopicId !== 'key-squares-opposition') {
                setSelectedTopicId('key-squares-opposition');
                setCurrentStepIndex(0);
            }
        }
    }, [initialParam, selectedTopicId]);

    const currentTopic = useMemo(() => {
        return STRATEGY_TOPICS.find(t => t.id === selectedTopicId) || STRATEGY_TOPICS[0];
    }, [selectedTopicId]);

    // Destination for "Back to Practice" / Back Arrow navigation
    const backTargetId = useMemo(() => {
        const urlReturn = searchParams.get('returnId');
        if (urlReturn) return urlReturn;
        if (originPracticeId) return originPracticeId;
        return currentTopic.practiceId;
    }, [searchParams, originPracticeId, currentTopic.practiceId]);

    const currentStep: MoveStep = useMemo(() => {
        return currentTopic.steps[currentStepIndex] || currentTopic.steps[0];
    }, [currentTopic, currentStepIndex]);

    const handleSelectTopic = (id: string) => {
        setSelectedTopicId(id);
        setCurrentStepIndex(0);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('endgame', id);
            if (originPracticeId && !next.has('returnId')) {
                next.set('returnId', originPracticeId);
            }
            return next;
        });
    };

    const handleNextStep = useCallback(() => {
        if (currentStepIndex < currentTopic.steps.length - 1) {
            if (!isSoundMuted) playMoveSound();
            setCurrentStepIndex(prev => prev + 1);
        }
    }, [currentStepIndex, currentTopic.steps.length, isSoundMuted]);

    const handlePrevStep = useCallback(() => {
        if (currentStepIndex > 0) {
            if (!isSoundMuted) playMoveSound();
            setCurrentStepIndex(prev => prev - 1);
        }
    }, [currentStepIndex, isSoundMuted]);

    const handleReset = useCallback(() => {
        if (!isSoundMuted) playMoveSound();
        setCurrentStepIndex(0);
    }, [isSoundMuted]);

    const handleJumpToStep = useCallback((index: number) => {
        if (!isSoundMuted) playMoveSound();
        setCurrentStepIndex(index);
    }, [isSoundMuted]);

    // Active move ref for auto-scrolling
    const activeMoveRef = useRef<HTMLButtonElement | null>(null);

    // Auto-scroll active move button into view
    useEffect(() => {
        if (activeMoveRef.current) {
            activeMoveRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
        }
    }, [currentStepIndex]);

    // Keyboard navigation (ArrowLeft = previous move, ArrowRight = next move)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable)
            ) {
                return;
            }

            if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNextStep();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrevStep();
            } else if (e.key === 'Home') {
                e.preventDefault();
                handleReset();
            } else if (e.key === 'End') {
                e.preventDefault();
                handleJumpToStep(currentTopic.steps.length - 1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNextStep, handlePrevStep, handleReset, handleJumpToStep, currentTopic.steps.length]);

    // Group topics by chapter
    const chapters = useMemo(() => {
        const map: Record<string, StrategyTopic[]> = {};
        STRATEGY_TOPICS.forEach(topic => {
            if (!map[topic.chapter]) {
                map[topic.chapter] = [];
            }
            map[topic.chapter].push(topic);
        });
        return map;
    }, []);

    // Enforce strict rule: step 0 has ZERO highlights
    const stepHighlights = useMemo(() => {
        if (currentStepIndex === 0) return {};
        return currentStep.highlights || {};
    }, [currentStepIndex, currentStep]);

    return (
        <div className="h-screen max-h-screen flex flex-col bg-[#FAF1DB] font-sans text-plum overflow-hidden">
            {/* Top Navbar */}
            <Navbar />

            {/* 3-Column Single-Screen Workspace */}
            <div className="flex-1 flex overflow-hidden w-full relative">

                {/* ══════════════════════════════════════════════════════════════
                    LEFT COLUMN: Course Card, Tabs & Chapter Topic Tree
                ══════════════════════════════════════════════════════════════ */}
                <aside className={`transition-all duration-300 ease-in-out border-r border-slate-200 bg-white flex flex-col h-full z-20 shrink-0 ${
                    leftSidebarCollapsed ? 'w-14' : 'w-[280px] lg:w-[310px]'
                }`}>
                    {/* Collapsed view toggle button - upside-down text removed */}
                    {leftSidebarCollapsed ? (
                        <div className="p-3 flex flex-col items-center gap-3">
                            <Link
                                to={`/EndgamePractice?id=${backTargetId}`}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-berry/10 text-plum/70 hover:text-berry transition"
                                title="Back to Endgame Practice"
                            >
                                <ArrowLeft size={18} />
                            </Link>
                            <button
                                onClick={() => setLeftSidebarCollapsed(false)}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                                title="Expand Topics List"
                            >
                                <PanelLeftOpen size={18} />
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Clean Sidebar Header */}
                            <div className="p-3 border-b border-slate-100 flex items-center justify-between shrink-0">
                                <Link
                                    to={`/EndgamePractice?id=${backTargetId}`}
                                    className="flex items-center gap-1.5 text-xs font-serif font-black text-plum/80 hover:text-berry px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                    title="Back to Endgame Practice"
                                >
                                    <ArrowLeft size={14} />
                                    <span>Back to Practice</span>
                                </Link>
                                <button
                                    onClick={() => setLeftSidebarCollapsed(true)}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition shrink-0"
                                    title="Collapse Sidebar"
                                >
                                    <PanelLeftClose size={16} />
                                </button>
                            </div>

                            {/* Streamlined Interactive Topic List */}
                            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 text-left">
                                {Object.entries(chapters).map(([chapterName, topics]) => (
                                    <div key={chapterName} className="space-y-1">
                                        <div className="px-2 pt-2 pb-1 text-[11px] font-bold text-slate-400 select-none">
                                            {chapterName}
                                        </div>

                                        <div className="space-y-0.5">
                                            {topics.map((topic) => {
                                                const isActive = topic.id === selectedTopicId;

                                                return (
                                                    <button
                                                        key={topic.id}
                                                        onClick={() => handleSelectTopic(topic.id)}
                                                        className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between gap-2 ${
                                                            isActive
                                                                ? 'bg-berry text-white shadow-sm font-bold'
                                                                : 'hover:bg-slate-100 text-slate-700 font-medium'
                                                        }`}
                                                    >
                                                        <span className="text-xs truncate">
                                                            {topic.title}
                                                        </span>
                                                        {isActive && (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </aside>

                {/* ══════════════════════════════════════════════════════════════
                    CENTER COLUMN: Centered Chessboard & Under-board Controls
                ══════════════════════════════════════════════════════════════ */}
                <main className="flex-1 flex flex-col items-center justify-between p-3 lg:p-4 bg-[#f8f6f2] relative overflow-hidden h-full">
                    {/* Only show Back button above board if sidebar is collapsed */}
                    {leftSidebarCollapsed && (
                        <div className="w-full flex items-center justify-start max-w-[min(calc(100vh-175px),calc(100vw-720px),520px)] mb-2 px-1">
                            <Link
                                to={`/EndgamePractice?id=${backTargetId}`}
                                className="inline-flex items-center gap-1.5 text-xs font-serif font-black text-plum/80 hover:text-berry transition-colors group px-2.5 py-1 rounded-lg bg-white border border-plum/15 shadow-2xs"
                                title="Return to Endgame Practice"
                            >
                                <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
                                <span>Back to Practice</span>
                            </Link>
                        </div>
                    )}

                    {/* Perfectly centered square chessboard */}
                    <div className="w-full max-w-[min(calc(100vh-175px),calc(100vw-720px),520px)] aspect-square relative flex items-center justify-center">
                        <div className="w-full h-full rounded-xl overflow-hidden shadow-xl border-2 border-slate-300/80 bg-white select-none relative">
                            <Chessboard
                                options={{
                                    position: currentStep.fen,
                                    boardOrientation: boardOrientation,
                                    squareStyles: stepHighlights,
                                    darkSquareStyle: { backgroundColor: '#b58863' },
                                    lightSquareStyle: { backgroundColor: '#f0d9b5' },
                                    allowDrawingArrows: true,
                                    clearArrowsOnClick: true,
                                    arrowOptions: customArrowOptions,
                                    arrows: (currentStep.arrows as any) || [],
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
                                    animationDurationInMs: 200
                                }}
                            />
                        </div>
                    </div>

                    {/* Controls Bar under board */}
                    <div className="w-full max-w-[min(calc(100vh-175px),calc(100vw-720px),520px)] mt-2 flex items-center justify-between gap-3">
                        {/* Left/Right step navigation buttons */}
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={handlePrevStep}
                                disabled={currentStepIndex === 0}
                                className="w-10 h-10 rounded-xl bg-white border-2 border-slate-300 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none text-slate-700 flex items-center justify-center transition shadow-xs"
                                title="Previous Step (<)"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={handleNextStep}
                                disabled={currentStepIndex === currentTopic.steps.length - 1}
                                className="w-10 h-10 rounded-xl bg-white border-2 border-slate-300 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none text-slate-700 flex items-center justify-center transition shadow-xs"
                                title="Next Step (>)"
                            >
                                <ChevronRight size={20} />
                            </button>
                            <button
                                onClick={handleReset}
                                className="w-10 h-10 rounded-xl bg-white border-2 border-slate-300 hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition shadow-xs"
                                title="Reset to Step 1"
                            >
                                <RotateCcw size={16} />
                            </button>
                        </div>

                        {/* Step Counter Badge */}
                        <div className="text-xs font-bold text-slate-500 bg-white/80 px-3 py-1.5 rounded-xl border border-slate-200/80 font-mono">
                            {currentStepIndex + 1} / {currentTopic.steps.length}
                        </div>

                        {/* Main Action Button returning to practice */}
                        <Link
                            to={`/EndgamePractice?id=${backTargetId}`}
                            className="bg-berry hover:bg-berry/90 text-white px-5 py-2 rounded-xl font-serif font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-98"
                        >
                            <span>Practice in Arena</span>
                            <ChevronRight size={16} />
                        </Link>
                    </div>
                </main>

                {/* ══════════════════════════════════════════════════════════════
                    RIGHT COLUMN: Clean Move Explanations & Clickable Notation
                ══════════════════════════════════════════════════════════════ */}
                <aside className="w-[330px] lg:w-[370px] shrink-0 border-l border-slate-200 bg-white p-5 flex flex-col justify-between h-full overflow-y-auto z-20">
                    <div className="space-y-4">
                        {/* Topic Header */}
                        <div className="border-b border-slate-100 pb-3">
                            <h3 className="text-base lg:text-lg font-serif font-black text-slate-900 leading-tight">
                                {currentTopic.title}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                {currentTopic.subtitle}
                            </p>
                        </div>

                        {/* Step Commentary Card */}
                        <div className="text-sm text-slate-700 font-medium leading-relaxed bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                            {currentStep.comment}
                        </div>

                        {/* Clickable Move Notation */}
                        <div className="space-y-2">
                            <div className="text-[11px] font-bold text-slate-400">
                                Moves
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50/70 rounded-xl border border-slate-200/80 custom-scrollbar">
                                {currentTopic.steps.map((step, idx) => {
                                    const isCurrent = currentStepIndex === idx;
                                    return (
                                        <button
                                            key={idx}
                                            ref={isCurrent ? activeMoveRef : undefined}
                                            onClick={() => handleJumpToStep(idx)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                                                isCurrent
                                                    ? 'bg-berry text-white shadow-xs scale-102 ring-2 ring-berry/30'
                                                    : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                                            }`}
                                        >
                                            {step.san}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Utility Controls */}
                    <div className="pt-3 border-t border-slate-100 shrink-0">
                        <div className="flex items-center justify-between text-slate-400 px-1">
                            <button
                                onClick={() => handleNextStep()}
                                className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                title="Next Move"
                            >
                                <ChevronRight size={17} />
                            </button>
                            <button
                                onClick={() => setIsSoundMuted(!isSoundMuted)}
                                className={`p-1.5 rounded-lg transition ${isSoundMuted ? 'text-red-500 hover:bg-red-50' : 'hover:text-slate-700 hover:bg-slate-100'}`}
                                title={isSoundMuted ? 'Unmute' : 'Mute'}
                            >
                                {isSoundMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                            </button>
                            <button
                                onClick={() => setBoardOrientation(prev => prev === 'white' ? 'black' : 'white')}
                                className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                title="Flip Board"
                            >
                                <RefreshCw size={15} />
                            </button>
                            <button
                                onClick={handleReset}
                                className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                title="Restart Position"
                            >
                                <RotateCcw size={15} />
                            </button>
                            <Link
                                to={`/EndgamePractice?id=${backTargetId}`}
                                className="p-1.5 hover:text-berry hover:bg-rose-50 rounded-lg transition text-slate-400"
                                title="Practice with Engine"
                            >
                                <Swords size={16} />
                            </Link>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
