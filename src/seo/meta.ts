import { ACHIEVEMENTS, COACH, COACHING_FAQ, LOCATION, SITE_URL } from '../data/coach';

export interface PageMeta {
    title: string;
    description: string;
    /** Excluded from search results (account pages). */
    noindex?: boolean;
    /** Rendered to full HTML at build time so crawlers that don't run JavaScript see the content. */
    prerender?: boolean;
    /** Listed in sitemap.xml. */
    sitemap?: boolean;
}

const DEFAULT_DESCRIPTION =
    'Chess coaching in Glen Waverley and Melbourne with FIDE Master Luis Chan. Home visits, school programs and online lessons, plus free chess puzzles, endgame drills and mini-games.';

export const PAGE_META: Record<string, PageMeta> = {
    '/': {
        title: 'Chess Parfait | Chess Coaching in Melbourne with FM Luis Chan',
        description: DEFAULT_DESCRIPTION,
        prerender: true,
        sitemap: true,
    },
    '/chess-coaching-melbourne': {
        title: 'Chess Coaching in Glen Waverley & Melbourne | FM Luis Chan',
        description:
            'Private chess lessons with FIDE Master Luis Chan in Glen Waverley, Melbourne. Home visits, chess coaching for schools and online lessons, from beginners to 2000+ FIDE.',
        prerender: true,
        sitemap: true,
    },
    '/about': {
        title: 'About FM Luis Chan | Chess Coach in Melbourne',
        description:
            'FIDE Master Luis Chan is a Melbourne chess coach with over 7 years of experience, a 2280 FIDE rating and the 2024 Chess.com Fog of War Championship title.',
        prerender: true,
        sitemap: true,
    },
    '/contact': {
        title: 'Book Chess Lessons in Melbourne | Contact Chess Parfait',
        description:
            'Get in touch with FM Luis Chan to book chess lessons in Glen Waverley, arrange chess coaching for your school, or start online lessons.',
        prerender: true,
        sitemap: true,
    },
    '/games': {
        title: 'Chess Mini-Games & Training | Chess Parfait',
        description:
            'Free chess training: endgame practice, the Pawn Game, weekly puzzles, Challenge Rulette handicaps and Imposter Chess.',
        prerender: true,
        sitemap: true,
    },
    '/PawnGameStrategy': {
        title: 'Pawn Game Strategy Guide | Chess Parfait',
        description: 'Learn the strategy behind the Pawn Game: passed pawns, zugzwang and the opening moves that win for White.',
        prerender: true,
        sitemap: true,
    },
    '/TrainingPuzzles': {
        title: 'Weekly Chess Puzzles | Chess Parfait',
        description: 'Hand-picked chess puzzles at three difficulty levels, refreshed every Monday by FIDE Master Luis Chan.',
        sitemap: true,
    },
    '/EndgamePractice': {
        title: 'Chess Endgame Practice | Chess Parfait',
        description: 'Practise key chess endgames against perfect tablebase defence: opposition, key squares, Lucena, Philidor and more.',
        sitemap: true,
    },
    '/EndgameStrategy': {
        title: 'Chess Endgame Strategy Guides | Chess Parfait',
        description: 'Interactive chess endgame lessons with diagrams and master lines, from rook endgames to queen vs rook.',
        sitemap: true,
    },
    '/PawnGame': {
        title: 'Play the Pawn Game | Chess Parfait',
        description: 'Race your pawns to the back rank against the computer in this classic chess training game.',
        sitemap: true,
    },
    '/Challenge_Rulette': {
        title: 'Challenge Rulette: Chess Handicaps | Chess Parfait',
        description: 'Spin for a funny or strategic handicap to spice up casual chess games with friends.',
        sitemap: true,
    },
    '/ImposterChess': {
        title: 'Imposter Chess | Chess Parfait',
        description: 'A hidden-information chess variant: secretly turn one of your pawns into a queen and capture the enemy king.',
        sitemap: true,
    },
    '/leaderboard': {
        title: 'Leaderboard | Chess Parfait Community',
        description: 'Top Chess Parfait players by points earned from weekly puzzles.',
        sitemap: true,
    },
    '/forum': {
        title: 'Community Forum | Chess Parfait',
        description: 'Share feedback, request features and talk chess with the Chess Parfait community.',
        sitemap: true,
    },
    '/login': { title: 'Log In | Chess Parfait', description: DEFAULT_DESCRIPTION, noindex: true },
    '/register': { title: 'Create an Account | Chess Parfait', description: DEFAULT_DESCRIPTION, noindex: true },
    '/forgot-password': { title: 'Forgot Password | Chess Parfait', description: DEFAULT_DESCRIPTION, noindex: true },
    '/reset-password': { title: 'Reset Password | Chess Parfait', description: DEFAULT_DESCRIPTION, noindex: true },
    '/link-email': { title: 'Link Email | Chess Parfait', description: DEFAULT_DESCRIPTION, noindex: true },
    '/setup-profile': { title: 'Set Up Profile | Chess Parfait', description: DEFAULT_DESCRIPTION, noindex: true },
    '/profile': { title: 'My Profile | Chess Parfait', description: DEFAULT_DESCRIPTION, noindex: true },
};

export const FALLBACK_META: PageMeta = { title: 'Chess Parfait', description: DEFAULT_DESCRIPTION };

export const getPageMeta = (path: string): PageMeta =>
    PAGE_META[path] ?? (path.startsWith('/forum/') ? { ...PAGE_META['/forum'] } : FALLBACK_META);

export const canonicalUrl = (path: string) => `${SITE_URL}${path === '/' ? '/' : path}`;

/** Site-wide structured data describing the coaching business and the coach. */
export function businessJsonLd() {
    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebSite',
                '@id': `${SITE_URL}/#website`,
                url: `${SITE_URL}/`,
                name: 'Chess Parfait',
                publisher: { '@id': `${SITE_URL}/#business` },
            },
            {
                '@type': ['LocalBusiness', 'EducationalOrganization'],
                '@id': `${SITE_URL}/#business`,
                name: 'Chess Parfait',
                alternateName: 'Chess Parfait – FM Luis Chan Chess Coaching',
                description:
                    'Chess coaching in Glen Waverley and Melbourne with FIDE Master Luis Chan: home visits, chess coaching for schools, and online lessons for beginners through to tournament players.',
                url: `${SITE_URL}/`,
                email: COACH.email,
                image: `${SITE_URL}/Logo.jpg`,
                logo: `${SITE_URL}/Logo.jpg`,
                address: {
                    '@type': 'PostalAddress',
                    addressLocality: LOCATION.suburb,
                    addressRegion: LOCATION.regionCode,
                    postalCode: LOCATION.postcode,
                    addressCountry: LOCATION.country,
                },
                areaServed: [
                    { '@type': 'Place', name: `${LOCATION.suburb}, ${LOCATION.region}` },
                    { '@type': 'City', name: LOCATION.city },
                    { '@type': 'State', name: LOCATION.region },
                ],
                founder: { '@id': `${SITE_URL}/#luis-chan` },
                knowsAbout: ['Chess', 'Chess coaching', 'Chess tactics', 'Chess endgames', 'Chess openings'],
                makesOffer: [
                    'Private chess lessons (home visits)',
                    'Chess coaching for schools',
                    'Online chess lessons',
                ].map((name) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name } })),
            },
            {
                '@type': 'Person',
                '@id': `${SITE_URL}/#luis-chan`,
                name: COACH.name,
                honorificPrefix: 'FM',
                jobTitle: 'FIDE Master and chess coach',
                url: `${SITE_URL}/about`,
                email: COACH.email,
                worksFor: { '@id': `${SITE_URL}/#business` },
                affiliation: { '@type': 'CollegeOrUniversity', name: 'University of Melbourne' },
                award: [
                    ...ACHIEVEMENTS.map((a) => `${a.title}, ${a.detail} (${a.year})`),
                    '2024 Chess.com Fog of War Chess Championship winner',
                ],
                sameAs: [COACH.fideProfile, COACH.chessComProfile],
                subjectOf: { '@type': 'NewsArticle', url: COACH.fogOfWarArticle },
            },
        ],
    };
}

export function faqJsonLd() {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: COACHING_FAQ.map((f) => ({
            '@type': 'Question',
            name: f.question,
            acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
    };
}

/** Structured data blocks for a given page. */
export function jsonLdFor(path: string) {
    const blocks: object[] = [businessJsonLd()];
    if (path === '/chess-coaching-melbourne') blocks.push(faqJsonLd());
    return blocks;
}
