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
} from '@/lib/lucideOriginal';
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
import {
    BISHOP_KNIGHT_10_STEPS,
    BISHOP_KNIGHT_EDGE_DEFENSE_STEPS,
    BISHOP_KNIGHT_BARRIER_STEPS,
    BISHOP_KNIGHT_RAPID_MATE_STEPS
} from '../components/BishopKnightGuide';

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
                fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
                comment: 'The White pawn is on the 7th rank (b7), but the White King on b8 is trapped in front of its own pawn. Black’s rook on the 2nd rank keeps the White King from escaping freely. White must build a bridge!'
            },
            {
                moveNumber: '1',
                san: '1. Rd1+',
                fen: '1K1k4/1P6/8/8/8/8/r7/3R4 b - - 1 1',
                comment: '1. Rd1+! White checks along the d-file to drive the defending King away from the promotion file.',
                highlights: { d1: WHITE_SQUARE_STYLE, d8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '1...',
                san: '1... Ke7',
                fen: '1K6/1P2k3/8/8/8/8/r7/3R4 w - - 2 2',
                comment: '1... Ke7. Black steps aside.',
                highlights: { e7: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2',
                san: '2. Rd4!',
                fen: '1K6/1P2k3/8/8/3R4/8/r7/8 b - - 3 2',
                comment: '2. Rd4! THE GOLDEN MOVE! Placing the rook on the 4th rank. This will act as a shield (bridge) when Black gives vertical checks!',
                highlights: { d4: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '2...',
                san: '2... Ra1',
                fen: '1K6/1P2k3/8/8/3R4/8/8/r7 w - - 4 3',
                comment: '2... Ra1. Black prepares to check the White King from behind once it leaves b8.',
                highlights: { a1: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '3. Kc7',
                fen: '8/1PK1k3/8/8/3R4/8/8/r7 b - - 5 3',
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
                fen: '4k3/8/8/4P3/8/8/r7/6KR b - - 0 1',
                comment: 'Black to move and draw. White has an extra passed pawn on e5, but White’s King has not reached the 6th rank yet. Black must prevent the White King from advancing.'
            },
            {
                moveNumber: '1...',
                san: '1... Ra6!',
                fen: '4k3/8/r7/4P3/8/8/8/6KR w - - 1 2',
                comment: '1... Ra6!! The KEY move! The rook patrols the 6th rank. The White King is completely cut off from advancing to e6, f6, or d6.',
                highlights: { a6: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2',
                san: '2. Rh7',
                fen: '4k3/7R/r7/4P3/8/8/8/6K1 b - - 2 2',
                comment: '2. Rh7. White waits or tries to create mating nets. Black simply stays calm.',
                highlights: { h7: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '2...',
                san: '2... Ra5!',
                fen: '4k3/7R/8/r3P3/8/8/8/6K1 w - - 3 3',
                comment: '2... Ra5! Directly attacking the e5 pawn, tying down White’s forces.',
                highlights: { a5: BLACK_SQUARE_STYLE, e5: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '3. e6',
                fen: '4k3/7R/4P3/r7/8/8/8/6K1 b - - 0 3',
                comment: '3. e6. White finally advances the pawn to the 6th rank! Since the pawn is now on e6, the White King has no shelter in front of it.',
                highlights: { e6: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '3...',
                san: '3... Ra1+!',
                fen: '4k3/7R/4P3/8/8/8/8/r5K1 w - - 1 4',
                comment: '3... Ra1+!! Immediately drop to the 1st rank! Now Black gives relentless, endless checks from behind (Ra2+, Ra3+, etc.). Theoretical draw secured!',
                highlights: { a1: BLACK_SQUARE_STYLE }
            }
        ]
    },

    // Chapter 3: Pawn Endgames
    {
        id: 'pawn-rule-of-square',
        chapter: 'Pawn Endgames',
        title: 'The Rule of the Square',
        subtitle: 'Determine at a glance whether a runaway passed pawn can be caught without King support.',
        question: 'Can the lone defending King catch the passed pawn before it queens?',
        keyIdea: 'Draw an imaginary square from the pawn to the 8th rank. If the defending King cannot step inside the square on its turn to move, the pawn promotes untouched.',
        practiceId: 'pawn-rule-of-square',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '6k1/8/8/8/8/8/P7/7K w - - 0 1',
                comment: 'White to move. The white pawn is on its starting square a2, and the Black king is on g8. Can the pawn promote without King assistance?',
                highlights: { a2: WHITE_SQUARE_STYLE, g8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '1',
                san: '1. a4!',
                fen: '6k1/8/8/8/P7/8/8/7K b - - 0 1',
                comment: '1. a4! The pawn advances two squares. Now draw the square: vertices are a4, a8, e8, and e4. Black to move must step into this zone to catch the pawn.',
                highlights: { a4: WHITE_SQUARE_STYLE, a8: WHITE_SQUARE_STYLE, e8: WHITE_SQUARE_STYLE, e4: WHITE_SQUARE_STYLE },
                arrows: [
                    { startSquare: 'a4', endSquare: 'a8', color: '#10b981' },
                    { startSquare: 'a8', endSquare: 'e8', color: '#10b981' },
                    { startSquare: 'e8', endSquare: 'e4', color: '#10b981' },
                    { startSquare: 'e4', endSquare: 'a4', color: '#10b981' }
                ]
            },
            {
                moveNumber: '1...',
                san: '1... Kf7',
                fen: '8/5k2/8/8/P7/8/8/7K w - - 1 2',
                comment: '1... Kf7. The Black king attempts to enter the square, but it lands on f7—outside the perimeter (a4-e8).',
                highlights: { f7: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2',
                san: '2. a5!',
                fen: '8/5k2/8/P7/8/8/8/7K b - - 0 2',
                comment: '2. a5! The square shrinks immediately to a5-a8-d8-d5! Black on f7 is two files away and cannot enter.',
                highlights: { a5: WHITE_SQUARE_STYLE, a8: WHITE_SQUARE_STYLE, d8: WHITE_SQUARE_STYLE, d5: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '2...',
                san: '2... Ke6',
                fen: '8/8/4k3/P7/8/8/8/7K w - - 1 3',
                comment: '2... Ke6. Black chases in vain.',
                highlights: { e6: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '3. a6',
                fen: '8/8/P3k3/8/8/8/8/7K b - - 0 3',
                comment: '3. a6. The square is now a6-a8-c8-c6. Black cannot catch the runner.',
                highlights: { a6: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '4',
                san: '3... Kd6 4. a7 Kc7 5. a8=Q',
                fen: 'Q7/2k5/8/8/8/8/8/7K b - - 0 5',
                comment: '3... Kd6 4. a7 Kc7 5. a8=Q! The pawn crowns into a Queen with an effortless theoretical win.',
                highlights: { a8: WHITE_SQUARE_STYLE }
            }
        ]
    },
    {
        id: 'pawn-6th-rank',
        chapter: 'Pawn Endgames',
        title: 'Pawn on the 6th Rank & Opposition',
        subtitle: 'The critical 6th-rank threshold where King opposition decides win or stalemate.',
        question: 'How does White handle the King maneuvers when the pawn reaches the 6th rank?',
        keyIdea: 'When the pawn is on the 6th rank, opposition is decisive. If the stronger King claims the opposition, the pawn promotes; if the defender seizes opposition, it is a forced stalemate draw.',
        practiceId: 'pawn-6th-rank',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '1k6/8/2P5/1K6/8/8/8/8 w - - 0 1',
                comment: 'White pawn on c6, King on b5. Black King on b8. White must choose the next square carefully.',
                highlights: { b5: WHITE_SQUARE_STYLE, c6: WHITE_SQUARE_STYLE, b8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '1',
                san: '1. Kb6!',
                fen: '1k6/8/1KP5/8/8/8/8/8 b - - 1 1',
                comment: '1. Kb6! TAKING THE OPPOSITION! Not 1.Ka6? Kc8 or 1.c7+? Kc8, where Black holds the draw.',
                highlights: { b6: WHITE_SQUARE_STYLE, b8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '1...',
                san: '1... Kc8',
                fen: '2k5/8/1KP5/8/8/8/8/8 w - - 2 2',
                comment: '1... Kc8. (If 1...Ka8 2.Kc7! wins.) Black must step in front of the pawn.',
                highlights: { c8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2',
                san: '2. c7',
                fen: '2k5/2P5/1K6/8/8/8/8/8 b - - 0 2',
                comment: '2. c7! The pawn is protected by the King and Black has only one legal move.',
                highlights: { c7: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '2...',
                san: '2... Kd7',
                fen: '8/2Pk4/1K6/8/8/8/8/8 w - - 1 3',
                comment: '2... Kd7. Forced.',
                highlights: { d7: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '3. Kb7!',
                fen: '8/1KPk4/8/8/8/8/8/8 b - - 2 3',
                comment: '3. Kb7! The King clears c8 for the pawn. c8=Q follows and White wins.',
                highlights: { b7: WHITE_SQUARE_STYLE, c7: WHITE_SQUARE_STYLE }
            }
        ]
    },
    {
        id: 'pawn-key-squares',
        chapter: 'Pawn Endgames',
        title: 'Key Squares',
        subtitle: 'Pawn on the 5th rank & outflanking.',
        question: 'How does White use key squares and opposition to escort the 5th-rank pawn to queen?',
        keyIdea: '1...Ke8 2.Ke6! (taking opposition; not 2.e6? stalemate) 2...Kd8 3.Kf7! (outflanking to clear the e-file). The pawn promotes in three moves.',
        practiceId: 'pawn-key-squares',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '3k4/8/3K4/4P3/8/8/8/8 b - - 0 1',
                comment: 'Black to move. White has a pawn on e5 and King on d6. White already occupies a key square (d6). How does White respond to Black\'s defensive tries?',
                highlights: { d6: WHITE_SQUARE_STYLE, e5: WHITE_SQUARE_STYLE, d8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '1...',
                san: '1... Ke8',
                fen: '4k3/8/3K4/4P3/8/8/8/8 w - - 1 2',
                comment: '1... Ke8. Black steps directly in front of the passed pawn, attempting to hold opposition.',
                highlights: { e8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2',
                san: '2. Ke6!',
                fen: '4k3/8/4K3/4P3/8/8/8/8 b - - 2 2',
                comment: '2. Ke6! TAKING THE OPPOSITION! Crucial accuracy: playing 2.e6? Kd8 3.e7+ Ke8 4.Ke6 is stalemate! By playing 2.Ke6!, White takes the opposition and forces Black\'s King to yield.',
                highlights: { e6: WHITE_SQUARE_STYLE, e8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2...',
                san: '2... Kd8',
                fen: '3k4/8/4K3/4P3/8/8/8/8 w - - 3 3',
                comment: '2... Kd8. Black is forced to step aside to the d-file.',
                highlights: { d8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '3. Kf7!',
                fen: '3k4/5K2/8/4P3/8/8/8/8 b - - 4 3',
                comment: '3. Kf7! OUTFLANKING! The King moves to f7, completely clearing the e-file for the pawn. 3...Kd7 4.e6+ Kd6 5.e7 and 6.e8=Q. 1-0!',
                highlights: { f7: WHITE_SQUARE_STYLE }
            }
        ]
    },
    {
        id: 'pawn-key-squares-4th',
        chapter: 'Pawn Endgames',
        title: 'Key Squares: 4th-Rank Pawn',
        subtitle: 'Occupy the critical key squares two ranks ahead to guarantee promotion.',
        question: 'Why are the squares two ranks ahead of a 2nd–4th rank pawn called key squares?',
        keyIdea: 'For a pawn on the 2nd, 3rd, or 4th rank, key squares are two ranks ahead on the same and adjacent files. If the attacking King reaches any of these squares, promotion is guaranteed regardless of opposition.',
        practiceId: 'pawn-key-squares-4th',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '5k2/8/8/8/2KP4/8/8/8 w - - 0 1',
                comment: 'White pawn on d4. For a 4th-rank pawn, the key squares are two ranks ahead: c6, d6, and e6. Claiming any of these guarantees victory.',
                highlights: { c6: WHITE_SQUARE_STYLE, d6: WHITE_SQUARE_STYLE, e6: WHITE_SQUARE_STYLE, d4: WHITE_SQUARE_STYLE, c4: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '1',
                san: '1. Kd5!',
                fen: '5k2/8/8/3K4/3P4/8/8/8 b - - 1 1',
                comment: '1. Kd5! Heading straight for the c6 key square. (1.Ke5?? would blunder opposition after 1...Ke7!).',
                highlights: { d5: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '1...',
                san: '1... Ke7',
                fen: '8/4k3/8/3K4/3P4/8/8/8 w - - 2 2',
                comment: '1... Ke7. Black tries to guard d6 and e6.',
                highlights: { e7: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2',
                san: '2. Kc6!',
                fen: '8/4k3/2K5/8/3P4/8/8/8 b - - 3 2',
                comment: '2. Kc6! KEY SQUARE CLAIMED! White occupies c6. The pawn\'s coronation path is now mathematically forced.',
                highlights: { c6: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '2...',
                san: '2... Kd8',
                fen: '3k4/8/2K5/8/3P4/8/8/8 w - - 4 3',
                comment: '2... Kd8. Black retreats.',
                highlights: { d8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '3. Kd6!',
                fen: '3k4/8/3K4/8/3P4/8/8/8 b - - 5 3',
                comment: '3. Kd6! Direct opposition. Black is forced to c8, opening the d-file.',
                highlights: { d6: WHITE_SQUARE_STYLE, d8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '4',
                san: '3... Kc8 4. Ke7 Kc7 5. d5',
                fen: '8/2k1K3/8/3P4/8/8/8/8 b - - 0 5',
                comment: '3... Kc8 4. Ke7 Kc7 5. d5! The pawn marches forward protected by the king. 5...Kc8 6.d6 Kb7 7.d7 and queens on d8.',
                highlights: { d5: WHITE_SQUARE_STYLE }
            }
        ]
    },
    {
        id: 'pawn-distant-opposition',
        chapter: 'Pawn Endgames',
        title: 'Distant Opposition',
        subtitle: 'Neutralizing advanced passed pawns from afar.',
        question: 'How does the defending king save the draw when separated by multiple ranks?',
        keyIdea: 'When separated by an odd number of squares (3 or 5) along the same file, the defender holds distant opposition. As the attacker advances, distant opposition converts into direct opposition.',
        practiceId: 'pawn-distant-opposition',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '8/8/8/1kp5/8/8/8/2K5 w - - 0 1',
                comment: 'Black has an advanced passed pawn on c5 supported by the king on b5. White king is on c1. If White steps to c2 or d2, Black wins. White must find distant opposition!',
                highlights: { c1: WHITE_SQUARE_STYLE, b5: BLACK_SQUARE_STYLE, c5: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '1',
                san: '1. Kb1!',
                fen: '8/8/8/1kp5/8/8/8/1K6 b - - 1 1',
                comment: '1. Kb1!! DISTANT OPPOSITION! The kings are on the b-file separated by exactly 3 empty squares. White controls the file.',
                highlights: { b1: WHITE_SQUARE_STYLE, b5: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '1...',
                san: '1... Kb4',
                fen: '8/8/8/2p5/1k6/8/8/1K6 w - - 2 2',
                comment: '1... Kb4. Black moves down the file.',
                highlights: { b4: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2',
                san: '2. Kb2!',
                fen: '8/8/8/2p5/1k6/8/1K6/8 b - - 3 2',
                comment: '2. Kb2! DIRECT OPPOSITION! The distant opposition converts into direct opposition (1 square separation). Black cannot cross into c3 or a3.',
                highlights: { b2: WHITE_SQUARE_STYLE, b4: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2...',
                san: '2... c4',
                fen: '8/8/8/8/1kp5/8/1K6/8 w - - 0 3',
                comment: '2... c4. Black pushes the pawn in frustration.',
                highlights: { c4: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '3. Kc2 c3 4. Kc1!',
                fen: '8/8/8/8/1k6/2p5/8/2K5 b - - 1 4',
                comment: '3. Kc2 c3 4. Kc1! Staying along the pawn\'s path. Black cannot penetrate without forcing stalemate.',
                highlights: { c1: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '4',
                san: '4... Kb3 5. Kb1 c2+ 6. Kc1 Kc3',
                fen: '8/8/8/8/8/2k5/2p5/2K5 w - - 1 6',
                comment: '5. Kb1 c2+ 6. Kc1 Kc3. STALEMATE! White has no legal moves. The draw is sealed!',
                highlights: { c1: WHITE_SQUARE_STYLE, c3: BLACK_SQUARE_STYLE }
            }
        ]
    },
    {
        id: 'pawn-rook-corner',
        chapter: 'Pawn Endgames',
        title: 'Rook Pawn Corner Defense',
        subtitle: 'Imprisoning the attacking King on the rim.',
        question: 'Why is a rook pawn the easiest passed pawn to defend against?',
        keyIdea: 'Against a rook pawn, placing the defending King in front of the pawn is an ironclad draw, but occupying the two nearest bishop-file squares (c1/c2 for an a-pawn) also locks the attacking King into a forced stalemate.',
        practiceId: 'pawn-rook-corner',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '8/8/8/8/p7/1k6/8/3K4 w - - 0 1',
                comment: 'Black threatens 1...Kb2, securing the pawn\'s path to a1. White\'s king on d1 must act decisively.',
                highlights: { d1: WHITE_SQUARE_STYLE, b3: BLACK_SQUARE_STYLE, a4: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '1',
                san: '1. Kc1!',
                fen: '8/8/8/8/p7/1k6/8/2K5 b - - 1 1',
                comment: '1. Kc1! Preventing 1...Kb2 and threatening 2.Kb1 to blockade.',
                highlights: { c1: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '1...',
                san: '1... Ka2',
                fen: '8/8/8/8/p7/8/k7/2K5 w - - 2 2',
                comment: '1... Ka2. Black prevents 2.Kb1, but steps onto the edge of the board.',
                highlights: { a2: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2',
                san: '2. Kc2!',
                fen: '8/8/8/8/p7/8/k1K5/8 b - - 3 2',
                comment: '2. Kc2! THE IMPRISONMENT! White confines the black king to the a-file. White will simply oscillate between c1 and c2.',
                highlights: { c2: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '2... a3 3. Kc1 Ka1 4. Kc2 a2 5. Kc1',
                fen: '8/8/8/8/8/8/p7/k1K5 b - - 0 5',
                comment: '2... a3 3. Kc1 Ka1 4. Kc2 a2 5. Kc1! STALEMATE! Black cannot make a single legal move. Even with multiple doubled pawns, it is a forced draw!',
                highlights: { c1: WHITE_SQUARE_STYLE }
            }
        ]
    },
    {
        id: 'pawn-trebuchet',
        chapter: 'Pawn Endgames',
        title: 'Mutual Zugzwang & Trebuchet',
        subtitle: 'Reserving the critical tempo in reciprocal attack positions.',
        question: 'What is the outcome when both kings attack each other\'s blocked pawn?',
        keyIdea: 'In the Trebuchet, both kings defend their own pawn while attacking the opponent\'s. The player whose turn it is to move must give way and lose their pawn.',
        practiceId: 'pawn-trebuchet',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '8/8/8/3Kp3/4Pk2/8/8/8 b - - 0 1',
                comment: 'The Trebuchet position: White King on d5 attacks e5 and protects e4; Black King on f4 attacks e4 and protects e5. Black to move is in mutual zugzwang!',
                highlights: { d5: WHITE_SQUARE_STYLE, e4: WHITE_SQUARE_STYLE, f4: BLACK_SQUARE_STYLE, e5: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '1...',
                san: '1... Kg4',
                fen: '8/8/8/3Kp3/4P1k1/8/8/8 w - - 1 2',
                comment: '1... Kg4. ZUGZWANG! Any king move abandons defense of the e5 pawn. (1...Kf3 loses e5 immediately).',
                highlights: { g4: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2',
                san: '2. Kxe5!',
                fen: '8/8/8/4K3/4P1k1/8/8/8 b - - 0 2',
                comment: '2. Kxe5! White captures the pawn while keeping the e4 pawn securely defended.',
                highlights: { e5: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '2...',
                san: '2... Kf3',
                fen: '8/8/8/4K3/4P3/5k2/8/8 w - - 1 3',
                comment: '2... Kf3. Black tries to attack e4.',
                highlights: { f3: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '3. Kd5! Kf4 4. e5 Kf5 5. e6 Kf6 6. Kd6!',
                fen: '8/8/3KPk2/8/8/8/8/8 b - - 1 6',
                comment: '3. Kd5! Kf4 4. e5 Kf5 5. e6 Kf6 6. Kd6! White claims the key square d6. The pawn promotes to Queen on e8. White wins!',
                highlights: { d6: WHITE_SQUARE_STYLE, e6: WHITE_SQUARE_STYLE }
            }
        ]
    },
    {
        id: 'pawn-reti-maneuver',
        chapter: 'Pawn Endgames',
        title: 'Dual-Purpose King Maneuver',
        subtitle: 'Diagonal geometry to chase a runner while supporting your own pawn.',
        question: 'How can a King far outside the square of an enemy pawn save the game?',
        keyIdea: 'Diagonal king moves create two threats at once: threatening to enter the square of the enemy runner and threatening to support your own passed pawn.',
        practiceId: 'pawn-reti-maneuver',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '7K/8/k1P5/8/7p/8/8/8 w - - 0 1',
                comment: 'White King on h8 is hopelessly outside the square of Black’s h4 pawn (h4-h1-e1-e4). Black King on a6 easily blockades c6. White to move creates an extraordinary draw!',
                highlights: { h8: WHITE_SQUARE_STYLE, c6: WHITE_SQUARE_STYLE, a6: BLACK_SQUARE_STYLE, h4: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '1',
                san: '1. Kg7!',
                fen: '8/6K1/k1P5/8/7p/8/8/8 b - - 1 1',
                comment: '1. Kg7! DUAL-PURPOSE MOVE! White steps diagonally toward both the h-pawn and the c-pawn!',
                highlights: { g7: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '1...',
                san: '1... h3',
                fen: '8/6K1/k1P5/8/8/7p/8/8 w - - 0 2',
                comment: '1... h3. Black pushes the runner.',
                highlights: { h3: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2',
                san: '2. Kf6!',
                fen: '8/8/k1P2K2/8/8/7p/8/8 b - - 1 2',
                comment: '2. Kf6! Still chasing both goals! White threatens 3.Ke7 h2 4.c7 Kb7 5.Kd7 queening both pawns, AND steps closer to the h-pawn.',
                highlights: { f6: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '2...',
                san: '2... Kb6',
                fen: '8/8/1kP2K2/8/8/7p/8/8 w - - 2 3',
                comment: '2... Kb6. Black must spend a tempo with the king to stop 3.c7.',
                highlights: { b6: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '3. Ke5!',
                fen: '8/8/1kP5/4K3/8/7p/8/8 b - - 3 3',
                comment: '3. Ke5!! THE CLIMAX! White threatens both 4.Kd6 (supporting c6) and 4.Kf4 (catching the h-pawn)!',
                highlights: { e5: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '4',
                san: '3... Kxc6 4. Kf4! h2 5. Kg3',
                fen: '8/8/2k5/8/8/6K1/7p/8 b - - 1 5',
                comment: '3... Kxc6 4. Kf4! h2 5. Kg3 h1=Q 6. Kxh1=. White steps inside the square and captures the pawn. A legendary theoretical draw!',
                highlights: { g3: WHITE_SQUARE_STYLE }
            }
        ]
    },
    {
        id: 'pawn-triangulation',
        chapter: 'Pawn Endgames',
        title: 'Triangulation Maneuver',
        subtitle: 'Losing a move to break a fortress via corresponding squares.',
        question: 'How does the attacking king lose a move to put Black into fatal zugzwang?',
        keyIdea: '1. Kd5 Kc8 2. Kd4! Kd8 3. Kc4! Kc8 4. Kd5! Kc7 (4... Kd8 5. Kd6 Kc8 6. c7 Kb7 7. Kd7 Ka7 8. Kc6 +- (8. c8=Q stalemate)) 5. Kc5! Kc8 6. Kb6 Kb8 7. Kxa6 Kc7 8. Kb5 1-0.',
        practiceId: 'pawn-triangulation',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '8/2k5/p1P5/P1K5/8/8/8/8 w - - 0 1',
                comment: 'White King on c5, pawns on a5 and c6. Black King on c7, pawn on a6. A direct advance fails, but White can triangulate on d5-d4-c4 to transfer the move to Black!',
                highlights: { c5: WHITE_SQUARE_STYLE, c7: BLACK_SQUARE_STYLE, c6: WHITE_SQUARE_STYLE, a5: WHITE_SQUARE_STYLE, a6: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '1',
                san: '1. Kd5',
                fen: '8/2k5/p1P5/P2K4/8/8/8/8 b - - 1 1',
                comment: '1. Kd5! White steps to d5, attacking both c5 and d6. Black must retreat.',
                highlights: { d5: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '1...',
                san: '1... Kc8',
                fen: '2k5/8/p1P5/P2K4/8/8/8/8 w - - 2 2',
                comment: '1... Kc8. Black retreats along the 8th rank to guard c7.',
                highlights: { c8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2',
                san: '2. Kd4!',
                fen: '2k5/8/p1P5/P7/3K4/8/8/8 b - - 3 2',
                comment: '2. Kd4! First step of the triangle! White drops back, keeping an eye on both c5 and d5.',
                highlights: { d4: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '2...',
                san: '2... Kd8',
                fen: '3k4/8/p1P5/P7/3K4/8/8/8 w - - 4 3',
                comment: '2... Kd8. Black mirrors White\'s retreat.',
                highlights: { d8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '3. Kc4!',
                fen: '3k4/8/p1P5/P7/2K5/8/8/8 b - - 5 3',
                comment: '3. Kc4! Second step of the triangle! White attacks c5 and d5. Black cannot cover both c7 and d8.',
                highlights: { c4: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '3...',
                san: '3... Kc8',
                fen: '2k5/8/p1P5/P7/2K5/8/8/8 w - - 6 4',
                comment: '3... Kc8. Forced to step back to c8.',
                highlights: { c8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '4',
                san: '4. Kd5!',
                fen: '2k5/8/p1P5/P2K4/8/8/8/8 b - - 7 4',
                comment: '4. Kd5! Completing the triangle! Now Black faces a critical choice: 4...Kc7 or 4...Kd8. (If 4... Kd8 5. Kd6 Kc8 6. c7 Kb7 7. Kd7 Ka7 8. Kc6! +- (not 8. c8=Q?? stalemate!) White wins immediately).',
                highlights: { d5: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '4...',
                san: '4... Kc7',
                fen: '8/2k5/p1P5/P2K4/8/8/8/8 w - - 8 5',
                comment: '4... Kc7. Black steps to c7, but now it is White to move with the King on d5!',
                highlights: { c7: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '5',
                san: '5. Kc5!',
                fen: '8/2k5/p1P5/P1K5/8/8/8/8 b - - 9 5',
                comment: '5. Kc5! TRIANGULATION COMPLETE! We have returned to the initial position, but now it is BLACK to move! Black is in zugzwang.',
                highlights: { c5: WHITE_SQUARE_STYLE, c7: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '5...',
                san: '5... Kc8',
                fen: '2k5/8/p1P5/P1K5/8/8/8/8 w - - 10 6',
                comment: '5... Kc8. Black must surrender defense of the a6 pawn.',
                highlights: { c8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '6',
                san: '6. Kb6! Kb8 7. Kxa6 Kc7 8. Kb5',
                fen: '8/2k5/2P5/PK6/8/8/8/8 b - - 0 8',
                comment: '6. Kb6! Kb8 7. Kxa6 Kc7 8. Kb5! White securely defends the c6 pawn with a decisive winning advantage. 1-0!',
                highlights: { b6: WHITE_SQUARE_STYLE, b5: WHITE_SQUARE_STYLE }
            }
        ]
    },
    {
        id: 'pawn-outside-passed',
        chapter: 'Pawn Endgames',
        title: 'Outside Passed Pawn Decoy',
        subtitle: 'Diverting the enemy King to sweep the opposite wing.',
        question: 'Why is an outside passed pawn such an overwhelming strategic advantage?',
        keyIdea: 'An outside passed pawn acts as a decoy: the enemy king is drawn far to the perimeter to eliminate it, while your king penetrates the center and sweeps the opponent\'s pawns.',
        practiceId: 'pawn-outside-passed',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '8/8/4k3/1p2p3/1P2K3/8/7P/8 w - - 0 1',
                comment: 'White has an outside passed pawn on h2. Pawns are locked on b4/b5 and e4/e5. White uses the h-pawn as a decoy to win.',
                highlights: { h2: WHITE_SQUARE_STYLE, e4: WHITE_SQUARE_STYLE, e6: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '1',
                san: '1. h4!',
                fen: '8/8/4k3/1p2p3/1P2K2P/8/8/8 b - - 0 1',
                comment: '1. h4! Advance immediately! Never let the enemy King blockade the pawn on its starting square.',
                highlights: { h4: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '1...',
                san: '1... Kf6',
                fen: '8/8/5k2/1p2p3/1P2K2P/8/8/8 w - - 1 2',
                comment: '1... Kf6. Black must turn toward the runner.',
                highlights: { f6: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2',
                san: '2. h5!',
                fen: '8/8/5k2/1p2p2P/1P2K3/8/8/8 b - - 0 2',
                comment: '2. h5! Pushing further, luring the black king even deeper into the corner.',
                highlights: { h5: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '2...',
                san: '2... Kg5',
                fen: '8/8/8/1p2p1kP/1P2K3/8/8/8 w - - 1 3',
                comment: '2... Kg5. Black heads to capture.',
                highlights: { g5: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '3. Kxe5!',
                fen: '8/8/8/1p2K1kP/1P6/8/8/8 b - - 0 3',
                comment: '3. Kxe5! THE DECOY SUCCEEDS! While Black captures on h5, White\'s king begins cleaning up.',
                highlights: { e5: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '4',
                san: '3... Kxh5 4. Kd5! Kg6 5. Kc5',
                fen: '8/8/6k1/1pK5/1P6/8/8/8 b - - 1 5',
                comment: '3... Kxh5 4. Kd5! Kg6 5. Kc5! White easily captures the b5 pawn and marches the b-pawn to queen.',
                highlights: { c5: WHITE_SQUARE_STYLE }
            }
        ]
    },
    {
        id: 'pawn-breakthrough',
        chapter: 'Pawn Endgames',
        title: 'Tactical Pawn Breakthrough',
        subtitle: 'Sacrificial levers to force a passed pawn through equal numbers.',
        question: 'How can 3 pawns break through an opposing 3-pawn wall without King assistance?',
        keyIdea: 'Push the middle pawn (1.b6!). Whichever flank pawn Black captures with, push the opposite flank pawn (2.c6! or 2.a6!) to deflect the remaining defender and queen untouched.',
        practiceId: 'pawn-breakthrough',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '8/ppp5/8/PPP5/8/4k3/8/4K3 w - - 0 1',
                comment: 'White has pawns on a5, b5, and c5 facing Black\'s a7, b7, and c7. Kings are passive. White can force a pawn promotion in 3 moves!',
                highlights: { a5: WHITE_SQUARE_STYLE, b5: WHITE_SQUARE_STYLE, c5: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '1',
                san: '1. b6!',
                fen: '8/ppp5/1P6/P1P5/8/4k3/8/4K3 b - - 0 1',
                comment: '1. b6!! THE SACRIFICIAL LEVER! White attacks both a7 and c7 simultaneously. Black has no choice but to capture.',
                highlights: { b6: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '1...',
                san: '1... axb6',
                fen: '8/1pp5/1p6/P1P5/8/4k3/8/4K3 w - - 0 2',
                comment: '1... axb6. Black captures with the a-pawn. (If 1...cxb6, White plays 2.a6! bxa6 3.c6! and the c-pawn queens).',
                highlights: { b6: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2',
                san: '2. c6!!',
                fen: '8/1pp5/1pP5/P7/8/4k3/8/4K3 b - - 0 2',
                comment: '2. c6!! THE SECOND SACRIFICE! Threatening 3.cxb7 and queening. Black is forced to capture 2...bxc6.',
                highlights: { c6: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '2...',
                san: '2... bxc6',
                fen: '8/2p5/1pp5/P7/8/4k3/8/4K3 w - - 0 3',
                comment: '2... bxc6. Black captures the second offering.',
                highlights: { c6: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '3. a6!',
                fen: '8/2p5/Ppp5/8/8/4k3/8/4K3 b - - 0 3',
                comment: '3. a6! THE RUNNER BREAKS FREE! The a-pawn has a clear runway to a8. Black cannot stop it.',
                highlights: { a6: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '4',
                san: '3... c5 4. a7 c4 5. a8=Q',
                fen: 'Q7/2p5/1p6/8/2p5/4k3/8/4K3 b - - 0 5',
                comment: '3... c5 4. a7 c4 5. a8=Q! White queens with a decisive checkmate soon to follow!',
                highlights: { a8: WHITE_SQUARE_STYLE }
            }
        ]
    },

    // Chapter 4: Minor Piece Endgames - Bishop & Knight
    {
        id: 'bishop-knight-mate',
        chapter: 'Minor Piece Endgames',
        title: 'Ending 93: 10-Step Method (34 Moves)',
        subtitle: 'Position 13.4: Complete logical sequence from worst starting placement to mate.',
        question: 'How do King, Bishop, and Knight coordinate to herd Black from center to mate?',
        keyIdea: '1. Centralise King & Knight -> 2. Drive to Safe Corner a8 -> 3. Occupy Pivotal Square c6 -> 4. Philidor W-path & 20.Be3! -> 5. Lock in The Cage -> 6. Two consecutive checks mate.',
        practiceId: 'bishop-knight-mate',
        steps: BISHOP_KNIGHT_10_STEPS
    },
    {
        id: 'bn-w-manoeuvre',
        chapter: 'Minor Piece Endgames',
        title: 'Philidor\'s W-Manoeuvre (Edge 18...Kd8)',
        subtitle: 'When Black clings to the 8th rank rim, White traces the full W-shape jump.',
        question: 'How does the Knight jump between 7th and 5th ranks to sweep the defending king along the edge?',
        keyIdea: 'Knight traces c7 -> d5 -> e7 -> f5 -> g7/h6, controlling opposite-colored squares to the Bishop while the Bishop covers diagonals.',
        practiceId: 'bishop-knight-mate',
        steps: BISHOP_KNIGHT_EDGE_DEFENSE_STEPS
    },
    {
        id: 'bn-barriers-cage',
        chapter: 'Minor Piece Endgames',
        title: 'Barriers & The Cage (Pos 13.1–13.3)',
        subtitle: 'Understanding coordinated same-colour walls, 20.Be3! containment, and the 4-square cage.',
        question: 'How do the Bishop and Knight combine to erect impenetrable walls across the board?',
        keyIdea: 'Placing Bishop and Knight on same-coloured squares creates an interlocking diagonal mesh that completely prevents the enemy King from escaping.',
        practiceId: 'bishop-knight-mate',
        steps: BISHOP_KNIGHT_BARRIER_STEPS
    },
    {
        id: 'bn-rapid-mate',
        chapter: 'Minor Piece Endgames',
        title: 'Rapid 14-Move Mate (Exercise 2.23)',
        subtitle: 'Forced conversion under 50-move clock pressure.',
        question: 'How does White force checkmate in just 14 moves when already 30 moves into the 50-move limit?',
        keyIdea: '1.Nd7! pure tactics, sealing off escape -> 3.Bb5! -> 5.Nd5+ building the cage -> King steps to c7 -> 13.Bb7+ -> 14.Nc6# mate.',
        practiceId: 'bishop-knight-mate',
        steps: BISHOP_KNIGHT_RAPID_MATE_STEPS
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
        if (initialParam === 'bishop-knight-mate' || initialParam.startsWith('bn-')) {
            const match = STRATEGY_TOPICS.find(t => t.id === initialParam);
            return match ? match.id : 'bishop-knight-mate';
        }

        const match = STRATEGY_TOPICS.find(t => t.id === initialParam || t.practiceId === initialParam);
        if (match) return match.id;

        if (initialParam.startsWith('pawn-')) {
            return 'pawn-rule-of-square';
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
            if (initialParam === 'bishop-knight-mate' || initialParam.startsWith('bn-')) {
                const targetId = STRATEGY_TOPICS.some(t => t.id === initialParam) ? initialParam : 'bishop-knight-mate';
                if (selectedTopicId !== targetId) {
                    setSelectedTopicId(targetId);
                    setCurrentStepIndex(0);
                }
                return;
            }
            const match = STRATEGY_TOPICS.find(t => t.id === initialParam || t.practiceId === initialParam);
            if (match && match.id !== selectedTopicId) {
                setSelectedTopicId(match.id);
                setCurrentStepIndex(0);
            } else if (!match && initialParam.startsWith('pawn-') && selectedTopicId !== 'pawn-rule-of-square') {
                setSelectedTopicId('pawn-rule-of-square');
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
        <div className="h-screen h-[100dvh] max-h-[100dvh] flex flex-col bg-[#FAF1DB] font-sans text-plum overflow-hidden">
            {/* Top Navbar */}
            <Navbar />

            {/* 3-Column Single-Screen Workspace */}
            <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden w-full relative">

                {/* ══════════════════════════════════════════════════════════════
                    LEFT COLUMN: Course Card, Tabs & Chapter Topic Tree
                ══════════════════════════════════════════════════════════════ */}
                <aside className={`transition-all duration-300 ease-in-out border-r border-slate-200 bg-white hidden md:flex flex-col h-full z-20 shrink-0 ${leftSidebarCollapsed ? 'w-14' : 'w-[280px] lg:w-[310px]'
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
                                                        className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between gap-2 ${isActive
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
                <main className="flex-none md:flex-1 flex flex-col items-center justify-between p-2 md:p-3 lg:p-4 bg-[#f8f6f2] relative md:overflow-hidden md:h-full">
                    {/* Mobile topic picker (replaces the sidebar on small screens) */}
                    <div className="md:hidden w-full mb-2 flex items-center gap-2">
                        <Link
                            to={`/EndgamePractice?id=${backTargetId}`}
                            className="w-10 h-10 shrink-0 rounded-xl bg-white border-2 border-slate-300 text-plum flex items-center justify-center"
                            aria-label="Back to Practice"
                        >
                            <ArrowLeft size={18} />
                        </Link>
                        <select
                            value={selectedTopicId}
                            onChange={(e) => handleSelectTopic(e.target.value)}
                            className="flex-1 min-w-0 h-10 rounded-xl border-2 border-slate-300 bg-white px-3 text-sm font-bold text-plum"
                            aria-label="Choose topic"
                        >
                            {Object.entries(chapters).map(([chapterName, topics]) => (
                                <optgroup key={chapterName} label={chapterName}>
                                    {topics.map((topic) => (
                                        <option key={topic.id} value={topic.id}>{topic.title}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    {/* Only show Back button above board if sidebar is collapsed */}
                    {leftSidebarCollapsed && (
                        <div className="hidden md:flex w-full items-center justify-start max-w-[min(100%,max(240px,calc(100dvh-395px)),520px)] md:max-w-[min(calc(100vh-175px),calc(100vw-720px),520px)] mb-2 px-1">
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
                    <div className="w-full max-w-[min(100%,max(240px,calc(100dvh-395px)),520px)] md:max-w-[min(calc(100vh-175px),calc(100vw-720px),520px)] aspect-square relative flex items-center justify-center">
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
                    <div className="w-full max-w-[min(100%,520px)] md:max-w-[min(calc(100vh-175px),calc(100vw-720px),520px)] mt-2 flex items-center justify-between gap-2 md:gap-3">
                        {/* Left/Right step navigation buttons */}
                        <div className="flex items-center gap-1 md:gap-1.5">
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
                            <button
                                onClick={() => setBoardOrientation(prev => prev === 'white' ? 'black' : 'white')}
                                className="md:hidden w-10 h-10 rounded-xl bg-white border-2 border-slate-300 text-slate-500 flex items-center justify-center transition shadow-xs"
                                title="Flip Board"
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>

                        {/* Step Counter Badge */}
                        <div className="text-xs font-bold text-slate-500 bg-white/80 px-2 md:px-3 py-1.5 rounded-xl border border-slate-200/80 font-mono whitespace-nowrap">
                            {currentStepIndex + 1} / {currentTopic.steps.length}
                        </div>

                        {/* Main Action Button returning to practice */}
                        <Link
                            to={`/EndgamePractice?id=${backTargetId}`}
                            className="bg-berry hover:bg-berry/90 text-white px-2.5 sm:px-5 h-10 md:h-auto md:py-2 rounded-xl font-serif font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all active:scale-98"
                        >
                            <span className="hidden sm:inline">Practice in Arena</span>
                            <span className="sm:hidden">Practice</span>
                            <ChevronRight size={16} />
                        </Link>
                    </div>
                </main>

                {/* ══════════════════════════════════════════════════════════════
                    RIGHT COLUMN: Clean Move Explanations & Clickable Notation
                ══════════════════════════════════════════════════════════════ */}
                <aside className="w-full md:w-[330px] lg:w-[370px] shrink-0 border-t md:border-t-0 md:border-l border-slate-200 bg-white p-3 md:p-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col justify-between md:h-full md:overflow-y-auto z-20">
                    <div className="space-y-2 md:space-y-4">
                        {/* Topic Header */}
                        <div className="hidden md:block border-b border-slate-100 pb-3">
                            <h3 className="text-base lg:text-lg font-serif font-black text-slate-900 leading-tight">
                                {currentTopic.title}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                {currentTopic.subtitle}
                            </p>
                        </div>

                        {/* Step Commentary Card */}
                        <div className="text-[13px] md:text-sm text-slate-700 font-medium leading-snug md:leading-relaxed bg-slate-50/70 p-2.5 md:p-4 rounded-xl border border-slate-100 max-h-24 overflow-y-auto md:max-h-none">
                            {currentStep.comment}
                        </div>

                        {/* Clickable Move Notation */}
                        <div className="space-y-1 md:space-y-2">
                            <div className="hidden md:block text-[11px] font-bold text-slate-400">
                                Moves
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-[4.5rem] md:max-h-48 overflow-y-auto p-2 bg-slate-50/70 rounded-xl border border-slate-200/80 custom-scrollbar">
                                {currentTopic.steps.map((step, idx) => {
                                    const isCurrent = currentStepIndex === idx;
                                    return (
                                        <button
                                            key={idx}
                                            ref={isCurrent ? activeMoveRef : undefined}
                                            onClick={() => handleJumpToStep(idx)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${isCurrent
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
                    <div className="hidden md:block pt-3 border-t border-slate-100 shrink-0">
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
