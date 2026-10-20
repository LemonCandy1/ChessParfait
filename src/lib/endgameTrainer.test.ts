import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import {
    countPieces,
    endgameRatingChange,
    MIN_CREDIT,
    kFactor,
    moveLabel,
    movesToMate,
    nextReviewGap,
    newMilestones,
    pickEndgame,
    randomTransform,
    ratingChange,
    solveScore,
    solveState,
    transformPosition
} from './endgameTrainer';

describe('ratings', () => {
    it('swings about 100 on the first position and decays smoothly to 16', () => {
        expect(kFactor(0)).toBe(200);
        expect(ratingChange(1000, 1000, 1, 0)).toBe(100);
        expect(ratingChange(1000, 1000, 0, 0)).toBe(-100);
        for (let played = 1; played < 60; played++) expect(kFactor(played)).toBeLessThanOrEqual(kFactor(played - 1));
        expect(kFactor(20)).toBeGreaterThan(40);
        expect(kFactor(41)).toBe(16);
        expect(kFactor(500)).toBe(16);
    });

    it('never takes rating away for a slow win, just gains less', () => {
        const full = ratingChange(1500, 1300, 1, 100);
        const slow = ratingChange(1500, 1300, solveScore(40, 8), 100);
        expect(slow).toBeGreaterThan(0);
        expect(slow).toBeLessThan(full);
        expect(ratingChange(2000, 800, MIN_CREDIT, 0)).toBeGreaterThanOrEqual(0);
    });

    it('gains more for beating a harder endgame and loses more to an easier one', () => {
        expect(ratingChange(1000, 1000, 1, 100)).toBe(8);
        expect(ratingChange(1000, 1000, 0, 100)).toBe(-8);
        expect(ratingChange(1000, 1400, 1, 100)).toBeGreaterThan(ratingChange(1000, 600, 1, 100));
        expect(ratingChange(1000, 600, 0, 100)).toBeLessThan(ratingChange(1000, 1400, 0, 100));
    });

    it('moves the endgame itself the opposite way, slowly', () => {
        expect(endgameRatingChange(1300, 1300, 1)).toBe(-4);
        expect(endgameRatingChange(1300, 1300, 0)).toBe(4);
        expect(endgameRatingChange(1300, 900, 0)).toBeLessThan(endgameRatingChange(1300, 1700, 0));
        expect(Math.abs(endgameRatingChange(800, 2000, 0))).toBeLessThanOrEqual(8);
    });

    it('pays each 100-point milestone above 1000 once', () => {
        expect(newMilestones(1000, 1099)).toEqual([]);
        expect(newMilestones(1000, 1100)).toEqual([1100]);
        expect(newMilestones(1050, 1230)).toEqual([1100, 1200]);
        expect(newMilestones(1200, 1250)).toEqual([]);
        expect(newMilestones(900, 1000)).toEqual([]);
    });
});

describe('picking the next endgame', () => {
    const endgames = [
        { id: 'a', rating: 800 }, { id: 'b', rating: 900 }, { id: 'c', rating: 1300 },
        { id: 'd', rating: 1300 }, { id: 'e', rating: 1800 }
    ];

    it('favours endgames about 100 below the player and never repeats the last one', () => {
        const counts: Record<string, number> = {};
        let seed = 1;
        const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        for (let i = 0; i < 4000; i++) {
            const picked = pickEndgame(endgames, 1000, 'a', random);
            counts[picked.id] = (counts[picked.id] ?? 0) + 1;
        }
        expect(counts.a).toBeUndefined();
        expect(counts.b).toBeGreaterThan(counts.c / 2);  // 900 sits on the target (1000 - 100)
        expect(counts.b).toBeGreaterThan(1000);
        expect(counts.e ?? 0).toBeLessThan(5);           // 1800 is far away
    });

    it('still returns the only endgame there is', () => {
        expect(pickEndgame([{ id: 'only', rating: 2000 }], 1000, 'only').id).toBe('only');
    });
});

describe('credit, reviews and move labels', () => {
    it('gives full credit up to the fastest mate, half at twice as long and never less than a quarter', () => {
        expect(solveScore(8, 8)).toBe(1);
        expect(solveScore(6, 8)).toBe(1);
        expect(solveScore(16, 8)).toBe(0.5);
        expect(solveScore(20, 8)).toBe(0.25);
        expect(solveScore(40, 8)).toBe(0.25);
        expect(solveScore(40, null)).toBe(1);
    });

    it('converts half-moves to moves to mate', () => {
        expect(movesToMate(3)).toBe(2);
        expect(movesToMate(-2)).toBe(1);
    });

    it('brings failed endgames back in 5 minutes, then a day, then doubles the gap', () => {
        expect(nextReviewGap(null, true)).toBeNull();
        expect(nextReviewGap(null, false)).toBe(5);
        expect(nextReviewGap(5, true)).toBe(1440);
        expect(nextReviewGap(1440, true)).toBe(2880);
        expect(nextReviewGap(2880, false)).toBe(5);
    });

    it('labels only moves worse than the best, ChessTempo style', () => {
        expect(moveLabel({ result: 'win', mateIn: 10 }, { result: 'win', mateIn: 8 })).toBe('M10 (M8)');
        expect(moveLabel({ result: 'draw', mateIn: null }, { result: 'win', mateIn: 3 })).toBe('D (M3)');
        expect(moveLabel({ result: 'loss', mateIn: 10 }, { result: 'win', mateIn: 2 })).toBe('L10 (M2)');
        expect(moveLabel({ result: 'loss', mateIn: 12 }, { result: 'draw', mateIn: null })).toBe('L12 (D)');
        expect(moveLabel({ result: 'win', mateIn: 8 }, { result: 'win', mateIn: 8 })).toBeNull();
        expect(moveLabel({ result: 'draw', mateIn: null }, { result: 'draw', mateIn: null })).toBeNull();
    });
});

describe('variations', () => {
    const lucena = '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1';

    it('mirrors and swaps colours exactly', () => {
        expect(transformPosition(lucena, 'w', { mirror: true, swap: false, dx: 0, dy: 0 })).toEqual({ fen: '4k1K1/6P1/8/8/8/8/7r/5R2 w - - 0 1', playerColor: 'w' });
        expect(transformPosition(lucena, 'w', { mirror: false, swap: true, dx: 0, dy: 0 })).toEqual({ fen: '2r5/R7/8/8/8/8/1p6/1k1K4 b - - 0 1', playerColor: 'b' });
    });

    it('rejects shifts that leave the board, put pawns on the back rank or leave the wrong king in check', () => {
        expect(transformPosition(lucena, 'w', { mirror: false, swap: false, dx: -2, dy: 0 })).toBeNull();
        expect(transformPosition('8/8/8/8/8/8/P7/k6K w - - 0 1', 'w', { mirror: false, swap: false, dx: 0, dy: -1 })).toBeNull();
        expect(transformPosition('k6R/8/8/8/8/8/8/K7 w - - 0 1', 'w', { mirror: false, swap: false, dx: 0, dy: 0 })).toBeNull();
    });

    it('only produces legal positions with the same pieces', () => {
        for (let i = 0; i < 200; i++) {
            const v = transformPosition(lucena, 'w', randomTransform(lucena, true));
            if (!v) continue;
            expect(() => new Chess(v.fen)).not.toThrow();
            expect(countPieces(v.fen)).toBe(5);
        }
    });
});

describe('solving', () => {
    const win = { target: 'win' as const, mateRequired: false };

    it('counts checkmate by the player, and a basic won ending only when mate is not required', () => {
        expect(solveState(new Chess('k7/1Q6/1K6/8/8/8/8/8 b - - 0 1'), win, 'w', 5)).toBe('solved');
        expect(solveState(new Chess('k7/8/1K6/8/8/8/8/7Q b - - 0 1'), win, 'w', 5)).toBe('confirm');
        expect(solveState(new Chess('k7/8/1K6/8/8/8/8/7Q b - - 0 1'), { target: 'win', mateRequired: true }, 'w', 5)).toBeNull();
        expect(solveState(new Chess('k7/8/1K6/8/8/8/P7/8 b - - 0 1'), win, 'w', 5)).toBeNull();
    });

    it('holds a draw after 15 moves, or straight away when the game is drawn', () => {
        const draw = { target: 'draw' as const, mateRequired: false };
        expect(solveState(new Chess('8/8/8/8/8/k7/p7/K7 w - - 0 1'), draw, 'w', 3)).toBe('solved');
        expect(solveState(new Chess('8/8/8/4k3/8/8/4P3/4K3 w - - 0 1'), draw, 'b', 14)).toBeNull();
        expect(solveState(new Chess('8/8/8/4k3/8/8/4P3/4K3 w - - 0 1'), draw, 'b', 15)).toBe('confirm');
    });
});
