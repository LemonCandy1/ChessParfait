import { describe, expect, it } from 'vitest';
import { outcomeForMover, rankMovesForMover, type TablebaseMove } from './tablebaseService';

// Lichess labels each move from the OPPONENT's point of view (the side to move after it).
const move = (san: string, category: TablebaseMove['category'], dtm: number | null): TablebaseMove => ({
    uci: san,
    san,
    category,
    dtm,
    dtz: dtm,
    checkmate: false,
    stalemate: false,
    insufficient_material: false
});

describe('outcomeForMover', () => {
    it('reads move labels from the side that plays the move', () => {
        expect(outcomeForMover(move('Kb6', 'loss', -20))).toBe('win');
        expect(outcomeForMover(move('Rb7', 'win', 35))).toBe('loss');
        expect(outcomeForMover(move('e6', 'draw', 0))).toBe('draw');
        expect(outcomeForMover(move('x', 'blessed-loss', -10))).toBe('cursed-win');
    });
});

describe('rankMovesForMover', () => {
    it('keeps the draw instead of blundering into a loss (Philidor, White to move)', () => {
        const ranked = rankMovesForMover([move('Rb7', 'win', 35), move('Rf7', 'win', 31), move('e6', 'draw', 0)]);
        expect(ranked[0].san).toBe('e6');
        expect(ranked.at(-1)?.san).toBe('Rf7');
    });

    it('picks the fastest win (pawn on the 6th rank, White to move)', () => {
        const ranked = rankMovesForMover([move('c7+', 'draw', 0), move('Kb4', 'loss', -30), move('Kb6', 'loss', -20)]);
        expect(ranked.map(m => m.san)).toEqual(['Kb6', 'Kb4', 'c7+']);
    });

    it('defends as stubbornly as possible when every move loses', () => {
        const ranked = rankMovesForMover([move('Ka8', 'win', 1), move('Kc8', 'win', 27), move('Be6', 'win', 5)]);
        expect(ranked.map(m => m.san)).toEqual(['Kc8', 'Be6', 'Ka8']);
    });

    it('prefers a 50-move-rule win over a plain draw', () => {
        const ranked = rankMovesForMover([move('a', 'draw', 0), move('b', 'blessed-loss', -60)]);
        expect(ranked[0].san).toBe('b');
    });
});
