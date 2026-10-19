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

/** The most a rating can move on the player's next position: 64 for positions 1 to 10, settling to 16 by position 50. */
export function kFactor(played: number): number {
    const position = played + 1;
    if (position <= 10) return 64;
    if (position >= 50) return 16;
    return Math.round(64 - ((position - 10) * 48) / 40);
}

/** Elo change for solving (or failing) an endgame rated `endgame`, for a player rated `player` who has played `played` positions. */
export function ratingChange(player: number, endgame: number, solved: boolean, played: number): number {
    const expected = 1 / (1 + 10 ** ((endgame - player) / 400));
    return Math.round(kFactor(played) * ((solved ? 1 : 0) - expected));
}

/** The most an endgame's own rating moves per attempt. Kept low so one player can't drag an endgame around. */
export const ENDGAME_K = 8;

/** How an endgame's rating moves after a player rated `player` solves (or fails) it: down when solved, up when failed. */
export function endgameRatingChange(endgame: number, player: number, solved: boolean): number {
    const expected = 1 / (1 + 10 ** ((player - endgame) / 400));
    return Math.round(ENDGAME_K * ((solved ? 0 : 1) - expected));
}

/** Milestones (1100, 1200, ...) passed when the best rating rises from `oldBest` to `newBest`. Each pays once. */
export function newMilestones(oldBest: number, newBest: number): number[] {
    const passed: number[] = [];
    for (let m = Math.floor(oldBest / BEST_RATING_STEP) * BEST_RATING_STEP + BEST_RATING_STEP; m <= newBest; m += BEST_RATING_STEP) {
        if (m > STARTING_RATING) passed.push(m);
    }
    return passed;
}

/**
 * The next endgame: one rated within 200 of the player, widening 100 at a time until at least 3
 * qualify, never the endgame they just played.
 */
export function pickEndgame<T extends { id: string; rating: number }>(endgames: T[], rating: number, lastId: string | null, random = Math.random): T {
    const pool = endgames.length > 1 ? endgames.filter(e => e.id !== lastId) : endgames;
    const wanted = Math.min(3, pool.length);
    let candidates: T[] = [];
    for (let range = 200; candidates.length < wanted; range += 100) {
        candidates = pool.filter(e => Math.abs(e.rating - rating) <= range);
    }
    return candidates[Math.floor(random() * candidates.length)];
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
