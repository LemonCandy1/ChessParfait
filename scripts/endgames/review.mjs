// Local review page for the endgame library: every candidate position as a diagram, grouped by theme, with
// keep/reject, theme changes and editable theme explanations and ratings. Decisions save to
// resources/endgames/out/review.json as you click.
// Usage: node scripts/endgames/review.mjs, then open http://localhost:5180
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = 'resources/endgames/out';
const REVIEW = `${OUT}/review.json`;
const PORT = 5180;

const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const loadReview = () => (existsSync(REVIEW) ? readJson(REVIEW) : { positions: {}, themes: {}, checkedThemes: [] });

const page = String.raw`<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Endgame library review</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/chessground@9.2.1/assets/chessground.base.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/chessground@9.2.1/assets/chessground.brown.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/chessground@9.2.1/assets/chessground.cburnett.css">
<style>
  :root { --plum: #3b1f3a; --cream: #faf1db; --berry: #b5245c; --ok: #047857; --bad: #be123c; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.45 system-ui, sans-serif; color: var(--plum); background: var(--cream); display: grid; grid-template-columns: 290px 1fr; height: 100vh; }
  nav { overflow-y: auto; background: var(--plum); color: var(--cream); padding: 16px 12px; }
  nav h1 { font-size: 17px; margin: 0 4px 4px; }
  nav p { margin: 0 4px 14px; font-size: 13px; opacity: .8; }
  nav h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; opacity: .7; margin: 14px 4px 4px; }
  nav button { display: flex; width: 100%; justify-content: space-between; gap: 8px; background: none; border: 0; color: inherit; font: inherit; text-align: left; padding: 5px 8px; border-radius: 6px; cursor: pointer; }
  nav button:hover, nav button.on { background: rgba(255,255,255,.12); }
  nav button .n { opacity: .75; font-variant-numeric: tabular-nums; }
  nav button.done::before { content: '✓ '; color: #6ee7b7; }
  main { overflow-y: auto; padding: 22px 26px 60px; }
  .theme { background: #fff; border-radius: 12px; padding: 16px 18px; margin-bottom: 18px; border: 1px solid rgba(59,31,58,.12); }
  .theme h2 { margin: 0 0 8px; font-size: 24px; }
  .theme textarea { width: 100%; min-height: 96px; font: inherit; padding: 8px; border-radius: 8px; border: 1px solid rgba(59,31,58,.25); }
  .row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-top: 8px; }
  input[type=number] { width: 90px; font: inherit; padding: 4px 6px; }
  .btn { font: inherit; padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(59,31,58,.3); background: #fff; cursor: pointer; }
  .btn.primary { background: var(--berry); color: #fff; border-color: var(--berry); }
  .saved { color: var(--ok); font-size: 13px; }
  .filters { margin: 0 0 14px; display: flex; gap: 14px; align-items: center; font-size: 14px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; }
  .card { background: #fff; border-radius: 10px; padding: 10px; border: 2px solid transparent; }
  .card.rejected { opacity: .5; border-color: var(--bad); }
  .board { position: relative; width: 100%; aspect-ratio: 1; }
  .board .cg-wrap { position: absolute; inset: 0; width: 100%; height: 100%; }
  /* Coordinates inside the edge squares, as on lichess.org (chessground's defaults sit outside a bare board). */
  .board coords.files { left: 0; bottom: 0; width: 100%; text-align: right; }
  .board coords.files coord { padding-right: 3px; }
  .board coords.ranks { left: 2px; top: 0; height: 100%; }
  .board coords.ranks coord { transform: none; padding-top: 1px; }
  .goal { font-weight: 700; margin: 8px 0 2px; }
  .meta { font-size: 12.5px; opacity: .8; }
  .refs { font-size: 12px; margin: 4px 0 6px; max-height: 64px; overflow-y: auto; opacity: .85; }
  .card select { width: 100%; font: inherit; font-size: 13px; padding: 3px; margin: 4px 0; }
  .actions { display: flex; gap: 6px; align-items: center; }
  .actions a { font-size: 12.5px; margin-left: auto; color: var(--berry); }
  .keep.on { background: var(--ok); color: #fff; border-color: var(--ok); }
  .reject.on { background: var(--bad); color: #fff; border-color: var(--bad); }
  .more { margin-top: 16px; }
</style>
</head>
<body>
<nav id="nav"></nav>
<main id="main"><p>Loading…</p></main>
<script type="module">
import { Chessground } from 'https://cdn.jsdelivr.net/npm/chessground@9.2.1/+esm';
let data, review, current = null, showRejected = true, limit = 60;

async function save(body) {
  await fetch('/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

// Lichess's own board (chessground), seen from the side to move. Filled in after each render.
const boardHtml = fen => '<div class="board" data-fen="' + fen + '"><div></div></div>';
function drawBoards() {
  document.querySelectorAll('.board[data-fen]').forEach(el => {
    const fen = el.dataset.fen;
    Chessground(el.firstElementChild, { fen, orientation: fen.split(' ')[1] === 'b' ? 'black' : 'white', viewOnly: true, coordinates: true, animation: { enabled: false } });
  });
}

const decision = c => review.positions[c.key] || {};
const themeOf = c => decision(c).theme || c.theme;
const kept = c => decision(c).keep !== false;
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);

function renderNav() {
  const groups = [...new Set(data.themes.map(t => t.group))];
  const nav = document.getElementById('nav');
  const total = data.candidates.length, rejected = data.candidates.filter(c => !kept(c)).length;
  nav.innerHTML = '<h1>Endgame library</h1><p>' + total + ' positions · ' + rejected + ' rejected · ' + review.checkedThemes.length + '/' + data.themes.length + ' themes checked</p>' +
    groups.map(g => '<h2>' + esc(g) + '</h2>' + data.themes.filter(t => t.group === g).map(t => {
      const n = data.candidates.filter(c => themeOf(c) === t.id && kept(c)).length;
      return '<button data-id="' + t.id + '" class="' + (t.id === current ? 'on ' : '') + (review.checkedThemes.includes(t.id) ? 'done' : '') + '"><span>' + esc(t.name) + '</span><span class="n">' + n + '</span></button>';
    }).join('')).join('');
  nav.querySelectorAll('button').forEach(b => b.onclick = () => { current = b.dataset.id; limit = 60; render(); document.getElementById('main').scrollTop = 0; });
}

function render() {
  renderNav();
  const main = document.getElementById('main');
  const theme = data.themes.find(t => t.id === current);
  if (!theme) { main.innerHTML = '<p>Pick a theme on the left.</p>'; return; }
  const edits = review.themes[theme.id] || {};
  const list = data.candidates.filter(c => themeOf(c) === theme.id && (showRejected || kept(c))).sort((a, b) => (decision(a).rating || a.rating) - (decision(b).rating || b.rating));
  const options = data.themes.map(t => '<option value="' + t.id + '">' + esc(t.group + ': ' + t.name) + '</option>').join('');
  main.innerHTML =
    '<section class="theme"><h2>' + esc(theme.name) + '</h2>' +
    '<label for="expl">Explanation shown to members after a position</label>' +
    '<textarea id="expl">' + esc(edits.explanation ?? theme.explanation) + '</textarea>' +
    '<div class="row"><label>Starting rating <input id="trating" type="number" step="50" value="' + (edits.rating ?? theme.rating) + '"></label>' +
    '<button class="btn" id="tsave">Save explanation and rating</button><span id="tmsg" class="saved"></span>' +
    '<button class="btn primary" id="tdone" style="margin-left:auto">' + (review.checkedThemes.includes(theme.id) ? 'Checked ✓ (undo)' : 'Mark theme as checked') + '</button></div></section>' +
    '<div class="filters"><span>' + list.filter(kept).length + ' kept, ' + list.filter(c => !kept(c)).length + ' rejected, easiest first</span>' +
    '<label><input type="checkbox" id="showrej" ' + (showRejected ? 'checked' : '') + '> Show rejected</label></div>' +
    '<div class="grid">' + list.slice(0, limit).map(c => {
      const side = c.fen.split(' ')[1] === 'w' ? 'White' : 'Black';
      const check = c.checkedBy === 'tablebase' ? 'Endgame database' + (c.mateIn ? ', mate in ' + c.mateIn : '') : 'Stockfish ' + (c.cp >= 0 ? '+' : '') + (c.cp / 100).toFixed(1);
      const refs = c.refs.map(r => esc(r.source.replace(/^.*\//, '')) + (r.chapter ? ': ' + esc(r.chapter) : '') + (r.title ? ' · ' + esc(r.title) : '')).join('<br>');
      return '<div class="card ' + (kept(c) ? '' : 'rejected') + '" data-key="' + esc(c.key) + '">' + boardHtml(c.fen) +
        '<div class="goal">' + side + ' to play and ' + c.target + '</div>' +
        '<div class="meta">' + c.material + ' · ' + check + ' · rating ' + c.rating + '</div>' +
        '<div class="refs">' + refs + '</div>' +
        '<select aria-label="Theme">' + options + '</select>' +
        '<div class="actions"><button class="btn keep ' + (kept(c) ? 'on' : '') + '">Keep</button><button class="btn reject ' + (kept(c) ? '' : 'on') + '">Reject</button>' +
        '<a href="https://lichess.org/analysis/standard/' + c.fen.replace(/ /g, '_') + '" target="_blank" rel="noopener">Analyse</a></div></div>';
    }).join('') + '</div>' +
    (list.length > limit ? '<button class="btn more" id="more">Show ' + Math.min(60, list.length - limit) + ' more of ' + (list.length - limit) + '</button>' : '');

  drawBoards();
  main.querySelectorAll('.card').forEach(card => {
    const c = data.candidates.find(x => x.key === card.dataset.key);
    const sel = card.querySelector('select');
    sel.value = themeOf(c);
    const set = async change => {
      review.positions[c.key] = { ...decision(c), ...change };
      await save({ position: c.key, decision: review.positions[c.key] });
      render();
    };
    sel.onchange = () => set({ theme: sel.value });
    card.querySelector('.keep').onclick = () => set({ keep: true });
    card.querySelector('.reject').onclick = () => set({ keep: false });
  });
  document.getElementById('showrej').onchange = e => { showRejected = e.target.checked; render(); };
  document.getElementById('more')?.addEventListener('click', () => { limit += 60; render(); });
  document.getElementById('tsave').onclick = async () => {
    review.themes[theme.id] = { explanation: document.getElementById('expl').value.trim(), rating: Number(document.getElementById('trating').value) };
    await save({ theme: theme.id, edits: review.themes[theme.id] });
    document.getElementById('tmsg').textContent = 'Saved';
  };
  document.getElementById('tdone').onclick = async () => {
    const on = !review.checkedThemes.includes(theme.id);
    review.checkedThemes = on ? [...review.checkedThemes, theme.id] : review.checkedThemes.filter(id => id !== theme.id);
    await save({ checked: theme.id, on });
    render();
  };
}

fetch('/data').then(r => r.json()).then(d => { data = d; review = d.review; current = d.themes[0].id; render(); });
</script>
</body>
</html>`;

createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        return res.end(page);
    }
    if (req.method === 'GET' && req.url === '/data') {
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ themes: readJson('src/data/trainerThemes.json'), candidates: readJson(`${OUT}/candidates.json`), review: loadReview() }));
    }
    if (req.method === 'POST' && req.url === '/save') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const change = JSON.parse(body);
            const review = loadReview();
            if (change.position) review.positions[change.position] = change.decision;
            if (change.theme) review.themes[change.theme] = change.edits;
            if (change.checked) review.checkedThemes = change.on ? [...new Set([...review.checkedThemes, change.checked])] : review.checkedThemes.filter(id => id !== change.checked);
            writeFileSync(REVIEW, JSON.stringify(review, null, 1));
            res.writeHead(204);
            res.end();
        });
        return;
    }
    res.writeHead(404);
    res.end();
}).listen(PORT, '127.0.0.1', () => console.log(`Review page: http://localhost:${PORT}`));
