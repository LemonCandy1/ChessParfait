import { Chess } from 'chess.js';
import { queryTablebase } from './tablebaseService';

export type EngineDefenseMode = 'tablebase_stubborn' | 'stockfish_gm' | 'practice_adaptive';

export interface MoveRecommendation {
    from: string;
    to: string;
    promotion?: string;
    san: string;
    evalText: string;
    isTablebase: boolean;
    dtm?: number | null;
}

/**
 * Enhanced Endgame AI Engine that intelligently fuses Syzygy 7-Piece Tablebases 
 * with dynamic endgame heuristic evaluation for stubborn defensive play.
 */
export class EndgameEngine {
    private mode: EngineDefenseMode = 'tablebase_stubborn';

    setMode(mode: EngineDefenseMode) {
        this.mode = mode;
    }

    getMode(): EngineDefenseMode {
        return this.mode;
    }

    /**
     * Compute the best defensive or attacking move for the given FEN
     */
    async getBestMove(fen: string, isDefender: boolean = true): Promise<MoveRecommendation | null> {
        const game = new Chess(fen);
        if (game.isGameOver()) return null;

        // 1. Try Tablebase query first for <= 7 pieces
        const pieceCount = this.countPieces(fen);
        if (pieceCount <= 7) {
            const tbResult = await queryTablebase(fen);
            if (tbResult && tbResult.moves.length > 0) {
                // If defending, pick the most stubborn move (maximizing moves to mate)
                const chosenMove = (isDefender && this.mode === 'tablebase_stubborn')
                    ? (tbResult.mostStubbornMove || tbResult.bestMove || tbResult.moves[0])
                    : (tbResult.bestMove || tbResult.moves[0]);

                if (chosenMove) {
                    const from = chosenMove.uci.slice(0, 2);
                    const to = chosenMove.uci.slice(2, 4);
                    const promotion = chosenMove.uci.length > 4 ? chosenMove.uci[4] : undefined;

                    let evalText = 'Tablebase Perfect';
                    if (tbResult.dtm !== null) {
                        if (tbResult.dtm === 0) evalText = 'Checkmate!';
                        else if (tbResult.dtm > 0) evalText = `Mate in ${Math.ceil(tbResult.dtm / 2)}`;
                        else evalText = `Longest Defense (${Math.ceil(Math.abs(tbResult.dtm) / 2)} moves)`;
                    } else if (tbResult.category === 'draw') {
                        evalText = 'Tablebase Draw';
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

        // 2. Fallback heuristic minimax calculation with endgame weights
        return this.computeHeuristicMove(game);
    }

    /**
     * Query evaluation only (for live eval bar)
     */
    async getEvaluation(fen: string): Promise<{ evalText: string; score: number; dtm?: number | null }> {
        const pieceCount = this.countPieces(fen);
        if (pieceCount <= 7) {
            const tbResult = await queryTablebase(fen);
            if (tbResult) {
                if (tbResult.category === 'draw') return { evalText: 'Theoretical Draw (0.0)', score: 0, dtm: 0 };
                if (tbResult.dtm !== null) {
                    const movesLeft = Math.ceil(Math.abs(tbResult.dtm) / 2);
                    if (tbResult.dtm > 0) {
                        return { evalText: `Winning (Mate in ${movesLeft})`, score: 99 - movesLeft, dtm: tbResult.dtm };
                    } else {
                        return { evalText: `Losing (Mate in ${movesLeft})`, score: -99 + movesLeft, dtm: tbResult.dtm };
                    }
                }
            }
        }

        const game = new Chess(fen);
        const evalScore = this.evaluatePosition(game);
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

        for (const move of moves) {
            game.move(move);
            const score = this.evaluatePosition(game);
            game.undo();

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
            evalText: `${(bestScore / 100).toFixed(1)}`,
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
