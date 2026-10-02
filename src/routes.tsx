import { lazy, type ComponentType, type ReactNode } from 'react';
import { matchPath } from 'react-router-dom';
import {
    AboutSkeleton,
    ArticleSkeleton,
    BoardSkeleton,
    ContactSkeleton,
    DifficultyCardsSkeleton,
    FormSkeleton,
    HomeSkeleton,
    ListSkeleton,
    ProfileSkeleton,
    SetupSkeleton,
    ThreadSkeleton,
    TileGridSkeleton,
} from './components/skeletons/PageSkeletons';

type PageModule = { default: ComponentType };

interface PageComponent {
    (): ReactNode;
    preload: () => Promise<void>;
}

/**
 * Like React.lazy, but once the page's code has been preloaded it renders synchronously.
 * That lets the first render (in the browser and at build time) show the real page
 * instead of its skeleton, so build-time HTML can be hydrated without a flash.
 */
function lazyPage(load: () => Promise<PageModule>): PageComponent {
    let Loaded: ComponentType | null = null;
    const preload = () =>
        load().then((m) => {
            Loaded = m.default;
        });
    const Lazy = lazy(() => preload().then(() => ({ default: Loaded as ComponentType })));
    const Page = () => (Loaded ? <Loaded /> : <Lazy />);
    Page.preload = preload;
    return Page;
}

export interface AppRoute {
    path: string;
    Page: PageComponent;
    fallback: ReactNode;
}

// Each page is its own chunk, so the first visit only downloads the page being viewed.
// While a page's chunk loads, a skeleton shaped like that page is shown.
export const ROUTES: AppRoute[] = [
    { path: '/', Page: lazyPage(() => import('./pages/Home')), fallback: <HomeSkeleton /> },
    { path: '/chess-coaching-melbourne', Page: lazyPage(() => import('./pages/Coaching')), fallback: <ArticleSkeleton /> },
    { path: '/about', Page: lazyPage(() => import('./pages/About')), fallback: <AboutSkeleton /> },
    { path: '/Challenge_Rulette', Page: lazyPage(() => import('./pages/Challenge_Rulette')), fallback: <SetupSkeleton options={4} cardHeight="h-80" /> },
    { path: '/TrainingPuzzles', Page: lazyPage(() => import('./pages/TrainingPuzzles')), fallback: <DifficultyCardsSkeleton /> },
    { path: '/EndgamePractice', Page: lazyPage(() => import('./pages/EndgamePractice')), fallback: <TileGridSkeleton /> },
    { path: '/EndgameStrategy', Page: lazyPage(() => import('./pages/EndgameStrategy')), fallback: <BoardSkeleton /> },
    { path: '/ImposterChess', Page: lazyPage(() => import('./pages/ImposterChess')), fallback: <SetupSkeleton options={3} cardHeight="h-56" narrow /> },
    { path: '/PawnGame', Page: lazyPage(() => import('./pages/PawnGame')), fallback: <SetupSkeleton options={0} cardHeight="h-96" /> },
    { path: '/PawnGameStrategy', Page: lazyPage(() => import('./pages/PawnGameStrategy')), fallback: <ArticleSkeleton /> },
    { path: '/leaderboard', Page: lazyPage(() => import('./pages/Leaderboard')), fallback: <ListSkeleton rows={8} /> },
    { path: '/forum', Page: lazyPage(() => import('./pages/Forum')), fallback: <ListSkeleton rows={4} icon={false} /> },
    { path: '/forum/:id', Page: lazyPage(() => import('./pages/ForumThread')), fallback: <ThreadSkeleton /> },
    { path: '/contact', Page: lazyPage(() => import('./pages/Contact')), fallback: <ContactSkeleton /> },
    { path: '/games', Page: lazyPage(() => import('./pages/Games')), fallback: <ListSkeleton /> },
    { path: '/profile', Page: lazyPage(() => import('./pages/Profile')), fallback: <ProfileSkeleton /> },
    { path: '/login', Page: lazyPage(() => import('./pages/Login')), fallback: <FormSkeleton fields={2} /> },
    { path: '/setup-profile', Page: lazyPage(() => import('./pages/SetupProfile')), fallback: <FormSkeleton fields={1} /> },
    { path: '/register', Page: lazyPage(() => import('./pages/Register')), fallback: <FormSkeleton fields={3} /> },
    { path: '/forgot-password', Page: lazyPage(() => import('./pages/ForgotPassword')), fallback: <FormSkeleton fields={1} /> },
    { path: '/reset-password', Page: lazyPage(() => import('./pages/ResetPassword')), fallback: <FormSkeleton fields={2} /> },
    { path: '/link-email', Page: lazyPage(() => import('./pages/LinkEmail')), fallback: <FormSkeleton fields={1} /> },
];

/** Loads the code for whichever page matches `pathname`, if any. */
export async function preloadRoute(pathname: string) {
    const route = ROUTES.find((r) => matchPath(r.path, pathname));
    await route?.Page.preload();
}
