/**
 * Imposter Chess rules engine.
 *
 * Variant rules:
 *  - Each side secretly turns one of its pawns into an "imposter". It looks like a pawn
 *    but moves and captures like a queen for the rest of the game (it never promotes).
 *  - There is no check, checkmate or stalemate. A king may move into attack.
 *    The first player to capture the enemy king wins.
 *  - A player with no pseudo-legal move loses. Draws: fifty-move rule, threefold
 *    repetition, or bare kings.
 *
 * chess.js cannot capture kings, so this module has its own pseudo-legal generator.
 * Squares are indexed rank * 8 + file, so a1 = 0 and h8 = 63.
 */

export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

export interface Piece {
    t: PieceType;
    c: Color;
    /** Only ever set on a pawn: it moves as a queen. */
    imp?: boolean;
}

export interface Castling {
    wK: boolean;
    wQ: boolean;
    bK: boolean;
    bQ: boolean;
}

export interface GameState {
    board: (Piece | null)[];
    turn: Color;
    castling: Castling;
    /** En passant target square index, or -1. */
    ep: number;
    halfmove: number;
    fullmove: number;
    /** An imposter is revealed to both sides once it captures or is captured. */
    revealed: { w: boolean; b: boolean };
}

export interface Move {
    from: number;
    to: number;
    promotion?: PromotionPiece;
    captured?: Piece;
    ep?: boolean;
    castle?: 'K' | 'Q';
}

export type GameResult =
    | { over: false }
    | { over: true; winner: Color; reason: 'king-captured' | 'no-moves' | 'resignation' }
    | { over: true; winner: 'draw'; reason: 'fifty-move' | 'repetition' | 'bare-kings' };

const FILES = 'abcdefgh';

export const opposite = (c: Color): Color => (c === 'w' ? 'b' : 'w');

export function sqName(i: number): string {
    return FILES[i & 7] + String((i >> 3) + 1);
}

export function parseSq(name: string): number {
    const f = FILES.indexOf(name[0]);
    const r = parseInt(name[1], 10) - 1;
    if (f < 0 || r < 0 || r > 7 || name.length !== 2) return -1;
    return r * 8 + f;
}

const BACK_RANK: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];

export function createInitialState(imposters: { w?: number; b?: number } = {}): GameState {
    const board: (Piece | null)[] = new Array(64).fill(null);
    for (let f = 0; f < 8; f++) {
        board[f] = { t: BACK_RANK[f], c: 'w' };
        board[8 + f] = { t: 'p', c: 'w' };
        board[48 + f] = { t: 'p', c: 'b' };
        board[56 + f] = { t: BACK_RANK[f], c: 'b' };
    }
    for (const color of ['w', 'b'] as Color[]) {
        const sq = imposters[color];
        if (sq === undefined) continue;
        const piece = board[sq];
        if (!piece || piece.t !== 'p' || piece.c !== color) {
            throw new Error(`Imposter for ${color} must be one of that side's pawns`);
        }
        board[sq] = { t: 'p', c: color, imp: true };
    }
    return {
        board,
        turn: 'w',
        castling: { wK: true, wQ: true, bK: true, bQ: true },
        ep: -1,
        halfmove: 0,
        fullmove: 1,
        revealed: { w: false, b: false }
    };
}

/**
 * Build a state from a FEN-like string. Only used for tests and analysis.
 * `imposters` maps a colour to the square name of the pawn that is the imposter.
 */
export function stateFromFen(fen: string, imposters: { w?: string; b?: string } = {}): GameState {
    const [placement, turn = 'w', castlingStr = '-', epStr = '-', half = '0', full = '1'] = fen.split(' ');
    const board: (Piece | null)[] = new Array(64).fill(null);
    const rows = placement.split('/');
    for (let row = 0; row < 8; row++) {
        const rank = 7 - row;
        let file = 0;
        for (const ch of rows[row]) {
            if (/\d/.test(ch)) {
                file += parseInt(ch, 10);
            } else {
                const c: Color = ch === ch.toUpperCase() ? 'w' : 'b';
                board[rank * 8 + file] = { t: ch.toLowerCase() as PieceType, c };
                file++;
            }
        }
    }
    for (const color of ['w', 'b'] as Color[]) {
        const name = imposters[color];
        if (!name) continue;
        const sq = parseSq(name);
        const piece = sq >= 0 ? board[sq] : null;
        if (!piece || piece.t !== 'p' || piece.c !== color) {
            throw new Error(`Imposter square ${name} is not a ${color} pawn`);
        }
        board[sq] = { t: 'p', c: color, imp: true };
    }
    return {
        board,
        turn: turn === 'b' ? 'b' : 'w',
        castling: {
            wK: castlingStr.includes('K'),
            wQ: castlingStr.includes('Q'),
            bK: castlingStr.includes('k'),
            bQ: castlingStr.includes('q')
        },
        ep: epStr === '-' ? -1 : parseSq(epStr),
        halfmove: parseInt(half, 10) || 0,
        fullmove: parseInt(full, 10) || 1,
        revealed: { w: false, b: false }
    };
}

const ROOK_DIRS: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_DIRS: ReadonlyArray<readonly [number, number]> = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const QUEEN_DIRS: ReadonlyArray<readonly [number, number]> = [...ROOK_DIRS, ...BISHOP_DIRS];
const KNIGHT_JUMPS: ReadonlyArray<readonly [number, number]> = [
    [1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]
];
const PROMOTIONS: PromotionPiece[] = ['q', 'r', 'b', 'n'];

/** True when the piece moves like a queen: a real queen or an imposter pawn. */
export const movesLikeQueen = (p: Piece): boolean => p.t === 'q' || (p.t === 'p' && !!p.imp);

function pushSlides(
    board: (Piece | null)[],
    from: number,
    piece: Piece,
    dirs: ReadonlyArray<readonly [number, number]>,
    out: Move[]
): void {
    const f0 = from & 7;
    const r0 = from >> 3;
    for (const [df, dr] of dirs) {
        let f = f0 + df;
        let r = r0 + dr;
        while (f >= 0 && f < 8 && r >= 0 && r < 8) {
            const to = r * 8 + f;
            const target = board[to];
            if (!target) {
                out.push({ from, to });
            } else {
                if (target.c !== piece.c) out.push({ from, to, captured: target });
                break;
            }
            f += df;
            r += dr;
        }
    }
}

function pushPawnMoves(s: GameState, from: number, piece: Piece, out: Move[]): void {
    const { board } = s;
    const dir = piece.c === 'w' ? 1 : -1;
    const startRank = piece.c === 'w' ? 1 : 6;
    const promoRank = piece.c === 'w' ? 7 : 0;
    const f0 = from & 7;
    const r0 = from >> 3;

    const add = (to: number, extra: Partial<Move> = {}) => {
        if (to >> 3 === promoRank) {
            for (const promotion of PROMOTIONS) out.push({ from, to, promotion, ...extra });
        } else {
            out.push({ from, to, ...extra });
        }
    };

    const r1 = r0 + dir;
    if (r1 < 0 || r1 > 7) return;
    const one = r1 * 8 + f0;
    if (!board[one]) {
        add(one);
        const r2 = r0 + 2 * dir;
        if (r0 === startRank && !board[r2 * 8 + f0]) out.push({ from, to: r2 * 8 + f0 });
    }
    for (const df of [-1, 1]) {
        const f = f0 + df;
        if (f < 0 || f > 7) continue;
        const to = r1 * 8 + f;
        const target = board[to];
        if (target) {
            if (target.c !== piece.c) add(to, { captured: target });
        } else if (s.ep === to) {
            const victimSq = r0 * 8 + f;
            const victim = board[victimSq];
            if (victim && victim.t === 'p' && !victim.imp && victim.c !== piece.c) {
                out.push({ from, to, ep: true, captured: victim });
            }
        }
    }
}

function pushKingMoves(s: GameState, from: number, piece: Piece, out: Move[]): void {
    const { board } = s;
    const f0 = from & 7;
    const r0 = from >> 3;
    for (const [df, dr] of QUEEN_DIRS) {
        const f = f0 + df;
        const r = r0 + dr;
        if (f < 0 || f > 7 || r < 0 || r > 7) continue;
        const to = r * 8 + f;
        const target = board[to];
        if (!target) out.push({ from, to });
        else if (target.c !== piece.c) out.push({ from, to, captured: target });
    }
    // Castling: rights and empty squares only. Attacked squares are irrelevant in this variant.
    const home = piece.c === 'w' ? 4 : 60;
    if (from !== home) return;
    const base = piece.c === 'w' ? 0 : 56;
    const canK = piece.c === 'w' ? s.castling.wK : s.castling.bK;
    const canQ = piece.c === 'w' ? s.castling.wQ : s.castling.bQ;
    const isRook = (sq: number) => {
        const p = board[sq];
        return !!p && p.t === 'r' && p.c === piece.c;
    };
    if (canK && isRook(base + 7) && !board[base + 5] && !board[base + 6]) {
        out.push({ from, to: base + 6, castle: 'K' });
    }
    if (canQ && isRook(base) && !board[base + 1] && !board[base + 2] && !board[base + 3]) {
        out.push({ from, to: base + 2, castle: 'Q' });
    }
}

/** All pseudo-legal moves for the side to move. Nothing is filtered for king safety. */
export function generateMoves(s: GameState): Move[] {
    const out: Move[] = [];
    const { board, turn } = s;
    for (let i = 0; i < 64; i++) {
        const p = board[i];
        if (!p || p.c !== turn) continue;
        switch (p.t) {
            case 'p':
                if (p.imp) pushSlides(board, i, p, QUEEN_DIRS, out);
                else pushPawnMoves(s, i, p, out);
                break;
            case 'n': {
                const f0 = i & 7;
                const r0 = i >> 3;
                for (const [df, dr] of KNIGHT_JUMPS) {
                    const f = f0 + df;
                    const r = r0 + dr;
                    if (f < 0 || f > 7 || r < 0 || r > 7) continue;
                    const to = r * 8 + f;
                    const target = board[to];
                    if (!target) out.push({ from: i, to });
                    else if (target.c !== p.c) out.push({ from: i, to, captured: target });
                }
                break;
            }
            case 'b':
                pushSlides(board, i, p, BISHOP_DIRS, out);
                break;
            case 'r':
                pushSlides(board, i, p, ROOK_DIRS, out);
                break;
            case 'q':
                pushSlides(board, i, p, QUEEN_DIRS, out);
                break;
            case 'k':
                pushKingMoves(s, i, p, out);
                break;
        }
    }
    return out;
}

/** Apply a move produced by generateMoves and return the new state. The input is not mutated. */
export function applyMove(s: GameState, m: Move): GameState {
    const board = s.board.slice();
    const piece = board[m.from];
    if (!piece) throw new Error('No piece on the from square');

    let captured: Piece | null = board[m.to];
    board[m.from] = null;
    if (m.ep) {
        const victimSq = (m.from >> 3) * 8 + (m.to & 7);
        captured = board[victimSq];
        board[victimSq] = null;
    }
    board[m.to] = m.promotion ? { t: m.promotion, c: piece.c } : piece;

    if (m.castle) {
        const base = piece.c === 'w' ? 0 : 56;
        if (m.castle === 'K') {
            board[base + 5] = board[base + 7];
            board[base + 7] = null;
        } else {
            board[base + 3] = board[base];
            board[base] = null;
        }
    }

    const castling = { ...s.castling };
    if (piece.t === 'k') {
        if (piece.c === 'w') {
            castling.wK = false;
            castling.wQ = false;
        } else {
            castling.bK = false;
            castling.bQ = false;
        }
    }
    for (const sq of [m.from, m.to]) {
        if (sq === 0) castling.wQ = false;
        else if (sq === 7) castling.wK = false;
        else if (sq === 56) castling.bQ = false;
        else if (sq === 63) castling.bK = false;
    }

    const revealed = { ...s.revealed };
    if (piece.imp && captured) revealed[piece.c] = true;
    if (captured && captured.imp) revealed[captured.c] = true;

    const isDouble = piece.t === 'p' && !piece.imp && Math.abs(m.to - m.from) === 16;
    const resetsClock = (piece.t === 'p' && !piece.imp) || !!captured;

    return {
        board,
        turn: opposite(s.turn),
        castling,
        ep: isDouble ? (m.from + m.to) >> 1 : -1,
        halfmove: resetsClock ? 0 : s.halfmove + 1,
        fullmove: s.turn === 'b' ? s.fullmove + 1 : s.fullmove,
        revealed
    };
}

export function findKing(s: GameState, color: Color): number {
    for (let i = 0; i < 64; i++) {
        const p = s.board[i];
        if (p && p.t === 'k' && p.c === color) return i;
    }
    return -1;
}

/** True when `color`'s king could be captured on the opponent's next move. */
export function isKingAttacked(s: GameState, color: Color): boolean {
    const king = findKing(s, color);
    if (king < 0) return false;
    const moves = generateMoves({ ...s, turn: opposite(color), ep: -1 });
    return moves.some((m) => m.to === king);
}

/** Stable key for repetition detection. Includes imposter flags because they change the position. */
export function positionKey(s: GameState): string {
    let key = '';
    for (let i = 0; i < 64; i++) {
        const p = s.board[i];
        key += p ? (p.c === 'w' ? p.t.toUpperCase() : p.t) + (p.imp ? '*' : '') : '.';
    }
    const c = s.castling;
    return `${key} ${s.turn} ${c.wK ? 'K' : ''}${c.wQ ? 'Q' : ''}${c.bK ? 'k' : ''}${c.bQ ? 'q' : ''} ${s.ep}`;
}

/**
 * Result of the position. `repetitionCount` is how many times the current position has occurred.
 */
export function getResult(s: GameState, repetitionCount = 1): GameResult {
    const whiteKing = findKing(s, 'w') >= 0;
    const blackKing = findKing(s, 'b') >= 0;
    if (!whiteKing) return { over: true, winner: 'b', reason: 'king-captured' };
    if (!blackKing) return { over: true, winner: 'w', reason: 'king-captured' };

    let pieces = 0;
    for (const p of s.board) if (p) pieces++;
    if (pieces === 2) return { over: true, winner: 'draw', reason: 'bare-kings' };
    if (s.halfmove >= 100) return { over: true, winner: 'draw', reason: 'fifty-move' };
    if (repetitionCount >= 3) return { over: true, winner: 'draw', reason: 'repetition' };
    if (generateMoves(s).length === 0) {
        return { over: true, winner: opposite(s.turn), reason: 'no-moves' };
    }
    return { over: false };
}

export function findMove(
    moves: Move[],
    from: number,
    to: number,
    promotion?: PromotionPiece
): Move | undefined {
    return moves.find((m) => m.from === from && m.to === to && (m.promotion ?? undefined) === (promotion ?? undefined));
}

/** True when moving from -> to is a non-imposter pawn reaching the last rank (needs a promotion choice). */
export function needsPromotion(moves: Move[], from: number, to: number): boolean {
    return moves.some((m) => m.from === from && m.to === to && !!m.promotion);
}

/**
 * Notation that never gives the imposter away: an imposter is written like a pawn move.
 */
export function moveNotation(before: GameState, m: Move): string {
    if (m.castle) return m.castle === 'K' ? 'O-O' : 'O-O-O';
    const piece = before.board[m.from]!;
    const letter = piece.t === 'p' ? '' : piece.t.toUpperCase();
    const sep = m.captured ? 'x' : '-';
    const promo = m.promotion ? `=${m.promotion.toUpperCase()}` : '';
    return `${letter}${sqName(m.from)}${sep}${sqName(m.to)}${promo}`;
}

/**
 * Copy of the state as seen by `viewer`: the opponent's imposter flag is removed until it is revealed.
 * Used for the bot's search and for the king-attacked hint so neither leaks hidden information.
 */
export function hideOpponentImposter(s: GameState, viewer: Color): GameState {
    const opp = opposite(viewer);
    if (s.revealed[opp]) return s;
    const board = s.board.map((p) => (p && p.c === opp && p.imp ? { t: p.t, c: p.c } : p));
    return { ...s, board };
}

/** Squares of the pawns that could still be the hidden imposter of `color` from the viewer's perspective. */
export function pawnSquares(s: GameState, color: Color): number[] {
    const out: number[] = [];
    for (let i = 0; i < 64; i++) {
        const p = s.board[i];
        if (p && p.t === 'p' && p.c === color) out.push(i);
    }
    return out;
}

export function imposterSquare(s: GameState, color: Color): number {
    for (let i = 0; i < 64; i++) {
        const p = s.board[i];
        if (p && p.imp && p.c === color) return i;
    }
    return -1;
}
