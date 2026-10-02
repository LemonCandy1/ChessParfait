import type { ReactNode } from 'react';
import Navbar from '../Navbar/Navbar';

// Placeholder layouts shown while a page's code (or its data) is loading.
// Each one mirrors the rough shape of the real page so content doesn't jump when it arrives.

export function Bone({ className = '' }: { className?: string }) {
    return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

function Shell({ children, mainClassName = '' }: { children: ReactNode; mainClassName?: string }) {
    return (
        <div className="min-h-[100dvh] bg-cream flex flex-col font-sans text-plum">
            <Navbar />
            <main aria-busy="true" className={`flex-1 w-full mx-auto ${mainClassName}`}>
                <span className="sr-only" role="status">Loading…</span>
                {children}
            </main>
        </div>
    );
}

function Lines({ count, className = '', last = 'w-2/3' }: { count: number; className?: string; last?: string }) {
    return (
        <div className={`space-y-2.5 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
                <Bone key={i} className={`h-4 ${i === count - 1 ? last : 'w-full'}`} />
            ))}
        </div>
    );
}

/** Centered page title with an optional pill above and subtitle below. */
function TitleBlock({ pill = false, subtitle = true, align = 'center' }: { pill?: boolean; subtitle?: boolean; align?: 'center' | 'left' }) {
    const center = align === 'center';
    return (
        <div className={`flex flex-col gap-3 ${center ? 'items-center' : 'items-start'}`}>
            {pill && <Bone className="h-6 w-32 rounded-full" />}
            <Bone className="h-10 md:h-12 w-64 md:w-96 max-w-full rounded-xl" />
            {subtitle && <Bone className="h-4 w-72 md:w-[28rem] max-w-full" />}
        </div>
    );
}

export function HomeSkeleton() {
    return (
        <Shell>
            <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 md:pt-20 pb-14 flex flex-col items-center gap-5">
                <Bone className="h-12 md:h-16 w-full max-w-3xl rounded-2xl" />
                <Bone className="h-12 md:h-16 w-2/3 max-w-xl rounded-2xl md:hidden" />
                <div className="w-full max-w-2xl flex flex-col items-center gap-2.5 mt-2">
                    <Bone className="h-4 w-full" />
                    <Bone className="h-4 w-11/12" />
                    <Bone className="h-4 w-1/3" />
                </div>
                <div className="flex gap-3 mt-4">
                    <Bone className="h-12 w-36 rounded-xl" />
                    <Bone className="h-12 w-36 rounded-xl" />
                </div>
            </section>
            <section className="bg-plum py-8 md:py-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div aria-hidden="true" className="skeleton skeleton-light h-9 w-40 rounded-xl" />
                            <div aria-hidden="true" className="skeleton skeleton-light h-3 w-28" />
                        </div>
                    ))}
                </div>
            </section>
        </Shell>
    );
}

/** Title + stacked rows: Variant Lobby, Leaderboard, Forum. */
export function ListSkeleton({ rows = 5, icon = true }: { rows?: number; icon?: boolean }) {
    return (
        <Shell mainClassName="max-w-3xl px-4 sm:px-6 py-8 md:py-12">
            <TitleBlock align="left" />
            <div className="mt-8 border-t border-plum/10">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 py-4 border-b border-plum/10">
                        {icon && <Bone className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl shrink-0" />}
                        <div className="flex-1 space-y-2">
                            <Bone className="h-5 sm:h-6 w-1/2" />
                            <Bone className="h-3.5 w-4/5" />
                        </div>
                    </div>
                ))}
            </div>
        </Shell>
    );
}

export function ThreadSkeleton() {
    return (
        <Shell mainClassName="max-w-3xl px-4 sm:px-6 py-10 md:py-14 space-y-6">
            <Bone className="h-4 w-28" />
            <div className="glass rounded-3xl p-5 sm:p-8 space-y-4">
                <Bone className="h-5 w-24 rounded-full" />
                <Bone className="h-8 w-3/4 rounded-xl" />
                <div className="flex items-center gap-2.5">
                    <Bone className="h-8 w-8 rounded-full" />
                    <Bone className="h-4 w-32" />
                </div>
                <Lines count={4} />
            </div>
            {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex gap-3 p-4 rounded-2xl bg-white/50 border border-plum/10">
                    <Bone className="h-8 w-8 rounded-full shrink-0" />
                    <Lines count={2} className="flex-1" />
                </div>
            ))}
        </Shell>
    );
}

/** Title + three difficulty cards: Training Puzzles. */
export function DifficultyCardsSkeleton() {
    return (
        <Shell mainClassName="max-w-5xl px-4 sm:px-6 py-10 md:py-14">
            <TitleBlock pill />
            <Bone className="h-3.5 w-48 mx-auto mt-4" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8 mt-10">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="soft-card p-6 md:p-8 flex flex-col items-center gap-4">
                        <Bone className="h-6 w-24 rounded-full" />
                        <Bone className="h-20 w-20 rounded-full" />
                        <Bone className="h-7 w-40 rounded-lg" />
                        <Bone className="h-3 w-16" />
                    </div>
                ))}
            </div>
        </Shell>
    );
}

/** Header panel with search + grid of drill tiles: Endgame Practice. */
export function TileGridSkeleton() {
    return (
        <Shell mainClassName="max-w-5xl px-4 sm:px-6 py-6 md:py-8 space-y-8">
            <div className="soft-card p-6 md:p-8 space-y-5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-3 flex-1">
                        <Bone className="h-9 w-3/4 max-w-md rounded-xl" />
                        <Bone className="h-4 w-full max-w-lg" />
                    </div>
                    <Bone className="h-20 w-full md:w-56 rounded-2xl" />
                </div>
                <Bone className="h-12 w-full rounded-xl" />
                <div className="flex flex-wrap gap-2">
                    {['w-12', 'w-28', 'w-28', 'w-28', 'w-36'].map((w, i) => (
                        <Bone key={i} className={`h-8 rounded-full ${w}`} />
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="soft-card rounded-2xl p-5 flex items-center gap-4">
                        <Bone className="h-10 w-10 rounded-xl shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Bone className="h-5 w-2/3" />
                            <Bone className="h-3.5 w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        </Shell>
    );
}

/** Sidebar + chessboard + notes panel: Endgame Strategy. */
export function BoardSkeleton() {
    return (
        <Shell mainClassName="max-w-[1400px] px-4 lg:px-0">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-0 py-6 lg:py-0 lg:min-h-[calc(100dvh-74px)]">
                <aside className="hidden lg:flex flex-col gap-3 w-72 shrink-0 border-r border-plum/10 p-5">
                    <Bone className="h-4 w-32 mb-3" />
                    {Array.from({ length: 12 }).map((_, i) => (
                        <Bone key={i} className={`h-4 ${i % 5 === 0 ? 'w-24 mt-3' : 'w-48'}`} />
                    ))}
                </aside>
                <div className="flex-1 flex flex-col items-center gap-5 lg:p-6">
                    <Bone className="w-full max-w-[520px] aspect-square rounded-xl" />
                    <div className="flex gap-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Bone key={i} className="h-10 w-10 rounded-xl" />
                        ))}
                    </div>
                </div>
                <aside className="w-full lg:w-[22rem] shrink-0 lg:border-l border-plum/10 lg:p-5 space-y-4">
                    <Bone className="h-6 w-3/4 rounded-lg" />
                    <Bone className="h-3.5 w-full" />
                    <div className="rounded-2xl border border-plum/10 p-4">
                        <Lines count={5} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Bone key={i} className="h-8 w-16 rounded-lg" />
                        ))}
                    </div>
                </aside>
            </div>
        </Shell>
    );
}

/**
 * Centered title over a single card with a row of options below it:
 * Challenge Rulette, Pawn Game, Imposter Chess setup screens.
 */
export function SetupSkeleton({ options = 4, cardHeight = 'h-72', narrow = false }: { options?: number; cardHeight?: string; narrow?: boolean }) {
    return (
        <Shell mainClassName={`${narrow ? 'max-w-md' : 'max-w-3xl'} px-4 sm:px-6 py-10 md:py-16 flex flex-col items-center gap-8`}>
            <TitleBlock />
            <Bone className={`w-full ${cardHeight} rounded-[2rem]`} />
            <div className={`w-full grid gap-3 ${options === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
                {Array.from({ length: options }).map((_, i) => (
                    <Bone key={i} className="h-16 sm:h-20 rounded-2xl" />
                ))}
            </div>
        </Shell>
    );
}

/** Long-form page: back link, title, paragraphs, feature cards. Pawn Game Strategy. */
export function ArticleSkeleton() {
    return (
        <Shell mainClassName="max-w-4xl px-4 sm:px-6 py-10 md:py-16 space-y-8">
            <Bone className="h-3.5 w-28" />
            <TitleBlock align="left" subtitle={false} />
            <Lines count={6} last="w-1/2" />
            <div className="soft-card p-6 md:p-10 space-y-5">
                <div className="flex items-center gap-4">
                    <Bone className="h-12 w-12 rounded-2xl shrink-0" />
                    <Bone className="h-8 w-56 rounded-xl" />
                </div>
                <Lines count={3} />
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="soft-card p-6 space-y-4">
                        <Bone className="h-7 w-7 rounded-lg" />
                        <Bone className="h-6 w-40 rounded-lg" />
                        <Lines count={3} />
                    </div>
                ))}
            </div>
        </Shell>
    );
}

export function AboutSkeleton() {
    return (
        <Shell mainClassName="max-w-5xl px-4 sm:px-6 py-10 md:py-16 space-y-16">
            <section className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
                <div className="flex-1 w-full order-2 lg:order-1 space-y-6">
                    <Bone className="h-7 w-44 rounded-full" />
                    <Bone className="h-14 w-64 rounded-2xl" />
                    <Lines count={7} last="w-1/2" />
                </div>
                <Bone className="order-1 lg:order-2 w-60 h-80 sm:w-72 sm:h-96 rounded-[2.5rem] shrink-0" />
            </section>
            <section className="grid md:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="glass rounded-3xl p-8 space-y-3">
                        <Bone className="h-6 w-6 rounded-md" />
                        <Bone className="h-3 w-24" />
                        <Bone className="h-9 w-24 rounded-lg" />
                    </div>
                ))}
            </section>
        </Shell>
    );
}

/** Centered auth card: Login, Register, password and profile setup pages. */
export function FormSkeleton({ fields = 2 }: { fields?: number }) {
    return (
        <Shell mainClassName="max-w-md px-4 sm:px-6 py-10 md:py-20">
            <div className="bg-white/80 rounded-[2.5rem] border-2 border-plum/10 p-6 sm:p-8 space-y-5">
                <Bone className="h-3 w-24" />
                <div className="space-y-2">
                    <Bone className="h-9 w-56 rounded-xl" />
                    <Bone className="h-3.5 w-48" />
                </div>
                {Array.from({ length: fields }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <Bone className="h-3 w-20" />
                        <Bone className="h-11 w-full rounded-xl" />
                    </div>
                ))}
                <Bone className="h-11 w-full rounded-xl" />
                <Bone className="h-3.5 w-52 mx-auto" />
            </div>
        </Shell>
    );
}

export function ContactSkeleton() {
    return (
        <Shell mainClassName="max-w-6xl px-4 sm:px-6 py-12 md:py-20">
            <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-16 items-start">
                <div className="space-y-5 lg:pt-6">
                    <Bone className="h-7 w-32 rounded-full" />
                    <Bone className="h-12 w-72 max-w-full rounded-2xl" />
                    <Lines count={3} className="max-w-md" />
                    <div className="space-y-4 pt-4">
                        {Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <Bone className="h-11 w-11 rounded-xl" />
                                <div className="space-y-2">
                                    <Bone className="h-3 w-16" />
                                    <Bone className="h-4 w-44" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="glass rounded-[2rem] p-6 sm:p-8 md:p-10 space-y-5">
                    <Bone className="h-8 w-48 rounded-xl" />
                    <div className="grid sm:grid-cols-2 gap-5">
                        <Bone className="h-12 rounded-xl" />
                        <Bone className="h-12 rounded-xl" />
                    </div>
                    <Bone className="h-36 rounded-xl" />
                    <Bone className="h-14 rounded-xl" />
                </div>
            </div>
        </Shell>
    );
}

export function ProfileSkeleton() {
    return (
        <Shell mainClassName="max-w-6xl px-4 sm:px-6 py-10 space-y-8">
            <div className="soft-card p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6">
                <Bone className="h-24 w-24 rounded-3xl shrink-0" />
                <div className="flex-1 w-full space-y-3 flex flex-col items-center md:items-start">
                    <Bone className="h-9 w-56 rounded-xl" />
                    <Bone className="h-4 w-40" />
                    <Bone className="h-3 w-full max-w-md rounded-full mt-2" />
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="soft-card rounded-3xl p-5 space-y-3">
                        <Bone className="h-6 w-6 rounded-md" />
                        <Bone className="h-3 w-20" />
                        <Bone className="h-8 w-16 rounded-lg" />
                    </div>
                ))}
            </div>
            <div className="grid md:grid-cols-2 gap-6">
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="soft-card p-6 space-y-4">
                        <Bone className="h-6 w-40 rounded-lg" />
                        <Lines count={4} />
                    </div>
                ))}
            </div>
        </Shell>
    );
}
