// Checks every extracted position and decides whether it is a real training task for the side to move:
//  - up to 7 pieces: the Lichess endgame database. A win to convert, or a draw that some move would lose.
//  - 8 to 12 pieces: Stockfish. A clear win (+3 or more), or a level position for the side with less material.
// Results are cached in resources/endgames/out, so it can be stopped and run again.
// Usage: node scripts/endgames/classify.mjs <path to stockfish.exe>
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { materialValue, sides, sleep } from './lib.mjs';

const OUT = 'resources/endgames/out';
const MAX_PIECES = 12;
const stockfishPath = process.argv[2];

const load = (name, fallback) => (existsSync(join(OUT, name)) ? JSON.parse(readFileSync(join(OUT, name), 'utf8')) : fallback);
const save = (name, data) => writeFileSync(join(OUT, name), JSON.stringify(data));

const extracted = load('extracted.json', null);
if (!extracted) throw new Error('Run extract.mjs first.');
const tbCache = load('cache-tablebase.json', {});
const sfCache = load('cache-stockfish.json', {});

async function tablebase(fen) {
    if (tbCache[fen]) return tbCache[fen];
    for (let attempt = 0; attempt < 6; attempt++) {
        const res = await fetch(`https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen)}`);
        if (res.status === 429) { await sleep(61000); continue; }
        if (!res.ok) { await sleep(2000); continue; }
        const data = await res.json();
        // Keep only what the library needs.
        tbCache[fen] = {
            category: data.category,
            dtm: data.dtm ?? null,
            dtz: data.dtz ?? null,
            moves: data.moves.map(m => ({ uci: m.uci, category: m.category, dtm: m.dtm ?? null }))
        };
        await sleep(150);
        return tbCache[fen];
    }
    return null;
}

// One Stockfish process, asked one position at a time.
let engine, pending = null, buffer = '';
function startEngine() {
    engine = spawn(stockfishPath);
    engine.stdout.on('data', chunk => {
        buffer += chunk;
        let i;
        while ((i = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, i).trim();
            buffer = buffer.slice(i + 1);
            pending?.(line);
        }
    });
    engine.stdin.write('uci\nsetoption name Threads value 4\nsetoption name Hash value 256\n');
}
function evaluate(fen) {
    if (sfCache[fen]) return Promise.resolve(sfCache[fen]);
    return new Promise(resolve => {
        let score = null;
        pending = line => {
            const m = line.match(/ score (cp|mate) (-?\d+)/);
            if (m && line.includes(' pv ')) score = m[1] === 'mate' ? (Number(m[2]) > 0 ? 10000 : -10000) : Number(m[2]);
            if (line.startsWith('bestmove')) {
                pending = null;
                sfCache[fen] = { cp: score, best: line.split(' ')[1] };
                resolve(sfCache[fen]);
            }
        };
        engine.stdin.write(`ucinewgame\nposition fen ${fen}\ngo movetime 1200\n`);
    });
}

const verdicts = [];
let n = 0;
for (const p of extracted) {
    n++;
    const { mine, theirs } = sides(p.fen);
    const v = { key: p.key, verdict: 'reject', reason: '', target: null };
    if (p.pieces <= 7) {
        const tb = await tablebase(p.fen);
        if (!tb) v.reason = 'endgame database unreachable';
        else if (tb.category === 'win') {
            Object.assign(v, { verdict: 'keep', target: 'win', dtm: tb.dtm, winningMoves: tb.moves.filter(m => m.category === 'loss').length, legalMoves: tb.moves.length });
        } else if (tb.category === 'draw') {
            const losing = tb.moves.filter(m => m.category === 'win').length;
            if (losing === 0) v.reason = 'a draw no move can spoil';
            else Object.assign(v, { verdict: 'keep', target: 'draw', drawingMoves: tb.moves.filter(m => ['draw', 'cursed-win', 'blessed-loss'].includes(m.category)).length, legalMoves: tb.moves.length });
        } else v.reason = tb.category === 'loss' ? 'the side to move loses' : `${tb.category} (decided by the 50-move rule)`;
    } else if (p.pieces > MAX_PIECES) {
        v.reason = `${p.pieces} pieces: more than ${MAX_PIECES}`;
    } else if (!stockfishPath) {
        v.reason = 'no engine given';
    } else {
        if (!engine) startEngine();
        const { cp, best } = await evaluate(p.fen);
        v.cp = cp;
        v.best = best;
        if (cp === null) v.reason = 'no evaluation';
        else if (cp >= 300) Object.assign(v, { verdict: 'keep', target: 'win' });
        else if (Math.abs(cp) <= 30 && materialValue(mine) <= materialValue(theirs)) Object.assign(v, { verdict: 'keep', target: 'draw' });
        else v.reason = cp <= -300 ? 'the side to move loses' : `unclear (${(cp / 100).toFixed(2)})`;
    }
    verdicts.push(v);
    if (n % 50 === 0) {
        save('cache-tablebase.json', tbCache);
        save('cache-stockfish.json', sfCache);
        console.log(`${n}/${extracted.length}`);
    }
}
save('cache-tablebase.json', tbCache);
save('cache-stockfish.json', sfCache);
save('classified.json', verdicts);
engine?.stdin.end('quit\n');
const kept = verdicts.filter(v => v.verdict === 'keep');
console.log({ total: verdicts.length, kept: kept.length, wins: kept.filter(v => v.target === 'win').length, draws: kept.filter(v => v.target === 'draw').length });
const reasons = {};
verdicts.filter(v => v.verdict === 'reject').forEach(v => { const r = v.reason.replace(/\(.*\)|\d+ pieces/g, '').trim(); reasons[r] = (reasons[r] ?? 0) + 1; });
console.log(reasons);
