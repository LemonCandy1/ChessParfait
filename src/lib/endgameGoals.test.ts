import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { drillGoalFor, goalAchievedBy } from './endgameGoals';

const play = (fen: string, move: string) => {
    const game = new Chess(fen);
    const played = game.move(move);
    return { game, played };
};

describe('drillGoalFor', () => {
    it('maps pawn endgames and queen vs rook drills', () => {
        expect(drillGoalFor({ id: 'pawn-key-squares', category: 'Pawn Endgames' })).toBe('pawn-promotion');
        expect(drillGoalFor({ id: 'queen-vs-rook-philidor', category: 'Queen Endgames' })).toBe('queen-wins-rook');
        expect(drillGoalFor({ id: 'lucena-position', category: 'Rook Endgames' })).toBeNull();
    });
});

describe('pawn promotion goal', () => {
    it('succeeds when the new queen cannot be taken', () => {
        const { game, played } = play('8/P7/8/8/8/8/5k2/7K w - - 0 1', 'a8=Q');
        expect(goalAchievedBy('pawn-promotion', game, played)).toBe('w');
    });

    it('fails when the enemy king can capture the new queen', () => {
        const { game, played } = play('8/Pk6/8/8/8/8/8/7K w - - 0 1', 'a8=Q+');
        expect(goalAchievedBy('pawn-promotion', game, played)).toBeNull();
    });

    it('fails when promoting is stalemate', () => {
        const { game, played } = play('8/1P6/8/8/8/K7/8/k7 w - - 0 1', 'b8=Q');
        expect(game.isStalemate()).toBe(true);
        expect(goalAchievedBy('pawn-promotion', game, played)).toBeNull();
    });

    it('fails when the defender has an immediate checkmate', () => {
        // White queens on h8, but Black replies Qg2#.
        const { game, played } = play('8/7P/8/8/8/5kq1/8/7K w - - 0 1', 'h8=Q');
        expect(goalAchievedBy('pawn-promotion', game, played)).toBeNull();
    });

    it('ignores underpromotion', () => {
        const { game, played } = play('8/P7/8/8/8/8/5k2/7K w - - 0 1', 'a8=R');
        expect(goalAchievedBy('pawn-promotion', game, played)).toBeNull();
    });

    it('works for Black promoting', () => {
        const { game, played } = play('7k/8/8/8/8/8/p7/6K1 b - - 0 1', 'a1=Q+');
        expect(goalAchievedBy('pawn-promotion', game, played)).toBe('b');
    });
});

describe('queen wins rook goal', () => {
    it('succeeds when the queen takes the rook safely', () => {
        const { game, played } = play('1k6/8/2K5/8/8/8/1r6/1Q6 w - - 0 1', 'Qxb2+');
        expect(goalAchievedBy('queen-wins-rook', game, played)).toBe('w');
    });

    it('fails when the king can recapture', () => {
        const { game, played } = play('8/8/8/8/8/1k6/1r6/1Q4K1 w - - 0 1', 'Qxb2+');
        expect(goalAchievedBy('queen-wins-rook', game, played)).toBeNull();
    });

    it('fails when taking the rook is stalemate', () => {
        const { game, played } = play('8/8/8/1r6/Q7/k7/8/K7 w - - 0 1', 'Qxb5');
        expect(game.isStalemate()).toBe(true);
        expect(goalAchievedBy('queen-wins-rook', game, played)).toBeNull();
    });

    it('ignores the king taking the rook', () => {
        const { game, played } = play('8/8/8/4k3/8/8/1r6/1K1Q4 w - - 0 1', 'Kxb2');
        expect(goalAchievedBy('queen-wins-rook', game, played)).toBeNull();
    });
});
