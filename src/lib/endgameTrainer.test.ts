import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import {
    countPieces,
    kFactor,
    newMilestones,
    pickEndgame,
    randomTransform,
    ratingChange,
    solveState,
    transformPosition
} from './endgameTrainer';

describe('ratings', () => {
    it('moves fast for new players and settles to 16 by position 50', () => {
        expect(kFactor(0)).toBe(64);
        expect(kFactor(9)).toBe(64);
        expect(kFactor(29)).toBe(40);
        expect(kFactor(49)).toBe(16);
        expect(kFactor(500)).toBe(16);
    });

    it('gains more for beating a harder endgame and loses more to an easier one', () => {
        expect(ratingChange(1000, 1000, true, 100)).toBe(8);
        expect(ratingChange(1000, 1000, false, 100)).toBe(-8);
        expect(ratingChange(1000, 1400, true, 100)).toBeGreaterThan(ratingChange(1000, 600, true, 100));
        expect(ratingChange(1000, 600, false, 100)).toBeLessThan(ratingChange(1000, 1400, false, 100));
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
        { id: 'a', rating: 800 }, { id: 'b', rating: 800 }, { id: 'c', rating: 1300 },
        { id: 'd', rating: 1300 }, { id: 'e', rating: 1800 }
    ];

    it('widens the range until 3 endgames qualify and never repeats the last one', () => {
        for (let i = 0; i < 50; i++) {
            const picked = pickEndgame(endgames, 1050, 'a');
            expect(picked.id).not.toBe('a');
            expect(['b', 'c', 'd']).toContain(picked.id);
        }
    });

    it('stays near the player once enough endgames are close', () => {
        const withNeighbour = [...endgames, { id: 'f', rating: 1400 }];
        for (const r of [0, 0.5, 0.99]) expect(['c', 'd', 'f']).toContain(pickEndgame(withNeighbour, 1300, null, () => r).id);
        expect(pickEndgame([{ id: 'only', rating: 2000 }], 1000, 'only').id).toBe('only');
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
