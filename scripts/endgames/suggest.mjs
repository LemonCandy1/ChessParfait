// Suggests a theme and a starting rating for every position that passed classify.mjs, for review.
// Writes resources/endgames/out/candidates.json.
// Usage: node scripts/endgames/suggest.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { boardArray, sides } from './lib.mjs';

const OUT = 'resources/endgames/out';
const themes = JSON.parse(readFileSync('src/data/trainerThemes.json', 'utf8'));
const themeRating = Object.fromEntries(themes.map(t => [t.id, t.rating]));
const extracted = new Map(JSON.parse(readFileSync(`${OUT}/extracted.json`, 'utf8')).map(p => [p.key, p]));
const classified = JSON.parse(readFileSync(`${OUT}/classified.json`, 'utf8'));

/** Pieces of one colour with their squares: { type: 'P', file: 0-7, rank: 1-8 } (rank from White's side). */
function placed(fen, white) {
    return boardArray(fen).flatMap((p, i) => (p && (p === p.toUpperCase()) === white ? [{ type: p.toUpperCase(), file: i % 8, rank: 8 - Math.floor(i / 8) }] : []));
}

const relRank = (rank, white) => (white ? rank : 9 - rank);
const isRookFile = f => f === 0 || f === 7;
const squareColour = p => ((p.file + p.rank - 1) % 2 === 0 ? 'dark' : 'light');

function passed(pawn, white, enemyPawns) {
    return !enemyPawns.some(e => Math.abs(e.file - pawn.file) <= 1 && (white ? e.rank > pawn.rank : e.rank < pawn.rank));
}

/** Theme named by the book's chapter or title, if it fits the material. */
const KEYWORDS = [
    [/lucena/, 'lucena', 'rook'], [/philidor/, 'philidor', 'rook'], [/vancura/, 'vancura', 'rook'],
    [/short side|long side/, 'short-side', 'rook'], [/behind the (passed )?pawn|rook behind/, 'rook-behind', 'rook'],
    [/shoulder/, 'shouldering', 'pawn'], [/r[eé]ti/, 'reti', 'pawn'], [/triangulat/, 'triangulation', 'pawn'], [/correspond/, 'corresponding-squares', 'pawn'],
    [/breakthrough/, 'breakthrough', 'pawn'], [/inva|penetrat|infiltrat|squares to attack/, 'king-invasion', 'pawn'], [/outside pass/, 'outside-passer', 'pawn'], [/protected pass/, 'protected-passer', 'pawn'],
    [/rule of the square|the square/, 'rule-of-square', 'pawn'], [/distant opposition|opposition/, 'distant-opposition', 'pawn'],
    [/fortress/, 'fortress', 'any'], [/wrong (colou?red )?bishop|wrong rook pawn/, 'wrong-bishop', 'minor']
];

function family(m, t) {
    const all = m + t;
    if (/Q/.test(all)) return 'queen';
    if (!/[RBN]/.test(all)) return 'pawn';
    if (/R/.test(all) && /[BN]/.test(all)) return 'mixed';
    if (/R/.test(all)) return 'rook';
    return 'minor';
}

function suggest(fen, target, text) {
    const white = fen.split(' ')[1] === 'w';
    const { mine, theirs } = sides(fen);
    const m = mine.slice(1), t = theirs.slice(1);
    const fam = family(m, t);
    for (const [re, id, needs] of KEYWORDS) {
        // The Lucena is always a win to convert; a book can mention it in a drawn position.
        if (re.test(text) && (needs === 'any' || needs === fam) && !(id === 'lucena' && target !== 'win')) return id;
    }
    const myPieces = placed(fen, white), theirPieces = placed(fen, !white);
    const myPawns = myPieces.filter(p => p.type === 'P'), theirPawns = theirPieces.filter(p => p.type === 'P');
    const noPawns = s => s.replace(/P/g, '');

    // Basic mates: a bare king against pieces.
    if (t === '' && !m.includes('P')) {
        if (m.includes('Q')) return 'queen-mate';
        if (m === 'RR') return 'two-rooks-mate';
        if (m === 'BB') return 'two-bishops-mate';
        if (m === 'BN') return 'bishop-knight-mate';
        if (m.includes('R')) return 'rook-mate';
    }
    if ((m === 'P' && t === '') || (m === '' && t === 'P')) {
        if (target === 'draw') return 'kp-defence';
        // A defending king beside or behind the pawn has to be shouldered away; one in front is a key squares fight.
        const pawn = myPawns[0], defender = theirPieces.find(p => p.type === 'K');
        const inFront = Math.abs(defender.file - pawn.file) <= 1 && relRank(defender.rank, white) > relRank(pawn.rank, white);
        return inFront ? 'key-squares' : 'shouldering';
    }

    if (fam === 'pawn') {
        if (target === 'draw') return m.length === 0 || t.length === 0 ? 'kp-defence' : 'distant-opposition';
        const myPassers = myPawns.filter(p => passed(p, white, theirPawns));
        const theirPassers = theirPawns.filter(p => passed(p, !white, myPawns));
        if (myPassers.length && theirPassers.length) return 'pawn-races';
        if (myPassers.some(p => myPawns.some(q => Math.abs(q.file - p.file) === 1 && relRank(q.rank, white) === relRank(p.rank, white) - 1))) return 'protected-passer';
        if (myPassers.length) return 'outside-passer';
        // Blocked pawns and no passed pawn: the king walks in (a breakthrough is only taken from the book's own words).
        return 'king-invasion';
    }

    if (fam === 'rook') {
        if (m === 'RP' && t === 'R') return target === 'win' && relRank(myPawns[0].rank, white) === 7 && !isRookFile(myPawns[0].file) ? 'lucena' : 'cut-off';
        if (m === 'R' && t === 'RP') {
            const pawn = theirPawns[0];
            const myKing = myPieces.find(p => p.type === 'K');
            if (isRookFile(pawn.file) && relRank(pawn.rank, !white) === 6) return 'vancura';
            if (myKing.file === pawn.file && relRank(myKing.rank, !white) > relRank(pawn.rank, !white)) return 'philidor';
            return 'short-side';
        }
        if ((m === 'RPP' && t === 'R') || (m === 'R' && t === 'RPP')) return 'rook-two-pawns';
        if (noPawns(m) === 'R' && noPawns(t) === '' || noPawns(t) === 'R' && noPawns(m) === '') {
            const pawns = (noPawns(m) === 'R' ? t : m).length;
            return pawns === 1 ? 'rook-vs-pawn' : pawns === 2 ? 'rook-vs-two-pawns' : 'piece-vs-pawns';
        }
        return 'rook-practical';
    }

    if (fam === 'minor') {
        const myBishops = myPieces.filter(p => p.type === 'B'), theirBishops = theirPieces.filter(p => p.type === 'B');
        // Bishop and rook pawn(s) on one file against a bare king, where the bishop can't cover the corner.
        const wrongBishop = (bishops, pawns, pawnsWhite) => bishops.length === 1 && pawns.length > 0 && pawns.every(p => p.file === pawns[0].file && isRookFile(p.file)) &&
            squareColour({ file: pawns[0].file, rank: pawnsWhite ? 8 : 1 }) !== squareColour(bishops[0]);
        if ((noPawns(t) === '' && t.length === 0 && wrongBishop(myBishops, myPawns, white)) || (noPawns(m) === '' && m.length === 0 && wrongBishop(theirBishops, theirPawns, !white))) return 'wrong-bishop';
        if (noPawns(m) === 'B' && noPawns(t) === 'B') return squareColour(myBishops[0]) === squareColour(theirBishops[0]) ? 'same-colour-bishops' : 'opposite-bishops';
        if ((noPawns(m) === 'N' && noPawns(t) === '') || (noPawns(t) === 'N' && noPawns(m) === '')) return (noPawns(m) === 'N' ? t : m).length <= 2 ? 'knight-vs-pawn' : 'piece-vs-pawns';
        if ((noPawns(m) === 'B' && noPawns(t) === 'N') || (noPawns(m) === 'N' && noPawns(t) === 'B')) return 'bishop-vs-knight';
        if (noPawns(m) === '' || noPawns(t) === '') return 'piece-vs-pawns';
        return 'minor-practical';
    }

    if (fam === 'queen') {
        if ((m === 'Q' && t === 'P') || (m === 'P' && t === 'Q')) {
            const pawn = (m === 'P' ? myPawns : theirPawns)[0];
            return target === 'draw' || [0, 2, 5, 7].includes(pawn.file) && m === 'P' ? 'queen-vs-pawn-draw' : 'queen-vs-pawn';
        }
        if ((m === 'Q' && t === 'R') || (m === 'R' && t === 'Q') || (noPawns(m) === 'Q' && noPawns(t) === 'R') || (noPawns(m) === 'R' && noPawns(t) === 'Q')) return 'queen-vs-rook';
        if ((m === 'QP' && t === 'Q') || (m === 'Q' && t === 'QP')) return 'queen-pawn-vs-queen';
        return 'queen-practical';
    }

    if (fam === 'mixed') {
        if ((noPawns(m) === 'R' && /^[BN]$/.test(noPawns(t))) || (noPawns(t) === 'R' && /^[BN]$/.test(noPawns(m)))) return 'rook-vs-minor';
    }
    return 'other-material';
}

/** Starting rating: the theme's rating, adjusted by how hard the position measures. */
function startRating(theme, v) {
    let adj = 0;
    if (v.legalMoves) {
        const share = v.target === 'win' ? v.winningMoves / v.legalMoves : v.drawingMoves / v.legalMoves;
        adj += Math.round((0.5 - share) * (v.target === 'win' ? 200 : 300));
    }
    if (v.dtm) adj += Math.max(-100, Math.min(100, (Math.ceil(Math.abs(v.dtm) / 2) - 15) * 5));
    return Math.round((themeRating[theme] + Math.max(-300, Math.min(300, adj))) / 10) * 10;
}

const candidates = classified.filter(v => v.verdict === 'keep').map(v => {
    const p = extracted.get(v.key);
    const text = p.refs.map(r => `${r.chapter} ${r.title}`).join(' ').toLowerCase();
    const theme = suggest(p.fen, v.target, text);
    return {
        // base: the theme rating the start rating was worked out from, so a theme rating edit can shift it later.
        key: p.key, fen: p.fen, target: v.target, theme, rating: startRating(theme, v), base: themeRating[theme], pieces: p.pieces, material: p.material,
        checkedBy: p.pieces <= 7 ? 'tablebase' : 'stockfish', ...(v.cp !== undefined ? { cp: v.cp } : {}), ...(v.dtm ? { mateIn: Math.ceil(Math.abs(v.dtm) / 2) } : {}),
        refs: p.refs.map(r => ({ source: r.source, chapter: r.chapter, title: r.title }))
    };
});
writeFileSync(`${OUT}/candidates.json`, JSON.stringify(candidates, null, 1));
const perTheme = Object.fromEntries(themes.map(t => [t.id, candidates.filter(c => c.theme === t.id).length]));
console.log({ candidates: candidates.length }, perTheme);
