import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { canonicalUrl, getPageMeta } from './meta';

function upsert(selector: string, create: () => HTMLElement, attr: string, value: string) {
    let el = document.head.querySelector<HTMLElement>(selector);
    if (!el) {
        el = create();
        document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
}

const metaTag = (key: 'name' | 'property', name: string, content: string) =>
    upsert(
        `meta[${key}="${name}"]`,
        () => {
            const m = document.createElement('meta');
            m.setAttribute(key, name);
            return m;
        },
        'content',
        content,
    );

/**
 * Keeps the document title and SEO tags in sync with the current route during
 * client-side navigation. The first page load already has them from the build.
 */
export default function RouteMeta() {
    const { pathname } = useLocation();

    useEffect(() => {
        const meta = getPageMeta(pathname);
        const url = canonicalUrl(pathname);

        document.title = meta.title;
        metaTag('name', 'description', meta.description);
        metaTag('name', 'robots', meta.noindex ? 'noindex, follow' : 'index, follow');
        metaTag('property', 'og:title', meta.title);
        metaTag('property', 'og:description', meta.description);
        metaTag('property', 'og:url', url);
        upsert(
            'link[rel="canonical"]',
            () => {
                const l = document.createElement('link');
                l.rel = 'canonical';
                return l;
            },
            'href',
            url,
        );
    }, [pathname]);

    return null;
}
