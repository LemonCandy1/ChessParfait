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
} from '@/lib/lucideOriginal';
import QueenVsRookGuide from './QueenVsRookGuide';
import BishopKnightGuide, { BISHOP_KNIGHT_10_STEPS } from './BishopKnightGuide';

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
                fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
                comment: 'The White pawn is on the 7th rank (b7), but the White King on b8 is trapped in front of its own pawn. Black’s rook on the 2nd rank keeps the White King from escaping freely. White must build a bridge!',
                highlights: { b8: HIGHLIGHT_WHITE, b7: HIGHLIGHT_WHITE, a2: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '1',
                san: '1. Rd1+',
                fen: '1K1k4/1P6/8/8/8/8/r7/3R4 b - - 1 1',
                comment: '1. Rd1+! White checks along the d-file to drive the defending King away from the promotion file.',
                highlights: { d1: HIGHLIGHT_WHITE, d8: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '1...',
                san: '1... Ke7',
                fen: '1K6/1P2k3/8/8/8/8/r7/3R4 w - - 2 2',
                comment: '1... Ke7. Black steps aside.',
                highlights: { e7: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '2',
                san: '2. Rd4!',
                fen: '1K6/1P2k3/8/8/3R4/8/r7/8 b - - 3 2',
                comment: '2. Rd4! THE GOLDEN MOVE! Placing the rook on the 4th rank. This will act as a shield (bridge) when Black gives vertical checks!',
                highlights: { d4: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '2...',
                san: '2... Ra1',
                fen: '1K6/1P2k3/8/8/3R4/8/8/r7 w - - 4 3',
                comment: '2... Ra1. Black prepares to check the White King from behind once it leaves b8.',
                highlights: { a1: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '3',
                san: '3. Kc7',
                fen: '8/1PK1k3/8/8/3R4/8/8/r7 b - - 5 3',
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
                fen: '4k3/8/8/4P3/8/8/r7/6KR b - - 0 1',
                comment: 'Black to move and draw. White has an extra passed pawn on e5, but White’s King has not reached the 6th rank yet. Black must prevent the White King from advancing.',
                highlights: { e5: HIGHLIGHT_WHITE, a2: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '1...',
                san: '1... Ra6!',
                fen: '4k3/8/r7/4P3/8/8/8/6KR w - - 1 2',
                comment: '1... Ra6!! The KEY move! The rook patrols the 6th rank. The White King is completely cut off from advancing to e6, f6, or d6.',
                highlights: { a6: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '2',
                san: '2. Rh7',
                fen: '4k3/7R/r7/4P3/8/8/8/6K1 b - - 2 2',
                comment: '2. Rh7. White waits or tries to create mating nets. Black simply stays calm.',
                highlights: { h7: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '2...',
                san: '2... Ra5!',
                fen: '4k3/7R/8/r3P3/8/8/8/6K1 w - - 3 3',
                comment: '2... Ra5! Directly attacking the e5 pawn, tying down White’s forces.',
                highlights: { a5: HIGHLIGHT_BLACK, e5: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '3',
                san: '3. e6',
                fen: '4k3/7R/4P3/r7/8/8/8/6K1 b - - 0 3',
                comment: '3. e6. White finally advances the pawn to the 6th rank! Since the pawn is now on e6, the White King has no shelter in front of it.',
                highlights: { e6: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '3...',
                san: '3... Ra1+!',
                fen: '4k3/7R/4P3/8/8/8/8/r5K1 w - - 1 4',
                comment: '3... Ra1+!! Immediately drop to the 1st rank! Now Black gives relentless, endless checks from behind (Ra2+, Ra3+, etc.). Theoretical draw secured!',
                highlights: { a1: HIGHLIGHT_BLACK }
            }
        ]
    },
    'pawn-rule-of-square': {
        id: 'pawn-rule-of-square',
        tabName: 'Square Rule',
        title: 'The Rule of the Square',
        subtitle: 'Determine at a glance whether a runaway passed pawn can be caught without King support.',
        keyIdea: 'Draw an imaginary square from the pawn to the 8th rank. If the defending King cannot step inside the square on its turn, the pawn promotes untouched.',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '6k1/8/8/8/8/8/P7/7K w - - 0 1',
                comment: 'White to move. The pawn is on a2, and Black\'s king is on g8. Can the pawn promote without King support?',
                highlights: { a2: HIGHLIGHT_WHITE, g8: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '1',
                san: '1. a4!',
                fen: '6k1/8/8/8/P7/8/8/7K b - - 0 1',
                comment: '1. a4! The pawn advances two squares. The square reaches a4-a8-e8-e4. Black on g8 is outside the square.',
                highlights: { a4: HIGHLIGHT_WHITE, a8: HIGHLIGHT_WHITE, e8: HIGHLIGHT_WHITE, e4: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '1...',
                san: '1... Kf7',
                fen: '8/5k2/8/8/P7/8/8/7K w - - 1 2',
                comment: '1... Kf7. Black tries to enter the square, but reaches only f7—still outside the perimeter.',
                highlights: { f7: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '2',
                san: '2. a5!',
                fen: '8/5k2/8/P7/8/8/8/7K b - - 0 2',
                comment: '2. a5! The square shrinks to a5-a8-d8-d5. Black cannot enter and the pawn queens untouched.',
                highlights: { a5: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '3',
                san: '2... Ke6 3. a6 Kd6 4. a7 Kc7 5. a8=Q',
                fen: 'Q7/2k5/8/8/8/8/8/7K b - - 0 5',
                comment: 'White queens smoothly with an effortless win.',
                highlights: { a8: HIGHLIGHT_WHITE }
            }
        ]
    },
    'pawn-6th-rank': {
        id: 'pawn-6th-rank',
        tabName: '6th-Rank Pawn',
        title: 'Pawn on the 6th Rank & Opposition',
        subtitle: 'The critical 6th-rank threshold where King opposition decides win or stalemate.',
        keyIdea: 'When the pawn reaches the 6th rank, opposition is decisive. If the stronger King holds opposition, the pawn promotes; if the defender holds opposition, it is stalemate.',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '1k6/8/2P5/1K6/8/8/8/8 w - - 0 1',
                comment: 'White pawn on c6, King on b5. Black King on b8. White must take the opposition.',
                highlights: { b5: HIGHLIGHT_WHITE, c6: HIGHLIGHT_WHITE, b8: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '1',
                san: '1. Kb6!',
                fen: '1k6/8/1KP5/8/8/8/8/8 b - - 1 1',
                comment: '1. Kb6! TAKING THE OPPOSITION! Not 1.Ka6? Kc8 or 1.c7+? Kc8, where Black holds the draw.',
                highlights: { b6: HIGHLIGHT_WHITE, b8: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '1...',
                san: '1... Kc8',
                fen: '2k5/8/1KP5/8/8/8/8/8 w - - 2 2',
                comment: '1... Kc8. (If 1...Ka8 2.Kc7! wins.) Black must step in front of the pawn.',
                highlights: { c8: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '2',
                san: '2. c7',
                fen: '2k5/2P5/1K6/8/8/8/8/8 b - - 0 2',
                comment: '2. c7! The pawn is protected by the King and Black has only one legal move.',
                highlights: { c7: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '2...',
                san: '2... Kd7',
                fen: '8/2Pk4/1K6/8/8/8/8/8 w - - 1 3',
                comment: '2... Kd7. Forced.',
                highlights: { d7: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '3',
                san: '3. Kb7!',
                fen: '8/1KPk4/8/8/8/8/8/8 b - - 2 3',
                comment: '3. Kb7! The King clears c8 for the pawn. c8=Q follows and White wins.',
                highlights: { b7: HIGHLIGHT_WHITE, c7: HIGHLIGHT_WHITE }
            }
        ]
    },
    'pawn-key-squares': {
        id: 'pawn-key-squares',
        tabName: 'Key Squares',
        title: 'Key Squares',
        subtitle: 'Pawn on the 5th rank & outflanking.',
        keyIdea: '1...Ke8 2.Ke6! (taking opposition; not 2.e6? stalemate) 2...Kd8 3.Kf7! (outflanking to clear the e-file). The pawn promotes in three moves.',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '3k4/8/3K4/4P3/8/8/8/8 b - - 0 1',
                comment: 'Black to move. White pawn on e5, King on d6. White already occupies a key square (d6).',
                highlights: { d6: HIGHLIGHT_WHITE, e5: HIGHLIGHT_WHITE, d8: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '1...',
                san: '1... Ke8 2. Ke6!',
                fen: '4k3/8/4K3/4P3/8/8/8/8 b - - 2 2',
                comment: '1... Ke8 2. Ke6! TAKING OPPOSITION! (Not 2.e6? Kd8 3.e7+ Ke8 4.Ke6 stalemate).',
                highlights: { e6: HIGHLIGHT_WHITE, e8: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '3',
                san: '2... Kd8 3. Kf7!',
                fen: '3k4/5K2/8/4P3/8/8/8/8 b - - 4 3',
                comment: '2... Kd8 3. Kf7! OUTFLANKING! The path for the e-pawn is completely clear. 1-0!',
                highlights: { f7: HIGHLIGHT_WHITE }
            }
        ]
    },
    'pawn-key-squares-4th': {
        id: 'pawn-key-squares-4th',
        tabName: 'Key Squares 4th',
        title: 'Key Squares: 4th-Rank Pawn',
        subtitle: 'Occupy the critical key squares two ranks ahead to guarantee promotion.',
        keyIdea: 'For a pawn on ranks 2-4, key squares are two ranks ahead on the same and adjacent files. Occupying any of these squares guarantees promotion regardless of opposition.',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '5k2/8/8/8/2KP4/8/8/8 w - - 0 1',
                comment: 'White pawn on d4. Key squares are c6, d6, e6. Claiming any of them forces a win.',
                highlights: { c6: HIGHLIGHT_WHITE, d6: HIGHLIGHT_WHITE, e6: HIGHLIGHT_WHITE, d4: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '1',
                san: '1. Kd5!',
                fen: '5k2/8/8/3K4/3P4/8/8/8 b - - 1 1',
                comment: '1. Kd5! Heading for c6. (1.Ke5?? would concede opposition after 1...Ke7!).',
                highlights: { d5: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '1...',
                san: '1... Ke7 2. Kc6!',
                fen: '8/4k3/2K5/8/3P4/8/8/8 b - - 3 2',
                comment: '1... Ke7 2. Kc6! KEY SQUARE OCCUPIED! The pawn will promote by force.',
                highlights: { c6: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '3',
                san: '2... Kd8 3. Kd6! Kc8 4. Ke7 Kc7 5. d5',
                fen: '8/2k1K3/8/3P4/8/8/8/8 b - - 0 5',
                comment: '3. Kd6! Seizing direct opposition, then 4.Ke7 escorting d5-d6-d7-d8=Q.',
                highlights: { d5: HIGHLIGHT_WHITE }
            }
        ]
    },
    'pawn-distant-opposition': {
        id: 'pawn-distant-opposition',
        tabName: 'Distant Opposition',
        title: 'Distant Opposition',
        subtitle: 'Neutralizing advanced passed pawns from afar.',
        keyIdea: 'When separated by an odd number of squares on the same file, the defender holds distant opposition. This converts into direct opposition as kings approach.',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '8/8/8/1kp5/8/8/8/2K5 w - - 0 1',
                comment: 'Black has an advanced passed pawn on c5 supported by the king on b5. White must take distant opposition.',
                highlights: { c1: HIGHLIGHT_WHITE, b5: HIGHLIGHT_BLACK, c5: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '1',
                san: '1. Kb1!',
                fen: '8/8/8/1kp5/8/8/8/1K6 b - - 1 1',
                comment: '1. Kb1!! DISTANT OPPOSITION! The kings are separated by 3 empty squares on the b-file.',
                highlights: { b1: HIGHLIGHT_WHITE, b5: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '2',
                san: '1... Kb4 2. Kb2!',
                fen: '8/8/8/2p5/1k6/8/1K6/8 b - - 3 2',
                comment: '1... Kb4 2. Kb2! DIRECT OPPOSITION! The distant opposition converts into direct opposition.',
                highlights: { b2: HIGHLIGHT_WHITE, b4: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '3',
                san: '2... c4 3. Kc2 c3 4. Kc1! Kb3 5. Kb1 c2+ 6. Kc1 Kc3',
                fen: '8/8/8/8/8/2k5/2p5/2K5 w - - 1 6',
                comment: 'STALEMATE! White has no legal moves. The draw is secured.',
                highlights: { c1: HIGHLIGHT_WHITE }
            }
        ]
    },
    'pawn-rook-corner': {
        id: 'pawn-rook-corner',
        tabName: 'Rook Pawn Defense',
        title: 'Rook Pawn Corner Defense',
        subtitle: 'Imprisoning the attacking King on the rim.',
        keyIdea: 'Against a rook pawn, occupying the two nearest bishop-file squares (c1/c2 for an a-pawn) locks the attacking King into a forced stalemate.',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '8/8/8/8/p7/1k6/8/3K4 w - - 0 1',
                comment: 'Black threatens 1...Kb2 followed by pushing the a-pawn. White must act immediately.',
                highlights: { d1: HIGHLIGHT_WHITE, b3: HIGHLIGHT_BLACK, a4: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '1',
                san: '1. Kc1!',
                fen: '8/8/8/8/p7/1k6/8/2K5 b - - 1 1',
                comment: '1. Kc1! PREVENTING Kb2 and threatening 2.Kb1 to blockade.',
                highlights: { c1: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '2',
                san: '1... Ka2 2. Kc2!',
                fen: '8/8/8/8/p7/8/k1K5/8 b - - 3 2',
                comment: '1... Ka2 2. Kc2! THE IMPRISONMENT! White confines the black king to the a-file.',
                highlights: { c2: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '3',
                san: '2... a3 3. Kc1 Ka1 4. Kc2 a2 5. Kc1',
                fen: '8/8/8/8/8/8/p7/k1K5 b - - 0 5',
                comment: 'STALEMATE! Black has no legal moves. An ironclad draw!',
                highlights: { c1: HIGHLIGHT_WHITE }
            }
        ]
    },
    'pawn-trebuchet': {
        id: 'pawn-trebuchet',
        tabName: 'Trebuchet',
        title: 'Mutual Zugzwang & Trebuchet',
        subtitle: 'Reserving the critical attack tempo in reciprocal attack positions.',
        keyIdea: 'In the Trebuchet, both kings defend their own pawn while attacking the opponent\'s. The player to move must give way and lose their pawn.',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '8/8/8/3Kp3/4Pk2/8/8/8 b - - 0 1',
                comment: 'The Trebuchet: White King on d5 attacks e5 and defends e4; Black King on f4 attacks e4 and defends e5. Black to move!',
                highlights: { d5: HIGHLIGHT_WHITE, e4: HIGHLIGHT_WHITE, f4: HIGHLIGHT_BLACK, e5: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '1',
                san: '1... Kg4',
                fen: '8/8/8/3Kp3/4P1k1/8/8/8 w - - 1 2',
                comment: '1... Kg4. ZUGZWANG! Black must abandon defense of the e5 pawn.',
                highlights: { g4: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '2',
                san: '2. Kxe5! Kf3 3. Kd5! Kf4 4. e5 Kf5 5. e6 Kf6 6. Kd6!',
                fen: '8/8/3KPk2/8/8/8/8/8 b - - 1 6',
                comment: '2. Kxe5! White captures the pawn and escorts the e-pawn to e8=Q. White wins!',
                highlights: { d6: HIGHLIGHT_WHITE, e6: HIGHLIGHT_WHITE }
            }
        ]
    },
    'pawn-reti-maneuver': {
        id: 'pawn-reti-maneuver',
        tabName: 'Dual-Purpose King',
        title: 'Dual-Purpose King Maneuver',
        subtitle: 'Diagonal geometry to chase a runner while supporting your own pawn.',
        keyIdea: 'Diagonal king moves create two threats at once: threatening to enter the square of the enemy runner and threatening to support your own passed pawn.',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '7K/8/k1P5/8/7p/8/8/8 w - - 0 1',
                comment: 'White King on h8 is far outside the square of Black\'s h4 pawn. Black King on a6 blockades c6. White to move draws!',
                highlights: { h8: HIGHLIGHT_WHITE, c6: HIGHLIGHT_WHITE, a6: HIGHLIGHT_BLACK, h4: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '1',
                san: '1. Kg7! h3 2. Kf6!',
                fen: '8/8/k1P2K2/8/8/7p/8/8 b - - 1 2',
                comment: '1. Kg7! h3 2. Kf6! Threatening both to enter the square of the h-pawn and to support c6 with Ke7.',
                highlights: { f6: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '2',
                san: '2... Kb6 3. Ke5!',
                fen: '8/8/1kP5/4K3/8/7p/8/8 b - - 3 3',
                comment: '2... Kb6 3. Ke5!! White threatens both 4.Kd6 and 4.Kf4!',
                highlights: { e5: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '3',
                san: '3... Kxc6 4. Kf4! h2 5. Kg3',
                fen: '8/8/2k5/8/8/6K1/7p/8 b - - 1 5',
                comment: '3... Kxc6 4. Kf4! White steps inside the square just in time to capture on h1. Draw!',
                highlights: { g3: HIGHLIGHT_WHITE }
            }
        ]
    },
    'pawn-triangulation': {
        id: 'pawn-triangulation',
        tabName: 'Triangulation',
        title: 'Triangulation Maneuver',
        subtitle: 'Losing a tempo to break a fortress via corresponding squares.',
        keyIdea: '1. Kd5 Kc8 2. Kd4! Kd8 3. Kc4! Kc8 4. Kd5! Kc7 (4... Kd8 5. Kd6 Kc8 6. c7 Kb7 7. Kd7 Ka7 8. Kc6 +- (8. c8=Q stalemate)) 5. Kc5! Kc8 6. Kb6 Kb8 7. Kxa6 Kc7 8. Kb5 1-0.',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '8/2k5/p1P5/P1K5/8/8/8/8 w - - 0 1',
                comment: 'White King on c5, pawns on a5 and c6. Black King on c7, pawn on a6. White triangulates on d5-d4-c4 to pass the move to Black.',
                highlights: { c5: HIGHLIGHT_WHITE, c7: HIGHLIGHT_BLACK, c6: HIGHLIGHT_WHITE, a5: HIGHLIGHT_WHITE, a6: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '1',
                san: '1. Kd5 Kc8',
                fen: '2k5/8/p1P5/P2K4/8/8/8/8 w - - 2 2',
                comment: '1. Kd5! Kc8. White steps to d5. Black retreats to c8.',
                highlights: { d5: HIGHLIGHT_WHITE, c8: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '2',
                san: '2. Kd4! Kd8',
                fen: '3k4/8/p1P5/P7/3K4/8/8/8 w - - 4 3',
                comment: '2. Kd4! Kd8. First step of the triangle, controlling c5 and d5.',
                highlights: { d4: HIGHLIGHT_WHITE, d8: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '3',
                san: '3. Kc4! Kc8',
                fen: '2k5/8/p1P5/P7/2K5/8/8/8 w - - 6 4',
                comment: '3. Kc4! Kc8. Second step of the triangle. Black cannot cover both c7 and d8.',
                highlights: { c4: HIGHLIGHT_WHITE, c8: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '4',
                san: '4. Kd5! Kc7',
                fen: '8/2k5/p1P5/P2K4/8/8/8/8 w - - 8 5',
                comment: '4. Kd5! Kc7. (If 4... Kd8 5. Kd6 Kc8 6. c7 Kb7 7. Kd7 Ka7 8. Kc6! +- not 8. c8=Q stalemate).',
                highlights: { d5: HIGHLIGHT_WHITE, c7: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '5',
                san: '5. Kc5! Kc8',
                fen: '2k5/8/p1P5/P1K5/8/8/8/8 w - - 10 6',
                comment: '5. Kc5! Kc8. Triangulation complete! Initial position reached with Black to move. Black must give way.',
                highlights: { c5: HIGHLIGHT_WHITE, c8: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '6',
                san: '6. Kb6! Kb8 7. Kxa6 Kc7 8. Kb5',
                fen: '8/2k5/2P5/PK6/8/8/8/8 b - - 0 8',
                comment: '6. Kb6! Kb8 7. Kxa6 Kc7 8. Kb5! White defends the pawn and secures promotion. 1-0!',
                highlights: { b6: HIGHLIGHT_WHITE, b5: HIGHLIGHT_WHITE }
            }
        ]
    },
    'pawn-outside-passed': {
        id: 'pawn-outside-passed',
        tabName: 'Outside Passed Pawn',
        title: 'Outside Passed Pawn Decoy',
        subtitle: 'Diverting the enemy King to sweep the opposite wing.',
        keyIdea: 'An outside passed pawn acts as a decoy: the enemy king is drawn far to the perimeter to eliminate it, while your king penetrates the center and sweeps the opponent\'s pawns.',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '8/8/4k3/1p2p3/1P2K3/8/7P/8 w - - 0 1',
                comment: 'White has an outside passed pawn on h2. The center is blocked. White uses the h-pawn as a decoy.',
                highlights: { h2: HIGHLIGHT_WHITE, e4: HIGHLIGHT_WHITE, e6: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '1',
                san: '1. h4! Kf6 2. h5! Kg5 3. Kxe5!',
                fen: '8/8/8/1p2K1kP/1P6/8/8/8 b - - 0 3',
                comment: '1. h4! Kf6 2. h5! Kg5 3. Kxe5! THE DECOY SUCCEEDS! While Black chases the h-pawn, White harvests the center.',
                highlights: { e5: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '2',
                san: '3... Kxh5 4. Kd5! Kg6 5. Kc5 Kf6 6. Kxb5',
                fen: '8/8/5k2/1K6/1P6/8/8/8 b - - 0 6',
                comment: '4. Kd5! 5. Kc5! 6. Kxb5! White claims the key square and queens the b-pawn easily. White wins!',
                highlights: { b5: HIGHLIGHT_WHITE }
            }
        ]
    },
    'pawn-breakthrough': {
        id: 'pawn-breakthrough',
        tabName: 'Pawn Breakthrough',
        title: 'Tactical Pawn Breakthrough',
        subtitle: 'Sacrificial levers to force a passed pawn through equal numbers.',
        keyIdea: 'Push the middle pawn (1.b6!). Whichever flank pawn captures, push the opposing flank pawn (2.c6! or 2.a6!) to deflect the remaining defender and queen untouched.',
        steps: [
            {
                moveNumber: 'Initial Position',
                san: 'Start',
                fen: '8/ppp5/8/PPP5/8/4k3/8/4K3 w - - 0 1',
                comment: 'White has pawns on a5, b5, c5 against Black\'s a7, b7, c7. White forces a queen in 3 moves!',
                highlights: { a5: HIGHLIGHT_WHITE, b5: HIGHLIGHT_WHITE, c5: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '1',
                san: '1. b6! axb6',
                fen: '8/1pp5/1p6/P1P5/8/4k3/8/4K3 w - - 0 2',
                comment: '1. b6!! THE SACRIFICE! Black captures 1...axb6.',
                highlights: { b6: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '2',
                san: '2. c6!! bxc6 3. a6!',
                fen: '8/2p5/Ppp5/8/8/4k3/8/4K3 b - - 0 3',
                comment: '2. c6!! THE SECOND SACRIFICE! Deflects b7. After 2...bxc6 3. a6!, the a-pawn queens uncontested!',
                highlights: { a6: HIGHLIGHT_WHITE }
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
                fen: '4k3/8/8/4K3/4P3/8/8/8 w - - 0 1',
                comment: 'White to move and win. The White King is already ahead of its e4 pawn. White must reach a key square (d6, e6 or f6) with the right timing.',
                highlights: { e5: HIGHLIGHT_WHITE, e4: HIGHLIGHT_WHITE, e8: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '1',
                san: '1. Kd6!',
                fen: '4k3/8/3K4/8/4P3/8/8/8 b - - 1 1',
                comment: '1. Kd6! White steps onto a key square. The pawn is now free to advance behind the King.',
                highlights: { d6: HIGHLIGHT_WHITE, e8: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '1...',
                san: '1... Kd8',
                fen: '3k4/8/3K4/8/4P3/8/8/8 w - - 2 2',
                comment: '1... Kd8. Black takes the opposition, but it cannot stop the pawn.',
                highlights: { d8: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '2',
                san: '2. e5!',
                fen: '3k4/8/3K4/4P3/8/8/8/8 b - - 0 2',
                comment: '2. e5! The pawn advances while the King guards the key squares.',
                highlights: { e5: HIGHLIGHT_WHITE }
            },
            {
                moveNumber: '2...',
                san: '2... Ke8',
                fen: '4k3/8/3K4/4P3/8/8/8/8 w - - 1 3',
                comment: '2... Ke8. Black steps in front of the pawn.',
                highlights: { e8: HIGHLIGHT_BLACK }
            },
            {
                moveNumber: '3',
                san: '3. Ke6!',
                fen: '4k3/8/4K3/4P3/8/8/8/8 b - - 2 3',
                comment: '3. Ke6! Taking the opposition. (3.e6? Kd8 only draws.) Black must give way and the pawn queens.',
                highlights: { e6: HIGHLIGHT_WHITE }
            }
        ]
    },
    'bishop-knight-mate': {
        id: 'bishop-knight-mate',
        tabName: 'B+N Checkmate',
        title: 'Bishop & Knight Checkmate (10-Step Method)',
        subtitle: 'Position 13.4: Complete 34-move logical checkmate.',
        keyIdea: '1. Centralise King & Knight -> 2. Push to Safe Corner -> 3. Pivotal Square c6 -> 4. Philidor W-path & 20.Be3! -> 5. The Cage -> 6. Two checks mate.',
        steps: BISHOP_KNIGHT_10_STEPS
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
                    ) : selectedTab === 'bishop-knight-mate' ? (
                        /* Embedded Bishop & Knight Masterclass */
                        <BishopKnightGuide
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
