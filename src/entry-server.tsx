// Build-time renderer used by scripts/prerender.mjs. Not part of the browser bundle,
// so the fast-refresh export rule does not apply.
/* eslint-disable react-refresh/only-export-components */
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { AppShell } from './App';
import { preloadRoute } from './routes';

export { PAGE_META, canonicalUrl, jsonLdFor } from './seo/meta';
export { SITE_URL } from './data/coach';

export async function render(url: string) {
    await preloadRoute(url);
    return renderToString(
        <StaticRouter location={url}>
            <AppShell />
        </StaticRouter>,
    );
}
