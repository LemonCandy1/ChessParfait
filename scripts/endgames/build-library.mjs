// Builds the trainer's library from the review so far: positions kept on the review page and unreviewed
// positions in themes marked as checked, with their (possibly changed) themes, plus theme explanation and
// rating edits.
// Writes src/data/trainerPositions.json and updates src/data/trainerThemes.json.
// Usage: node scripts/endgames/build-library.mjs
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = 'resources/endgames/out';
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const candidates = readJson(`${OUT}/candidates.json`);
const review = existsSync(`${OUT}/review.json`) ? readJson(`${OUT}/review.json`) : { positions: {}, themes: {} };
const themes = readJson('src/data/trainerThemes.json');

// Theme edits from the review page.
for (const theme of themes) {
    const edits = review.themes[theme.id];
    if (edits?.explanation) theme.explanation = edits.explanation;
    if (edits?.rating) theme.rating = edits.rating;
}
const themeRating = id => themes.find(t => t.id === id).rating;

// Approved so far: positions kept on the review page, and positions left unreviewed in a theme marked as checked.
const checked = new Set(review.checkedThemes ?? []);
const positions = candidates
    .map(c => ({ c, decision: review.positions[c.key] ?? {} }))
    .map(({ c, decision }) => ({ c, decision, theme: decision.theme ?? c.theme }))
    .filter(({ decision, theme }) => decision.keep === true || (decision.keep === undefined && checked.has(theme)))
    .map(({ c, theme }) => ({
        // Stable id from the position itself, so ratings and reviews survive rebuilds.
        id: `lib-${createHash('sha1').update(c.key).digest('hex').slice(0, 10)}`,
        theme,
        fen: c.fen,
        target: c.target,
        // The position's own difficulty offset, on top of its (possibly edited, possibly new) theme's rating.
        rating: themeRating(theme) + (c.rating - c.base)
    }))
    .sort((a, b) => a.theme.localeCompare(b.theme) || a.rating - b.rating);

writeFileSync('src/data/trainerThemes.json', JSON.stringify(themes, null, 2) + '\n');
writeFileSync('src/data/trainerPositions.json', JSON.stringify(positions) + '\n');
console.log({ positions: positions.length, leftOut: candidates.length - positions.length });
