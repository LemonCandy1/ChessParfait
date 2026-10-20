import { Chess } from 'chess.js';

/**
 * Rules for the endless endgame trainer, shared by the /endgame-trainer page and the
 * /api/endgame-trainer endpoints so both agree on ratings, variations and what counts as solved.
 */

export const STARTING_RATING = 1000;
/** Players appear on the endgame rating leaderboard (and lose the "?") after this many positions. */
export const LEADERBOARD_MIN_PLAYED = 20;
/** Leaderboard points each time a player's best rating passes another BEST_RATING_STEP. */
export const BEST_RATING_STEP = 100;
export const BEST_RATING_POINTS = 5;
/** A draw is held once the player has made this many moves without losing the draw. */
export const DRAW_HOLD_MOVES = 15;
/** Positions with more pieces than this can't be checked against the endgame database. */
export const TABLEBASE_MAX_PIECES = 7;

export type Colour = 'w' | 'b';

export interface TrainerEndgame {
    id: string;
    title: string;
    category: string;
    fen: string;
    playerColor: Colour;
    target: 'win' | 'draw';
    rating: number;
    mateRequired: boolean;
    keyTip?: string;
}

/** Swing on a player's first position: about +-100 against an evenly rated endgame. */
const FIRST_K = 200;
/** Each position shrinks the swing by about 6%, so ratings settle over roughly 40 positions. */
const K_DECAY = 0.9388;
/** The smallest swing, reached around position 40, so improving players still climb. */
const MIN_K = 16;

/** The most a rating can move on the player's next position, after `played` positions. */
export function kFactor(played: number): number {
    return Math.max(MIN_K, Math.round(FIRST_K * K_DECAY ** played));
}

/**
 * Elo change for a player rated `player` (with `played` positions behind them) against an endgame rated
 * `endgame`. `credit` is 0 for a fail, otherwise the share of the full gain a solve earns (see solveScore):
 * a solve never loses rating, a slow one just gains less.
 */
export function ratingChange(player: number, endgame: number, credit: number, played: number): number {
    const expected = 1 / (1 + 10 ** ((endgame - player) / 400));
    const k = kFactor(played);
    return credit > 0 ? Math.round(k * (1 - expected) * credit) : Math.round(-k * expected);
}

/** The least a solve earns: even a very slow win gains a quarter of the full amount. */
export const MIN_CREDIT = 0.25;

/**
 * Share of the full rating gain a solve earns: all of it up to the fastest possible mate, half at twice as
 * many moves, and never less than a quarter. Draws and positions without a known fastest mate earn all of it.
 */
export function solveScore(movesTaken: number, fastest: number | null): number {
    if (!fastest || movesTaken <= fastest) return 1;
    return Math.max(MIN_CREDIT, 1 - (0.5 * (movesTaken - fastest)) / fastest);
}

/** Moves to mate from the endgame database's distance to mate, which counts half-moves. */
export const movesToMate = (dtmPlies: number) => Math.ceil(Math.abs(dtmPlies) / 2);

/** The most an endgame's own rating moves per attempt. Kept low so one player can't drag an endgame around. */
export const ENDGAME_K = 8;

/** How an endgame's rating moves after a player rated `player` earns `credit` on it (0 = failed): down when solved, up when failed. */
export function endgameRatingChange(endgame: number, player: number, credit: number): number {
    const playerExpected = 1 / (1 + 10 ** ((endgame - player) / 400));
    return credit > 0 ? -Math.round(ENDGAME_K * (1 - playerExpected) * credit) : Math.round(ENDGAME_K * playerExpected);
}

/** Milestones (1100, 1200, ...) passed when the best rating rises from `oldBest` to `newBest`. Each pays once. */
export function newMilestones(oldBest: number, newBest: number): number[] {
    const passed: number[] = [];
    for (let m = Math.floor(oldBest / BEST_RATING_STEP) * BEST_RATING_STEP + BEST_RATING_STEP; m <= newBest; m += BEST_RATING_STEP) {
        if (m > STARTING_RATING) passed.push(m);
    }
    return passed;
}

/** Positions are aimed this far below the player's rating, like ChessTempo's default, so players solve more than half. */
export const TARGET_BELOW = 100;
/** Spread of the bell curve: an endgame 150 points from the target is picked about 60% as often as one on it. */
const PICK_SPREAD = 150;

/**
 * The next endgame, chosen on a bell curve centred 100 below the player's rating: endgames near that are
 * picked most often, ones far away rarely. Never the endgame they just played.
 */
export function pickEndgame<T extends { id: string; rating: number }>(endgames: T[], rating: number, lastId: string | null, random = Math.random): T {
    const pool = endgames.length > 1 ? endgames.filter(e => e.id !== lastId) : endgames;
    const target = rating - TARGET_BELOW;
    const weights = pool.map(e => Math.exp(-((e.rating - target) ** 2) / (2 * PICK_SPREAD ** 2)) + 1e-9);
    let r = random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) {
        r -= weights[i];
        if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
}

/**
 * Spaced repetition for endgames a player has failed (ChessTempo's schedule, without the speed factor):
 * a fail brings it back in 5 minutes, the first solve after that in a day, and each further solve doubles the gap.
 * Returns the new gap in minutes, or null for an endgame that isn't under review and was solved.
 */
export function nextReviewGap(currentGap: number | null, solved: boolean): number | null {
    if (!solved) return 5;
    if (currentGap === null) return null;
    return currentGap < 24 * 60 ? 24 * 60 : currentGap * 2;
}

export type MoveResult = 'win' | 'draw' | 'loss';

/** A ChessTempo-style label such as "M10 (M8)" or "D (M3)", or null if the move was as good as the best one. */
export function moveLabel(played: { result: MoveResult; mateIn: number | null }, best: { result: MoveResult; mateIn: number | null }): string | null {
    const rank = { win: 2, draw: 1, loss: 0 };
    const text = (m: typeof played) => (m.result === 'draw' ? 'D' : `${m.result === 'win' ? 'M' : 'L'}${m.mateIn ?? ''}`);
    const worse = rank[played.result] < rank[best.result]
        || (played.result === 'win' && best.result === 'win' && played.mateIn !== null && best.mateIn !== null && played.mateIn > best.mateIn);
    return worse ? `${text(played)} (${text(best)})` : null;
}

interface PlacedPiece {
    piece: string;
    file: number; // 0 = a
    rank: number; // 0 = rank 1
}

function parseBoard(fen: string): PlacedPiece[] {
    const pieces: PlacedPiece[] = [];
    fen.split(' ')[0].split('/').forEach((row, i) => {
        let file = 0;
        for (const ch of row) {
            if (/\d/.test(ch)) file += Number(ch);
            else pieces.push({ piece: ch, file: file++, rank: 7 - i });
        }
    });
    return pieces;
}

function buildFen(pieces: PlacedPiece[], turn: Colour): string {
    const rows: string[] = [];
    for (let rank = 7; rank >= 0; rank--) {
        let row = '';
        let empty = 0;
        for (let file = 0; file < 8; file++) {
            const p = pieces.find(x => x.file === file && x.rank === rank);
            if (!p) { empty++; continue; }
            if (empty) { row += empty; empty = 0; }
            row += p.piece;
        }
        rows.push(row + (empty || ''));
    }
    return `${rows.join('/')} ${turn} - - 0 1`;
}

export const countPieces = (fen: string) => parseBoard(fen).length;

/** Legal for training: kings apart, pawns off the back ranks, and the side not to move not in check. */
function isUsable(pieces: PlacedPiece[], turn: Colour): boolean {
    if (pieces.some(p => p.file < 0 || p.file > 7 || p.rank < 0 || p.rank > 7)) return false;
    if (pieces.some(p => /p/i.test(p.piece) && (p.rank === 0 || p.rank === 7))) return false;
    const [wk, bk] = ['K', 'k'].map(k => pieces.find(p => p.piece === k));
    if (!wk || !bk || (Math.abs(wk.file - bk.file) <= 1 && Math.abs(wk.rank - bk.rank) <= 1)) return false;
    try {
        return !new Chess(buildFen(pieces, turn === 'w' ? 'b' : 'w')).isCheck();
    } catch {
        return false;
    }
}

export interface Transform {
    mirror: boolean; // flip left to right
    swap: boolean;   // swap colours (flips the board top to bottom)
    dx: number;      // move every piece this many files
    dy: number;      // and this many ranks
}

/** The position after `transform`, or null if it leaves the board or isn't legal. Swapping colours also swaps the player's colour. */
export function transformPosition(fen: string, playerColor: Colour, t: Transform): { fen: string; playerColor: Colour } | null {
    const turn = fen.split(' ')[1] as Colour;
    const pieces = parseBoard(fen).map(p => {
        let { file, rank, piece } = p;
        if (t.mirror) file = 7 - file;
        if (t.swap) {
            rank = 7 - rank;
            piece = piece === piece.toUpperCase() ? piece.toLowerCase() : piece.toUpperCase();
        }
        return { piece, file: file + t.dx, rank: rank + t.dy };
    });
    const newTurn: Colour = t.swap ? (turn === 'w' ? 'b' : 'w') : turn;
    if (!isUsable(pieces, newTurn)) return null;
    return { fen: buildFen(pieces, newTurn), playerColor: t.swap ? (playerColor === 'w' ? 'b' : 'w') : playerColor };
}

/** A random transform. Shifts change the position, so they're only used when the endgame database can check the result. */
export function randomTransform(fen: string, allowShift: boolean, random = Math.random): Transform {
    const t: Transform = { mirror: random() < 0.5, swap: random() < 0.5, dx: 0, dy: 0 };
    if (!allowShift) return t;
    const pieces = parseBoard(fen);
    const pick = (lo: number, hi: number) => lo + Math.floor(random() * (hi - lo + 1));
    const files = pieces.map(p => p.file);
    const ranks = pieces.map(p => p.rank);
    const pawnRanks = pieces.filter(p => /p/i.test(p.piece)).map(p => p.rank);
    t.dx = pick(-Math.min(...files), 7 - Math.max(...files));
    const lo = Math.max(-Math.min(...ranks), pawnRanks.length ? 1 - Math.min(...pawnRanks) : -7);
    const hi = Math.min(7 - Math.max(...ranks), pawnRanks.length ? 6 - Math.max(...pawnRanks) : 7);
    t.dy = lo <= hi ? pick(lo, hi) : 0;
    return t;
}

/**
 * Has the player solved the position? 'solved' outright, 'confirm' if it is solved only if the endgame
 * database agrees the result still holds, or null to keep playing. Losing the result is caught separately.
 */
export function solveState(game: Chess, endgame: Pick<TrainerEndgame, 'target' | 'mateRequired'>, playerColor: Colour, playerMoves: number): 'solved' | 'confirm' | null {
    if (endgame.target === 'win') {
        if (game.isCheckmate()) return game.turn() !== playerColor ? 'solved' : null;
        if (endgame.mateRequired) return null;
        // A basic won ending: the defender has only a king and the player has a queen or rook.
        const pieces = parseBoard(game.fen());
        const isPlayer = (p: PlacedPiece) => (p.piece === p.piece.toUpperCase()) === (playerColor === 'w');
        const defenderBare = pieces.filter(p => !isPlayer(p)).length === 1;
        const heavyPiece = pieces.some(p => isPlayer(p) && /[qr]/i.test(p.piece));
        return defenderBare && heavyPiece ? 'confirm' : null;
    }
    if (game.isDraw() || game.isStalemate()) return 'solved';
    return playerMoves >= DRAW_HOLD_MOVES ? 'confirm' : null;
}
