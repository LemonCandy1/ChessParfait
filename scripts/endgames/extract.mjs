// Pulls every starting position out of the endgame books in resources/endgames (PGN), merges duplicates
// (mirrored and colour-swapped copies too) and writes resources/endgames/out/extracted.json.
// Only positions are taken from the books: no annotations or wording.
// Usage: node scripts/endgames/extract.mjs
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { Chess } from 'chess.js';
import { canonicalKey, countPieces, materialSignature } from './lib.mjs';

const ROOT = 'resources/endgames';
const OUT = join(ROOT, 'out');

const files = [];
const walk = dir => readdirSync(dir).forEach(name => {
    const path = join(dir, name);
    if (name === 'out') return;
    if (statSync(path).isDirectory()) walk(path);
    else if (name.toLowerCase().endsWith('.pgn')) files.push(path);
});
walk(ROOT);

const header = (text, tag) => text.match(new RegExp(`^\\[${tag} "(.*)"\\]`, 'm'))?.[1]?.trim() ?? '';
const clean = s => s.replace(/[^\x20-\x7EÀ-ſ]/g, '').replace(/\s+/g, ' ').trim();
const known = s => s && !/^[?-]*$/.test(s);

const byKey = new Map();
let games = 0, withFen = 0, invalid = 0;
for (const file of files) {
    const source = relative(ROOT, file).replace(/\\/g, '/').replace(/\.pgn$/i, '');
    // Most exports are UTF-8; older ChessBase ones are Latin-1.
    const bytes = readFileSync(file);
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { text = bytes.toString('latin1'); }
    for (const game of text.split(/^(?=\[Event )/m).filter(g => g.startsWith('[Event '))) {
        games++;
        const fen = header(game, 'FEN');
        if (!fen) continue;
        withFen++;
        let chess;
        try {
            chess = new Chess(fen);
        } catch {
            invalid++;
            continue;
        }
        if (chess.isGameOver()) continue;
        const normalised = chess.fen().split(' ').slice(0, 2).join(' ') + ' - - 0 1';
        // Chapter and title: whichever headers this book uses for them.
        const chapter = clean([header(game, 'SourceTitle'), header(game, 'White')].filter(s => known(s) && !s.startsWith('http')).join(' | '));
        const title = clean([header(game, 'Black'), header(game, 'Site'), header(game, 'Event')].filter(known).join(' | '));
        const ref = { source, chapter, title, result: header(game, 'Result') };
        const key = canonicalKey(normalised);
        const existing = byKey.get(key);
        if (existing) existing.refs.push(ref);
        else byKey.set(key, { key, fen: normalised, pieces: countPieces(normalised), material: materialSignature(normalised), refs: [ref] });
    }
}

mkdirSync(OUT, { recursive: true });
const positions = [...byKey.values()];
writeFileSync(join(OUT, 'extracted.json'), JSON.stringify(positions, null, 1));
console.log({ files: files.length, games, withFen, invalid, unique: positions.length, upTo7: positions.filter(p => p.pieces <= 7).length });
