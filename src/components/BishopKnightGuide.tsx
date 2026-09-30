import React, { useState, useEffect, useRef } from 'react';
import { Chessboard, defaultArrowOptions } from 'react-chessboard';
import {
    BookOpen,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Play,
    Pause,
    Target,
    Lightbulb,
    Swords,
    Shield,
    Compass,
    Timer,
    Award
} from '@/lib/lucideOriginal';
import { Link } from 'react-router-dom';
import { playMoveSound } from '../lib/soundEffects';

// Square highlights matching ChessParfait palette
export const WHITE_SQUARE_STYLE: React.CSSProperties = { backgroundColor: 'rgba(16, 185, 129, 0.75)' };
export const BLACK_SQUARE_STYLE: React.CSSProperties = { backgroundColor: 'rgba(220, 38, 38, 0.75)' };
export const ALERT_SQUARE_STYLE: React.CSSProperties = { backgroundColor: 'rgba(245, 158, 11, 0.65)' };

const customArrowOptions = {
    ...defaultArrowOptions,
    color: '#0284c7',
    secondaryColor: '#ea580c',
    tertiaryColor: '#059669',
    opacity: 0.65,
    activeOpacity: 0.55,
};

export interface MoveStep {
    san: string;
    moveNumber: string;
    fen: string;
    comment: string;
    highlights?: Record<string, React.CSSProperties>;
    arrows?: Array<{ startSquare: string; endSquare: string; color: string }>;
}

export interface DiagramVariation {
    id: string;
    name: string;
    summary: string;
    targetSquare: string;
    steps: MoveStep[];
}

interface BishopKnightGuideProps {
    onLoadPosition?: (fen: string, playerColor: 'w' | 'b', title: string) => void;
    onClose?: () => void;
}

/**
 * 1. The 10-Step Method (Position 13.4, 34 Moves)
 * The definitive human-logic technique to checkmate from the worst possible starting position.
 */
export const BISHOP_KNIGHT_10_STEPS: MoveStep[] = [
    {
        moveNumber: `Initial Position`,
        san: `Start`,
        fen: '8/8/8/8/4k3/8/6K1/6BN w - - 0 1',
        comment: `Position 13.4: One of the worst starting positions for White. Pieces are scattered and far from the centre. With the 10-step logical plan, White delivers checkmate in 34 moves.`
    },
    {
        moveNumber: `1`,
        san: `1. Kg3`,
        fen: '8/8/8/8/4k3/6K1/8/6BN b - - 1 1',
        comment: `Step 1: Transferring White King to the center. 1.Kg3 steps off the 2nd rank to contest central territory.`,
        highlights: { g3: WHITE_SQUARE_STYLE, e4: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "g2", "endSquare": "g3", "color": "#0284c7"}]
    },
    {
        moveNumber: `1...`,
        san: `1... Ke5`,
        fen: '8/8/8/4k3/8/6K1/8/6BN w - - 2 2',
        comment: `1... Ke5. Black moves into the center to resist.`,
        highlights: { e5: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `2`,
        san: `2. Kf3`,
        fen: '8/8/8/4k3/8/5K2/8/6BN b - - 3 2',
        comment: `2. Kf3! White advances closer. (Note: 2.Nf2! saves a move, but sticking to the logical plan is easiest to remember).`,
        highlights: { f3: WHITE_SQUARE_STYLE, e5: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "g3", "endSquare": "f3", "color": "#0284c7"}]
    },
    {
        moveNumber: `2...`,
        san: `2... Kd5`,
        fen: '8/8/8/3k4/8/5K2/8/6BN w - - 4 3',
        comment: `2... Kd5. Black centralises the King.`,
        highlights: { d5: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `3`,
        san: `3. Kf4`,
        fen: '8/8/8/3k4/5K2/8/8/6BN b - - 5 3',
        comment: `3. Kf4! Seizing the 4th rank and shouldering Black away.`,
        highlights: { f4: WHITE_SQUARE_STYLE, d5: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "f3", "endSquare": "f4", "color": "#0284c7"}]
    },
    {
        moveNumber: `3...`,
        san: `3... Kd6`,
        fen: '8/8/3k4/8/5K2/8/8/6BN w - - 6 4',
        comment: `3... Kd6. Black retreats.`,
        highlights: { d6: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `4`,
        san: `4. Ke4`,
        fen: '8/8/3k4/8/4K3/8/8/6BN b - - 7 4',
        comment: `4. Ke4! White occupies the central square e4. King centralisation (Step 1) is achieved!`,
        highlights: { e4: WHITE_SQUARE_STYLE, d6: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "f4", "endSquare": "e4", "color": "#0284c7"}]
    },
    {
        moveNumber: `4...`,
        san: `4... Kc6`,
        fen: '8/8/2k5/8/4K3/8/8/6BN w - - 8 5',
        comment: `4... Kc6. Black steps aside towards the queenside.`,
        highlights: { c6: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `5`,
        san: `5. Ng3`,
        fen: '8/8/2k5/8/4K3/6N1/8/6B1 b - - 9 5',
        comment: `Step 2: Centralising the Knight. 5.Ng3 brings the Knight off the rim towards the central circuits.`,
        highlights: { g3: WHITE_SQUARE_STYLE, c6: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "h1", "endSquare": "g3", "color": "#0284c7"}]
    },
    {
        moveNumber: `5...`,
        san: `5... Kd6`,
        fen: '8/8/3k4/8/4K3/6N1/8/6B1 w - - 10 6',
        comment: `5... Kd6. Black keeps the king active.`,
        highlights: { d6: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `6`,
        san: `6. Nf5+`,
        fen: '8/8/3k4/5N2/4K3/8/8/6B1 b - - 11 6',
        comment: `6. Nf5+! Knight check drives Black further back.`,
        highlights: { f5: WHITE_SQUARE_STYLE, d6: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "g3", "endSquare": "f5", "color": "#0284c7"}]
    },
    {
        moveNumber: `6...`,
        san: `6... Kc6`,
        fen: '8/8/2k5/5N2/4K3/8/8/6B1 w - - 12 7',
        comment: `6... Kc6. Black retreats.`,
        highlights: { c6: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `7`,
        san: `7. Ke5`,
        fen: '8/8/2k5/4KN2/8/8/8/6B1 b - - 13 7',
        comment: `7. Ke5! White King follows, denying d6 and e6.`,
        highlights: { e5: WHITE_SQUARE_STYLE, c6: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "e4", "endSquare": "e5", "color": "#0284c7"}]
    },
    {
        moveNumber: `7...`,
        san: `7... Kd7`,
        fen: '8/3k4/8/4KN2/8/8/8/6B1 w - - 14 8',
        comment: `7... Kd7. Forced back towards the 7th rank.`,
        highlights: { d7: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `8`,
        san: `8. Kd5`,
        fen: '8/3k4/8/3K1N2/8/8/8/6B1 b - - 15 8',
        comment: `8. Kd5! Dominating the 5th rank. The King and Knight are now fully centralized!`,
        highlights: { d5: WHITE_SQUARE_STYLE, d7: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "e5", "endSquare": "d5", "color": "#0284c7"}]
    },
    {
        moveNumber: `8...`,
        san: `8... Kc7`,
        fen: '8/2k5/8/3K1N2/8/8/8/6B1 w - - 16 9',
        comment: `8... Kc7. Black steps to the c-file.`,
        highlights: { c7: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `9`,
        san: `9. Bc5`,
        fen: '8/2k5/8/2BK1N2/8/8/8/8 b - - 17 9',
        comment: `Step 3: Pushing Black King to the edge / Safe Corner (a8). 9.Bc5! (from g1) controls d6 and prepares Bd6 if ...Kd7.`,
        highlights: { c5: WHITE_SQUARE_STYLE, d6: ALERT_SQUARE_STYLE, c7: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "g1", "endSquare": "c5", "color": "#0284c7"}]
    },
    {
        moveNumber: `9...`,
        san: `9... Kb7`,
        fen: '8/1k6/8/2BK1N2/8/8/8/8 w - - 18 10',
        comment: `9... Kb7. Black aims for a8, the Safe Corner opposite the Bishop's color.`,
        highlights: { b7: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `10`,
        san: `10. Kd6`,
        fen: '8/1k6/3K4/2B2N2/8/8/8/8 b - - 19 10',
        comment: `10. Kd6! Advancing the King to push Black into the rim.`,
        highlights: { d6: WHITE_SQUARE_STYLE, b7: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "d5", "endSquare": "d6", "color": "#0284c7"}]
    },
    {
        moveNumber: `10...`,
        san: `10... Kb8`,
        fen: '1k6/8/3K4/2B2N2/8/8/8/8 w - - 20 11',
        comment: `10... Kb8. Black arrives at the back rank.`,
        highlights: { b8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `11`,
        san: `11. Kc6`,
        fen: '1k6/8/2K5/2B2N2/8/8/8/8 b - - 21 11',
        comment: `Step 4: Occupying the Pivotal Square. 11.Kc6! The White King occupies the long diagonal opposite the corner. From c6, White controls the escape route.`,
        highlights: { c6: WHITE_SQUARE_STYLE, b8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "d6", "endSquare": "c6", "color": "#0284c7"}]
    },
    {
        moveNumber: `11...`,
        san: `11... Ka8`,
        fen: 'k7/8/2K5/2B2N2/8/8/8/8 w - - 22 12',
        comment: `11... Ka8. Black reaches the Safe Corner. Now White must evict the King and drive it to a1 or h8.`,
        highlights: { a8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `12`,
        san: `12. Nd6`,
        fen: 'k7/8/2KN4/2B5/8/8/8/8 b - - 23 12',
        comment: `Step 5: The Knight drives the King off the Safe Corner. 12.Nd6 moves into position targeting c7.`,
        highlights: { d6: WHITE_SQUARE_STYLE, a8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "f5", "endSquare": "d6", "color": "#0284c7"}]
    },
    {
        moveNumber: `12...`,
        san: `12... Kb8`,
        fen: '1k6/8/2KN4/2B5/8/8/8/8 w - - 24 13',
        comment: `12... Kb8.`,
        highlights: { b8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `13`,
        san: `13. Nb5`,
        fen: '1k6/8/2K5/1NB5/8/8/8/8 b - - 25 13',
        comment: `13. Nb5! Maneuvering to c7 with tempo.`,
        highlights: { b5: WHITE_SQUARE_STYLE, b8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "d6", "endSquare": "b5", "color": "#0284c7"}]
    },
    {
        moveNumber: `13...`,
        san: `13... Ka8`,
        fen: 'k7/8/2K5/1NB5/8/8/8/8 w - - 26 14',
        comment: `13... Ka8.`,
        highlights: { a8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `14`,
        san: `14. Nc7+`,
        fen: 'k7/2N5/2K5/2B5/8/8/8/8 b - - 27 14',
        comment: `14. Nc7+! Eviction check! The Black King is kicked out of the a8 Safe Corner forever.`,
        highlights: { c7: WHITE_SQUARE_STYLE, a8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "b5", "endSquare": "c7", "color": "#0284c7"}]
    },
    {
        moveNumber: `14...`,
        san: `14... Kb8`,
        fen: '1k6/2N5/2K5/2B5/8/8/8/8 w - - 28 15',
        comment: `14... Kb8. Forced.`,
        highlights: { b8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `15`,
        san: `15. Bd4`,
        fen: '1k6/2N5/2K5/8/3B4/8/8/8 b - - 29 15',
        comment: `Step 6: The Bishop drives the King off the adjacent square. 15.Bd4! Wastes a tempo and covers the long diagonal.`,
        highlights: { d4: WHITE_SQUARE_STYLE, b8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "c5", "endSquare": "d4", "color": "#0284c7"}]
    },
    {
        moveNumber: `15...`,
        san: `15... Kc8`,
        fen: '2k5/2N5/2K5/8/3B4/8/8/8 w - - 30 16',
        comment: `15... Kc8. Forced.`,
        highlights: { c8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `16`,
        san: `16. Ba7`,
        fen: '2k5/B1N5/2K5/8/8/8/8/8 b - - 31 16',
        comment: `16. Ba7! The key! The Bishop seals b8 so the Black King cannot return to the safe corner.`,
        highlights: { a7: WHITE_SQUARE_STYLE, b8: ALERT_SQUARE_STYLE, c8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "d4", "endSquare": "a7", "color": "#0284c7"}]
    },
    {
        moveNumber: `16...`,
        san: `16... Kd8`,
        fen: '3k4/B1N5/2K5/8/8/8/8/8 w - - 32 17',
        comment: `16... Kd8. Black begins the long march towards the other side.`,
        highlights: { d8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `17`,
        san: `17. Nd5`,
        fen: '3k4/B7/2K5/3N4/8/8/8/8 b - - 33 17',
        comment: `Step 7: Philidor's W-Manoeuvre begins. 17.Nd5! (c7 -> d5). The Knight jumps to the 5th rank, controlling c7 and e7.`,
        highlights: { d5: WHITE_SQUARE_STYLE, d8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "c7", "endSquare": "d5", "color": "#0284c7"}]
    },
    {
        moveNumber: `17...`,
        san: `17... Ke8`,
        fen: '4k3/B7/2K5/3N4/8/8/8/8 w - - 34 18',
        comment: `17... Ke8. Black continues along the 8th rank.`,
        highlights: { e8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `18`,
        san: `18. Kd6`,
        fen: '4k3/B7/3K4/3N4/8/8/8/8 b - - 35 18',
        comment: `18. Kd6! King steps forward to accompany the herd. Now Black has a critical choice: 18...Kf7 (trying to break out) or 18...Kd8.`,
        highlights: { d6: WHITE_SQUARE_STYLE, e8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "c6", "endSquare": "d6", "color": "#0284c7"}]
    },
    {
        moveNumber: `18...`,
        san: `18... Kf7`,
        fen: '8/B4k2/3K4/3N4/8/8/8/8 w - - 36 19',
        comment: `18... Kf7! Black attempts to escape into the open center. This is Black's most stubborn defense!`,
        highlights: { f7: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `19`,
        san: `19. Ne7`,
        fen: '8/B3Nk2/3K4/8/8/8/8/8 b - - 37 19',
        comment: `19. Ne7! (d5 -> e7). The second leg of the W-path! Controlling d5, f5, and cutting off escape.`,
        highlights: { e7: WHITE_SQUARE_STYLE, f7: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "d5", "endSquare": "e7", "color": "#0284c7"}]
    },
    {
        moveNumber: `19...`,
        san: `19... Kf6`,
        fen: '8/B3N3/3K1k2/8/8/8/8/8 w - - 38 20',
        comment: `19... Kf6. Black King seems about to break free via g5/h6... but White has an incredible geometric answer!`,
        highlights: { f6: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `20`,
        san: `20. Be3!`,
        fen: '8/4N3/3K1k2/8/8/4B3/8/8 b - - 39 20',
        comment: `20. Be3!! THE MOST CRITICAL MOVE IN THE ENDING! (Position 13.2 / 13.6). On the right, the Bishop and Knight set up a barrier covering g5 and h6; on the left, the White King cuts off the way! The breakout is completely refuted.`,
        highlights: { e3: WHITE_SQUARE_STYLE, g5: ALERT_SQUARE_STYLE, h6: ALERT_SQUARE_STYLE, f6: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "a7", "endSquare": "e3", "color": "#0284c7"}]
    },
    {
        moveNumber: `20...`,
        san: `20... Kf7`,
        fen: '8/4Nk2/3K4/8/8/4B3/8/8 w - - 40 21',
        comment: `20... Kf7. Forced to retreat.`,
        highlights: { f7: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `21`,
        san: `21. Bg5`,
        fen: '8/4Nk2/3K4/6B1/8/8/8/8 b - - 41 21',
        comment: `Step 8: Building The Cage (Position 13.3). 21.Bg5! takes away e7 and f6. The net tightens.`,
        highlights: { g5: WHITE_SQUARE_STYLE, f7: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "e3", "endSquare": "g5", "color": "#0284c7"}]
    },
    {
        moveNumber: `21...`,
        san: `21... Ke8`,
        fen: '4k3/4N3/3K4/6B1/8/8/8/8 w - - 42 22',
        comment: `21... Ke8.`,
        highlights: { e8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `22`,
        san: `22. Nc6`,
        fen: '4k3/8/2NK4/6B1/8/8/8/8 b - - 43 22',
        comment: `22. Nc6! Knight moves to support the cage, controlling e7 and d8.`,
        highlights: { c6: WHITE_SQUARE_STYLE, e8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "e7", "endSquare": "c6", "color": "#0284c7"}]
    },
    {
        moveNumber: `22...`,
        san: `22... Kf7`,
        fen: '8/5k2/2NK4/6B1/8/8/8/8 w - - 44 23',
        comment: `22... Kf7.`,
        highlights: { f7: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `23`,
        san: `23. Ne5+`,
        fen: '8/5k2/3K4/4N1B1/8/8/8/8 b - - 45 23',
        comment: `23. Ne5+! Checking and pushing Black King further into the corner.`,
        highlights: { e5: WHITE_SQUARE_STYLE, f7: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "c6", "endSquare": "e5", "color": "#0284c7"}]
    },
    {
        moveNumber: `23...`,
        san: `23... Ke8`,
        fen: '4k3/8/3K4/4N1B1/8/8/8/8 w - - 46 24',
        comment: `23... Ke8. Forced.`,
        highlights: { e8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `24`,
        san: `24. Ke6`,
        fen: '4k3/8/4K3/4N1B1/8/8/8/8 b - - 47 24',
        comment: `24. Ke6! THE CAGE IS READY (Position 13.3). The Black King is trapped on the back rank in a 4-square prison (e8-f8-g8-h8). White can now finish calmly.`,
        highlights: { e6: WHITE_SQUARE_STYLE, e8: BLACK_SQUARE_STYLE, d7: ALERT_SQUARE_STYLE, d8: ALERT_SQUARE_STYLE },
        arrows: [{"startSquare": "d6", "endSquare": "e6", "color": "#0284c7"}]
    },
    {
        moveNumber: `24...`,
        san: `24... Kf8`,
        fen: '5k2/8/4K3/4N1B1/8/8/8/8 w - - 48 25',
        comment: `24... Kf8.`,
        highlights: { f8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `25`,
        san: `25. Kd7`,
        fen: '5k2/3K4/8/4N1B1/8/8/8/8 b - - 49 25',
        comment: `Step 9: Taking the Mating Square. 25.Kd7! (or 26.Bh6!). White's King marches towards f7/g6.`,
        highlights: { d7: WHITE_SQUARE_STYLE, f8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "e6", "endSquare": "d7", "color": "#0284c7"}]
    },
    {
        moveNumber: `25...`,
        san: `25... Kg8`,
        fen: '6k1/3K4/8/4N1B1/8/8/8/8 w - - 50 26',
        comment: `25... Kg8.`,
        highlights: { g8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `26`,
        san: `26. Ke8`,
        fen: '4K1k1/8/8/4N1B1/8/8/8/8 b - - 51 26',
        comment: `26. Ke8! White controls f7 and pushes Black into the h-file.`,
        highlights: { e8: WHITE_SQUARE_STYLE, g8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "d7", "endSquare": "e8", "color": "#0284c7"}]
    },
    {
        moveNumber: `26...`,
        san: `26... Kg7`,
        fen: '4K3/6k1/8/4N1B1/8/8/8/8 w - - 52 27',
        comment: `26... Kg7.`,
        highlights: { g7: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `27`,
        san: `27. Ke7`,
        fen: '8/4K1k1/8/4N1B1/8/8/8/8 b - - 53 27',
        comment: `27. Ke7! Shifting the opposition.`,
        highlights: { e7: WHITE_SQUARE_STYLE, g7: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "e8", "endSquare": "e7", "color": "#0284c7"}]
    },
    {
        moveNumber: `27...`,
        san: `27... Kg8`,
        fen: '6k1/4K3/8/4N1B1/8/8/8/8 w - - 54 28',
        comment: `27... Kg8.`,
        highlights: { g8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `28`,
        san: `28. Bh6`,
        fen: '6k1/4K3/7B/4N3/8/8/8/8 b - - 55 28',
        comment: `28. Bh6! Restricting the king to g8 and h7.`,
        highlights: { h6: WHITE_SQUARE_STYLE, g7: ALERT_SQUARE_STYLE, g8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "g5", "endSquare": "h6", "color": "#0284c7"}]
    },
    {
        moveNumber: `28...`,
        san: `28... Kh7`,
        fen: '8/4K2k/7B/4N3/8/8/8/8 w - - 56 29',
        comment: `28... Kh7.`,
        highlights: { h7: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `29`,
        san: `29. Bf8`,
        fen: '5B2/4K2k/8/4N3/8/8/8/8 b - - 57 29',
        comment: `29. Bf8! Holding Black in the corner.`,
        highlights: { f8: WHITE_SQUARE_STYLE, h7: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "h6", "endSquare": "f8", "color": "#0284c7"}]
    },
    {
        moveNumber: `29...`,
        san: `29... Kg8`,
        fen: '5Bk1/4K3/8/4N3/8/8/8/8 w - - 58 30',
        comment: `29... Kg8.`,
        highlights: { g8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `30`,
        san: `30. Ke8`,
        fen: '4KBk1/8/8/4N3/8/8/8/8 b - - 59 30',
        comment: `30. Ke8! White King steps to e8 to prepare the final invasion.`,
        highlights: { e8: WHITE_SQUARE_STYLE, g8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "e7", "endSquare": "e8", "color": "#0284c7"}]
    },
    {
        moveNumber: `30...`,
        san: `30... Kh8`,
        fen: '4KB1k/8/8/4N3/8/8/8/8 w - - 60 31',
        comment: `30... Kh8. Forced into the corner.`,
        highlights: { h8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `31`,
        san: `31. Kf7`,
        fen: '5B1k/5K2/8/4N3/8/8/8/8 b - - 61 31',
        comment: `31. Kf7! The King occupies the MATING SQUARE (f7), exactly a knight's jump from the h8 corner. The trap is complete.`,
        highlights: { f7: WHITE_SQUARE_STYLE, h8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "e8", "endSquare": "f7", "color": "#0284c7"}]
    },
    {
        moveNumber: `31...`,
        san: `31... Kh7`,
        fen: '5B2/5K1k/8/4N3/8/8/8/8 w - - 62 32',
        comment: `31... Kh7.`,
        highlights: { h7: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `32`,
        san: `32. Ng4`,
        fen: '5B2/5K1k/8/8/6N1/8/8/8 b - - 63 32',
        comment: `Step 10: Checkmate with two consecutive checks. 32.Ng4! Maneuvering the Knight to deliver the fatal blow.`,
        highlights: { g4: WHITE_SQUARE_STYLE, h7: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "e5", "endSquare": "g4", "color": "#0284c7"}]
    },
    {
        moveNumber: `32...`,
        san: `32... Kh8`,
        fen: '5B1k/5K2/8/8/6N1/8/8/8 w - - 64 33',
        comment: `32... Kh8. The only legal move.`,
        highlights: { h8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `33`,
        san: `33. Bg7+`,
        fen: '7k/5KB1/8/8/6N1/8/8/8 b - - 65 33',
        comment: `33. Bg7+! First check! The Bishop strikes on the dark square, stripping away the h8 flight square and forcing the King to h7.`,
        highlights: { g7: WHITE_SQUARE_STYLE, h8: ALERT_SQUARE_STYLE, h7: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "f8", "endSquare": "g7", "color": "#0284c7"}]
    },
    {
        moveNumber: `33...`,
        san: `33... Kh7`,
        fen: '8/5KBk/8/8/6N1/8/8/8 w - - 66 34',
        comment: `33... Kh7. The lone legal response.`,
        highlights: { h7: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `34`,
        san: `34. Nf6#`,
        fen: '8/5KBk/5N2/8/8/8/8/8 b - - 67 34',
        comment: `34. Nf6# CHECKMATE!! The Knight delivers the decisive second check on the dark square f6. Flawless execution of the 10-Step Method!`,
        highlights: { f6: WHITE_SQUARE_STYLE, h7: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "g4", "endSquare": "f6", "color": "#be185d"}]
    }
];

/**
 * 2. Philidor's W-Manoeuvre: Edge Defense (18...Kd8)
 * When Black clings to the back rank, White traces the full W-shape jump.
 */
export const BISHOP_KNIGHT_EDGE_DEFENSE_STEPS: MoveStep[] = [
    {
        moveNumber: `Move 18 Position`,
        san: `18. Kd6`,
        fen: '4k3/B7/3K4/3N4/8/8/8/8 b - - 35 18',
        comment: `The critical branch in Philidor's W-manoeuvre: After 18.Kd6, Black chooses 18...Kd8 (clinging to the rim) instead of 18...Kf7.`
    },
    {
        moveNumber: `18...`,
        san: `18... Kd8`,
        fen: '3k4/B7/3K4/3N4/8/8/8/8 w - - 36 19',
        comment: `18... Kd8. Black chooses to stay on the edge rather than attempting to flee to the center. This triggers the classical full W-path!`,
        highlights: { d8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `19`,
        san: `19. Ne7`,
        fen: '3k4/B3N3/3K4/8/8/8/8/8 b - - 37 19',
        comment: `19. Ne7! (c7 -> d5 -> e7). The Knight completes the first V-jump of the W-manoeuvre, cutting off d8/f8 escape squares.`,
        highlights: { e7: WHITE_SQUARE_STYLE, d8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "d5", "endSquare": "e7", "color": "#0284c7"}]
    },
    {
        moveNumber: `19...`,
        san: `19... Ke8`,
        fen: '4k3/B3N3/3K4/8/8/8/8/8 w - - 38 20',
        comment: `19... Ke8. Forced.`,
        highlights: { e8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `20`,
        san: `20. Ke6`,
        fen: '4k3/B3N3/4K3/8/8/8/8/8 b - - 39 20',
        comment: `20. Ke6! White King advances, maintaining the tight squeeze.`,
        highlights: { e6: WHITE_SQUARE_STYLE, e8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "d6", "endSquare": "e6", "color": "#0284c7"}]
    },
    {
        moveNumber: `20...`,
        san: `20... Kd8`,
        fen: '3k4/B3N3/4K3/8/8/8/8/8 w - - 40 21',
        comment: `20... Kd8.`,
        highlights: { d8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `21`,
        san: `21. Bb6+`,
        fen: '3k4/4N3/1B2K3/8/8/8/8/8 b - - 41 21',
        comment: `21. Bb6+! The Bishop checks and drives the King further toward the dark-squared mating corner (h8).`,
        highlights: { b6: WHITE_SQUARE_STYLE, d8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "a7", "endSquare": "b6", "color": "#0284c7"}]
    },
    {
        moveNumber: `21...`,
        san: `21... Ke8`,
        fen: '4k3/4N3/1B2K3/8/8/8/8/8 w - - 42 22',
        comment: `21... Ke8. Forced.`,
        highlights: { e8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `22`,
        san: `22. Bc7`,
        fen: '4k3/2B1N3/4K3/8/8/8/8/8 b - - 43 22',
        comment: `22. Bc7! (Zugzwang). A quiet waiting move! Black has no choices and must step to the kingside.`,
        highlights: { c7: WHITE_SQUARE_STYLE, e8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "b6", "endSquare": "c7", "color": "#0284c7"}]
    },
    {
        moveNumber: `22...`,
        san: `22... Kf8`,
        fen: '5k2/2B1N3/4K3/8/8/8/8/8 w - - 44 23',
        comment: `22... Kf8. Forced into the mating wing.`,
        highlights: { f8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `23`,
        san: `23. Nf5`,
        fen: '5k2/2B5/4K3/5N2/8/8/8/8 b - - 45 23',
        comment: `23. Nf5! (e7 -> f5). The third leg of the W-route! The Knight leaps to f5, controlling e7, d6, and prepares to strike.`,
        highlights: { f5: WHITE_SQUARE_STYLE, f8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "e7", "endSquare": "f5", "color": "#0284c7"}]
    },
    {
        moveNumber: `23...`,
        san: `23... Ke8`,
        fen: '4k3/2B5/4K3/5N2/8/8/8/8 w - - 46 24',
        comment: `23... Ke8.`,
        highlights: { e8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `24`,
        san: `24. Ng7+`,
        fen: '4k3/2B3N1/4K3/8/8/8/8/8 b - - 47 24',
        comment: `24. Ng7+! (f5 -> g7). Completing the full W-shape (c7 -> d5 -> e7 -> f5 -> g7)! Black is pushed to f8.`,
        highlights: { g7: WHITE_SQUARE_STYLE, e8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "f5", "endSquare": "g7", "color": "#0284c7"}]
    },
    {
        moveNumber: `24...`,
        san: `24... Kf8`,
        fen: '5k2/2B3N1/4K3/8/8/8/8/8 w - - 48 25',
        comment: `24... Kf8.`,
        highlights: { f8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `25`,
        san: `25. Kf6`,
        fen: '5k2/2B3N1/5K2/8/8/8/8/8 b - - 49 25',
        comment: `25. Kf6! King steps into f6, seizing key escape squares.`,
        highlights: { f6: WHITE_SQUARE_STYLE, f8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "e6", "endSquare": "f6", "color": "#0284c7"}]
    },
    {
        moveNumber: `25...`,
        san: `25... Kg8`,
        fen: '6k1/2B3N1/5K2/8/8/8/8/8 w - - 50 26',
        comment: `25... Kg8.`,
        highlights: { g8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `26`,
        san: `26. Kg6`,
        fen: '6k1/2B3N1/6K1/8/8/8/8/8 b - - 51 26',
        comment: `26. Kg6! Tightening the cordon.`,
        highlights: { g6: WHITE_SQUARE_STYLE, g8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "f6", "endSquare": "g6", "color": "#0284c7"}]
    },
    {
        moveNumber: `26...`,
        san: `26... Kh8`,
        fen: '7k/2B3N1/6K1/8/8/8/8/8 w - - 52 27',
        comment: `26... Kh8. (Or 26...Kf8 27.Bd6+ Kg8 28.Nf5 Kh8 29.Bc5 Kg8 30.Nh6+ Kh8 31.Bd4#).`,
        highlights: { h8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `27`,
        san: `27. Bd6`,
        fen: '7k/6N1/3B2K1/8/8/8/8/8 b - - 53 27',
        comment: `27. Bd6! Controlling the diagonal and preparing the final coordinate check.`,
        highlights: { d6: WHITE_SQUARE_STYLE, h8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "c7", "endSquare": "d6", "color": "#0284c7"}]
    },
    {
        moveNumber: `27...`,
        san: `27... Kg8`,
        fen: '6k1/6N1/3B2K1/8/8/8/8/8 w - - 54 28',
        comment: `27... Kg8.`,
        highlights: { g8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `28`,
        san: `28. Nf5`,
        fen: '6k1/8/3B2K1/5N2/8/8/8/8 b - - 55 28',
        comment: `28. Nf5! Knight maneuvers to deliver the penultimate check.`,
        highlights: { f5: WHITE_SQUARE_STYLE, g8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "g7", "endSquare": "f5", "color": "#0284c7"}]
    },
    {
        moveNumber: `28...`,
        san: `28... Kh8`,
        fen: '7k/8/3B2K1/5N2/8/8/8/8 w - - 56 29',
        comment: `28... Kh8.`,
        highlights: { h8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `29`,
        san: `29. Bc5`,
        fen: '7k/8/6K1/2B2N2/8/8/8/8 b - - 57 29',
        comment: `29. Bc5! A quiet tempo move so that the check lands with maximum effect.`,
        highlights: { c5: WHITE_SQUARE_STYLE, h8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "d6", "endSquare": "c5", "color": "#0284c7"}]
    },
    {
        moveNumber: `29...`,
        san: `29... Kg8`,
        fen: '6k1/8/6K1/2B2N2/8/8/8/8 w - - 58 30',
        comment: `29... Kg8.`,
        highlights: { g8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `30`,
        san: `30. Nh6+`,
        fen: '6k1/8/6KN/2B5/8/8/8/8 b - - 59 30',
        comment: `30. Nh6+! The Knight delivers check, forcing Black into the fatal corner h8.`,
        highlights: { h6: WHITE_SQUARE_STYLE, g8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "f5", "endSquare": "h6", "color": "#0284c7"}]
    },
    {
        moveNumber: `30...`,
        san: `30... Kh8`,
        fen: '7k/8/6KN/2B5/8/8/8/8 w - - 60 31',
        comment: `30... Kh8. Forced.`,
        highlights: { h8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `31`,
        san: `31. Bd4#`,
        fen: '7k/8/6KN/8/3B4/8/8/8 b - - 61 31',
        comment: `31. Bd4# CHECKMATE!! The dark-squared Bishop delivers the coup de grâce. Checkmate on the h8 dark corner!`,
        highlights: { d4: WHITE_SQUARE_STYLE, h8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "c5", "endSquare": "d4", "color": "#be185d"}]
    }
];

/**
 * 3. Geometric Barriers & The Cage (Positions 13.1, 13.2, 13.3)
 * The coordinated diagonal fences that prevent escape and seal the defending King.
 */
export const BISHOP_KNIGHT_BARRIER_STEPS: MoveStep[] = [
    {
        moveNumber: `Position 13.1`,
        san: `Barrier 1`,
        fen: '8/8/8/4k3/8/8/2BN4/4K3 w - - 0 1',
        comment: `Position 13.1 — The Coordinated Diagonal Barrier: When Bishop and Knight stand on same-coloured squares (here c2 and d2), they set up an impassable barrier (a3, b3, c3, c4, d4, e4, e5, f6, g7, h8). The enemy King cannot cross without a long, circuitous march.`,
        highlights: { c2: WHITE_SQUARE_STYLE, d2: WHITE_SQUARE_STYLE, e5: BLACK_SQUARE_STYLE, b3: ALERT_SQUARE_STYLE, c4: ALERT_SQUARE_STYLE, d4: ALERT_SQUARE_STYLE, e4: ALERT_SQUARE_STYLE, f6: ALERT_SQUARE_STYLE, g7: ALERT_SQUARE_STYLE }
    },
    {
        moveNumber: `Position 13.2`,
        san: `Barrier 2`,
        fen: '8/4N3/3K1k2/8/8/4B3/8/8 w - - 0 1',
        comment: `Position 13.2 — The Containment Barrier (Move 20): Arising after 19...Kf6 20.Be3!! The Knight on e7 controls f5/g6/g8; the Bishop on e3 controls g5/h6; the White King on d6 seals the rear. The Black King is completely cut off from breaking out into the center!`,
        highlights: { e7: WHITE_SQUARE_STYLE, e3: WHITE_SQUARE_STYLE, d6: WHITE_SQUARE_STYLE, f6: BLACK_SQUARE_STYLE, g5: ALERT_SQUARE_STYLE, h6: ALERT_SQUARE_STYLE }
    },
    {
        moveNumber: `Position 13.3`,
        san: `The Cage`,
        fen: '4k3/8/2N1K3/6B1/8/8/8/8 w - - 0 1',
        comment: `Position 13.3 — The Cage (Move 24): The most remarkable geometry in Ending 93. Black is imprisoned in a 4-square cage on e8/f8/g8/h8. White can now maneuver with total calm and zero risk of escape.`,
        highlights: { g5: WHITE_SQUARE_STYLE, c6: WHITE_SQUARE_STYLE, e6: WHITE_SQUARE_STYLE, e8: BLACK_SQUARE_STYLE, d7: ALERT_SQUARE_STYLE, d8: ALERT_SQUARE_STYLE, e7: ALERT_SQUARE_STYLE, f7: ALERT_SQUARE_STYLE }
    }
];

/**
 * 4. Exercise 2.23 (14-Move Rapid Mate)
 * Forced conversion under 50-move clock pressure.
 */
export const BISHOP_KNIGHT_RAPID_MATE_STEPS: MoveStep[] = [
    {
        moveNumber: `Initial Position`,
        san: `Start`,
        fen: '8/2k4B/4K3/4N3/8/8/8/8 w - - 0 1',
        comment: `Exercise 2.23: Suppose you have already spent 30 of your 50 moves. It is time to be accurate! White executes a forced mate in 14 moves.`
    },
    {
        moveNumber: `1`,
        san: `1. Nd7`,
        fen: '8/2kN3B/4K3/8/8/8/8/8 b - - 1 1',
        comment: `1. Nd7! Pure tactics. Kicking the Black King towards the dark corner and sealing off escape.`,
        highlights: { d7: WHITE_SQUARE_STYLE, c7: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "e5", "endSquare": "d7", "color": "#0284c7"}]
    },
    {
        moveNumber: `1...`,
        san: `1... Kc6`,
        fen: '8/3N3B/2k1K3/8/8/8/8/8 w - - 2 2',
        comment: `1... Kc6. (If 1...Kb7 2.Bd3).`,
        highlights: { c6: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `2`,
        san: `2. Bd3`,
        fen: '8/3N4/2k1K3/8/8/3B4/8/8 b - - 3 2',
        comment: `2. Bd3! Closing off the way out.`,
        highlights: { d3: WHITE_SQUARE_STYLE, c6: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "h7", "endSquare": "d3", "color": "#0284c7"}]
    },
    {
        moveNumber: `2...`,
        san: `2... Kc7`,
        fen: '8/2kN4/4K3/8/8/3B4/8/8 w - - 4 3',
        comment: `2... Kc7.`,
        highlights: { c7: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `3`,
        san: `3. Bb5!`,
        fen: '8/2kN4/4K3/1B6/8/8/8/8 b - - 5 3',
        comment: `3. Bb5! Sealing c6 and forcing Black back to the 8th rank.`,
        highlights: { b5: WHITE_SQUARE_STYLE, c7: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "d3", "endSquare": "b5", "color": "#0284c7"}]
    },
    {
        moveNumber: `3...`,
        san: `3... Kd8`,
        fen: '3k4/3N4/4K3/1B6/8/8/8/8 w - - 6 4',
        comment: `3... Kd8.`,
        highlights: { d8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `4`,
        san: `4. Nf6`,
        fen: '3k4/8/4KN2/1B6/8/8/8/8 b - - 7 4',
        comment: `4. Nf6! Dominating e8.`,
        highlights: { f6: WHITE_SQUARE_STYLE, d8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "d7", "endSquare": "f6", "color": "#0284c7"}]
    },
    {
        moveNumber: `4...`,
        san: `4... Kc7`,
        fen: '8/2k5/4KN2/1B6/8/8/8/8 w - - 8 5',
        comment: `4... Kc7.`,
        highlights: { c7: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `5`,
        san: `5. Nd5+`,
        fen: '8/2k5/4K3/1B1N4/8/8/8/8 b - - 9 5',
        comment: `5. Nd5+! Building the cage! Black is forced to d8.`,
        highlights: { d5: WHITE_SQUARE_STYLE, c7: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "f6", "endSquare": "d5", "color": "#0284c7"}]
    },
    {
        moveNumber: `5...`,
        san: `5... Kd8`,
        fen: '3k4/8/4K3/1B1N4/8/8/8/8 w - - 10 6',
        comment: `5... Kd8. The cage is sealed.`,
        highlights: { d8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `6`,
        san: `6. Kd6`,
        fen: '3k4/8/3K4/1B1N4/8/8/8/8 b - - 11 6',
        comment: `6. Kd6! White King steps to d6, preparing the invasion.`,
        highlights: { d6: WHITE_SQUARE_STYLE, d8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "e6", "endSquare": "d6", "color": "#0284c7"}]
    },
    {
        moveNumber: `6...`,
        san: `6... Kc8`,
        fen: '2k5/8/3K4/1B1N4/8/8/8/8 w - - 12 7',
        comment: `6... Kc8.`,
        highlights: { c8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `7`,
        san: `7. Ke7`,
        fen: '2k5/4K3/8/1B1N4/8/8/8/8 b - - 13 7',
        comment: `7. Ke7! Driving Black into the queenside corner.`,
        highlights: { e7: WHITE_SQUARE_STYLE, c8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "d6", "endSquare": "e7", "color": "#0284c7"}]
    },
    {
        moveNumber: `7...`,
        san: `7... Kb7`,
        fen: '8/1k2K3/8/1B1N4/8/8/8/8 w - - 14 8',
        comment: `7... Kb7.`,
        highlights: { b7: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `8`,
        san: `8. Kd7`,
        fen: '8/1k1K4/8/1B1N4/8/8/8/8 b - - 15 8',
        comment: `8. Kd7! Pushing Black to b8.`,
        highlights: { d7: WHITE_SQUARE_STYLE, b7: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "e7", "endSquare": "d7", "color": "#0284c7"}]
    },
    {
        moveNumber: `8...`,
        san: `8... Kb8`,
        fen: '1k6/3K4/8/1B1N4/8/8/8/8 w - - 16 9',
        comment: `8... Kb8.`,
        highlights: { b8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `9`,
        san: `9. Ba6`,
        fen: '1k6/3K4/B7/3N4/8/8/8/8 b - - 17 9',
        comment: `9. Ba6! Cutting off b7 and preparing the mating net.`,
        highlights: { a6: WHITE_SQUARE_STYLE, b8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "b5", "endSquare": "a6", "color": "#0284c7"}]
    },
    {
        moveNumber: `9...`,
        san: `9... Ka7`,
        fen: '8/k2K4/B7/3N4/8/8/8/8 w - - 18 10',
        comment: `9... Ka7.`,
        highlights: { a7: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `10`,
        san: `10. Bc8`,
        fen: '2B5/k2K4/8/3N4/8/8/8/8 b - - 19 10',
        comment: `10. Bc8! Depriving Black of the b7 square.`,
        highlights: { c8: WHITE_SQUARE_STYLE, a7: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "a6", "endSquare": "c8", "color": "#0284c7"}]
    },
    {
        moveNumber: `10...`,
        san: `10... Kb8`,
        fen: '1kB5/3K4/8/3N4/8/8/8/8 w - - 20 11',
        comment: `10... Kb8.`,
        highlights: { b8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `11`,
        san: `11. Nb4`,
        fen: '1kB5/3K4/8/8/1N6/8/8/8 b - - 21 11',
        comment: `11. Nb4! Bringing the Knight into the mating square coordinate.`,
        highlights: { b4: WHITE_SQUARE_STYLE, b8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "d5", "endSquare": "b4", "color": "#0284c7"}]
    },
    {
        moveNumber: `11...`,
        san: `11... Ka7`,
        fen: '2B5/k2K4/8/8/1N6/8/8/8 w - - 22 12',
        comment: `11... Ka7.`,
        highlights: { a7: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `12`,
        san: `12. Kc7`,
        fen: '2B5/k1K5/8/8/1N6/8/8/8 b - - 23 12',
        comment: `12. Kc7! King seals the box. Black only has a8.`,
        highlights: { c7: WHITE_SQUARE_STYLE, a7: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "d7", "endSquare": "c7", "color": "#0284c7"}]
    },
    {
        moveNumber: `12...`,
        san: `12... Ka8`,
        fen: 'k1B5/2K5/8/8/1N6/8/8/8 w - - 24 13',
        comment: `12... Ka8. Forced into the corner.`,
        highlights: { a8: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `13`,
        san: `13. Bb7+`,
        fen: 'k7/1BK5/8/8/1N6/8/8/8 b - - 25 13',
        comment: `13. Bb7+! First check! Stripping away the flight square.`,
        highlights: { b7: WHITE_SQUARE_STYLE, a8: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "c8", "endSquare": "b7", "color": "#0284c7"}]
    },
    {
        moveNumber: `13...`,
        san: `13... Ka7`,
        fen: '8/kBK5/8/8/1N6/8/8/8 w - - 26 14',
        comment: `13... Ka7. Lone legal move.`,
        highlights: { a7: BLACK_SQUARE_STYLE }
    },
    {
        moveNumber: `14`,
        san: `14. Nc6#`,
        fen: '8/kBK5/2N5/8/8/8/8/8 b - - 27 14',
        comment: `14. Nc6# CHECKMATE!! Clean, razor-sharp 14-move conversion under the 50-move clock.`,
        highlights: { c6: WHITE_SQUARE_STYLE, a7: BLACK_SQUARE_STYLE },
        arrows: [{"startSquare": "b4", "endSquare": "c6", "color": "#be185d"}]
    }
];

export default function BishopKnightGuide({ onLoadPosition, onClose }: BishopKnightGuideProps) {
    const [activeTab, setActiveTab] = useState<'10steps' | 'wpath' | 'barriers' | 'rapid' | 'rules'>('10steps');

    // 10 Steps state
    const [step10Index, setStep10Index] = useState(0);
    const [is10Playing, setIs10Playing] = useState(false);
    const timer10Ref = useRef<number | null>(null);

    // W-path state
    const [wPathIndex, setWPathIndex] = useState(0);
    const [isWPathPlaying, setIsWPathPlaying] = useState(false);
    const timerWPathRef = useRef<number | null>(null);

    // Barriers state
    const [barrierIndex, setBarrierIndex] = useState(0);

    // Rapid mate state
    const [rapidIndex, setRapidIndex] = useState(0);
    const [isRapidPlaying, setIsRapidPlaying] = useState(false);
    const timerRapidRef = useRef<number | null>(null);

    // Autoplay for 10-step method
    useEffect(() => {
        if (!is10Playing) {
            if (timer10Ref.current) clearInterval(timer10Ref.current);
            return;
        }
        timer10Ref.current = window.setInterval(() => {
            setStep10Index((prev) => {
                if (prev >= BISHOP_KNIGHT_10_STEPS.length - 1) {
                    setIs10Playing(false);
                    return prev;
                }
                playMoveSound();
                return prev + 1;
            });
        }, 1700);

        return () => {
            if (timer10Ref.current) clearInterval(timer10Ref.current);
        };
    }, [is10Playing]);

    // Autoplay for W-path
    useEffect(() => {
        if (!isWPathPlaying) {
            if (timerWPathRef.current) clearInterval(timerWPathRef.current);
            return;
        }
        timerWPathRef.current = window.setInterval(() => {
            setWPathIndex((prev) => {
                if (prev >= BISHOP_KNIGHT_EDGE_DEFENSE_STEPS.length - 1) {
                    setIsWPathPlaying(false);
                    return prev;
                }
                playMoveSound();
                return prev + 1;
            });
        }, 1700);

        return () => {
            if (timerWPathRef.current) clearInterval(timerWPathRef.current);
        };
    }, [isWPathPlaying]);

    // Autoplay for Rapid Mate
    useEffect(() => {
        if (!isRapidPlaying) {
            if (timerRapidRef.current) clearInterval(timerRapidRef.current);
            return;
        }
        timerRapidRef.current = window.setInterval(() => {
            setRapidIndex((prev) => {
                if (prev >= BISHOP_KNIGHT_RAPID_MATE_STEPS.length - 1) {
                    setIsRapidPlaying(false);
                    return prev;
                }
                playMoveSound();
                return prev + 1;
            });
        }, 1700);

        return () => {
            if (timerRapidRef.current) clearInterval(timerRapidRef.current);
        };
    }, [isRapidPlaying]);

    const active10Step = BISHOP_KNIGHT_10_STEPS[step10Index];
    const activeWStep = BISHOP_KNIGHT_EDGE_DEFENSE_STEPS[wPathIndex];
    const activeBarrierStep = BISHOP_KNIGHT_BARRIER_STEPS[barrierIndex];
    const activeRapidStep = BISHOP_KNIGHT_RAPID_MATE_STEPS[rapidIndex];

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
                        Bishop & Knight <span className="text-berry italic">Checkmate</span>
                    </h2>
                    <p className="text-xs md:text-sm text-plum/70 font-medium max-w-2xl">
                        Master the 10-step logical plan, Philidor's W-manoeuvre, and geometric containment barriers to deliver checkmate with Bishop and Knight.
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

            {/* Sticky Navigation Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                    onClick={() => setActiveTab('10steps')}
                    className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${
                        activeTab === '10steps'
                            ? 'bg-plum text-white border-plum shadow-md'
                            : 'bg-white text-plum/70 border-plum/15 hover:bg-cream'
                    }`}
                >
                    1. 10-Step Master Plan (Pos 13.4)
                </button>
                <button
                    onClick={() => setActiveTab('wpath')}
                    className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${
                        activeTab === 'wpath'
                            ? 'bg-plum text-white border-plum shadow-md'
                            : 'bg-white text-plum/70 border-plum/15 hover:bg-cream'
                    }`}
                >
                    2. Philidor's W-Path (18...Kd8)
                </button>
                <button
                    onClick={() => setActiveTab('barriers')}
                    className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${
                        activeTab === 'barriers'
                            ? 'bg-plum text-white border-plum shadow-md'
                            : 'bg-white text-plum/70 border-plum/15 hover:bg-cream'
                    }`}
                >
                    3. Barriers & The Cage (Pos 13.1–13.3)
                </button>
                <button
                    onClick={() => setActiveTab('rapid')}
                    className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${
                        activeTab === 'rapid'
                            ? 'bg-plum text-white border-plum shadow-md'
                            : 'bg-white text-plum/70 border-plum/15 hover:bg-cream'
                    }`}
                >
                    4. Rapid 14-Move Mate (Ex 2.23)
                </button>
                <button
                    onClick={() => setActiveTab('rules')}
                    className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${
                        activeTab === 'rules'
                            ? 'bg-plum text-white border-plum shadow-md'
                            : 'bg-white text-plum/70 border-plum/15 hover:bg-cream'
                    }`}
                >
                    5. 6 Golden Rules
                </button>
            </div>

            {/* Tab 1: 10-Step Method */}
            {activeTab === '10steps' && (
                <div className="grid lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-6 flex flex-col items-center">
                        <div className="w-full max-w-[420px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-2 border-plum/15 bg-white relative">
                            <Chessboard
                                options={{
                                    position: active10Step.fen,
                                    boardOrientation: 'white',
                                    squareStyles: active10Step.highlights || {},
                                    darkSquareStyle: { backgroundColor: '#b58863' },
                                    lightSquareStyle: { backgroundColor: '#f0d9b5' },
                                    alphaNotationStyle: { fontSize: '10px', fontWeight: 'bold' },
                                    numericNotationStyle: { fontSize: '10px', fontWeight: 'bold' },
                                    arrowOptions: customArrowOptions,
                                    arrows: (active10Step.arrows as any) || [],
                                    animationDurationInMs: 250
                                }}
                            />
                        </div>

                        {/* Under-board controls */}
                        <div className="flex items-center justify-between w-full max-w-[420px] mt-4 gap-2">
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => {
                                        setIs10Playing(false);
                                        setStep10Index(0);
                                    }}
                                    className="p-2.5 rounded-xl border border-plum/15 hover:bg-cream text-plum/70 hover:text-plum transition-colors"
                                    title="Reset to Start"
                                >
                                    <RotateCcw size={18} />
                                </button>
                                <button
                                    onClick={() => {
                                        setIs10Playing(false);
                                        setStep10Index(prev => Math.max(0, prev - 1));
                                    }}
                                    disabled={step10Index === 0}
                                    className="p-2.5 rounded-xl border border-plum/15 hover:bg-cream disabled:opacity-30 disabled:pointer-events-none text-plum/70 hover:text-plum transition-colors"
                                    title="Previous Move"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    onClick={() => setIs10Playing(prev => !prev)}
                                    className="px-4 py-2.5 rounded-xl bg-berry text-white hover:bg-berry/90 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                                >
                                    {is10Playing ? <Pause size={16} /> : <Play size={16} />}
                                    <span>{is10Playing ? 'Pause' : 'Autoplay'}</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setIs10Playing(false);
                                        setStep10Index(prev => Math.min(BISHOP_KNIGHT_10_STEPS.length - 1, prev + 1));
                                    }}
                                    disabled={step10Index === BISHOP_KNIGHT_10_STEPS.length - 1}
                                    className="p-2.5 rounded-xl border border-plum/15 hover:bg-cream disabled:opacity-30 disabled:pointer-events-none text-plum/70 hover:text-plum transition-colors"
                                    title="Next Move"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>

                            <span className="text-xs font-mono font-bold text-plum/60 bg-cream px-3 py-1.5 rounded-xl border border-plum/10">
                                {step10Index + 1} / {BISHOP_KNIGHT_10_STEPS.length}
                            </span>
                        </div>
                    </div>

                    <div className="lg:col-span-6 space-y-4">
                        <div className="p-5 rounded-2xl bg-cream/70 border border-plum/10 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-black uppercase tracking-wider text-berry">
                                    Move {active10Step.moveNumber}: {active10Step.san}
                                </span>
                                <span className="text-[11px] font-bold text-plum/50">
                                    Position 13.4
                                </span>
                            </div>
                            <p className="text-sm md:text-base text-plum/90 leading-relaxed font-medium">
                                {active10Step.comment}
                            </p>
                        </div>

                        {/* Clickable moves timeline */}
                        <div className="space-y-2">
                            <span className="text-xs font-black uppercase tracking-wider text-plum/60">
                                34-Move Timeline
                            </span>
                            <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-plum/10 scrollbar-thin">
                                {BISHOP_KNIGHT_10_STEPS.map((s, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setIs10Playing(false);
                                            setStep10Index(idx);
                                        }}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                                            step10Index === idx
                                                ? 'bg-berry text-white shadow-sm ring-2 ring-berry/30'
                                                : 'bg-white hover:bg-slate-200 text-plum/80 border border-slate-200'
                                        }`}
                                    >
                                        {s.san}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Practice Button */}
                        <div className="pt-2">
                            {onLoadPosition ? (
                                <button
                                    onClick={() => onLoadPosition(active10Step.fen, 'w', 'Bishop & Knight Checkmate (Ending 93)')}
                                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-berry hover:bg-berry/90 text-white font-serif font-black text-sm uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
                                >
                                    <Swords size={18} />
                                    <span>Practice Position 13.4 in Arena</span>
                                </button>
                            ) : (
                                <Link
                                    to="/EndgamePractice?id=bishop-knight-mate"
                                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-berry hover:bg-berry/90 text-white font-serif font-black text-sm uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
                                >
                                    <Swords size={18} />
                                    <span>Practice Position 13.4 in Arena</span>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 2: Philidor's W-Path (18...Kd8) */}
            {activeTab === 'wpath' && (
                <div className="grid lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-6 flex flex-col items-center">
                        <div className="w-full max-w-[420px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-2 border-plum/15 bg-white relative">
                            <Chessboard
                                options={{
                                    position: activeWStep.fen,
                                    boardOrientation: 'white',
                                    squareStyles: activeWStep.highlights || {},
                                    darkSquareStyle: { backgroundColor: '#b58863' },
                                    lightSquareStyle: { backgroundColor: '#f0d9b5' },
                                    alphaNotationStyle: { fontSize: '10px', fontWeight: 'bold' },
                                    numericNotationStyle: { fontSize: '10px', fontWeight: 'bold' },
                                    arrowOptions: customArrowOptions,
                                    arrows: (activeWStep.arrows as any) || [],
                                    animationDurationInMs: 250
                                }}
                            />
                        </div>

                        <div className="flex items-center justify-between w-full max-w-[420px] mt-4 gap-2">
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => {
                                        setIsWPathPlaying(false);
                                        setWPathIndex(0);
                                    }}
                                    className="p-2.5 rounded-xl border border-plum/15 hover:bg-cream text-plum/70 hover:text-plum transition-colors"
                                >
                                    <RotateCcw size={18} />
                                </button>
                                <button
                                    onClick={() => {
                                        setIsWPathPlaying(false);
                                        setWPathIndex(prev => Math.max(0, prev - 1));
                                    }}
                                    disabled={wPathIndex === 0}
                                    className="p-2.5 rounded-xl border border-plum/15 hover:bg-cream disabled:opacity-30 disabled:pointer-events-none text-plum/70 hover:text-plum transition-colors"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    onClick={() => setIsWPathPlaying(prev => !prev)}
                                    className="px-4 py-2.5 rounded-xl bg-berry text-white hover:bg-berry/90 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                                >
                                    {isWPathPlaying ? <Pause size={16} /> : <Play size={16} />}
                                    <span>{isWPathPlaying ? 'Pause' : 'Autoplay'}</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setIsWPathPlaying(false);
                                        setWPathIndex(prev => Math.min(BISHOP_KNIGHT_EDGE_DEFENSE_STEPS.length - 1, prev + 1));
                                    }}
                                    disabled={wPathIndex === BISHOP_KNIGHT_EDGE_DEFENSE_STEPS.length - 1}
                                    className="p-2.5 rounded-xl border border-plum/15 hover:bg-cream disabled:opacity-30 disabled:pointer-events-none text-plum/70 hover:text-plum transition-colors"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>

                            <span className="text-xs font-mono font-bold text-plum/60 bg-cream px-3 py-1.5 rounded-xl border border-plum/10">
                                {wPathIndex + 1} / {BISHOP_KNIGHT_EDGE_DEFENSE_STEPS.length}
                            </span>
                        </div>
                    </div>

                    <div className="lg:col-span-6 space-y-4">
                        <div className="p-5 rounded-2xl bg-cream/70 border border-plum/10 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-black uppercase tracking-wider text-berry">
                                    Move {activeWStep.moveNumber}: {activeWStep.san}
                                </span>
                                <span className="text-[11px] font-bold text-plum/50">
                                    The Full "W" Path
                                </span>
                            </div>
                            <p className="text-sm md:text-base text-plum/90 leading-relaxed font-medium">
                                {activeWStep.comment}
                            </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-plum/10 space-y-2">
                            <h4 className="text-xs font-black uppercase tracking-wider text-plum">
                                Geometry of the W-Manoeuvre
                            </h4>
                            <p className="text-xs text-plum/70 leading-relaxed">
                                The Knight travels in a distinctive W pattern across the board: <strong>c7 &rarr; d5 &rarr; e7 &rarr; f5 &rarr; g7 (or h6)</strong>. Because the Knight always alternates square colors, it precisely shields the dark squares while your light-squared Bishop patrols the diagonals, forming a moving barrier that herds the enemy King seamlessly towards the mating corner!
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-plum/10 scrollbar-thin">
                            {BISHOP_KNIGHT_EDGE_DEFENSE_STEPS.map((s, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setIsWPathPlaying(false);
                                        setWPathIndex(idx);
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                                        wPathIndex === idx
                                            ? 'bg-berry text-white shadow-sm ring-2 ring-berry/30'
                                            : 'bg-white hover:bg-slate-200 text-plum/80 border border-slate-200'
                                    }`}
                                >
                                    {s.san}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 3: Barriers & The Cage */}
            {activeTab === 'barriers' && (
                <div className="grid lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-6 flex flex-col items-center">
                        <div className="w-full max-w-[420px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-2 border-plum/15 bg-white relative">
                            <Chessboard
                                options={{
                                    position: activeBarrierStep.fen,
                                    boardOrientation: 'white',
                                    squareStyles: activeBarrierStep.highlights || {},
                                    darkSquareStyle: { backgroundColor: '#b58863' },
                                    lightSquareStyle: { backgroundColor: '#f0d9b5' },
                                    alphaNotationStyle: { fontSize: '10px', fontWeight: 'bold' },
                                    numericNotationStyle: { fontSize: '10px', fontWeight: 'bold' },
                                    arrowOptions: customArrowOptions,
                                    animationDurationInMs: 250
                                }}
                            />
                        </div>

                        <div className="flex items-center justify-between w-full max-w-[420px] mt-4 gap-2">
                            <div className="flex items-center gap-2">
                                {BISHOP_KNIGHT_BARRIER_STEPS.map((b, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setBarrierIndex(idx)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            barrierIndex === idx
                                                ? 'bg-plum text-white shadow-sm'
                                                : 'bg-white border border-plum/15 text-plum/70 hover:bg-cream'
                                        }`}
                                    >
                                        {b.san}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-6 space-y-4">
                        <div className="p-5 rounded-2xl bg-cream/70 border border-plum/10 space-y-3">
                            <div className="flex items-center gap-2 text-berry font-black text-xs uppercase tracking-wider">
                                <Shield size={16} />
                                <span>{activeBarrierStep.moveNumber}: {activeBarrierStep.san}</span>
                            </div>
                            <p className="text-sm md:text-base text-plum/90 leading-relaxed font-medium">
                                {activeBarrierStep.comment}
                            </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-plum/10 space-y-2 text-xs text-plum/70 leading-relaxed">
                            <h4 className="font-bold text-plum text-sm">Key Takeaway:</h4>
                            <p>
                                Notice how in Position 13.1, the Knight and Bishop stand on <em>same-coloured squares</em>. This harmonizes their influence: the bishop controls light squares, while the knight commands key adjacent dark squares, creating an unbreakable diagonal wall.
                            </p>
                            <p>
                                In Position 13.3 (The Cage), White does not even need to rush checks. Black's King is imprisoned on the 8th rank and White can calmly reposition their King to the mating square.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 4: Rapid Mate (Ex 2.23) */}
            {activeTab === 'rapid' && (
                <div className="grid lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-6 flex flex-col items-center">
                        <div className="w-full max-w-[420px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-2 border-plum/15 bg-white relative">
                            <Chessboard
                                options={{
                                    position: activeRapidStep.fen,
                                    boardOrientation: 'white',
                                    squareStyles: activeRapidStep.highlights || {},
                                    darkSquareStyle: { backgroundColor: '#b58863' },
                                    lightSquareStyle: { backgroundColor: '#f0d9b5' },
                                    alphaNotationStyle: { fontSize: '10px', fontWeight: 'bold' },
                                    numericNotationStyle: { fontSize: '10px', fontWeight: 'bold' },
                                    arrowOptions: customArrowOptions,
                                    arrows: (activeRapidStep.arrows as any) || [],
                                    animationDurationInMs: 250
                                }}
                            />
                        </div>

                        <div className="flex items-center justify-between w-full max-w-[420px] mt-4 gap-2">
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => {
                                        setIsRapidPlaying(false);
                                        setRapidIndex(0);
                                    }}
                                    className="p-2.5 rounded-xl border border-plum/15 hover:bg-cream text-plum/70 hover:text-plum transition-colors"
                                >
                                    <RotateCcw size={18} />
                                </button>
                                <button
                                    onClick={() => {
                                        setIsRapidPlaying(false);
                                        setRapidIndex(prev => Math.max(0, prev - 1));
                                    }}
                                    disabled={rapidIndex === 0}
                                    className="p-2.5 rounded-xl border border-plum/15 hover:bg-cream disabled:opacity-30 disabled:pointer-events-none text-plum/70 hover:text-plum transition-colors"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    onClick={() => setIsRapidPlaying(prev => !prev)}
                                    className="px-4 py-2.5 rounded-xl bg-berry text-white hover:bg-berry/90 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                                >
                                    {isRapidPlaying ? <Pause size={16} /> : <Play size={16} />}
                                    <span>{isRapidPlaying ? 'Pause' : 'Autoplay'}</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setIsRapidPlaying(false);
                                        setRapidIndex(prev => Math.min(BISHOP_KNIGHT_RAPID_MATE_STEPS.length - 1, prev + 1));
                                    }}
                                    disabled={rapidIndex === BISHOP_KNIGHT_RAPID_MATE_STEPS.length - 1}
                                    className="p-2.5 rounded-xl border border-plum/15 hover:bg-cream disabled:opacity-30 disabled:pointer-events-none text-plum/70 hover:text-plum transition-colors"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>

                            <span className="text-xs font-mono font-bold text-plum/60 bg-cream px-3 py-1.5 rounded-xl border border-plum/10">
                                {rapidIndex + 1} / {BISHOP_KNIGHT_RAPID_MATE_STEPS.length}
                            </span>
                        </div>
                    </div>

                    <div className="lg:col-span-6 space-y-4">
                        <div className="p-5 rounded-2xl bg-cream/70 border border-plum/10 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-black uppercase tracking-wider text-berry">
                                    Move {activeRapidStep.moveNumber}: {activeRapidStep.san}
                                </span>
                                <span className="text-[11px] font-bold text-plum/50 flex items-center gap-1">
                                    <Timer size={12} />
                                    <span>Exercise 2.23</span>
                                </span>
                            </div>
                            <p className="text-sm md:text-base text-plum/90 leading-relaxed font-medium">
                                {activeRapidStep.comment}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-plum/10 scrollbar-thin">
                            {BISHOP_KNIGHT_RAPID_MATE_STEPS.map((s, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setIsRapidPlaying(false);
                                        setRapidIndex(idx);
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                                        rapidIndex === idx
                                            ? 'bg-berry text-white shadow-sm ring-2 ring-berry/30'
                                            : 'bg-white hover:bg-slate-200 text-plum/80 border border-slate-200'
                                    }`}
                                >
                                    {s.san}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 5: Golden Rules */}
            {activeTab === 'rules' && (
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-2xl bg-cream/60 border border-plum/10 space-y-2">
                        <div className="flex items-center gap-2 text-berry font-black text-sm">
                            <Target size={18} />
                            <span>1. Mating Corner vs. Safe Corner</span>
                        </div>
                        <p className="text-xs md:text-sm text-plum/70 leading-relaxed">
                            A lone King can <strong>ONLY</strong> be checkmated in a corner matching your Bishop's square color. The opposite-colored corners are "Safe Corners" for the defender. Your job is to evict them from the Safe Corner and herd them towards the Mating Corner.
                        </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-cream/60 border border-plum/10 space-y-2">
                        <div className="flex items-center gap-2 text-berry font-black text-sm">
                            <Lightbulb size={18} />
                            <span>2. Logical, NOT Mechanical</span>
                        </div>
                        <p className="text-xs md:text-sm text-plum/70 leading-relaxed">
                            Unlike Rook or Queen checkmates, Bishop and Knight checkmate is <em>not purely mechanical</em>. At critical moments (especially moves 16 to 20 when the defending King attempts to break out), thoughtful, quiet moves like <strong>20.Be3!</strong> are required.
                        </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-cream/60 border border-plum/10 space-y-2">
                        <div className="flex items-center gap-2 text-berry font-black text-sm">
                            <Compass size={18} />
                            <span>3. The Pivotal Square</span>
                        </div>
                        <p className="text-xs md:text-sm text-plum/70 leading-relaxed">
                            Your King must occupy the square on the long diagonal opposite the corner (e.g. <strong>c6</strong> when defending King is in the a8 corner). From the pivotal square, your King cuts off the entire exit diagonal and allows your Knight and Bishop to evict the defender.
                        </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-cream/60 border border-plum/10 space-y-2">
                        <div className="flex items-center gap-2 text-berry font-black text-sm">
                            <Shield size={18} />
                            <span>4. Same-Color Square Coordination</span>
                        </div>
                        <p className="text-xs md:text-sm text-plum/70 leading-relaxed">
                            When your Bishop and Knight stand on squares of the <em>same color</em> (e.g. c2 and d2), they create an impassable diagonal mesh of alternated attacks. The defending King can neither pass nor break the fence.
                        </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-cream/60 border border-plum/10 space-y-2">
                        <div className="flex items-center gap-2 text-berry font-black text-sm">
                            <Award size={18} />
                            <span>5. The Mating Square & Two Checks</span>
                        </div>
                        <p className="text-xs md:text-sm text-plum/70 leading-relaxed">
                            Your King stands at the "Mating Square" exactly a knight's jump away from the corner (e.g. <strong>f7</strong> for the h8 corner). Checkmate is delivered in two consecutive checks: first the Bishop checks to strip away flight squares, followed immediately by the Knight delivering checkmate!
                        </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-cream/60 border border-plum/10 space-y-2">
                        <div className="flex items-center gap-2 text-berry font-black text-sm">
                            <Timer size={18} />
                            <span>6. 50-Move Rule Margin</span>
                        </div>
                        <p className="text-xs md:text-sm text-plum/70 leading-relaxed">
                            From the worst starting position on the board (Position 13.4), perfect play mates in 30 moves, and the logical human method mates in <strong>34 moves</strong>. This leaves a generous margin of 16 moves under the 50-move rule, allowing you to stay calm and methodical.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
