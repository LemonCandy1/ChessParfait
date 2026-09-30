/**
 * Imposter Chess bot: alpha-beta search over the variant's pseudo-legal moves.
 *
 * Fairness: the bot only ever sees a sanitized state (see hideOpponentImposter). Its own imposter
 * is known, while the human's hidden imposter is guessed. Each search runs on several sampled
 * assignments of the human's imposter to one of their pawns, and root scores are averaged.
 */
import {
    applyMove,
    createInitialState,
    generateMoves,
    hideOpponentImposter,
    opposite,
    pawnSquares,
    type Color,
    type GameState,
    type Move,
    type Piece,
    type PromotionPiece
} from './imposterChess';

export type BotLevel = 'casual' | 'club' | 'strong';

export interface BotLevelConfig {
    label: string;
    description: string;
    depth: number;
    samples: number;
    /** Probability of playing a random move among the best three instead of the best. */
    randomTopThree: number;
}

export const BOT_LEVELS: Record<BotLevel, BotLevelConfig> = {
    casual: {
        label: 'Casual',
        description: 'Looks one move ahead and sometimes plays a natural second choice.',
        depth: 1,
        samples: 1,
        randomTopThree: 0.3
    },
    club: {
        label: 'Club',
        description: 'Looks two moves ahead and guesses which of your pawns is the imposter.',
        depth: 2,
        samples: 3,
        randomTopThree: 0
    },
    strong: {
        label: 'Strong',
        description: 'Searches four plies and weighs several imposter guesses.',
        depth: 4,
        samples: 3,
        randomTopThree: 0
    }
};

export interface BotMove {
    from: number;
    to: number;
    promotion?: PromotionPiece;
}

const MATE = 100000;

const VALUE: Record<Piece['t'], number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const IMPOSTER_VALUE = 880;

function pieceValue(p: Piece): number {
    return p.imp ? IMPOSTER_VALUE : VALUE[p.t];
}

function centrality(sq: number): number {
    const f = Math.abs((sq & 7) - 3.5);
    const r = Math.abs((sq >> 3) - 3.5);
    return 3 - Math.max(f, r);
}

/** Static evaluation from the point of view of the side to move. */
export function evaluate(s: GameState): number {
    let score = 0;
    let enemyMaterialForKingSafety = 0;
    for (let i = 0; i < 64; i++) {
        const p = s.board[i];
        if (p && p.t !== 'k' && p.t !== 'p') enemyMaterialForKingSafety += VALUE[p.t];
    }
    for (let i = 0; i < 64; i++) {
        const p = s.board[i];
        if (!p) continue;
        const rel = p.c === 'w' ? i >> 3 : 7 - (i >> 3);
        let v = pieceValue(p);
        if (p.t === 'p' && !p.imp) {
            v += rel * 6 + centrality(i) * 2;
            if (rel >= 5) v += 10;
        } else if (p.t === 'n' || p.t === 'b') {
            v += centrality(i) * 5;
            if (rel === 0) v -= 8;
        } else if (p.t === 'r') {
            if (rel === 6) v += 12;
        } else if (p.t === 'k') {
            // With no check rule an advanced king is easy prey while heavy pieces remain.
            v -= rel * (enemyMaterialForKingSafety > 1200 ? 14 : 2);
        } else if (p.imp || p.t === 'q') {
            v += centrality(i) * 2;
        }
        score += p.c === s.turn ? v : -v;
    }
    return score;
}

function orderMoves(moves: Move[]): Move[] {
    const scored = moves.map((m) => {
        let key = 0;
        if (m.captured) key += 10 * pieceValue(m.captured);
        if (m.promotion) key += VALUE[m.promotion];
        return { m, key };
    });
    scored.sort((a, b) => b.key - a.key);
    return scored.map((x) => x.m);
}

interface SearchContext {
    nodes: number;
}

function negamax(s: GameState, depth: number, alpha: number, beta: number, ply: number, ctx: SearchContext): number {
    ctx.nodes++;
    const moves = generateMoves(s);
    // The side to move can take the king right now, so it wins.
    for (const m of moves) if (m.captured && m.captured.t === 'k') return MATE - ply;
    if (moves.length === 0) return -MATE + ply;
    if (s.halfmove >= 100) return 0;
    if (depth <= 0) return evaluate(s);

    let best = -Infinity;
    for (const m of orderMoves(moves)) {
        const score = -negamax(applyMove(s, m), depth - 1, -beta, -alpha, ply + 1, ctx);
        if (score > best) best = score;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
    }
    return best;
}

export interface RootScore {
    move: Move;
    score: number;
}

/** Score every root move for the side to move on one fully specified position. */
export function scoreRootMoves(s: GameState, depth: number): RootScore[] {
    const ctx: SearchContext = { nodes: 0 };
    return generateMoves(s).map((move) => {
        if (move.captured && move.captured.t === 'k') return { move, score: MATE };
        const child = applyMove(s, move);
        return { move, score: -negamax(child, depth - 1, -Infinity, Infinity, 1, ctx) };
    });
}

function shuffle<T>(items: T[], rng: () => number): T[] {
    const a = items.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/** Assign the human's hidden imposter flag to a chosen pawn in a copy of the state. */
function withGuessedImposter(s: GameState, sq: number): GameState {
    const board = s.board.slice();
    const p = board[sq];
    if (p) board[sq] = { t: p.t, c: p.c, imp: true };
    return { ...s, board };
}

const moveKey = (m: Move) => `${m.from}-${m.to}-${m.promotion ?? ''}`;

/**
 * Choose the bot's move. `state` must already be sanitized for the bot with hideOpponentImposter.
 * Root moves and their averaged scores are returned best-first for testing.
 */
export function rankBotMoves(
    state: GameState,
    botColor: Color,
    level: BotLevel,
    rng: () => number = Math.random
): RootScore[] {
    const cfg = BOT_LEVELS[level];
    const human = opposite(botColor);
    const humanKnown = state.board.some((p) => p && p.c === human && p.imp);

    let assignments: GameState[];
    if (humanKnown) {
        assignments = [state];
    } else {
        const pawns = shuffle(pawnSquares(state, human), rng).slice(0, cfg.samples);
        assignments = pawns.length > 0 ? pawns.map((sq) => withGuessedImposter(state, sq)) : [state];
    }

    const totals = new Map<string, { move: Move; sum: number; n: number }>();
    for (const assumed of assignments) {
        for (const { move, score } of scoreRootMoves(assumed, cfg.depth)) {
            const key = moveKey(move);
            const entry = totals.get(key);
            // Root moves never depend on the human's imposter, so keep the move object from the first sample.
            if (entry) {
                entry.sum += score;
                entry.n++;
            } else {
                totals.set(key, { move, sum: score, n: 1 });
            }
        }
    }
    return [...totals.values()]
        .map((e) => ({ move: e.move, score: e.sum / e.n + (rng() - 0.5) * 2 }))
        .sort((a, b) => b.score - a.score);
}

export function chooseBotMove(
    state: GameState,
    botColor: Color,
    level: BotLevel,
    rng: () => number = Math.random
): BotMove | null {
    const ranked = rankBotMoves(state, botColor, level, rng);
    if (ranked.length === 0) return null;
    const cfg = BOT_LEVELS[level];
    let pick = ranked[0];
    if (cfg.randomTopThree > 0 && ranked.length > 1 && rng() < cfg.randomTopThree) {
        const pool = ranked.slice(0, Math.min(3, ranked.length));
        pick = pool[Math.floor(rng() * pool.length)];
    }
    return { from: pick.move.from, to: pick.move.to, promotion: pick.move.promotion };
}

/** Convenience wrapper: sanitize the real state for the bot, then choose. */
export function chooseBotMoveForGame(
    real: GameState,
    botColor: Color,
    level: BotLevel,
    rng: () => number = Math.random
): BotMove | null {
    return chooseBotMove(hideOpponentImposter(real, botColor), botColor, level, rng);
}

/** The bot prefers a central pawn whose queen lines are likely to open. */
export function chooseBotImposter(color: Color, rng: () => number = Math.random): number {
    const base = createInitialState();
    const candidates = pawnSquares(base, color);
    const weights = candidates.map((sq) => {
        const file = sq & 7;
        const distance = Math.abs(file - 3.5);
        return distance < 1 ? 5 : distance < 2 ? 4 : distance < 3 ? 2 : 1;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = rng() * total;
    for (let i = 0; i < candidates.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return candidates[i];
    }
    return candidates[0];
}
