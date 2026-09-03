import React, { useState, useEffect, useRef } from 'react';
import { Chessboard, defaultArrowOptions } from 'react-chessboard';

// High-contrast, uniform square highlights for White and Black pieces
const WHITE_SQUARE_STYLE: React.CSSProperties = { backgroundColor: 'rgba(16, 185, 129, 0.75)' };
const BLACK_SQUARE_STYLE: React.CSSProperties = { backgroundColor: 'rgba(220, 38, 38, 0.75)' };

const customArrowOptions = {
    ...defaultArrowOptions,
    color: '#be185d',
    secondaryColor: '#ea580c',
    tertiaryColor: '#059669',
    opacity: 0.55,
    activeOpacity: 0.45,
};
import {
    BookOpen,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Play,
    Pause,
    Crosshair,
    Swords,
    Sparkles,
    AlertTriangle,
    CheckCircle2
} from 'lucide-react';

interface MoveStep {
    san: string;
    moveNumber: string;
    fen: string;
    comment: string;
    highlights?: Record<string, React.CSSProperties>;
    forkSquares?: string[];
    arrows?: Array<{ startSquare: string; endSquare: string; color: string }>;
}

interface DiagramVariation {
    id: string;
    name: string;
    summary: string;
    targetSquare: string;
    steps: MoveStep[];
}

interface QueenVsRookGuideProps {
    onLoadPosition?: (fen: string, playerColor: 'w' | 'b', title: string) => void;
    onClose?: () => void;
}

// 1. Philidor 1777 Triangulation Steps
const TRIANGULATION_STEPS: MoveStep[] = [
    {
        moveNumber: 'Initial Position',
        san: 'Start',
        fen: '1k6/1r6/2K5/Q7/8/8/8/8 w - - 0 1',
        comment: "Philidor (1777): White's king and queen are optimally placed. The Black king is confined to the rim, and the rook guards the 7th rank. But it is White to move! If it were Black to move, Black would be in zugzwang. White must transfer the turn to Black via triangulation.",
        highlights: {
            a5: WHITE_SQUARE_STYLE,
            c6: WHITE_SQUARE_STYLE,
            b8: BLACK_SQUARE_STYLE,
            b7: BLACK_SQUARE_STYLE
        }
    },
    {
        moveNumber: '1',
        san: '1. Qe5+',
        fen: '1k6/1r6/2K5/4Q3/8/8/8/8 b - - 1 1',
        comment: '1. Qe5+! White delivers a diagonal check. The Black king is forced back into the corner (a8 or a7).',
        highlights: {
            e5: WHITE_SQUARE_STYLE,
            b8: BLACK_SQUARE_STYLE
        }
    },
    {
        moveNumber: '1...',
        san: '1... Ka8',
        fen: 'k7/1r6/2K5/4Q3/8/8/8/8 w - - 2 2',
        comment: '1... Ka8 (or 1... Ka7). The King is forced to step further into the corner.',
        highlights: {
            a8: BLACK_SQUARE_STYLE
        }
    },
    {
        moveNumber: '2',
        san: '2. Qa1+',
        fen: 'k7/1r6/2K5/8/8/8/8/Q7 b - - 3 2',
        comment: '2. Qa1+! The Queen drops to the opposite corner on the 1st rank, checking along the a-file and forcing the King back.',
        highlights: {
            a1: WHITE_SQUARE_STYLE,
            a8: BLACK_SQUARE_STYLE
        }
    },
    {
        moveNumber: '2...',
        san: '2... Kb8',
        fen: '1k6/1r6/2K5/8/8/8/8/Q7 w - - 4 3',
        comment: "2... Kb8. The Black King is pushed back to b8. Now observe the Queen's return path...",
        highlights: {
            b8: BLACK_SQUARE_STYLE
        }
    },
    {
        moveNumber: '3',
        san: '3. Qa5!',
        fen: '1k6/1r6/2K5/Q7/8/8/8/8 b - - 5 3',
        comment: '3. Qa5! Zugzwang! White returns to the identical starting position (a5 → e5 → a1 → a5), but now it is BLACK to move! The Black rook must abandon its king and promptly falls to a double attack.',
        highlights: {
            a5: WHITE_SQUARE_STYLE,
            b7: BLACK_SQUARE_STYLE
        }
    }
];

// 2. Fork Variations after 3. Qa5
const FORK_VARIATIONS: DiagramVariation[] = [
    {
        id: 'rb1',
        name: '3... Rb1 (Main Fork on h7)',
        summary: 'Black retreats the rook down the b-file. White maneuvers the Queen to h7 to deliver the decisive royal fork.',
        targetSquare: 'h7',
        steps: [
            {
                moveNumber: '3...',
                san: '3... Rb1',
                fen: '1k6/8/2K5/Q7/8/8/8/1r6 w - - 6 4',
                comment: '3... Rb1. Black hopes to deliver checks from behind or from the side.',
                highlights: { b1: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '4',
                san: '4. Qd8+',
                fen: '3Q4/k7/2K5/8/8/8/8/1r6 b - - 7 4',
                comment: '4. Qd8+! Back-rank check. The Black king is forced out to a7.',
                highlights: {
                    d8: WHITE_SQUARE_STYLE,
                    a7: BLACK_SQUARE_STYLE
                }
            },
            {
                moveNumber: '4...',
                san: '4... Ka7',
                fen: '3Q4/k7/2K5/8/8/8/8/1r6 w - - 8 5',
                comment: '4... Ka7. Only legal move.',
                highlights: { a7: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '5',
                san: '5. Qd4+',
                fen: '8/k7/2K5/8/3Q4/8/8/1r6 b - - 9 5',
                comment: '5. Qd4+! Centralizing check. Black King must step to a8 (if 5...Kb8 6.Qh8+ Ka7 7.Qh7+ wins equally).',
                highlights: { d4: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '5...',
                san: '5... Ka8',
                fen: 'k7/8/2K5/8/3Q4/8/8/1r6 w - - 10 6',
                comment: '5... Ka8. Cornered.',
                highlights: { a8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '6',
                san: '6. Qh8+',
                fen: 'k6Q/8/2K5/8/8/8/8/1r6 b - - 11 6',
                comment: '6. Qh8+! Driving the king back up to a7.',
                highlights: { h8: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '6...',
                san: '6... Ka7',
                fen: '7Q/k7/2K5/8/8/8/8/1r6 w - - 12 7',
                comment: '6... Ka7.',
                highlights: { a7: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '7',
                san: '7. Qh7+!',
                fen: '8/k6Q/2K5/8/8/8/8/1r6 b - - 13 7',
                comment: '7. Qh7+! DOUBLE ATTACK! The Queen attacks both the King on a7 and the unprotected Rook on b1 along the 7th rank and diagonal.',
                highlights: {
                    h7: WHITE_SQUARE_STYLE,
                    a7: BLACK_SQUARE_STYLE,
                    b1: BLACK_SQUARE_STYLE
                },
                arrows: [
                    { startSquare: 'h7', endSquare: 'a7', color: '#be185d' },
                    { startSquare: 'h7', endSquare: 'b1', color: '#be185d' }
                ]
            },
            {
                moveNumber: '8',
                san: '8. Qxb1',
                fen: '8/k7/2K5/8/8/8/8/1Q6 b - - 0 8',
                comment: '8. Qxb1! The rook falls. White mates on the next move (e.g. 8...Ka8 9.Qb7#).',
                highlights: { b1: WHITE_SQUARE_STYLE }
            }
        ]
    },
    {
        id: 'rh7',
        name: '3... Rh7 (Rank Defense - Fork on b1)',
        summary: 'Black swings the rook along the 7th rank. White checks on e5, a1, and lands a royal fork on b1.',
        targetSquare: 'b1',
        steps: [
            {
                moveNumber: '3...',
                san: '3... Rh7',
                fen: '1k6/7r/2K5/Q7/8/8/8/8 w - - 6 4',
                comment: '3... Rh7. Black attempts to hold along the 7th rank.',
                highlights: { h7: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '4',
                san: '4. Qe5+',
                fen: '1k6/7r/2K5/4Q3/8/8/8/8 b - - 7 4',
                comment: '4. Qe5+! Diagonal check driving the King into the corner.',
                highlights: { e5: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '4...',
                san: '4... Ka8',
                fen: 'k7/7r/2K5/4Q3/8/8/8/8 w - - 8 5',
                comment: '4... Ka8 (4...Ka7 loses similarly).',
                highlights: { a8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '5',
                san: '5. Qa1+',
                fen: 'k7/7r/2K5/8/8/8/8/Q7 b - - 9 5',
                comment: '5. Qa1+! Checking along the diagonal and a-file, driving the King back to b8.',
                highlights: { a1: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '5...',
                san: '5... Kb8',
                fen: '1k6/7r/2K5/8/8/8/8/Q7 w - - 10 6',
                comment: '5... Kb8.',
                highlights: { b8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '6',
                san: '6. Qb1+!',
                fen: '1k6/7r/2K5/8/8/8/8/1Q6 b - - 11 6',
                comment: '6. Qb1+! DOUBLE ATTACK! The Queen simultaneously checks the King on b8 and forks the unprotected Rook on h7 along the 1st rank and diagonal!',
                highlights: {
                    b1: WHITE_SQUARE_STYLE,
                    b8: BLACK_SQUARE_STYLE,
                    h7: BLACK_SQUARE_STYLE
                },
                arrows: [
                    { startSquare: 'b1', endSquare: 'b8', color: '#be185d' },
                    { startSquare: 'b1', endSquare: 'h7', color: '#be185d' }
                ]
            },
            {
                moveNumber: '7',
                san: '7. Qxh7',
                fen: '1k6/7Q/2K5/8/8/8/8/8 b - - 0 7',
                comment: '7. Qxh7! Rook captured with mate to follow on b7 or c7.',
                highlights: { h7: WHITE_SQUARE_STYLE }
            }
        ]
    },
    {
        id: 'rb3',
        name: '3... Rb3 (3rd Rank - Fork on a4)',
        summary: 'Black drops to b3 to keep maximum distance. White forks king and rook via 6.Qa4+.',
        targetSquare: 'a4',
        steps: [
            {
                moveNumber: '3...',
                san: '3... Rb3',
                fen: '1k6/8/2K5/Q7/8/1r6/8/8 w - - 6 4',
                comment: '3... Rb3. Black hopes the third rank keeps the rook safe.',
                highlights: { b3: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '4',
                san: '4. Qd8+',
                fen: '3Q4/8/2K5/8/8/1r6/8/8 b - - 7 4',
                comment: '4. Qd8+! Back-rank check.',
                highlights: { d8: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '4...',
                san: '4... Ka7',
                fen: '3Q4/k7/2K5/8/8/1r6/8/8 w - - 8 5',
                comment: '4... Ka7.',
                highlights: { a7: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '5',
                san: '5. Qd4+',
                fen: '8/k7/2K5/8/3Q4/1r6/8/8 b - - 9 5',
                comment: '5. Qd4+! Pushing the King to a8.',
                highlights: { d4: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '5...',
                san: '5... Ka8',
                fen: 'k7/8/2K5/8/3Q4/1r6/8/8 w - - 10 6',
                comment: '5... Ka8.',
                highlights: { a8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '6',
                san: '6. Qa4+!',
                fen: 'k7/8/2K5/8/Q7/1r6/8/8 b - - 11 6',
                comment: '6. Qa4+! DOUBLE ATTACK! Queen hits Ka8 along the a-file and simultaneously skewers Rb3 along the 4th rank!',
                highlights: {
                    a4: WHITE_SQUARE_STYLE,
                    a8: BLACK_SQUARE_STYLE,
                    b3: BLACK_SQUARE_STYLE
                },
                arrows: [
                    { startSquare: 'a4', endSquare: 'a8', color: '#be185d' },
                    { startSquare: 'a4', endSquare: 'b3', color: '#be185d' }
                ]
            },
            {
                moveNumber: '7',
                san: '7. Qxb3',
                fen: 'k7/8/2K5/8/8/1Q6/8/8 b - - 0 7',
                comment: '7. Qxb3. Decisive win.',
                highlights: { b3: WHITE_SQUARE_STYLE }
            }
        ]
    },
    {
        id: 'rb2',
        name: '3... Rb2 (2nd Rank - Direct Fork on d4)',
        summary: 'Black drops to b2. White punishes immediately with 4.Qd8+ and 5.Qd4+ fork.',
        targetSquare: 'd4',
        steps: [
            {
                moveNumber: '3...',
                san: '3... Rb2',
                fen: '1k6/8/2K5/Q7/8/8/1r6/8 w - - 6 4',
                comment: '3... Rb2.',
                highlights: { b2: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '4',
                san: '4. Qd8+',
                fen: '3Q4/8/2K5/8/8/8/1r6/8 b - - 7 4',
                comment: '4. Qd8+ Ka7',
                highlights: { d8: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '4...',
                san: '4... Ka7',
                fen: '3Q4/k7/2K5/8/8/8/1r6/8 w - - 8 5',
                comment: '4... Ka7.',
                highlights: { a7: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '5',
                san: '5. Qd4+',
                fen: '8/k7/2K5/8/3Q4/8/1r6/8 b - - 9 5',
                comment: '5. Qd4+! IMMEDIATE DOUBLE ATTACK! Hits Ka7 on the long diagonal and the undefended Rook on b2 along the d4-b2 diagonal!',
                highlights: {
                    d4: WHITE_SQUARE_STYLE,
                    a7: BLACK_SQUARE_STYLE,
                    b2: BLACK_SQUARE_STYLE
                },
                arrows: [
                    { startSquare: 'd4', endSquare: 'a7', color: '#be185d' },
                    { startSquare: 'd4', endSquare: 'b2', color: '#be185d' }
                ]
            },
            {
                moveNumber: '6',
                san: '6. Qxb2',
                fen: '8/k7/2K5/8/8/8/1Q6/8 b - - 0 6',
                comment: '6. Qxb2. Rook won.',
                highlights: { b2: WHITE_SQUARE_STYLE }
            }
        ]
    },
    {
        id: 'kc8',
        name: '3... Kc8 (King Step - Mate in 2)',
        summary: 'If the black king steps to c8, White delivers an immediate checkmate.',
        targetSquare: 'f8',
        steps: [
            {
                moveNumber: '3...',
                san: '3... Kc8',
                fen: '2k5/1r6/2K5/Q7/8/8/8/8 w - - 6 4',
                comment: '3... Kc8. Black tries to keep the rook defended by the King.',
                highlights: { c8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '4',
                san: '4. Qf5+',
                fen: '2k5/1r6/2K5/5Q2/8/8/8/8 b - - 7 4',
                comment: '4. Qf5+! Black king is forced to d8.',
                highlights: { f5: WHITE_SQUARE_STYLE }
            },
            {
                moveNumber: '4...',
                san: '4... Kd8',
                fen: '3k4/1r6/2K5/5Q2/8/8/8/8 w - - 8 5',
                comment: '4... Kd8 (4...Kb8 loses to 5.Qf8+ Ka7 6.Qa3+ Kb8 7.Qa6).',
                highlights: { d8: BLACK_SQUARE_STYLE }
            },
            {
                moveNumber: '5',
                san: '5. Qf8#',
                fen: '3k1Q2/1r6/2K5/8/8/8/8/8 b - - 9 5',
                comment: '5. Qf8# CHECKMATE! King is boxed against the back rank.',
                highlights: { f8: WHITE_SQUARE_STYLE }
            }
        ]
    }
];

// 3. Center to Edge: Herding the Solitary Rook (Dvoretsky 13-3)
const HERDING_STEPS: MoveStep[] = [
    {
        moveNumber: 'Initial Position',
        san: 'FEN 13-3',
        fen: '8/8/8/2K5/5r2/4k3/8/Q7 b - - 0 1',
        comment: 'Dvoretsky 13-3: Black has king on e3 and rook on f4 in the open board. Under time controls (e.g. Svidler vs Gelfand 2001 Moscow World Championship), grandmasters often fail to outplay the rook within 50 moves without strict geometric technique.',
        highlights: {
            a1: WHITE_SQUARE_STYLE,
            c5: WHITE_SQUARE_STYLE,
            e3: BLACK_SQUARE_STYLE,
            f4: BLACK_SQUARE_STYLE
        }
    },
    {
        moveNumber: '1...',
        san: '1... Rf8',
        fen: '5r2/8/8/2K5/8/4k3/8/Q7 w - - 1 2',
        comment: '1... Rf8. Black swings the rook to the edge to prepare distant checks.',
        highlights: { f8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: '2',
        san: '2. Qd4+',
        fen: '5r2/8/8/2K5/3Q4/4k3/8/8 b - - 2 2',
        comment: '2. Qd4+! Centralizing check, restricting Black King squares on the e-file.',
        highlights: { d4: WHITE_SQUARE_STYLE }
    },
    {
        moveNumber: '2...',
        san: '2... Ke2',
        fen: '5r2/8/8/2K5/3Q4/8/4k3/8 w - - 3 3',
        comment: '2... Ke2.',
        highlights: { e2: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: '3',
        san: '3. Qg4+',
        fen: '5r2/8/8/2K5/6Q1/8/4k3/8 b - - 4 3',
        comment: '3. Qg4+! Squeezing the Black King away from the center.',
        highlights: { g4: WHITE_SQUARE_STYLE }
    },
    {
        moveNumber: '3...',
        san: '3... Ke3',
        fen: '5r2/8/8/2K5/6Q1/4k3/8/8 w - - 5 4',
        comment: '3... Ke3.',
        highlights: { e3: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: '4',
        san: '4. Qe6+',
        fen: '5r2/8/4Q3/2K5/8/4k3/8/8 b - - 6 4',
        comment: '4. Qe6+! King must step to f3.',
        highlights: { e6: WHITE_SQUARE_STYLE }
    },
    {
        moveNumber: '4...',
        san: '4... Kf3',
        fen: '5r2/8/4Q3/2K5/8/5k2/8/8 w - - 7 5',
        comment: '4... Kf3. Black is gradually herded toward the kingside flank.',
        highlights: { f3: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: '5',
        san: '5. Kd4',
        fen: '5r2/8/4Q3/8/3K4/5k2/8/8 b - - 8 5',
        comment: "5. Kd4! Now that Black's king is restricted, White's King marches up into active opposition.",
        highlights: { d4: WHITE_SQUARE_STYLE }
    },
    {
        moveNumber: '5...',
        san: '5... Rd8+',
        fen: '3r4/8/4Q3/8/3K4/5k2/8/8 w - - 9 6',
        comment: '5... Rd8+. Harassing check from the rook.',
        highlights: { d8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: '6',
        san: '6. Kc3',
        fen: '3r4/8/4Q3/8/8/2K2k2/8/8 b - - 10 6',
        comment: '6. Kc3! Sidestepping the vertical check.',
        highlights: { c3: WHITE_SQUARE_STYLE }
    },
    {
        moveNumber: '6...',
        san: '6... Rf8',
        fen: '5r2/8/4Q3/8/8/2K2k2/8/8 w - - 11 7',
        comment: '6... Rf8. Defending the king along the f-file.',
        highlights: { f8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: '7',
        san: '7. Qc6+',
        fen: '5r2/8/2Q5/8/8/2K2k2/8/8 b - - 12 7',
        comment: '7. Qc6+! Crucial timing! Now 7...Ke3? is impossible due to the double attack 8.Qc5+! forking King and Rook. Black must play 7...Kg4.',
        highlights: {
            c6: WHITE_SQUARE_STYLE,
            c5: BLACK_SQUARE_STYLE
        }
    },
    {
        moveNumber: '7...',
        san: '7... Kg4',
        fen: '5r2/8/2Q5/8/6k1/2K5/8/8 w - - 13 8',
        comment: '7... Kg4. King pushed further towards the edge.',
        highlights: { g4: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: '8',
        san: '8. Qg6+',
        fen: '5r2/8/6Q1/8/6k1/2K5/8/8 b - - 14 8',
        comment: '8. Qg6+! Precise cross-check.',
        highlights: { g6: WHITE_SQUARE_STYLE }
    },
    {
        moveNumber: '8...',
        san: '8... Kf3',
        fen: '5r2/8/6Q1/8/8/2K2k2/8/8 w - - 15 9',
        comment: '8... Kf3.',
        highlights: { f3: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: '9',
        san: '9. Qh5+!',
        fen: '5r2/8/8/7Q/8/2K2k2/8/8 b - - 16 9',
        comment: "9. Qh5+! An outstanding square for the Queen. Black's king is forced onto the g-file. Note that 9...Ke3?, 9...Kf4?, or 9...Kf2? all lose the rook immediately to Queen forks! Moreover, 9...Ke4? drops to 10.Qe2+ Kd5 11.Qc4+.",
        highlights: {
            h5: WHITE_SQUARE_STYLE,
            f3: BLACK_SQUARE_STYLE
        }
    },
    {
        moveNumber: '9...',
        san: '9... Kg3',
        fen: '5r2/8/8/7Q/8/2K3k1/8/8 w - - 17 10',
        comment: "9... Kg3. Forced to the g-file, leaving the rook vulnerable.",
        highlights: { g3: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: '10',
        san: '10. Kd3',
        fen: '5r2/8/8/7Q/8/3K2k1/8/8 b - - 18 10',
        comment: "10. Kd3! White's King advances while Black has no checks without losing the rook.",
        highlights: { d3: WHITE_SQUARE_STYLE }
    },
    {
        moveNumber: '10...',
        san: '10... Rf3+',
        fen: '8/8/8/7Q/8/3K1rk1/8/8 w - - 19 11',
        comment: '10... Rf3+ (10...Rd8+ 11.Ke3 Re8+? is illegal/losing).',
        highlights: { f3: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: '11',
        san: '11. Ke4',
        fen: '8/8/8/7Q/4K3/5rk1/8/8 b - - 20 11',
        comment: '11. Ke4! White steps closer to the enemy king and rook.',
        highlights: { e4: WHITE_SQUARE_STYLE }
    },
    {
        moveNumber: '11...',
        san: '11... Rf4+',
        fen: '8/8/8/7Q/4Kr2/6k1/8/8 w - - 21 12',
        comment: '11... Rf4+.',
        highlights: { f4: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: '12',
        san: '12. Ke3!',
        fen: '8/8/8/7Q/5r2/4K1k1/8/8 b - - 22 12',
        comment: '12. Ke3! Black has run out of safe checks (12...Rf3+ is impossible). The defending king is cornered on the rim and White will soon transition directly into the Philidor 1777 winning setup!',
        highlights: {
            e3: WHITE_SQUARE_STYLE,
            f4: BLACK_SQUARE_STYLE,
            g3: BLACK_SQUARE_STYLE
        }
    }
];

export default function QueenVsRookGuide({ onLoadPosition, onClose }: QueenVsRookGuideProps) {
    // Active section tabs
    const [activeTab, setActiveTab] = useState<'triangulation' | 'forks' | 'herding' | 'rules'>('triangulation');

    // Diagram 1: Triangulation state
    const [triStepIndex, setTriStepIndex] = useState(0);
    const [isTriPlaying, setIsTriPlaying] = useState(false);

    // Diagram 2: Forks state
    const [selectedForkId, setSelectedForkId] = useState<string>('rb1');
    const [forkStepIndex, setForkStepIndex] = useState(0);
    const [isForkPlaying, setIsForkPlaying] = useState(false);

    // Diagram 3: Herding state
    const [herdStepIndex, setHerdStepIndex] = useState(0);
    const [isHerdPlaying, setIsHerdPlaying] = useState(false);

    // Autoplay timers
    const triTimerRef = useRef<number | null>(null);
    const forkTimerRef = useRef<number | null>(null);
    const herdTimerRef = useRef<number | null>(null);

    // Triangulation autoplay
    useEffect(() => {
        if (!isTriPlaying) {
            if (triTimerRef.current) clearInterval(triTimerRef.current);
            return;
        }

        triTimerRef.current = window.setInterval(() => {
            setTriStepIndex((prev) => {
                if (prev >= TRIANGULATION_STEPS.length - 1) {
                    setIsTriPlaying(false);
                    return prev;
                }
                return prev + 1;
            });
        }, 1800);

        return () => {
            if (triTimerRef.current) clearInterval(triTimerRef.current);
        };
    }, [isTriPlaying]);

    // Fork autoplay
    const currentForkVariation = FORK_VARIATIONS.find((v) => v.id === selectedForkId) || FORK_VARIATIONS[0];

    useEffect(() => {
        if (!isForkPlaying) {
            if (forkTimerRef.current) clearInterval(forkTimerRef.current);
            return;
        }

        forkTimerRef.current = window.setInterval(() => {
            setForkStepIndex((prev) => {
                if (prev >= currentForkVariation.steps.length - 1) {
                    setIsForkPlaying(false);
                    return prev;
                }
                return prev + 1;
            });
        }, 1800);

        return () => {
            if (forkTimerRef.current) clearInterval(forkTimerRef.current);
        };
    }, [isForkPlaying, currentForkVariation]);

    // Herding autoplay
    useEffect(() => {
        if (!isHerdPlaying) {
            if (herdTimerRef.current) clearInterval(herdTimerRef.current);
            return;
        }

        herdTimerRef.current = window.setInterval(() => {
            setHerdStepIndex((prev) => {
                if (prev >= HERDING_STEPS.length - 1) {
                    setIsHerdPlaying(false);
                    return prev;
                }
                return prev + 1;
            });
        }, 1600);

        return () => {
            if (herdTimerRef.current) clearInterval(herdTimerRef.current);
        };
    }, [isHerdPlaying]);

    const activeTriStep = TRIANGULATION_STEPS[triStepIndex];
    const activeForkStep = currentForkVariation.steps[forkStepIndex] || currentForkVariation.steps[0];
    const activeHerdStep = HERDING_STEPS[herdStepIndex];

    const [forkArrows, setForkArrows] = useState<Array<{ startSquare: string; endSquare: string; color: string }>>([]);

    useEffect(() => {
        setForkArrows(activeForkStep?.arrows || []);
    }, [activeForkStep]);

    return (
        <div className="w-full bg-white/95 backdrop-blur-md rounded-3xl border-2 border-plum/15 shadow-xl p-6 md:p-8 space-y-8 animate-in fade-in duration-500 text-plum">
            {/* Header / Intro Banner */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-plum/10">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-berry/10 text-berry font-black text-xs uppercase tracking-wider">
                        <BookOpen size={14} />
                        <span>Masterclass Theory & Interactive Diagrams</span>
                    </div>
                    <h2 className="text-2xl md:text-4xl font-black font-serif text-plum tracking-tight">
                        How to Win <span className="text-berry italic">Queen vs. Rook</span>
                    </h2>
                    <p className="text-xs md:text-sm text-plum/70 font-medium max-w-2xl">
                        Based on François-André Danican Philidor (1777) and Mark Dvoretsky's Endgame Manual (Chapter 13). Master triangulation, zugzwang, and geometric royal forks.
                    </p>
                </div>

                {onClose && (
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl border border-plum/15 bg-cream hover:bg-white text-xs font-black uppercase tracking-wider text-plum/70 hover:text-plum transition-all"
                    >
                        Close Guide
                    </button>
                )}
            </div>

            {/* Sticky Navigation Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                    onClick={() => setActiveTab('triangulation')}
                    className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${activeTab === 'triangulation'
                        ? 'bg-plum text-white border-plum shadow-md'
                        : 'bg-white text-plum/70 border-plum/15 hover:bg-cream'
                        }`}
                >
                    1. Triangulation (Philidor 1777)
                </button>
                <button
                    onClick={() => setActiveTab('forks')}
                    className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${activeTab === 'forks'
                        ? 'bg-plum text-white border-plum shadow-md'
                        : 'bg-white text-plum/70 border-plum/15 hover:bg-cream'
                        }`}
                >
                    2. Zugzwang & Royal Forks (5 Lines)
                </button>
                <button
                    onClick={() => setActiveTab('herding')}
                    className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${activeTab === 'herding'
                        ? 'bg-plum text-white border-plum shadow-md'
                        : 'bg-white text-plum/70 border-plum/15 hover:bg-cream'
                        }`}
                >
                    3. Herding to Edge (13-3)
                </button>
                <button
                    onClick={() => setActiveTab('rules')}
                    className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${activeTab === 'rules'
                        ? 'bg-plum text-white border-plum shadow-md'
                        : 'bg-white text-plum/70 border-plum/15 hover:bg-cream'
                        }`}
                >
                    4. Master Rules & Traps
                </button>
            </div>

            {/* TAB 1: TRIANGULATION */}
            {activeTab === 'triangulation' && (
                <div className="space-y-6">
                    <div className="grid lg:grid-cols-12 gap-8 items-center">
                        {/* Diagram Interactive Board */}
                        <div className="lg:col-span-6 flex flex-col items-center">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-plum/60 bg-cream/80 px-2.5 py-1 rounded-lg border border-plum/10 mb-2">
                                <Sparkles size={12} className="text-berry shrink-0" />
                                <span>Right-click & drag to draw arrows • Left-click to clear all arrows</span>
                            </div>
                            <div
                                className="w-full aspect-square max-w-[380px] bg-white rounded-2xl border-2 border-plum/15 shadow-inner p-3 overflow-hidden relative select-none cursor-pointer"
                                onContextMenu={(e) => e.preventDefault()}
                            >
                                <Chessboard
                                    options={{
                                        position: activeTriStep.fen,
                                        boardOrientation: 'white',
                                        allowDragging: false,
                                        darkSquareStyle: { backgroundColor: '#b58863' },
                                        lightSquareStyle: { backgroundColor: '#f0d9b5' },
                                        squareStyles: activeTriStep.highlights || {},
                                        arrows: activeTriStep.arrows || [],
                                        allowDrawingArrows: true,
                                        clearArrowsOnClick: true,
                                        arrowOptions: customArrowOptions,
                                        alphaNotationStyle: {
                                            fontSize: '9px',
                                            fontWeight: 'bold',
                                            lineHeight: 1,
                                            bottom: 1.5,
                                            right: 2.5,
                                            zIndex: 15,
                                            pointerEvents: 'none',
                                            userSelect: 'none'
                                        },
                                        numericNotationStyle: {
                                            fontSize: '9px',
                                            fontWeight: 'bold',
                                            lineHeight: 1,
                                            top: 1.5,
                                            left: 2.5,
                                            zIndex: 15,
                                            pointerEvents: 'none',
                                            userSelect: 'none'
                                        },
                                        animationDurationInMs: 0,
                                        showAnimations: false
                                    }}
                                />
                            </div>

                            {/* Stepper Controls */}
                            <div className="flex items-center justify-between w-full max-w-[380px] mt-4 gap-2">
                                <button
                                    onClick={() => { setIsTriPlaying(false); setTriStepIndex(0); }}
                                    className="p-2.5 rounded-xl border border-plum/15 hover:bg-cream text-plum/70 hover:text-plum transition-colors"
                                    title="Reset to Start"
                                >
                                    <RotateCcw size={15} />
                                </button>
                                <button
                                    onClick={() => { setIsTriPlaying(false); setTriStepIndex(Math.max(0, triStepIndex - 1)); }}
                                    disabled={triStepIndex === 0}
                                    className="p-2.5 rounded-xl border border-plum/15 hover:bg-cream text-plum/70 hover:text-plum disabled:opacity-40 transition-colors"
                                    title="Previous Move"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={() => setIsTriPlaying(!isTriPlaying)}
                                    className="px-4 py-2 rounded-xl bg-berry text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm hover:bg-berry/90 transition-colors"
                                >
                                    {isTriPlaying ? <Pause size={14} /> : <Play size={14} />}
                                    <span>{isTriPlaying ? 'Pause' : 'Autoplay'}</span>
                                </button>
                                <button
                                    onClick={() => { setIsTriPlaying(false); setTriStepIndex(Math.min(TRIANGULATION_STEPS.length - 1, triStepIndex + 1)); }}
                                    disabled={triStepIndex === TRIANGULATION_STEPS.length - 1}
                                    className="p-2.5 rounded-xl border border-plum/15 hover:bg-cream text-plum/70 hover:text-plum disabled:opacity-40 transition-colors"
                                    title="Next Move"
                                >
                                    <ChevronRight size={16} />
                                </button>
                                {onLoadPosition && (
                                    <button
                                        onClick={() => onLoadPosition(activeTriStep.fen, 'w', "Philidor Triangulation Stage")}
                                        className="px-3 py-2 rounded-xl border-2 border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-xs uppercase tracking-wider transition-colors shadow-sm"
                                        title="Practice on Trainer Board"
                                    >
                                        Try on Board
                                    </button>
                                )}
                            </div>

                            {/* Move index indicators */}
                            <div className="flex items-center gap-1.5 mt-3">
                                {TRIANGULATION_STEPS.map((step, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => { setIsTriPlaying(false); setTriStepIndex(idx); }}
                                        className={`h-2 rounded-full transition-all ${triStepIndex === idx ? 'w-6 bg-berry' : 'w-2 bg-plum/20 hover:bg-plum/40'
                                            }`}
                                        title={step.san}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Explanation Column */}
                        <div className="lg:col-span-6 space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-plum/40">
                                        Step {triStepIndex + 1} of {TRIANGULATION_STEPS.length}
                                    </span>
                                    <span className="font-mono text-sm font-black px-2.5 py-0.5 rounded-lg bg-plum/5 border border-plum/10 text-plum">
                                        {activeTriStep.san}
                                    </span>
                                </div>
                                <h3 className="text-xl font-serif font-black text-plum">
                                    The Triangular Maneuver (a5 → e5 → a1 → a5)
                                </h3>
                                <div className="p-4 rounded-2xl bg-cream border border-plum/10 text-xs font-medium leading-relaxed text-plum/80">
                                    {activeTriStep.comment}
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 space-y-2">
                                <div className="flex items-center gap-2 font-black text-amber-800 uppercase tracking-wider">
                                    <Sparkles size={14} />
                                    <span>Why Triangulation Works</span>
                                </div>
                                <p className="leading-relaxed">
                                    In the starting position, White's Queen is on <strong>a5</strong> and King on <strong>c6</strong>. White wants to say "pass", because if Black moves, the Rook must leave the protection of the King! Since passing is illegal in chess, White spends 3 moves visiting <strong>e5</strong> and <strong>a1</strong> to return to <strong>a5</strong>, successfully transferring the turn to Black.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: ZUGZWANG & ROYAL FORKS */}
            {activeTab === 'forks' && (
                <div className="space-y-6">
                    {/* Variation Selector Buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                        {FORK_VARIATIONS.map((v) => (
                            <button
                                key={v.id}
                                onClick={() => {
                                    setSelectedForkId(v.id);
                                    setForkStepIndex(0);
                                    setIsForkPlaying(false);
                                }}
                                className={`p-3 rounded-2xl border text-left transition-all ${selectedForkId === v.id
                                    ? 'bg-plum text-white border-plum shadow-md'
                                    : 'bg-white hover:bg-cream text-plum border-plum/15'
                                    }`}
                            >
                                <div className="text-[10px] font-black uppercase tracking-wider opacity-70">
                                    Fork on {v.targetSquare.toUpperCase()}
                                </div>
                                <div className="font-bold text-xs truncate mt-0.5">
                                    {v.name.split('(')[0]}
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="grid lg:grid-cols-12 gap-8 items-center pt-2">
                        {/* Interactive Board */}
                        <div className="lg:col-span-6 flex flex-col items-center">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-plum/60 bg-cream/80 px-2.5 py-1 rounded-lg border border-plum/10 mb-2">
                                <Sparkles size={12} className="text-berry shrink-0" />
                                <span>Right-click & drag to draw arrows • Left-click to clear all arrows</span>
                            </div>
                            <div
                                className="w-full aspect-square max-w-[380px] bg-white rounded-2xl border-2 border-plum/15 shadow-inner p-3 overflow-hidden relative select-none cursor-pointer"
                                onContextMenu={(e) => e.preventDefault()}
                                onMouseDown={(e) => {
                                    if (e.button === 0) {
                                        setForkArrows([]);
                                    }
                                }}
                            >
                                <Chessboard
                                    options={{
                                        position: activeForkStep.fen,
                                        boardOrientation: 'white',
                                        allowDragging: false,
                                        darkSquareStyle: { backgroundColor: '#b58863' },
                                        lightSquareStyle: { backgroundColor: '#f0d9b5' },
                                        squareStyles: activeForkStep.highlights || {},
                                        arrows: forkArrows,
                                        allowDrawingArrows: true,
                                        clearArrowsOnClick: true,
                                        onSquareClick: () => {
                                            setForkArrows([]);
                                        },
                                        onPieceClick: () => {
                                            setForkArrows([]);
                                        },
                                        arrowOptions: customArrowOptions,
                                        alphaNotationStyle: {
                                            fontSize: '9px',
                                            fontWeight: 'bold',
                                            lineHeight: 1,
                                            bottom: 1.5,
                                            right: 2.5,
                                            zIndex: 15,
                                            pointerEvents: 'none',
                                            userSelect: 'none'
                                        },
                                        numericNotationStyle: {
                                            fontSize: '9px',
                                            fontWeight: 'bold',
                                            lineHeight: 1,
                                            top: 1.5,
                                            left: 2.5,
                                            zIndex: 15,
                                            pointerEvents: 'none',
                                            userSelect: 'none'
                                        },
                                        animationDurationInMs: 0,
                                        showAnimations: false
                                    }}
                                />
                            </div>

                            {/* Stepper Controls */}
                            <div className="flex items-center justify-between w-full max-w-[380px] mt-4 gap-2">
                                <button
                                    onClick={() => { setIsForkPlaying(false); setForkStepIndex(0); }}
                                    className="p-2.5 rounded-xl border border-plum/15 hover:bg-cream text-plum/70 hover:text-plum transition-colors"
                                    title="Reset"
                                >
                                    <RotateCcw size={15} />
                                </button>
                                <button
                                    onClick={() => { setIsForkPlaying(false); setForkStepIndex(Math.max(0, forkStepIndex - 1)); }}
                                    disabled={forkStepIndex === 0}
                                    className="p-2.5 rounded-xl border border-plum/15 hover:bg-cream text-plum/70 hover:text-plum disabled:opacity-40 transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={() => setIsForkPlaying(!isForkPlaying)}
                                    className="px-4 py-2 rounded-xl bg-berry text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm hover:bg-berry/90 transition-colors"
                                >
                                    {isForkPlaying ? <Pause size={14} /> : <Play size={14} />}
                                    <span>{isForkPlaying ? 'Pause' : 'Autoplay'}</span>
                                </button>
                                <button
                                    onClick={() => { setIsForkPlaying(false); setForkStepIndex(Math.min(currentForkVariation.steps.length - 1, forkStepIndex + 1)); }}
                                    disabled={forkStepIndex === currentForkVariation.steps.length - 1}
                                    className="p-2.5 rounded-xl border border-plum/15 hover:bg-cream text-plum/70 hover:text-plum disabled:opacity-40 transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                                {onLoadPosition && (
                                    <button
                                        onClick={() => onLoadPosition(activeForkStep.fen, 'w', `Refutation: ${currentForkVariation.name}`)}
                                        className="px-3 py-2 rounded-xl border-2 border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-xs uppercase tracking-wider transition-colors shadow-sm"
                                        title="Practice on Trainer Board"
                                    >
                                        Try on Board
                                    </button>
                                )}
                            </div>

                            {/* Move dots */}
                            <div className="flex items-center gap-1.5 mt-3">
                                {currentForkVariation.steps.map((step, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => { setIsForkPlaying(false); setForkStepIndex(idx); }}
                                        className={`h-2 rounded-full transition-all ${forkStepIndex === idx ? 'w-6 bg-berry' : 'w-2 bg-plum/20 hover:bg-plum/40'
                                            }`}
                                        title={step.san}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Explanation */}
                        <div className="lg:col-span-6 space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-plum/40">
                                        Step {forkStepIndex + 1} of {currentForkVariation.steps.length}
                                    </span>
                                    <span className="font-mono text-sm font-black px-2.5 py-0.5 rounded-lg bg-plum/5 border border-plum/10 text-plum">
                                        {activeForkStep.san}
                                    </span>
                                </div>
                                <h3 className="text-xl font-serif font-black text-plum">
                                    {currentForkVariation.name}
                                </h3>
                                <p className="text-xs text-plum/60 font-medium">
                                    {currentForkVariation.summary}
                                </p>
                                <div className="p-4 rounded-2xl bg-cream border border-plum/10 text-xs font-medium leading-relaxed text-plum/80">
                                    {activeForkStep.comment}
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-900 space-y-2">
                                <div className="flex items-center gap-2 font-black text-emerald-800 uppercase tracking-wider">
                                    <Crosshair size={14} />
                                    <span>Geometry of the Double Attack</span>
                                </div>
                                <p className="leading-relaxed">
                                    Because Black's king is pinned on the rim, the Queen coordinates checks on the open board while aligning with the abandoned rook. The rook cannot protect itself from diagonal + horizontal attacks!
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: HERDING FROM CENTER (13-3) */}
            {activeTab === 'herding' && (
                <div className="space-y-6">
                    <div className="p-4 rounded-2xl bg-cream border border-plum/10 text-xs text-plum/80 leading-relaxed">
                        <strong className="text-plum font-black">Historical Insight:</strong> At the 2001 World Championship in Moscow, Super-GM Peter Svidler had Boris Gelfand down to a Queen vs. Rook endgame with several minutes plus a 10-second increment. Svidler failed to herd the defending King to the rim within 50 moves, and the arbiters declared a draw! The following line shows the modern computer-tested technique to systematically restrict the defender.
                    </div>

                    <div className="grid lg:grid-cols-12 gap-8 items-center">
                        {/* Interactive Board */}
                        <div className="lg:col-span-6 flex flex-col items-center">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-plum/60 bg-cream/80 px-2.5 py-1 rounded-lg border border-plum/10 mb-2">
                                <Sparkles size={12} className="text-berry shrink-0" />
                                <span>Right-click & drag to draw arrows • Left-click to clear all arrows</span>
                            </div>
                            <div
                                className="w-full aspect-square max-w-[380px] bg-white rounded-2xl border-2 border-plum/15 shadow-inner p-3 overflow-hidden relative select-none cursor-pointer"
                                onContextMenu={(e) => e.preventDefault()}
                            >
                                <Chessboard
                                    options={{
                                        position: activeHerdStep.fen,
                                        boardOrientation: 'white',
                                        allowDragging: false,
                                        darkSquareStyle: { backgroundColor: '#b58863' },
                                        lightSquareStyle: { backgroundColor: '#f0d9b5' },
                                        squareStyles: activeHerdStep.highlights || {},
                                        arrows: activeHerdStep.arrows || [],
                                        allowDrawingArrows: true,
                                        clearArrowsOnClick: true,
                                        arrowOptions: customArrowOptions,
                                        alphaNotationStyle: {
                                            fontSize: '9px',
                                            fontWeight: 'bold',
                                            lineHeight: 1,
                                            bottom: 1.5,
                                            right: 2.5,
                                            zIndex: 15,
                                            pointerEvents: 'none',
                                            userSelect: 'none'
                                        },
                                        numericNotationStyle: {
                                            fontSize: '9px',
                                            fontWeight: 'bold',
                                            lineHeight: 1,
                                            top: 1.5,
                                            left: 2.5,
                                            zIndex: 15,
                                            pointerEvents: 'none',
                                            userSelect: 'none'
                                        },
                                        animationDurationInMs: 0,
                                        showAnimations: false
                                    }}
                                />
                            </div>

                            {/* Stepper Controls */}
                            <div className="flex items-center justify-between w-full max-w-[380px] mt-4 gap-2">
                                <button
                                    onClick={() => { setIsHerdPlaying(false); setHerdStepIndex(0); }}
                                    className="p-2.5 rounded-xl border border-plum/15 hover:bg-cream text-plum/70 hover:text-plum transition-colors"
                                    title="Reset"
                                >
                                    <RotateCcw size={15} />
                                </button>
                                <button
                                    onClick={() => { setIsHerdPlaying(false); setHerdStepIndex(Math.max(0, herdStepIndex - 1)); }}
                                    disabled={herdStepIndex === 0}
                                    className="p-2.5 rounded-xl border border-plum/15 hover:bg-cream text-plum/70 hover:text-plum disabled:opacity-40 transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={() => setIsHerdPlaying(!isHerdPlaying)}
                                    className="px-4 py-2 rounded-xl bg-berry text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm hover:bg-berry/90 transition-colors"
                                >
                                    {isHerdPlaying ? <Pause size={14} /> : <Play size={14} />}
                                    <span>{isHerdPlaying ? 'Pause' : 'Autoplay'}</span>
                                </button>
                                <button
                                    onClick={() => { setIsHerdPlaying(false); setHerdStepIndex(Math.min(HERDING_STEPS.length - 1, herdStepIndex + 1)); }}
                                    disabled={herdStepIndex === HERDING_STEPS.length - 1}
                                    className="p-2.5 rounded-xl border border-plum/15 hover:bg-cream text-plum/70 hover:text-plum disabled:opacity-40 transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                                {onLoadPosition && (
                                    <button
                                        onClick={() => onLoadPosition(activeHerdStep.fen, 'w', `Herding Stage (${activeHerdStep.san})`)}
                                        className="px-3 py-2 rounded-xl border-2 border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-xs uppercase tracking-wider transition-colors shadow-sm"
                                        title="Practice on Trainer Board"
                                    >
                                        Try on Board
                                    </button>
                                )}
                            </div>

                            {/* Move dots */}
                            <div className="flex items-center gap-1 mt-3 flex-wrap justify-center max-w-[380px]">
                                {HERDING_STEPS.map((step, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => { setIsHerdPlaying(false); setHerdStepIndex(idx); }}
                                        className={`h-1.5 rounded-full transition-all ${herdStepIndex === idx ? 'w-5 bg-berry' : 'w-1.5 bg-plum/20 hover:bg-plum/40'
                                            }`}
                                        title={step.san}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Explanation */}
                        <div className="lg:col-span-6 space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-plum/40">
                                        Step {herdStepIndex + 1} of {HERDING_STEPS.length}
                                    </span>
                                    <span className="font-mono text-sm font-black px-2.5 py-0.5 rounded-lg bg-plum/5 border border-plum/10 text-plum">
                                        {activeHerdStep.san}
                                    </span>
                                </div>
                                <h3 className="text-xl font-serif font-black text-plum">
                                    Herding Black's King to the Flank
                                </h3>
                                <div className="p-4 rounded-2xl bg-cream border border-plum/10 text-xs font-medium leading-relaxed text-plum/80">
                                    {activeHerdStep.comment}
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-plum/5 border border-plum/10 text-xs text-plum/80 space-y-2">
                                <div className="flex items-center gap-2 font-black text-plum uppercase tracking-wider">
                                    <Swords size={14} className="text-berry" />
                                    <span>Key Principles to Remember</span>
                                </div>
                                <ul className="space-y-1.5 list-disc pl-4 text-plum/70">
                                    <li><strong>Diagonal Restriction:</strong> Queen moves like 2.Qd4+, 3.Qg4+, and 9.Qh5+ slice the board into smaller boxes.</li>
                                    <li><strong>King Advance:</strong> Only step your King up when the defending King cannot escape (e.g. 5.Kd4, 10.Kd3, 11.Ke4).</li>
                                    <li><strong>Double Attack Threats:</strong> Moves like 7.Qc6+ prevent defensive counterplay like 7...Ke3 because 8.Qc5+ forks king and rook.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: RULES & PITFALLS */}
            {activeTab === 'rules' && (
                <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Card 1: Stalemate Traps */}
                        <div className="p-6 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-3">
                            <div className="flex items-center gap-2 text-rose-800 font-black text-sm uppercase tracking-wider">
                                <AlertTriangle size={18} />
                                <span>Beware the Desperado Rook</span>
                            </div>
                            <p className="text-xs text-rose-900/80 leading-relaxed font-medium">
                                Defending against a Queen, the opponent will deliberately sacrifice their Rook with checks (e.g. adjacent checks) when their King has zero legal moves! If you capture the Rook automatically without checking whether the King has a flight square, it is an instant <strong>stalemate draw</strong>. Always verify the King has an escape square before capturing an unprotected piece.
                            </p>
                        </div>

                        {/* Card 2: 50-Move Rule */}
                        <div className="p-6 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3">
                            <div className="flex items-center gap-2 text-amber-800 font-black text-sm uppercase tracking-wider">
                                <RotateCcw size={18} />
                                <span>The 50-Move Clock</span>
                            </div>
                            <p className="text-xs text-amber-900/80 leading-relaxed font-medium">
                                There are no pawns in Queen vs. Rook, so the 50-move counter never resets until the Rook is captured! If you waste 20 moves wandering around aimlessly or giving harmless checks, the tablebase defender will hold on and claim a draw. Execute the methodical herding steps and triangulation swiftly.
                            </p>
                        </div>

                        {/* Card 3: The Triangulation Rule of Thumb */}
                        <div className="p-6 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-3">
                            <div className="flex items-center gap-2 text-emerald-800 font-black text-sm uppercase tracking-wider">
                                <CheckCircle2 size={18} />
                                <span>The Queen Triangle Rule</span>
                            </div>
                            <p className="text-xs text-emerald-900/80 leading-relaxed font-medium">
                                In Philidor's setup with White King on <strong>c6</strong> and Queen on <strong>a5</strong>:
                                Remember the triangle: <strong>e5 → a1 → a5</strong>!
                                1. Check on the center diagonal (Qe5+).
                                2. Corner check on the 1st rank (Qa1+).
                                3. Anchor back to the starting square (Qa5!).
                                Black is placed in zugzwang every time.
                            </p>
                        </div>

                        {/* Card 4: Distance Defense */}
                        <div className="p-6 rounded-2xl bg-plum/5 border border-plum/10 space-y-3">
                            <div className="flex items-center gap-2 text-plum font-black text-sm uppercase tracking-wider">
                                <Crosshair size={18} className="text-berry" />
                                <span>Countering Flank Distance</span>
                            </div>
                            <p className="text-xs text-plum/70 leading-relaxed font-medium">
                                When the Rook moves far away from its King (such as 3...Rb1 or 3...Rh7), it loses physical defense. Do not rush to chase it with King moves; instead use Queen geometry (Qd8+, Qd4+, Qh7+, or Qb1+) to fork the King and Rook simultaneously.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
