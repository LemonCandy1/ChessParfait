import { Component, type ReactNode } from 'react';
import Navbar from './Navbar/Navbar';

/**
 * Catches errors while a page renders, including when its lazily loaded code fails to
 * download (a dropped connection, or an old tab after a new deploy). Without this,
 * React unmounts the whole app and the visitor sees a blank screen.
 */
export default class PageLoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error: unknown) {
        console.error('Page failed to load:', error);
    }

    render() {
        if (!this.state.failed) return this.props.children;

        return (
            <div className="min-h-[100dvh] bg-cream flex flex-col font-sans text-plum">
                <Navbar />
                <main role="alert" className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 gap-4">
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight">This page didn't load</h1>
                    <p className="text-plum/70 max-w-sm">
                        Check your connection and try again. If the site was just updated, reloading will fetch the latest version.
                    </p>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="soft-button-berry px-6 py-3 text-sm mt-2"
                    >
                        Reload page
                    </button>
                </main>
            </div>
        );
    }
}
