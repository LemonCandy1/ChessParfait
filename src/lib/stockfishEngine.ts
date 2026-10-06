import { Chess } from 'chess.js';
import { flipOutcome, outcomeOf, queryTablebase, type TablebaseMove, type TablebaseResult } from './tablebaseService';
import { maiaOnnxService } from './maiaOnnxService';

export type PracticeOpponent = 'stockfish' | 'maia_1100' | 'maia_1500' | 'maia_1900';

export type EngineDefenseMode = 'tablebase_stubborn' | 'stockfish_gm' | 'practice_adaptive' | PracticeOpponent;

export interface OpponentInfo {
    id: PracticeOpponent;
    name: string;
    elo: number;
    title: string;
    description: string;
}

export const OPPONENT_PRESETS: Record<PracticeOpponent, OpponentInfo> = {
    stockfish: {
        id: 'stockfish',
        name: 'Stockfish 17',
        elo: 3500,
        title: 'Syzygy Perfect Engine',
        description: 'Maximum mathematical precision via 7-piece Syzygy tablebases and deep engine search.',
    },
    maia_1900: {
        id: 'maia_1900',
        name: 'Mr. Cherry',
        elo: 1900,
        title: 'Strongest Maia',
        description: 'Expert-level human play with strong endgame knowledge and stubborn defence.',
    },
    maia_1500: {
        id: 'maia_1500',
        name: 'Lemon Tart',
        elo: 1500,
        title: 'Intermediate Club Player',
        description: 'Solid basic technique, realistic human inaccuracies and tempo miscalculations.',
    },
    maia_1100: {
        id: 'maia_1100',
        name: 'Strawberry Cake',
        elo: 1100,
        title: 'Casual / Beginner',
        description: 'Plays natural human beginner moves with frequent inaccuracies and tactical blunders.',
    }
};

/**
 * How long to wait for chess-api.com (remote Stockfish) before falling back to the local heuristic.
 * Depth-14 answers typically take 1-3 s, so a short timeout would almost always abort.
 */
const ONLINE_ENGINE_TIMEOUT_MS = 4000;

export interface MoveRecommendation {
    from: string;
    to: string;
    promotion?: string;
    san: string;
    evalText: string;
    isTablebase: boolean;
    isNeural?: boolean;
    dtm?: number | null;
}

/**
 * Enhanced Endgame AI Engine that intelligently fuses Syzygy 7-Piece Tablebases 
 * with Maia neural network behavioral profiles and Stockfish engine queries.
 */
export class EndgameEngine {
    private opponent: PracticeOpponent = 'stockfish';

    setOpponent(opponent: PracticeOpponent) {
        this.opponent = opponent;
    }

    getOpponent(): PracticeOpponent {
        return this.opponent;
    }

    // Backward-compatible mode setter
    setMode(mode: EngineDefenseMode) {
        if (mode === 'tablebase_stubborn' || mode === 'stockfish_gm') {
            this.opponent = 'stockfish';
        } else if (mode === 'practice_adaptive') {
            this.opponent = 'maia_1500';
        } else if (OPPONENT_PRESETS[mode as PracticeOpponent]) {
            this.opponent = mode as PracticeOpponent;
        }
    }

    getMode(): PracticeOpponent {
        return this.opponent;
    }

    /**
     * Compute the opponent's move for the given FEN: the best move for the side to move, whether it
     * is attacking or defending (weaker opponents sometimes pick a worse move on purpose).
     */
    async getBestMove(fen: string): Promise<MoveRecommendation | null> {
        const game = new Chess(fen);
        if (game.isGameOver()) return null;

        // 1. Authentic Maia Neural Network inference when a Maia opponent is selected
        if (this.opponent.startsWith('maia_')) {
            const preset = OPPONENT_PRESETS[this.opponent];
            const targetElo = preset.elo;
            try {
                const neuralMove = await maiaOnnxService.getBestMove(fen, targetElo);
                if (neuralMove) {
                    return {
                        from: neuralMove.from,
                        to: neuralMove.to,
                        promotion: neuralMove.promotion,
                        san: neuralMove.san,
                        evalText: neuralMove.evalText,
                        isTablebase: false,
                        isNeural: true
                    };
                }
            } catch (err) {
                console.warn('[EndgameEngine] Maia ONNX inference failed, falling back to Tablebase / Heuristic:', err);
            }
        }

        // 2. Try Tablebase query first for <= 7 pieces
        const pieceCount = this.countPieces(fen);
        if (pieceCount <= 7) {
            const tbResult = await queryTablebase(fen);
            if (tbResult && tbResult.moves.length > 0) {
                const chosenMove = this.selectMoveByOpponentProfile(tbResult);
                if (chosenMove) {
                    const from = chosenMove.uci.slice(0, 2);
                    const to = chosenMove.uci.slice(2, 4);
                    const promotion = chosenMove.uci.length > 4 ? chosenMove.uci[4] : undefined;

                    const preset = OPPONENT_PRESETS[this.opponent];
                    let evalText = preset.name;
                    if (tbResult.dtm !== null) {
                        if (tbResult.dtm === 0) evalText = `${preset.name} Checkmate!`;
                        else if (tbResult.dtm > 0) evalText = `${preset.name} (Mate in ${Math.ceil(tbResult.dtm / 2)})`;
                        else evalText = `${preset.name} (${Math.ceil(Math.abs(tbResult.dtm) / 2)} moves)`;
                    } else if (tbResult.category === 'draw') {
                        evalText = `${preset.name} (Draw)`;
                    }

                    return {
                        from,
                        to,
                        promotion,
                        san: chosenMove.san,
                        evalText,
                        isTablebase: true,
                        dtm: tbResult.dtm
                    };
                }
            }
        }

        // 2. Try online engine query with calibrated depth for the opponent
        const apiMove = await this.queryOnlineEngine(fen);
        if (apiMove) {
            return apiMove;
        }

        // 3. Fallback heuristic minimax calculation with rating noise
        return this.computeHeuristicMove(game);
    }

    /**
     * Select move based on the active opponent's skill and blunder profile
     */
    private selectMoveByOpponentProfile(tbResult: TablebaseResult): TablebaseMove | null {
        // Best-first for the side to move: fastest win, then draws, then the most stubborn defence
        const moves = tbResult.rankedMoves;
        if (moves.length === 0) return null;

        // Stockfish: always the best move (fastest win, safest draw, or most stubborn defence)
        if (this.opponent === 'stockfish') {
            return moves[0];
        }

        // Maia 1900 (Expert): 92% best move, 8% second best
        if (this.opponent === 'maia_1900') {
            const rand = Math.random();
            if (rand < 0.92 || moves.length < 2) return moves[0];
            return moves[1];
        }

        // Maia 1500 (Intermediate): 50% best, 30% second, 15% third, 5% fourth
        if (this.opponent === 'maia_1500') {
            const rand = Math.random();
            if (rand < 0.50 || moves.length < 2) return moves[0];
            if (rand < 0.80 || moves.length < 3) return moves[1];
            if (rand < 0.95 || moves.length < 4) return moves[2];
            return moves[Math.min(3, moves.length - 1)];
        }

        // Maia 1100 (Beginner): 25% best, 30% second, 25% third, 20% blunder/inferior
        if (this.opponent === 'maia_1100') {
            const rand = Math.random();
            if (rand < 0.25 || moves.length < 2) return moves[0];
            if (rand < 0.55 || moves.length < 3) return moves[1];
            if (rand < 0.80 || moves.length < 4) return moves[2];
            // Pick an inaccurate move or blunder (closer to mate)
            const blunderIndex = Math.min(moves.length - 1, Math.floor(Math.random() * moves.length));
            return moves[blunderIndex];
        }

        return moves[0];
    }

    /**
     * Query online engine API with calibrated depth
     */
    private async queryOnlineEngine(fen: string): Promise<MoveRecommendation | null> {
        const depthMap: Record<PracticeOpponent, number> = {
            stockfish: 14,
            maia_1900: 12,
            maia_1500: 4,
            maia_1100: 1
        };

        const depth = depthMap[this.opponent] || 8;

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), ONLINE_ENGINE_TIMEOUT_MS);

            const res = await fetch('https://chess-api.com/v1', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fen, depth }),
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (res.ok) {
                const data = await res.json();
                if (data && data.from && data.to) {
                    return {
                        from: data.from,
                        to: data.to,
                        promotion: data.isPromotion ? (data.promotion || 'q') : undefined,
                        san: data.san || data.move,
                        evalText: `${OPPONENT_PRESETS[this.opponent].name} (${data.eval ? (data.eval > 0 ? `+${data.eval}` : data.eval) : 'Eval'})`,
                        isTablebase: false
                    };
                }
            }
        } catch {
            // Silently fallback to local heuristic evaluation if offline or aborted
        }

        return null;
    }

    /**
     * Evaluation for the live eval display, from `perspective`'s point of view
     * (a positive score and "Winning" mean good for that side, whoever is to move).
     */
    async getEvaluation(fen: string, perspective: 'w' | 'b'): Promise<{ evalText: string; score: number; dtm?: number | null }> {
        const game = new Chess(fen);
        const viewerToMove = game.turn() === perspective;

        if (this.countPieces(fen) <= 7) {
            const tbResult = await queryTablebase(fen);
            if (tbResult) {
                // The tablebase reports from the side to move; flip it when that is the opponent.
                const sideToMove = outcomeOf(tbResult.category);
                const outcome = viewerToMove ? sideToMove : flipOutcome(sideToMove);
                const dtm = tbResult.dtm === null ? null : (viewerToMove ? tbResult.dtm : -tbResult.dtm);
                const mateIn = dtm === null ? null : Math.ceil(Math.abs(dtm) / 2);

                if (game.isCheckmate()) {
                    return viewerToMove
                        ? { evalText: 'Checkmated', score: -100, dtm: 0 }
                        : { evalText: 'Checkmate!', score: 100, dtm: 0 };
                }
                switch (outcome) {
                    case 'win':
                        return { evalText: mateIn ? `Winning (Mate in ${mateIn})` : 'Winning', score: 99 - (mateIn ?? 0), dtm };
                    case 'loss':
                        return { evalText: mateIn ? `Losing (Mated in ${mateIn})` : 'Losing', score: -99 + (mateIn ?? 0), dtm };
                    case 'cursed-win':
                        return { evalText: 'Winning, but drawn by the 50-move rule', score: 1, dtm };
                    case 'blessed-loss':
                        return { evalText: 'Losing, but saved by the 50-move rule', score: -1, dtm };
                    default:
                        return { evalText: 'Theoretical Draw (0.0)', score: 0, dtm: 0 };
                }
            }
        }

        // Material-based estimate (White's point of view), flipped for Black.
        const whiteScore = this.evaluatePosition(game);
        const evalScore = perspective === 'w' ? whiteScore : -whiteScore;
        return {
            evalText: evalScore > 0 ? `+${(evalScore / 100).toFixed(1)}` : `${(evalScore / 100).toFixed(1)}`,
            score: evalScore
        };
    }

    private countPieces(fen: string): number {
        const boardPart = fen.split(' ')[0];
        let count = 0;
        for (const char of boardPart) {
            if (/[pnbrqkPNBRQK]/.test(char)) count++;
        }
        return count;
    }

    private computeHeuristicMove(game: Chess): MoveRecommendation | null {
        const moves = game.moves({ verbose: true });
        if (moves.length === 0) return null;

        const isWhite = game.turn() === 'w';
        let bestMove = moves[0];
        let bestScore = isWhite ? -Infinity : Infinity;

        // Add human rating noise
        const noiseMultipliers: Record<PracticeOpponent, number> = {
            stockfish: 0,
            maia_1900: 10,
            maia_1500: 75,
            maia_1100: 180
        };
        const maxNoise = noiseMultipliers[this.opponent] || 0;

        for (const move of moves) {
            game.move(move);
            let score = this.evaluatePosition(game);
            game.undo();

            if (maxNoise > 0) {
                score += (Math.random() - 0.5) * maxNoise * 2;
            }

            if (isWhite) {
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            } else {
                if (score < bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }
        }

        return {
            from: bestMove.from,
            to: bestMove.to,
            promotion: bestMove.promotion,
            san: bestMove.san,
            evalText: `${OPPONENT_PRESETS[this.opponent].name} (${(bestScore / 100).toFixed(1)})`,
            isTablebase: false
        };
    }

    private evaluatePosition(game: Chess): number {
        if (game.isCheckmate()) {
            return game.turn() === 'w' ? -10000 : 10000;
        }
        if (game.isDraw()) return 0;

        const pieceValues: Record<string, number> = {
            p: 100,
            n: 320,
            b: 330,
            r: 500,
            q: 900,
            k: 20000
        };

        let score = 0;
        const board = game.board();

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const sq = board[r][c];
                if (!sq) continue;

                const val = pieceValues[sq.type] || 0;
                const isW = sq.color === 'w';

                // Advancement bonus for pawns
                let bonus = 0;
                if (sq.type === 'p') {
                    bonus = isW ? (7 - r) * 15 : r * 15;
                }

                score += isW ? (val + bonus) : -(val + bonus);
            }
        }

        return score;
    }
}

export const endgameEngine = new EndgameEngine();
