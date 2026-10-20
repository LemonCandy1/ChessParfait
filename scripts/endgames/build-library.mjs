// Builds the trainer's library from the reviewed candidates: every position not rejected on the review page,
// with its (possibly changed) theme, plus any theme explanation and rating edits.
// Writes src/data/trainerPositions.json and updates src/data/trainerThemes.json.
// Usage: node scripts/endgames/build-library.mjs
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = 'resources/endgames/out';
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const candidates = readJson(`${OUT}/candidates.json`);
const review = existsSync(`${OUT}/review.json`) ? readJson(`${OUT}/review.json`) : { positions: {}, themes: {} };
const themes = readJson('src/data/trainerThemes.json');

// Theme edits from the review page; a position's rating moves with its theme's.
const ratingShift = {};
for (const theme of themes) {
    const edits = review.themes[theme.id];
    if (!edits) continue;
    if (edits.explanation) theme.explanation = edits.explanation;
    if (edits.rating && edits.rating !== theme.rating) {
        ratingShift[theme.id] = edits.rating - theme.rating;
        theme.rating = edits.rating;
    }
}

const positions = candidates
    .filter(c => review.positions[c.key]?.keep !== false)
    .map(c => {
        const theme = review.positions[c.key]?.theme ?? c.theme;
        // Keep the position's own difficulty offset from its suggested theme.
        const offset = c.rating - (themes.find(t => t.id === c.theme).rating - (ratingShift[c.theme] ?? 0));
        return {
            // Stable id from the position itself, so ratings and reviews survive rebuilds.
            id: `lib-${createHash('sha1').update(c.key).digest('hex').slice(0, 10)}`,
            theme,
            fen: c.fen,
            target: c.target,
            rating: themes.find(t => t.id === theme).rating + offset
        };
    })
    .sort((a, b) => a.theme.localeCompare(b.theme) || a.rating - b.rating);

writeFileSync('src/data/trainerThemes.json', JSON.stringify(themes, null, 2) + '\n');
writeFileSync('src/data/trainerPositions.json', JSON.stringify(positions) + '\n');
console.log({ positions: positions.length, rejected: candidates.length - positions.length });
