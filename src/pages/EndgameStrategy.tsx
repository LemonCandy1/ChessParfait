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
    ArrowLeft,
    History,
    X
} from '@/lib/lucideOriginal';
import Navbar from '../components/Navbar/Navbar';
import { Link, useSearchParams } from 'react-router-dom';
import { playMoveSound } from '../lib/soundEffects';
import endgamesData from '../data/endgames.json';
import { useAuth } from '../context/AuthContext';
import { readLastAccessed, timeAgo, writeLastAccessed, type LastStrategy } from '../lib/lastAccessed';
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

/**
 * Highlights for the Rule of the Square: tints every square between the pawn and its
 * promotion rank, marks the pawn, and marks the defending king.
 */
const SQUARE_ZONE_STYLE: React.CSSProperties = { backgroundColor: 'rgba(16, 185, 129, 0.3)' };
/** Squares the defending side must keep the attacker out of. */
const DANGER_ZONE_STYLE: React.CSSProperties = { backgroundColor: 'rgba(220, 38, 38, 0.3)' };

/** Arrow colours match the square styles: green for White's ideas, red for Black's. */
const WHITE_ARROW = '#059669';
const BLACK_ARROW = '#dc2626';

const arrow = (startSquare: string, endSquare: string, color = WHITE_ARROW) => ({ startSquare, endSquare, color });

/** Tints every square in a rectangle, e.g. zone('e', 'h', 1, 4) for the square of a pawn on h4 heading to h1. */
function zone(fromFile: string, toFile: string, fromRank: number, toRank: number, style = SQUARE_ZONE_STYLE) {
    const highlights: Record<string, React.CSSProperties> = {};
    for (let f = fromFile.charCodeAt(0); f <= toFile.charCodeAt(0); f++) {
        for (let r = fromRank; r <= toRank; r++) highlights[`${String.fromCharCode(f)}${r}`] = style;
    }
    return highlights;
}

function ruleOfSquare(pawn: string, king: string): Pick<MoveStep, 'highlights'> {
    const file = pawn.charCodeAt(0) - 97;
    const rank = Number(pawn[1]);
    const size = 8 - rank;
    const highlights: Record<string, React.CSSProperties> = {};
    for (let f = file; f <= Math.min(7, file + size); f++) {
        for (let r = rank; r <= 8; r++) {
            highlights[`${String.fromCharCode(97 + f)}${r}`] = SQUARE_ZONE_STYLE;
        }
    }
    highlights[pawn] = WHITE_SQUARE_STYLE;
    highlights[king] = BLACK_SQUARE_STYLE;
    return { highlights };
}

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
        steps: FORK_VARIATIONS.find(v => v.id === 'rb1')?.steps || []
    },
    {
        id: 'qvr-fork-rh7',
        chapter: 'Queen vs Rook Mastery',
        title: 'Double Attack: 3... Rh7 Fork',
        subtitle: 'Winning the rook when Black slides along the 7th rank.',
        question: 'How does White break Black’s 7th-rank defense?',
        keyIdea: 'Diagonal check on e5, back-rank check on a1, and deliver the devastating royal fork on b1.',
        practiceId: 'queen-vs-rook-philidor',
        steps: FORK_VARIATIONS.find(v => v.id === 'rh7')?.steps || []
    },
    {
        id: 'qvr-fork-rb3',
        chapter: 'Queen vs Rook Mastery',
        title: 'Double Attack: 3... Rb3 Fork',
        subtitle: 'Winning the rook when Black defends along the 3rd rank.',
        question: 'How does White punish 3... Rb3?',
        keyIdea: 'Check on d8, centralize with check on d4, then fork king and rook with 6.Qa4+.',
        practiceId: 'queen-vs-rook-philidor',
        steps: FORK_VARIATIONS.find(v => v.id === 'rb3')?.steps || []
    },
    {
        id: 'qvr-fork-rb2',
        chapter: 'Queen vs Rook Mastery',
        title: 'Double Attack: 3... Rb2 Fork',
        subtitle: 'Winning the rook when Black defends along the 2nd rank.',
        question: 'How does White punish 3... Rb2?',
        keyIdea: 'Check on d8 to force the king to a7, then 5.Qd4+ hits the king and the rook on b2 at the same time.',
        practiceId: 'queen-vs-rook-philidor',
        steps: FORK_VARIATIONS.find(v => v.id === 'rb2')?.steps || []
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
                highlights: { d1: WHITE_SQUARE_STYLE, d8: BLACK_SQUARE_STYLE },
                arrows: [arrow('c1', 'd1'), arrow('d1', 'd8')]
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
                highlights: { d4: WHITE_SQUARE_STYLE },
                arrows: [arrow('d1', 'd4')]
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
                comment: '7. Rb4! THE BRIDGE IS BUILT! The rook blocks the check on the 4th rank and Black has no more useful checks. The pawn queens next and White wins.',
                highlights: { b4: WHITE_SQUARE_STYLE, b1: BLACK_SQUARE_STYLE },
                arrows: [arrow('d4', 'b4')]
            }
        ]
    },
    {
        id: 'philidor-defense',
        chapter: 'Rook Endgames',
        title: 'The Philidor Defense: 6th Rank Cut-Off',
        subtitle: 'The most important drawing technique in Rook + Pawn vs Rook endgames.',
        question: 'How does Black secure a theoretical draw against White’s passed pawn?',
        keyIdea: '1. Keep the rook on the 6th rank (...Rb6!) so the white king cannot advance -> 2. The moment the pawn reaches e6, drop the rook to the 1st rank (...Rb1!) and check from behind.',
        practiceId: 'philidor-defense',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '4k3/7R/8/3KP3/8/8/8/1r6 b - - 0 1',
                comment: 'Black to move. The black king stands on the queening square, and White’s rook on h7 cuts it off on the back rank. White threatens Kd6 or Ke6 followed by Rh8 mate, so Black must keep the white king off the 6th rank.',
                arrows: [arrow('d5', 'd6'), arrow('h7', 'h8')]
            },
            {
                moveNumber: '1...',
                san: '1... Rb6!',
                fen: '4k3/7R/1r6/3KP3/8/8/8/8 w - - 1 2',
                comment: '1... Rb6! The key move. The rook guards the whole 6th rank, so the white king cannot reach d6, e6 or f6. If White waits, Black waits along the 6th rank too. (Passive 1...Rb8? loses to 2.Rh8+, skewering king and rook.)',
                highlights: { b6: BLACK_SQUARE_STYLE, d6: DANGER_ZONE_STYLE, e6: DANGER_ZONE_STYLE, f6: DANGER_ZONE_STYLE },
                arrows: [arrow('b1', 'b6', BLACK_ARROW), arrow('b6', 'g6', BLACK_ARROW)]
            },
            {
                moveNumber: '2',
                san: '2. e6',
                fen: '4k3/7R/1r2P3/3K4/8/8/8/8 b - - 0 2',
                comment: '2. e6. The only way to make progress is to push the pawn. But now the pawn no longer shelters the white king: there is no square in front of it to hide from checks from behind.',
                highlights: { e6: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '2...',
                san: '2... Rb1!',
                fen: '4k3/7R/4P3/3K4/8/8/8/1r6 w - - 1 3',
                comment: '2... Rb1! Now the rook leaves the 6th rank and goes as far away as possible, ready to check from behind.',
                highlights: { b1: BLACK_SQUARE_STYLE },
                arrows: [arrow('b6', 'b1', BLACK_ARROW)]
            },
            {
                moveNumber: '3',
                san: '3. Kd6',
                fen: '4k3/7R/3KP3/8/8/8/8/1r6 b - - 2 3',
                comment: '3. Kd6. The white king steps forward and threatens Rh8 mate.',
                highlights: { d6: WHITE_SQUARE_STYLE },
                arrows: [arrow('h7', 'h8')]
            },
            {
                moveNumber: '3...',
                san: '3... Rd1+',
                fen: '4k3/7R/3KP3/8/8/8/8/3r4 w - - 3 4',
                comment: '3... Rd1+! Check from behind. The checks never end: 4.Ke5 Re1+ 5.Kd6 Rd1+ and so on. The king cannot hide without abandoning the pawn. Theoretical draw!',
                highlights: { d1: BLACK_SQUARE_STYLE },
                arrows: [arrow('d1', 'd6', BLACK_ARROW)]
            }
        ]
    },

    {
        id: 'vancura-defense',
        chapter: 'Rook Endgames',
        title: 'The Vancura Defense',
        subtitle: 'Holding a rook pawn by attacking it from the side.',
        question: 'How does Black draw when White’s rook stands in front of a rook pawn?',
        keyIdea: 'Rook on the 6th rank attacking a6 from the side, king on g7/h7. When the white king comes to help, check it horizontally: it can never hide.',
        practiceId: 'rook-7th-passive',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: 'R7/6k1/P4r2/8/8/8/4K3/8 w - - 0 1',
                comment: 'The Vancura position (1924). White’s rook is stuck in front of the a-pawn, and Black’s rook on f6 attacks the pawn from the side, so White’s rook cannot leave the a-file. The black king guards g7 and h7, the squares where a white rook check could come from.',
                arrows: [arrow('f6', 'a6', BLACK_ARROW)]
            },
            {
                moveNumber: '1',
                san: '1. Kd3',
                fen: 'R7/6k1/P4r2/8/8/3K4/8/8 b - - 1 1',
                comment: '1. Kd3. White brings the king toward b7 to protect the pawn and free the rook.',
                highlights: { d3: WHITE_SQUARE_STYLE },
                arrows: [arrow('d3', 'b7')]
            },
            {
                moveNumber: '1...',
                san: '1... Rf3+!',
                fen: 'R7/6k1/P7/8/8/3K1r2/8/8 w - - 2 2',
                comment: '1... Rf3+! The rook leaves the 6th rank only to give a check from the side.',
                highlights: { f3: BLACK_SQUARE_STYLE, d3: WHITE_SQUARE_STYLE },
                arrows: [arrow('f3', 'd3', BLACK_ARROW)]
            },
            {
                moveNumber: '2',
                san: '2. Kc4',
                fen: 'R7/6k1/P7/8/2K5/5r2/8/8 b - - 3 2',
                comment: '2. Kc4. The king keeps marching toward b7.',
                highlights: { c4: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '2...',
                san: '2... Rf4+',
                fen: 'R7/6k1/P7/8/2K2r2/8/8/8 w - - 4 3',
                comment: '2... Rf4+. Another check from the side.',
                highlights: { f4: BLACK_SQUARE_STYLE },
                arrows: [arrow('f4', 'c4', BLACK_ARROW)]
            },
            {
                moveNumber: '3',
                san: '3. Kb5',
                fen: 'R7/6k1/P7/1K6/5r2/8/8/8 b - - 5 3',
                comment: '3. Kb5. The king comes closer to the pawn.',
                highlights: { b5: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '3...',
                san: '3... Rf5+',
                fen: 'R7/6k1/P7/1K3r2/8/8/8/8 w - - 6 4',
                comment: '3... Rf5+. And another check.',
                highlights: { f5: BLACK_SQUARE_STYLE },
                arrows: [arrow('f5', 'b5', BLACK_ARROW)]
            },
            {
                moveNumber: '4',
                san: '4. Kb6',
                fen: 'R7/6k1/PK6/5r2/8/8/8/8 b - - 7 4',
                comment: '4. Kb6. The king has reached the 6th rank.',
                highlights: { b6: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '4...',
                san: '4... Rf6+',
                fen: 'R7/6k1/PK3r2/8/8/8/8/8 w - - 8 5',
                comment: '4... Rf6+! The rook is back on the 6th rank with check. It stays far away on the f-file, so the king can never attack it.',
                highlights: { f6: BLACK_SQUARE_STYLE },
                arrows: [arrow('f6', 'b6', BLACK_ARROW)]
            },
            {
                moveNumber: '5',
                san: '5. Kb7',
                fen: 'R7/1K4k1/P4r2/8/8/8/8/8 b - - 9 5',
                comment: '5. Kb7. The king finally stands next to its pawn.',
                highlights: { b7: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '5...',
                san: '5... Rf7+',
                fen: 'R7/1K3rk1/P7/8/8/8/8/8 w - - 10 6',
                comment: '5... Rf7+. Even on b7 the king finds no shelter (6.Kb8 Rf8+ or 6.Kb6 Rf6+). If White ever plays a7 instead, Black puts the rook behind the pawn (...Ra6) and keeps the king on g7/h7. Draw!',
                highlights: { f7: BLACK_SQUARE_STYLE },
                arrows: [arrow('f7', 'b7', BLACK_ARROW)]
            }
        ]
    },
    {
        id: 'practical-rook-endings',
        chapter: 'Rook Endgames',
        title: 'Four vs Three on One Wing',
        subtitle: 'Practical defence a pawn down with all pawns on the same side.',
        question: 'How does Black defend a rook ending a pawn down when all pawns are on one wing?',
        keyIdea: 'Keep the rook active and trade pawns. With 4 vs 3 on the same wing, every pawn exchange brings the defender closer to the draw.',
        practiceId: 'practical-rook-endings',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '6k1/5p1p/6p1/8/8/4P1PP/r4PK1/1R6 b - - 0 1',
                comment: 'Black to move. White has an extra pawn, but there is no passed pawn and all the pawns are on the kingside. Black’s rook on the 2nd rank is active: it ties White down to the defence of f2.',
                arrows: [arrow('a2', 'f2', BLACK_ARROW)]
            },
            {
                moveNumber: '1...',
                san: '1... h5!',
                fen: '6k1/5p2/6p1/7p/8/4P1PP/r4PK1/1R6 w - - 0 2',
                comment: '1... h5! A useful pawn move: it gains space and prepares …h4 or …g5-g4 to exchange pawns. Do not passively return the rook to the back rank. Keep it active, trade pawns, and the draw comes closer with every exchange.',
                highlights: { h5: BLACK_SQUARE_STYLE, a2: BLACK_SQUARE_STYLE },
                arrows: [arrow('h5', 'h4', BLACK_ARROW), arrow('g6', 'g5', BLACK_ARROW)]
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
                fen: '8/8/4k3/8/P7/8/8/7K w - - 0 1',
                comment: 'White to move. The white pawn on a4 wants to run to a8, and the white king on h1 is too far away to help. Can the black king on e6 catch the pawn?',
            },
            {
                moveNumber: 'Square',
                san: 'Draw the square',
                fen: '8/8/4k3/8/P7/8/8/7K w - - 0 1',
                comment: 'Draw the square: take the distance from the pawn to its promotion square (a4 to a8, four squares) and use it as the side of a square: a4, a8, e8 and e4. The black king on e6 is inside the square, so it can catch the pawn.',
                ...ruleOfSquare('a4', 'e6'),
                arrows: [
                    { startSquare: 'a4', endSquare: 'a8', color: '#10b981' },
                    { startSquare: 'a8', endSquare: 'e8', color: '#10b981' },
                    { startSquare: 'e8', endSquare: 'e4', color: '#10b981' },
                    { startSquare: 'e4', endSquare: 'a4', color: '#10b981' }
                ]
            },
            {
                moveNumber: '1',
                san: '1. a5',
                fen: '8/8/4k3/P7/8/8/8/7K b - - 0 1',
                comment: '1. a5. Every pawn step shrinks the square, now a5 to d8. The king on e6 is just outside, but it is Black to move.',
                ...ruleOfSquare('a5', 'e6')
            },
            {
                moveNumber: '1...',
                san: '1... Kd6',
                fen: '8/8/3k4/P7/8/8/8/7K w - - 1 2',
                comment: '1... Kd6. The king steps diagonally back inside the square. As long as it stays inside, the pawn cannot escape.',
                ...ruleOfSquare('a5', 'd6')
            },
            {
                moveNumber: '2',
                san: '2. a6',
                fen: '8/8/P2k4/8/8/8/8/7K b - - 0 2',
                comment: '2. a6. The square shrinks again, to a6 to c8.',
                ...ruleOfSquare('a6', 'd6')
            },
            {
                moveNumber: '2...',
                san: '2... Kc7',
                fen: '8/2k5/P7/8/8/8/8/7K w - - 1 3',
                comment: '2... Kc7. The king keeps pace, stepping inside the smaller square.',
                ...ruleOfSquare('a6', 'c7')
            },
            {
                moveNumber: '3',
                san: '3. a7',
                fen: '8/P1k5/8/8/8/8/8/7K b - - 0 3',
                comment: '3. a7. The pawn is one step from queening, and its square is just a7, a8, b8 and b7.',
                ...ruleOfSquare('a7', 'c7')
            },
            {
                moveNumber: '3...',
                san: '3... Kb7',
                fen: '8/Pk6/8/8/8/8/8/7K w - - 1 4',
                comment: '3... Kb7. The king reaches the last square and now guards both a7 and a8.',
                ...ruleOfSquare('a7', 'b7')
            },
            {
                moveNumber: '4',
                san: '4. a8=Q+',
                fen: 'Q7/1k6/8/8/8/8/8/7K b - - 0 4',
                comment: '4. a8=Q+. The pawn promotes, but the new queen is attacked by the king.',
                highlights: { a8: WHITE_SQUARE_STYLE, b7: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '4...',
                san: '4... Kxa8',
                fen: 'k7/8/8/8/8/8/8/7K w - - 0 5',
                comment: '4... Kxa8. The king captures the queen and the game is a draw. Because the king started inside the square, it caught the pawn in time.',
                highlights: { a8: BLACK_SQUARE_STYLE }
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
                highlights: { b6: WHITE_SQUARE_STYLE, b8: BLACK_SQUARE_STYLE },
                arrows: [arrow('b5', 'b6')]
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
                comment: '3. Kb7! The king guards c8, so c8=Q follows and White wins.',
                highlights: { b7: WHITE_SQUARE_STYLE, c7: WHITE_SQUARE_STYLE },
                arrows: [arrow('c7', 'c8')]
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
                comment: '3. Kf7! OUTFLANKING! The king steps aside and controls e7 and e8, so the pawn can run: 3...Kd7 4.e6+ Kd6 5.e7 and 6.e8=Q. White wins!',
                highlights: { f7: WHITE_SQUARE_STYLE },
                arrows: [arrow('e6', 'f7'), arrow('e5', 'e8')]
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
                comment: '1. Kd5! The king goes first, heading for the key squares c6, d6 and e6. (1.d5? is premature: 1...Ke7 and Black reaches the key squares in time, drawing.)',
                highlights: { d5: WHITE_SQUARE_STYLE },
                arrows: [arrow('d5', 'c6')]
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
                comment: '2. Kc6! KEY SQUARE CLAIMED! With the king on c6 the pawn will queen, whatever Black does.',
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
                comment: '3. Kd6! Taking the opposition. The black king must step aside to c8 or e8, and the white king walks past it.',
                highlights: { d6: WHITE_SQUARE_STYLE, d8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '3...',
                san: '3... Kc8',
                fen: '2k5/8/3K4/8/3P4/8/8/8 w - - 6 4',
                comment: '3... Kc8. Black steps aside.',
                highlights: { c8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '4',
                san: '4. Ke7!',
                fen: '2k5/4K3/8/8/3P4/8/8/8 b - - 7 4',
                comment: '4. Ke7! The king walks past and controls d6, d7 and d8, the path of the pawn.',
                highlights: { e7: WHITE_SQUARE_STYLE },
                arrows: [arrow('d4', 'd8')]
            },
            {
                moveNumber: '4...',
                san: '4... Kc7',
                fen: '8/2k1K3/8/8/3P4/8/8/8 w - - 8 5',
                comment: '4... Kc7. Black waits.',
                highlights: { c7: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '5',
                san: '5. d5!',
                fen: '8/2k1K3/8/3P4/8/8/8/8 b - - 0 5',
                comment: '5. d5! The pawn marches forward protected by the king: 5...Kc8 6.d6 Kb7 7.d7 and it queens on d8.',
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
                comment: '1. Kb1! DISTANT OPPOSITION! The kings stand on the same file with an odd number of squares (three) between them, and Black is to move.',
                highlights: { b1: WHITE_SQUARE_STYLE, b5: BLACK_SQUARE_STYLE, b2: SQUARE_ZONE_STYLE, b3: SQUARE_ZONE_STYLE, b4: SQUARE_ZONE_STYLE },
                arrows: [arrow('c1', 'b1')]
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
                comment: '2. Kb2! DIRECT OPPOSITION! The distant opposition turns into direct opposition (one square apart). Black cannot get past to a3 or c3.',
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
                san: '3. Kc2',
                fen: '8/8/8/8/1kp5/8/2K5/8 b - - 1 3',
                comment: '3. Kc2. The king stays in front of the pawn.',
                highlights: { c2: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '3...',
                san: '3... c3',
                fen: '8/8/8/8/1k6/2p5/2K5/8 w - - 0 4',
                comment: '3... c3. Black pushes on.',
                highlights: { c3: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '4',
                san: '4. Kc1!',
                fen: '8/8/8/8/1k6/2p5/8/2K5 b - - 1 4',
                comment: '4. Kc1! The king keeps blocking the pawn\'s path.',
                highlights: { c1: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '4...',
                san: '4... Kb3',
                fen: '8/8/8/8/8/1kp5/8/2K5 w - - 2 5',
                comment: '4... Kb3. Black tries to support the pawn from the side.',
                highlights: { b3: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '5',
                san: '5. Kb1!',
                fen: '8/8/8/8/8/1kp5/8/1K6 b - - 3 5',
                comment: '5. Kb1! Opposition again: the kings face each other on the b-file.',
                highlights: { b1: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '5...',
                san: '5... c2+',
                fen: '8/8/8/8/8/1k6/2p5/1K6 w - - 0 6',
                comment: '5... c2+. The pawn reaches the 2nd rank with check.',
                highlights: { c2: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '6',
                san: '6. Kc1',
                fen: '8/8/8/8/8/1k6/2p5/2K5 b - - 1 6',
                comment: '6. Kc1. The king steps in front of the pawn.',
                highlights: { c1: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '6...',
                san: '6... Kc3',
                fen: '8/8/8/8/8/2k5/2p5/2K5 w - - 2 7',
                comment: '6... Kc3. STALEMATE! White has no legal move. The draw is sealed!',
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
                comment: '1. Kc1! Preventing 1...Kb2 and heading for b1, the square in front of the pawn.',
                highlights: { c1: WHITE_SQUARE_STYLE },
                arrows: [arrow('d1', 'c1')]
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
                highlights: { c2: WHITE_SQUARE_STYLE, b1: DANGER_ZONE_STYLE, b2: DANGER_ZONE_STYLE, b3: DANGER_ZONE_STYLE }
            },
            {
                moveNumber: '2...',
                san: '2... a3',
                fen: '8/8/8/8/8/p7/k1K5/8 w - - 0 3',
                comment: '2... a3. Black pushes the pawn.',
                highlights: { a3: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '3. Kc1',
                fen: '8/8/8/8/8/p7/k7/2K5 b - - 1 3',
                comment: '3. Kc1. White simply shuffles between c1 and c2.',
                highlights: { c1: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '3...',
                san: '3... Ka1',
                fen: '8/8/8/8/8/p7/8/k1K5 w - - 2 4',
                comment: '3... Ka1. The black king goes into the corner.',
                highlights: { a1: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '4',
                san: '4. Kc2',
                fen: '8/8/8/8/8/p7/2K5/k7 b - - 3 4',
                comment: '4. Kc2. Keeping b1 and b2 under control.',
                highlights: { c2: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '4...',
                san: '4... a2',
                fen: '8/8/8/8/8/8/p1K5/k7 w - - 0 5',
                comment: '4... a2. Nothing has changed.',
                highlights: { a2: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '5',
                san: '5. Kc1!',
                fen: '8/8/8/8/8/8/p7/k1K5 b - - 1 5',
                comment: '5. Kc1! STALEMATE! Black has no legal move. The black king never escaped the a-file prison.',
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
                san: '3. Kd5!',
                fen: '8/8/8/3K4/4P3/5k2/8/8 b - - 2 3',
                comment: '3. Kd5! The king keeps protecting e4 and heads for the key squares.',
                highlights: { d5: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '3...',
                san: '3... Kf4',
                fen: '8/8/8/3K4/4Pk2/8/8/8 w - - 3 4',
                comment: '3... Kf4. Black attacks the pawn again.',
                highlights: { f4: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '4',
                san: '4. e5',
                fen: '8/8/8/3KP3/5k2/8/8/8 b - - 0 4',
                comment: '4. e5. The pawn advances, escorted by its king.',
                highlights: { e5: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '4...',
                san: '4... Kf5',
                fen: '8/8/8/3KPk2/8/8/8/8 w - - 1 5',
                comment: '4... Kf5. Black follows.',
                highlights: { f5: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '5',
                san: '5. e6',
                fen: '8/8/4P3/3K1k2/8/8/8/8 b - - 0 5',
                comment: '5. e6. The pawn reaches the 6th rank.',
                highlights: { e6: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '5...',
                san: '5... Kf6',
                fen: '8/8/4Pk2/3K4/8/8/8/8 w - - 1 6',
                comment: '5... Kf6. Black blocks the pawn from the side.',
                highlights: { f6: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '6',
                san: '6. Kd6!',
                fen: '8/8/3KPk2/8/8/8/8/8 b - - 2 6',
                comment: '6. Kd6! The king supports the pawn; next come Kd7 and e7. The pawn will queen. White wins!',
                highlights: { d6: WHITE_SQUARE_STYLE, e6: WHITE_SQUARE_STYLE }
            }
        ]
    },
    {
        id: 'pawn-reti-maneuver',
        chapter: 'Pawn Endgames',
        title: 'The Réti Maneuver',
        subtitle: 'Diagonal geometry to chase a runner while supporting your own pawn.',
        question: 'How can a King far outside the square of an enemy pawn save the game?',
        keyIdea: 'A diagonal king march is as fast as a straight one, and each diagonal step serves two goals: entering the square of the enemy pawn and supporting your own passed pawn.',
        practiceId: 'pawn-reti-maneuver',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '7K/8/k1P5/7p/8/8/8/8 w - - 0 1',
                comment: 'Réti (1921), White to move. The white king on h8 looks hopelessly outside the square of the h5 pawn, and the black king is ready to take c6. Chasing the pawn along the h-file fails by one tempo. Yet White draws!',
                arrows: [arrow('h8', 'e5')]
            },
            {
                moveNumber: '1',
                san: '1. Kg7!',
                fen: '8/6K1/k1P5/7p/8/8/8/8 b - - 1 1',
                comment: '1. Kg7! The first diagonal step. The king moves toward the h-pawn and toward its own c-pawn at the same time.',
                highlights: { g7: WHITE_SQUARE_STYLE },
                arrows: [arrow('g7', 'f6')]
            },
            {
                moveNumber: '1...',
                san: '1... h4',
                fen: '8/6K1/k1P5/8/7p/8/8/8 w - - 0 2',
                comment: '1... h4. Black runs with the pawn. The king is still outside its square.',
                highlights: { h4: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2',
                san: '2. Kf6!',
                fen: '8/8/k1P2K2/8/7p/8/8/8 b - - 1 2',
                comment: '2. Kf6! Now White threatens 3.Ke7 and 4.c7, queening alongside Black. For example 2...h3 3.Ke7 h2 4.c7 Kb7 5.Kd7 and both sides promote: a draw.',
                highlights: { f6: WHITE_SQUARE_STYLE },
                arrows: [arrow('f6', 'e7'), arrow('c6', 'c8')]
            },
            {
                moveNumber: '2...',
                san: '2... Kb6',
                fen: '8/8/1kP2K2/8/7p/8/8/8 w - - 2 3',
                comment: '2... Kb6. Black spends a tempo to stop the c-pawn.',
                highlights: { b6: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '3. Ke5!',
                fen: '8/8/1kP5/4K3/7p/8/8/8 b - - 3 3',
                comment: '3. Ke5! The climax. White threatens both 4.Kd6, supporting the c-pawn, and 4.Kf4, catching the h-pawn. Black cannot stop both.',
                highlights: { e5: WHITE_SQUARE_STYLE },
                arrows: [arrow('e5', 'd6'), arrow('e5', 'f4')]
            },
            {
                moveNumber: '3...',
                san: '3... Kxc6',
                fen: '8/8/2k5/4K3/7p/8/8/8 w - - 0 4',
                comment: '3... Kxc6. Black takes the pawn, but now the white king turns to the h-pawn.',
                highlights: { c6: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '4',
                san: '4. Kf4!',
                fen: '8/8/2k5/8/5K1p/8/8/8 b - - 1 4',
                comment: '4. Kf4! The king has entered the square of the h-pawn (4...h3 5.Kg3 h2 6.Kxh2). If instead 3...h3, then 4.Kd6 h2 5.c7 and both sides queen. Draw!',
                highlights: { ...zone('e', 'h', 1, 4), f4: WHITE_SQUARE_STYLE, h4: BLACK_SQUARE_STYLE },
                arrows: [arrow('f4', 'g3')]
            }
        ]
    },
    {
        id: 'pawn-triangulation',
        chapter: 'Pawn Endgames',
        title: 'Triangulation Maneuver',
        subtitle: 'Losing a move to break a fortress via corresponding squares.',
        question: 'How does the attacking king lose a move to put Black into fatal zugzwang?',
        keyIdea: 'White wants this exact position with BLACK to move. The white king walks the triangle d5-d4-c4-d5 (three moves) while the black king can only shuttle between c8, d8 and c7, so the move passes to Black.',
        practiceId: 'pawn-triangulation',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '8/2k5/p1P5/P1K5/8/8/8/8 w - - 0 1',
                comment: 'White to move. If it were Black to move, Black would be in zugzwang: the king must step away and White plays Kb6, winning the a6 pawn. The white king must keep protecting c6 (1.Kb4? Kxc6), so White cannot simply wait. The solution is to lose a move by triangulation.',
                arrows: [arrow('c5', 'b6')]
            },
            {
                moveNumber: '1',
                san: '1. Kd5',
                fen: '8/2k5/p1P5/P2K4/8/8/8/8 b - - 1 1',
                comment: '1. Kd5. The king steps onto the triangle d5-d4-c4.',
                highlights: { d5: WHITE_SQUARE_STYLE },
                arrows: [arrow('c5', 'd5')]
            },
            {
                moveNumber: '1...',
                san: '1... Kc8',
                fen: '2k5/8/p1P5/P2K4/8/8/8/8 w - - 2 2',
                comment: '1... Kc8. The best defence: the black king keeps an eye on b7, c7 and d7 (1...Kd8 loses faster: 2.Kd6 Kc8 3.c7 Kb7 4.Kd7).',
                highlights: { c8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2',
                san: '2. Kd4!',
                fen: '2k5/8/p1P5/P7/3K4/8/8/8 b - - 3 2',
                comment: '2. Kd4! First side of the triangle. The king steps back, still guarding c5 and d5.',
                highlights: { d4: WHITE_SQUARE_STYLE },
                arrows: [arrow('d5', 'd4'), arrow('d4', 'c4'), arrow('c4', 'd5')]
            },
            {
                moveNumber: '2...',
                san: '2... Kd8',
                fen: '3k4/8/p1P5/P7/3K4/8/8/8 w - - 4 3',
                comment: '2... Kd8. Black has to move too and can only shuffle between c8, d8 and c7.',
                highlights: { d8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '3. Kc4!',
                fen: '3k4/8/p1P5/P7/2K5/8/8/8 b - - 5 3',
                comment: '3. Kc4! Second side of the triangle.',
                highlights: { c4: WHITE_SQUARE_STYLE },
                arrows: [arrow('c4', 'd5')]
            },
            {
                moveNumber: '3...',
                san: '3... Kc8',
                fen: '2k5/8/p1P5/P7/2K5/8/8/8 w - - 6 4',
                comment: '3... Kc8. Back again.',
                highlights: { c8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '4',
                san: '4. Kd5!',
                fen: '2k5/8/p1P5/P2K4/8/8/8/8 b - - 7 4',
                comment: '4. Kd5! The triangle is complete. This is the position after move 1, but now BLACK is to move. 4...Kd8 5.Kd6 Kc8 6.c7 Kb7 7.Kd7 Ka7 8.Kc6! wins (not 8.c8=Q?? stalemate).',
                highlights: { d5: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '4...',
                san: '4... Kc7',
                fen: '8/2k5/p1P5/P2K4/8/8/8/8 w - - 8 5',
                comment: '4... Kc7. The most stubborn try.',
                highlights: { c7: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '5',
                san: '5. Kc5!',
                fen: '8/2k5/p1P5/P1K5/8/8/8/8 b - - 9 5',
                comment: '5. Kc5! We are back in the starting position, but with Black to move. Mission accomplished: Black is in zugzwang.',
                highlights: { c5: WHITE_SQUARE_STYLE, c7: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '5...',
                san: '5... Kc8',
                fen: '2k5/8/p1P5/P1K5/8/8/8/8 w - - 10 6',
                comment: '5... Kc8. The black king must step away, and b6 is now free for White.',
                highlights: { c8: BLACK_SQUARE_STYLE },
                arrows: [arrow('c5', 'b6')]
            },
            {
                moveNumber: '6',
                san: '6. Kb6!',
                fen: '2k5/8/pKP5/P7/8/8/8/8 b - - 11 6',
                comment: '6. Kb6! The king attacks the a6 pawn.',
                highlights: { b6: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '6...',
                san: '6... Kb8',
                fen: '1k6/8/pKP5/P7/8/8/8/8 w - - 12 7',
                comment: '6... Kb8. Black cannot defend it.',
                highlights: { b8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '7',
                san: '7. Kxa6',
                fen: '1k6/8/K1P5/P7/8/8/8/8 b - - 0 7',
                comment: '7. Kxa6. The pawn is won.',
                highlights: { a6: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '7...',
                san: '7... Kc7',
                fen: '8/2k5/K1P5/P7/8/8/8/8 w - - 1 8',
                comment: '7... Kc7. Black attacks the c6 pawn.',
                highlights: { c7: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '8',
                san: '8. Kb5!',
                fen: '8/2k5/2P5/PK6/8/8/8/8 b - - 2 8',
                comment: '8. Kb5! Protecting the c6 pawn. The a-pawn will now run to a8. White wins.',
                highlights: { b5: WHITE_SQUARE_STYLE, a5: WHITE_SQUARE_STYLE },
                arrows: [arrow('a5', 'a8')]
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
                comment: '1. h4! Advance immediately! The further the pawn runs, the further the black king must go to stop it.',
                highlights: { h4: WHITE_SQUARE_STYLE },
                arrows: [arrow('h2', 'h4')]
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
                highlights: { e5: WHITE_SQUARE_STYLE },
                arrows: [arrow('e5', 'd5'), arrow('d5', 'c5')]
            },
            {
                moveNumber: '3...',
                san: '3... Kxh5',
                fen: '8/8/8/1p2K2k/1P6/8/8/8 w - - 0 4',
                comment: '3... Kxh5. Black wins the h-pawn, but its king is now far offside.',
                highlights: { h5: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '4',
                san: '4. Kd5!',
                fen: '8/8/8/1p1K3k/1P6/8/8/8 b - - 1 4',
                comment: '4. Kd5! The white king heads for the b5 pawn.',
                highlights: { d5: WHITE_SQUARE_STYLE },
                arrows: [arrow('d5', 'c5')]
            },
            {
                moveNumber: '4...',
                san: '4... Kg6',
                fen: '8/8/6k1/1p1K4/1P6/8/8/8 w - - 2 5',
                comment: '4... Kg6. Black hurries back, too late.',
                highlights: { g6: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '5',
                san: '5. Kc5!',
                fen: '8/8/6k1/1pK5/1P6/8/8/8 b - - 3 5',
                comment: '5. Kc5! White wins the b5 pawn and queens the b-pawn.',
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
                fen: '8/ppp3k1/8/PPP5/8/8/8/6K1 w - - 0 1',
                comment: 'White has pawns on a5, b5 and c5 facing Black\'s a7, b7 and c7. Both kings are far away on the kingside. White to move can force a new queen by sacrificing two pawns!',
                highlights: { a5: WHITE_SQUARE_STYLE, b5: WHITE_SQUARE_STYLE, c5: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '1',
                san: '1. b6!',
                fen: '8/ppp3k1/1P6/P1P5/8/8/8/6K1 b - - 0 1',
                comment: '1. b6!! THE SACRIFICIAL LEVER! White attacks both a7 and c7 simultaneously. Black has no choice but to capture.',
                highlights: { b6: WHITE_SQUARE_STYLE },
                arrows: [arrow('b6', 'a7'), arrow('b6', 'c7')]
            },
            {
                moveNumber: '1...',
                san: '1... axb6',
                fen: '8/1pp3k1/1p6/P1P5/8/8/8/6K1 w - - 0 2',
                comment: '1... axb6. Black captures with the a-pawn. (If 1...cxb6, White plays 2.a6! bxa6 3.c6! and the c-pawn queens).',
                highlights: { b6: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2',
                san: '2. c6!!',
                fen: '8/1pp3k1/1pP5/P7/8/8/8/6K1 b - - 0 2',
                comment: '2. c6!! THE SECOND SACRIFICE! Threatening 3.cxb7 and queening. Black is forced to capture 2...bxc6.',
                highlights: { c6: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '2...',
                san: '2... bxc6',
                fen: '8/2p3k1/1pp5/P7/8/8/8/6K1 w - - 0 3',
                comment: '2... bxc6. Black captures the second offering.',
                highlights: { c6: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '3. a6!',
                fen: '8/2p3k1/Ppp5/8/8/8/8/6K1 b - - 0 3',
                comment: '3. a6! THE RUNNER BREAKS FREE! The a-pawn has a clear runway to a8 and the black king is far outside its square.',
                highlights: { a6: WHITE_SQUARE_STYLE },
                arrows: [arrow('a6', 'a8')]
            },
            {
                moveNumber: '3...',
                san: '3... c5',
                fen: '8/2p3k1/Pp6/2p5/8/8/8/6K1 w - - 0 4',
                comment: '3... c5. Black tries to run with a pawn of its own.',
                highlights: { c5: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '4',
                san: '4. a7',
                fen: '8/P1p3k1/1p6/2p5/8/8/8/6K1 b - - 0 4',
                comment: '4. a7. One step from queening.',
                highlights: { a7: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '4...',
                san: '4... c4',
                fen: '8/P1p3k1/1p6/8/2p5/8/8/6K1 w - - 0 5',
                comment: '4... c4. Far too slow.',
                highlights: { c4: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '5',
                san: '5. a8=Q',
                fen: 'Q7/2p3k1/1p6/8/2p5/8/8/6K1 b - - 0 5',
                comment: '5. a8=Q. White queens first, long before Black\'s pawns get anywhere. White wins.',
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
        title: 'Barriers & The Cage',
        subtitle: 'Sealing the safe corner, the 20.Be3! barrier, and the final cage.',
        question: 'How do the Bishop and Knight combine to erect impenetrable walls across the board?',
        keyIdea: 'King, bishop and knight cover complementary squares: the bishop controls one colour, the knight jumps to cover the other, and together they build walls the defending king cannot cross.',
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
    },
    {
        id: 'two-bishops-mate',
        chapter: 'Minor Piece Endgames',
        title: 'Two Bishops Checkmate',
        subtitle: 'Side-by-side bishops build a wall; king and bishops finish in the corner.',
        question: 'How do two bishops and a king force mate against a lone king?',
        keyIdea: 'Keep the bishops next to each other so their diagonals form a wall, bring your king up, push the enemy king into a corner and mate with the bishops checking along two diagonals.',
        practiceId: 'two-bishops-mate',
        steps: [
            {
                moveNumber: 'The Wall',
                san: 'Start',
                fen: '8/8/8/3k4/8/3BB3/8/4K3 w - - 0 1',
                comment: 'Bishops standing side by side (d3 and e3) cover neighbouring diagonals: the black king cannot step to c4, d4, e4 or c5. Together they form a wall, and the white king walks up behind it to push the black king back.',
                arrows: [arrow('d3', 'a6'), arrow('d3', 'h7'), arrow('e3', 'a7'), arrow('e3', 'h6')]
            },
            {
                moveNumber: 'Final Phase',
                san: 'Mating net',
                fen: '6k1/8/5K2/8/8/3BB3/8/8 w - - 0 1',
                comment: 'Later in the ending: the black king has been driven to the corner. The white king on f6 takes away f7, g7 and e7. Now the bishops finish the job.',
                highlights: { f6: WHITE_SQUARE_STYLE, g8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '1',
                san: '1. Bc5!',
                fen: '6k1/8/5K2/2B5/8/3B4/8/8 b - - 1 1',
                comment: '1. Bc5! Takes away f8. With h7 already covered by the bishop on d3, the black king can only go to h8.',
                highlights: { c5: WHITE_SQUARE_STYLE, f8: DANGER_ZONE_STYLE, h7: DANGER_ZONE_STYLE },
                arrows: [arrow('c5', 'f8'), arrow('d3', 'h7')]
            },
            {
                moveNumber: '1...',
                san: '1... Kh8',
                fen: '7k/8/5K2/2B5/8/3B4/8/8 w - - 2 2',
                comment: '1... Kh8. Forced.',
                highlights: { h8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2',
                san: '2. Kg6',
                fen: '7k/8/6K1/2B5/8/3B4/8/8 b - - 3 2',
                comment: '2. Kg6. The king covers g7 and h7, leaving Black only g8.',
                highlights: { g6: WHITE_SQUARE_STYLE },
                arrows: [arrow('f6', 'g6')]
            },
            {
                moveNumber: '2...',
                san: '2... Kg8',
                fen: '6k1/8/6K1/2B5/8/3B4/8/8 w - - 4 3',
                comment: '2... Kg8. Forced.',
                highlights: { g8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '3. Bc4+',
                fen: '6k1/8/6K1/2B5/2B5/8/8/8 b - - 5 3',
                comment: '3. Bc4+! The light-squared bishop checks and drives the king into the corner.',
                highlights: { c4: WHITE_SQUARE_STYLE, g8: BLACK_SQUARE_STYLE },
                arrows: [arrow('c4', 'g8')]
            },
            {
                moveNumber: '3...',
                san: '3... Kh8',
                fen: '7k/8/6K1/2B5/2B5/8/8/8 w - - 6 4',
                comment: '3... Kh8. Forced.',
                highlights: { h8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '4',
                san: '4. Bd4#',
                fen: '7k/8/6K1/8/2BB4/8/8/8 b - - 7 4',
                comment: '4. Bd4# CHECKMATE! The dark-squared bishop checks on the long diagonal, the light-squared bishop covers g8 and the king covers g7 and h7.',
                highlights: { d4: WHITE_SQUARE_STYLE, h8: BLACK_SQUARE_STYLE },
                arrows: [arrow('d4', 'h8'), arrow('c4', 'g8')]
            }
        ]
    },
    {
        id: 'rook-vs-bishop-wrong-corner',
        chapter: 'Minor Piece Endgames',
        title: 'Rook vs Bishop: The Wrong Corner',
        subtitle: 'Why the bishop’s colour decides between a win and a draw.',
        question: 'When can a rook beat a bishop?',
        keyIdea: 'The defender is safe in the corner whose colour differs from the bishop’s, because the bishop can block or guard the mating checks there. In the other corner (the wrong corner) mating threats and pins win the bishop.',
        practiceId: 'rook-vs-bishop-safe-corner',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '1k6/8/2K5/8/2b5/8/8/3R4 w - - 0 1',
                comment: 'Black’s bishop is light-squared and the black king is near a8, a light corner: the wrong corner. The bishop can never control the dark squares b8 and d8, where White’s mating checks will land.',
                arrows: [arrow('d1', 'd8')]
            },
            {
                moveNumber: '1',
                san: '1. Kb6!',
                fen: '1k6/8/1K6/8/2b5/8/8/3R4 b - - 1 1',
                comment: '1. Kb6! Taking the opposition and threatening 2.Rd8 mate. The light-squared bishop cannot guard d8, so the king must run.',
                highlights: { b6: WHITE_SQUARE_STYLE, d8: DANGER_ZONE_STYLE },
                arrows: [arrow('c6', 'b6'), arrow('d1', 'd8')]
            },
            {
                moveNumber: '1...',
                san: '1... Kc8',
                fen: '2k5/8/1K6/8/2b5/8/8/3R4 w - - 2 2',
                comment: '1... Kc8. The most stubborn defence (1...Ka8 2.Rd8+ mates at once).',
                highlights: { c8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '2',
                san: '2. Rc1!',
                fen: '2k5/8/1K6/8/2b5/8/8/2R5 b - - 3 2',
                comment: '2. Rc1! A pin: the bishop on c4 cannot move without exposing its king, and nothing can defend it.',
                highlights: { c1: WHITE_SQUARE_STYLE, c4: BLACK_SQUARE_STYLE, c8: BLACK_SQUARE_STYLE },
                arrows: [arrow('c1', 'c8')]
            },
            {
                moveNumber: '2...',
                san: '2... Kd7',
                fen: '8/3k4/1K6/8/2b5/8/8/2R5 w - - 4 3',
                comment: '2... Kd7. The king steps off the c-file, but it cannot defend the bishop.',
                highlights: { d7: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '3',
                san: '3. Rxc4',
                fen: '8/3k4/1K6/8/2R5/8/8/8 b - - 0 3',
                comment: '3. Rxc4. The bishop falls and White mates with king and rook.',
                highlights: { c4: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: 'Compare',
                san: 'Safe corner',
                fen: '1k6/8/2K5/8/8/2b5/8/3R4 w - - 0 1',
                comment: 'Now the same position with a DARK-squared bishop. The a8 corner is light, the opposite colour to the bishop, so it is the safe corner. After 1.Kb6 Black plays 1...Bf6!, guarding d8, and White cannot make progress. Draw.',
                highlights: { c3: BLACK_SQUARE_STYLE, d8: SQUARE_ZONE_STYLE },
                arrows: [arrow('c3', 'f6', BLACK_ARROW), arrow('f6', 'd8', BLACK_ARROW)]
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

    // Resume the signed-in user's last studied topic and step when no topic is given in the URL.
    // The saved place is only overwritten once that restore has happened (`restored`), so the
    // default topic shown while the account loads never replaces it.
    const { user, loading: authLoading } = useAuth();
    const username = user?.username ?? null;
    const [restored, setRestored] = useState(false);
    const [resumedFrom, setResumedFrom] = useState<LastStrategy | null>(null);

    // Runs once, during render, as soon as the account has loaded (React's "adjust state while rendering" pattern).
    if (!authLoading && !restored) {
        setRestored(true);
        const last = initialParam ? null : readLastAccessed('strategy', username);
        const topic = last && STRATEGY_TOPICS.find(t => t.id === last.topicId);
        if (last && topic) {
            setSelectedTopicId(topic.id);
            setCurrentStepIndex(Math.min(Math.max(last.step, 0), topic.steps.length - 1));
            setResumedFrom(last);
        }
    }

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

    // Remember where the user is, per account
    useEffect(() => {
        if (!restored) return;
        writeLastAccessed('strategy', username, {
            topicId: currentTopic.id,
            title: currentTopic.title,
            step: currentStepIndex,
            totalSteps: currentTopic.steps.length,
            at: Date.now()
        });
    }, [currentStepIndex, currentTopic, restored, username]);

    const handleSelectTopic = (id: string) => {
        setSelectedTopicId(id);
        setCurrentStepIndex(0);
        setResumedFrom(null);
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
                        {/* Resumed from the user's last visit */}
                        {resumedFrom && resumedFrom.topicId === currentTopic.id && (
                            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                                <History size={15} className="text-amber-600 shrink-0 mt-0.5" />
                                <div className="flex-1 leading-snug">
                                    <span className="font-black">Welcome back{username ? `, @${username}` : ''}!</span>{' '}
                                    Resumed at step {Math.min(resumedFrom.step + 1, currentTopic.steps.length)} of {currentTopic.steps.length}, where you left off {timeAgo(resumedFrom.at)}.
                                </div>
                                <button
                                    onClick={() => setResumedFrom(null)}
                                    className="p-0.5 rounded text-amber-700 hover:bg-amber-100 shrink-0"
                                    aria-label="Dismiss"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}

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
