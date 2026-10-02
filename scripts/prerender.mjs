// Runs after `vite build` and `vite build --ssr`. For each page it writes an HTML file
// with that page's title, description, canonical URL and structured data. Pages marked
// `prerender` also get their full content rendered into the HTML, so search engines and
// AI crawlers that don't run JavaScript can read them. Also writes sitemap.xml.
//
// Cloudflare Pages serves dist/about.html at /about, matching the app's routes.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

process.env.NODE_ENV = 'production';

const DIST = path.resolve('dist');
const SSR_ENTRY = path.resolve('dist-ssr/entry-server.js');

const { render, PAGE_META, canonicalUrl, jsonLdFor, SITE_URL } = await import(pathToFileURL(SSR_ENTRY).href);

const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

const escapeHtml = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Keep "</script>" inside JSON from closing the tag early.
const safeJson = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');

function headTags(route, meta) {
    const url = canonicalUrl(route);
    const title = escapeHtml(meta.title);
    const description = escapeHtml(meta.description);
    const tags = [
        `<meta name="description" content="${description}" />`,
        `<meta name="robots" content="${meta.noindex ? 'noindex, follow' : 'index, follow'}" />`,
        `<link rel="canonical" href="${url}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:site_name" content="Chess Parfait" />`,
        `<meta property="og:locale" content="en_AU" />`,
        `<meta property="og:title" content="${title}" />`,
        `<meta property="og:description" content="${description}" />`,
        `<meta property="og:url" content="${url}" />`,
        `<meta property="og:image" content="${SITE_URL}/Logo.jpg" />`,
        `<meta name="twitter:card" content="summary" />`,
    ];
    if (!meta.noindex) {
        for (const block of jsonLdFor(route)) {
            tags.push(`<script type="application/ld+json">${safeJson(block)}</script>`);
        }
    }
    return tags.map((t) => `    ${t}`).join('\n');
}

const ROOT_RE = /<div id="root">[\s\S]*?<\/div>\s*(?=<script|<\/body>)/;
if (!ROOT_RE.test(template)) throw new Error('Could not find #root in dist/index.html');

let rendered = 0;
for (const [route, meta] of Object.entries(PAGE_META)) {
    let html = template
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(meta.title)}</title>`)
        .replace('</head>', `${headTags(route, meta)}\n  </head>`);

    if (meta.prerender) {
        const body = await render(route);
        html = html.replace(ROOT_RE, `<div id="root" data-prerendered="${route}">${body}</div>\n    `);
        rendered++;
    }

    const file = route === '/' ? 'index.html' : `${route.slice(1)}.html`;
    fs.writeFileSync(path.join(DIST, file), html);
}

const sitemapUrls = Object.entries(PAGE_META)
    .filter(([, meta]) => meta.sitemap && !meta.noindex)
    .map(([route]) => `  <url><loc>${canonicalUrl(route)}</loc></url>`)
    .join('\n');
fs.writeFileSync(
    path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>\n`,
);

fs.rmSync(path.resolve('dist-ssr'), { recursive: true, force: true });
console.log(`Prerendered ${rendered} pages, wrote meta for ${Object.keys(PAGE_META).length} routes and sitemap.xml.`);
