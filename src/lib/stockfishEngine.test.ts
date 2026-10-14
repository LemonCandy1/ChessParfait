import { afterEach, describe, expect, it, vi } from 'vitest';
import { EndgameEngine } from './stockfishEngine';
import { maiaOnnxService, type MaiaMoveResult } from './maiaOnnxService';

vi.mock('./maiaOnnxService', () => ({ maiaOnnxService: { getRankedMoves: vi.fn() } }));

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

describe('Maia endgame guard', () => {
    // Queen vs rook: 1.Qxg3+?? lets the king recapture (draw); 1.Qh5 keeps the win.
    const fen = '8/8/8/4Q3/8/6r1/4K1k1/8 w - - 0 1';
    const maiaMove = (san: string, from: string, to: string): MaiaMoveResult =>
        ({ san, from, to, evalText: 'Maia 1900 (ONNX Neural)', confidence: 0.5, score: 0 });
    const rankedByMaia = [maiaMove('Qxg3+', 'e5', 'g3'), maiaMove('Qh5', 'e5', 'h5')];

    const setUp = (random: number) => {
        vi.mocked(maiaOnnxService.getRankedMoves).mockResolvedValue(rankedByMaia);
        mockTablebase({
            category: 'win',
            dtm: 27,
            moves: [
                { uci: 'e5g3', san: 'Qxg3+', category: 'draw', dtm: 0 },
                { uci: 'e5h5', san: 'Qh5', category: 'loss', dtm: -26 }
            ]
        });
        const engine = new EndgameEngine(() => random);
        engine.setOpponent('maia_1900');
        return engine;
    };

    it('usually avoids a move that throws away the win, playing its next most likely move', async () => {
        const move = await setUp(0.5).getBestMove(fen);
        expect(move?.san).toBe('Qh5');
        expect(move?.isNeural).toBe(true);
    });

    it('still makes the human mistake some of the time', async () => {
        const move = await setUp(0.95).getBestMove(fen);
        expect(move?.san).toBe('Qxg3+');
    });

    it('keeps its first choice when that move already holds the result', async () => {
        const engine = setUp(0);
        vi.mocked(maiaOnnxService.getRankedMoves).mockResolvedValue([rankedByMaia[1], rankedByMaia[0]]);
        expect((await engine.getBestMove(fen))?.san).toBe('Qh5');
    });

    it('does not consult the tablebase with more than 7 pieces', async () => {
        const fetchSpy = vi.fn();
        vi.stubGlobal('fetch', fetchSpy);
        vi.mocked(maiaOnnxService.getRankedMoves).mockResolvedValue([maiaMove('b6', 'b5', 'b6')]);
        const engine = new EndgameEngine(() => 0);
        engine.setOpponent('maia_1900');
        expect((await engine.getBestMove('8/ppp3k1/8/PPP5/8/8/8/6K1 w - - 0 1'))?.san).toBe('b6');
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});
