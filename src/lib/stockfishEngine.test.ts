import { afterEach, describe, expect, it, vi } from 'vitest';
import { EndgameEngine } from './stockfishEngine';

/** Stubs the Lichess tablebase API with a fixed answer for every position. */
function mockTablebase(body: object) {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })));
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('EndgameEngine.getBestMove', () => {
    it('Stockfish keeps a drawn position drawn instead of playing a losing move', async () => {
        // Philidor position, White to move: Rb7 loses, e6 draws.
        mockTablebase({
            category: 'draw',
            dtm: 0,
            moves: [
                { uci: 'h7b7', san: 'Rb7', category: 'win', dtm: 35 },
                { uci: 'e5e6', san: 'e6', category: 'draw', dtm: 0 }
            ]
        });
        const engine = new EndgameEngine();
        const move = await engine.getBestMove('4k3/7R/1r6/3KP3/8/8/8/8 w - - 0 1');
        expect(move?.san).toBe('e6');
    });
});

describe('EndgameEngine.getEvaluation', () => {
    // Pawn on the 6th rank, White to move and winning (mate in 11).
    const fen = '1k6/8/2P5/1K6/8/8/8/8 w - - 0 1';

    it('reports a win for the side to move', async () => {
        mockTablebase({ category: 'win', dtm: 21, moves: [] });
        const result = await new EndgameEngine().getEvaluation(fen, 'w');
        expect(result.evalText).toBe('Winning (Mate in 11)');
        expect(result.score).toBeGreaterThan(0);
    });

    it('reports the same position as lost for the other side', async () => {
        mockTablebase({ category: 'win', dtm: 21, moves: [] });
        const result = await new EndgameEngine().getEvaluation(fen, 'b');
        expect(result.evalText).toBe('Losing (Mated in 11)');
        expect(result.score).toBeLessThan(0);
    });
});
