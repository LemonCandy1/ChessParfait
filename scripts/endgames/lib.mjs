// Shared helpers for the endgame library scripts.

const ORDER = 'KQRBNP';
const VALUE = { K: 0, Q: 9, R: 5, B: 3, N: 3, P: 1 };

/** The 64 squares of a FEN board, a8 first, '' for empty. */
export function boardArray(fen) {
    const out = [];
    for (const ch of fen.split(' ')[0].replace(/\//g, '')) {
        if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) out.push('');
        else out.push(ch);
    }
    return out;
}

export function boardFen(squares) {
    const rows = [];
    for (let r = 0; r < 8; r++) {
        let row = '', empty = 0;
        for (let f = 0; f < 8; f++) {
            const p = squares[r * 8 + f];
            if (!p) empty++;
            else { if (empty) row += empty; empty = 0; row += p; }
        }
        rows.push(row + (empty || ''));
    }
    return rows.join('/');
}

export const countPieces = fen => boardArray(fen).filter(Boolean).length;

/** Mirror left to right (a-file <-> h-file). Never changes the result without castling rights. */
export function mirrorFen(fen) {
    const sq = boardArray(fen);
    const out = sq.map((_, i) => sq[Math.floor(i / 8) * 8 + (7 - (i % 8))]);
    return [boardFen(out), fen.split(' ')[1], '-', '-', '0', '1'].join(' ');
}

/** Swap the colours: flip the board top to bottom, swap piece colours and the side to move. */
export function swapColoursFen(fen) {
    const sq = boardArray(fen);
    const out = sq.map((_, i) => {
        const p = sq[(7 - Math.floor(i / 8)) * 8 + (i % 8)];
        return p ? (p === p.toUpperCase() ? p.toLowerCase() : p.toUpperCase()) : '';
    });
    return [boardFen(out), fen.split(' ')[1] === 'w' ? 'b' : 'w', '-', '-', '0', '1'].join(' ');
}

/** The same key for a position, its mirror and its colour-swapped copies. */
export function canonicalKey(fen) {
    const base = fen.split(' ').slice(0, 2).join(' ') + ' - - 0 1';
    const swapped = swapColoursFen(base);
    return [base, mirrorFen(base), swapped, mirrorFen(swapped)].map(f => f.split(' ').slice(0, 2).join(' ')).sort()[0];
}

const sidePieces = (fen, white) => boardArray(fen)
    .filter(p => p && (p === p.toUpperCase()) === white)
    .map(p => p.toUpperCase())
    .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
    .join('');

export const materialValue = pieces => [...pieces].reduce((s, p) => s + VALUE[p], 0);

/** Material as "KRPvKR", the side with more material first. */
export function materialSignature(fen) {
    const w = sidePieces(fen, true), b = sidePieces(fen, false);
    return materialValue(w) >= materialValue(b) ? `${w}v${b}` : `${b}v${w}`;
}

/** The pieces of the side to move and of the other side, e.g. { mine: 'KRP', theirs: 'KR' }. */
export function sides(fen) {
    const white = fen.split(' ')[1] === 'w';
    return { mine: sidePieces(fen, white), theirs: sidePieces(fen, !white) };
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));
