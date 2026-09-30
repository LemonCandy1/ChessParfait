import * as ort from 'onnxruntime-web';
import { Chess } from 'chess.js';

// Configure ONNX WebAssembly binary path
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.29.0/dist/';

export type MaiaLevel = 1100 | 1500 | 1900;

export interface MaiaMoveResult {
    from: string;
    to: string;
    promotion?: string;
    san: string;
    evalText: string;
    confidence: number;
    score: number;
}

const FILES = 'abcdefgh';
const PIECE_ORDER = ['p', 'n', 'b', 'r', 'q', 'k'];
const HISTORY_PLANES = 8;
const PLANES_PER_POSITION = 13;

/**
 * lc0 policy head vocabulary (1858 moves): every queen-like and knight move
 * plus the 66 under-promotions, ordered by from-square then to-square
 * (rank-major, a1 = 0). Queen promotions share the plain move's entry.
 */
function generateMoveVocabulary(): Map<string, number> {
    const moves: string[] = [];
    const sq = (f: number, r: number) => FILES[f] + (r + 1);
    const rays = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    const jumps = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];

    for (let f = 0; f < 8; f++) {
        for (let r = 0; r < 8; r++) {
            for (const [df, dr] of rays) {
                for (let k = 1; k < 8; k++) {
                    const nf = f + df * k;
                    const nr = r + dr * k;
                    if (nf < 0 || nf > 7 || nr < 0 || nr > 7) break;
                    moves.push(sq(f, r) + sq(nf, nr));
                }
            }
            for (const [df, dr] of jumps) {
                const nf = f + df;
                const nr = r + dr;
                if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
                moves.push(sq(f, r) + sq(nf, nr));
            }
        }
    }
    for (let f = 0; f < 8; f++) {
        for (const df of [-1, 0, 1]) {
            const nf = f + df;
            if (nf < 0 || nf > 7) continue;
            for (const p of 'rbn') moves.push(FILES[f] + '7' + FILES[nf] + '8' + p);
        }
    }

    const key = (s: string) => parseInt(s[1], 10) * 8 + FILES.indexOf(s[0]);
    moves.sort((x, y) => key(x.slice(0, 2)) - key(y.slice(0, 2)) || key(x.slice(2, 4)) - key(y.slice(2, 4)) || x.slice(4).localeCompare(y.slice(4)));

    return new Map(moves.map((m, i) => [m, i]));
}

const moveToIdx = generateMoveVocabulary();

function mirrorSquare(sq: string): string {
    return sq[0] + (9 - parseInt(sq[1], 10));
}

function mirrorMove(uci: string): string {
    return mirrorSquare(uci.slice(0, 2)) + mirrorSquare(uci.slice(2, 4)) + uci.slice(4);
}

/**
 * Encode a position as the lc0 classical 112-plane input [1, 112, 8, 8].
 * The board is always seen from the side to move (mirrored when Black moves).
 */
function encodePlanes(game: Chess): Float32Array {
    const planes = new Float32Array(112 * 64);
    const isBlack = game.turn() === 'b';
    const us = isBlack ? 'b' : 'w';

    for (let r = 1; r <= 8; r++) {
        for (let f = 0; f < 8; f++) {
            const piece = game.get((FILES[f] + r) as any);
            if (!piece) continue;
            const row = (isBlack ? 9 - r : r) - 1;
            const plane = PIECE_ORDER.indexOf(piece.type) + (piece.color === us ? 0 : 6);
            for (let h = 0; h < HISTORY_PLANES; h++) {
                planes[(h * PLANES_PER_POSITION + plane) * 64 + row * 8 + f] = 1;
            }
        }
    }

    const ours = game.getCastlingRights(us);
    const theirs = game.getCastlingRights(isBlack ? 'w' : 'b');
    const fill = (plane: number, on: boolean) => {
        if (on) planes.fill(1, plane * 64, plane * 64 + 64);
    };
    fill(104, ours.q);
    fill(105, ours.k);
    fill(106, theirs.q);
    fill(107, theirs.k);
    fill(108, isBlack);
    fill(111, true);

    return planes;
}

/**
 * Service managing client-side ONNX inference for the lc0-format Maia models
 * (Maia 1100, 1500 and 1900).
 */
class MaiaOnnxService {
    private sessions = new Map<MaiaLevel, Promise<ort.InferenceSession>>();
    private loaded = new Set<MaiaLevel>();

    static levelForElo(elo: number): MaiaLevel {
        if (elo <= 1300) return 1100;
        if (elo <= 1700) return 1500;
        return 1900;
    }

    isReady(level: MaiaLevel = 1500): boolean {
        return this.loaded.has(level);
    }

    /**
     * Lazy-load a Maia ONNX model from the public/models directory
     */
    loadModel(level: MaiaLevel): Promise<ort.InferenceSession> {
        let pending = this.sessions.get(level);
        if (!pending) {
            pending = ort.InferenceSession
                .create(`/models/maia-${level}.onnx`, {
                    executionProviders: ['wasm'],
                    graphOptimizationLevel: 'basic'
                })
                .then((session) => {
                    this.loaded.add(level);
                    return session;
                })
                .catch((err) => {
                    this.sessions.delete(level);
                    console.warn(`Could not initialize Maia ${level} ONNX model (falling back to hybrid engine):`, err);
                    throw err;
                });
            this.sessions.set(level, pending);
        }
        return pending;
    }

    /**
     * Predict the most likely move for a player of the given Maia level.
     * `elo` is snapped to the nearest model (1100 / 1500 / 1900).
     */
    async getBestMove(fen: string, elo: number): Promise<MaiaMoveResult | null> {
        try {
            const level = MaiaOnnxService.levelForElo(elo);
            const session = await this.loadModel(level);
            const game = new Chess(fen);
            if (game.isGameOver()) return null;

            const legalMoves = game.moves({ verbose: true });
            if (legalMoves.length === 0) return null;

            const isBlack = game.turn() === 'b';
            const results = await session.run({
                '/input/planes': new ort.Tensor('float32', encodePlanes(game), [1, 112, 8, 8])
            });
            const logits = results['/output/policy'].data as Float32Array;

            const scored = legalMoves.map((m) => {
                // Queen promotions use the plain move's vocabulary entry
                const uci = m.from + m.to + (m.promotion && m.promotion !== 'q' ? m.promotion : '');
                const idx = moveToIdx.get(isBlack ? mirrorMove(uci) : uci);
                return { move: m, logit: idx !== undefined ? logits[idx] : -Infinity };
            });
            scored.sort((a, b) => b.logit - a.logit);

            const best = scored[0];
            const total = scored.reduce((sum, s) => sum + Math.exp(s.logit - best.logit), 0);
            const chosen = best.move;

            return {
                from: chosen.from,
                to: chosen.to,
                promotion: chosen.promotion,
                san: chosen.san,
                evalText: `Maia ${level} (ONNX Neural)`,
                confidence: 1 / total,
                score: best.logit
            };
        } catch (err) {
            console.warn('Maia ONNX inference error, falling back:', err);
            return null;
        }
    }
}

export const maiaOnnxService = new MaiaOnnxService();
