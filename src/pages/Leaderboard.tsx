import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import { Avatar } from '../components/community/CommunityUI';
import { useAuth } from '../context/AuthContext';
import { calculateLevelInfo } from '../lib/levelSystem';
import { getLeaderboard, type LeaderboardEntry } from '../lib/communityApi';

const PODIUM_STYLES = ['text-amber-500', 'text-slate-400', 'text-orange-400'];

export default function Leaderboard() {
    const { user } = useAuth();
    const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        getLeaderboard()
            .then(setEntries)
            .catch((err) => setError(err.message));
    }, []);

    const viewerRanked = !!user?.id && !!entries?.some((e) => e.id === user.id);

    return (
        <div className="min-h-screen flex flex-col font-sans text-plum bg-cream">
            <div className="relative z-50">
                <Navbar />
            </div>

            <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-12 md:py-16 animate-fade-up">
                <header className="mb-8">
                    <p className="text-xs font-bold uppercase tracking-widest text-berry mb-2">Community</p>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">Leaderboard</h1>
                    <p className="text-plum/70">Top players by points earned from puzzles.</p>
                </header>

                <section className="glass rounded-3xl overflow-hidden">
                    <div className="grid grid-cols-[2.5rem_1fr_auto] gap-3 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-plum/50 border-b border-plum/10">
                        <span>#</span>
                        <span>Player</span>
                        <span className="text-right">Points</span>
                    </div>

                    {error && <p className="px-5 py-10 text-center text-sm text-rose-700">{error}</p>}

                    {!error && !entries && (
                        <ul aria-busy="true">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <li key={i} className="flex items-center gap-3 px-5 py-4 border-b border-plum/5 last:border-0">
                                    <div className="w-6 h-4 rounded bg-plum/10 animate-pulse" />
                                    <div className="w-9 h-9 rounded-full bg-plum/10 animate-pulse" />
                                    <div className="flex-1 h-4 rounded bg-plum/10 animate-pulse" />
                                </li>
                            ))}
                        </ul>
                    )}

                    {entries && entries.length === 0 && (
                        <p className="px-5 py-10 text-center text-sm text-plum/60">
                            No points earned yet. <Link to="/TrainingPuzzles" className="text-berry font-semibold hover:underline">Solve a puzzle</Link> to claim the top spot.
                        </p>
                    )}

                    {entries && entries.length > 0 && (
                        <ol>
                            {entries.map((entry, i) => {
                                const isViewer = entry.id === user?.id;
                                return (
                                    <li
                                        key={entry.id}
                                        className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-5 py-3.5 border-b border-plum/5 last:border-0 ${
                                            isViewer ? 'bg-berry/5' : ''
                                        }`}
                                    >
                                        <span className={`font-serif font-black text-lg tabular-nums ${PODIUM_STYLES[i] ?? 'text-plum/40'}`}>
                                            {i + 1}
                                        </span>
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Avatar name={entry.username} url={entry.avatarUrl} />
                                            <div className="min-w-0">
                                                <p className="font-semibold truncate">
                                                    {entry.username}
                                                    {isViewer && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-berry">You</span>}
                                                </p>
                                                <p className="text-xs text-plum/55 truncate">
                                                    {calculateLevelInfo(entry.points).title} · {entry.puzzlesSolved} solved
                                                </p>
                                            </div>
                                        </div>
                                        <span className="font-bold tabular-nums text-right">{entry.points.toLocaleString()}</span>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </section>

                {entries && !error && (
                    <p className="mt-4 text-xs text-plum/55 text-center">
                        {!user ? (
                            <>
                                <Link to="/register" className="text-berry font-semibold hover:underline">Create an account</Link> to earn points and appear here.
                            </>
                        ) : !viewerRanked ? (
                            user.points
                                ? <>You have {user.points.toLocaleString()} points. Keep solving puzzles to climb into the top 50.</>
                                : <><Link to="/TrainingPuzzles" className="text-berry font-semibold hover:underline">Solve a puzzle</Link> to get on the board.</>
                        ) : null}
                    </p>
                )}
            </main>
        </div>
    );
}
