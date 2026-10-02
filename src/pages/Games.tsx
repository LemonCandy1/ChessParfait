import Navbar from '../components/Navbar/Navbar';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { ChessKnight } from '../lib/lucideOriginal';
import { ChessPawnIcon, PuzzleIcon, RouletteIcon, GhostChefIcon } from '../components/Icons';

interface GameItem {
    id: string;
    title: string;
    description: string;
    path: string;
    icon: ReactNode;
}

const gamesList: GameItem[] = [
    {
        id: 'endgame-practice',
        title: 'Endgame Practice',
        description: 'Drill key endgames against perfect tablebase defence.',
        path: '/EndgamePractice',
        icon: <ChessKnight className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={1.5} />,
    },
    {
        id: 'pawn-game',
        title: 'Pawn Game',
        description: 'Race your pawns to the back rank against the AI.',
        path: '/PawnGame',
        icon: <ChessPawnIcon className="w-8 h-8 sm:w-10 sm:h-10" />,
    },
    {
        id: 'weekly-puzzles',
        title: 'Weekly Puzzles',
        description: 'Fresh hand-picked puzzles every Monday.',
        path: '/TrainingPuzzles',
        icon: <PuzzleIcon className="w-8 h-8 sm:w-10 sm:h-10" />,
    },
    {
        id: 'challenge-roulette',
        title: 'Challenge Rulette',
        description: 'Spin for a silly handicap to play with friends.',
        path: '/Challenge_Rulette',
        icon: <RouletteIcon className="w-8 h-8 sm:w-10 sm:h-10" />,
    },
    {
        id: 'imposter-chess',
        title: 'Imposter Chess',
        description: 'Hide a secret queen among your pawns.',
        path: '/ImposterChess',
        icon: <GhostChefIcon className="w-8 h-8 sm:w-10 sm:h-10" />,
    },
];

export default function Games() {
    return (
        <div className="min-h-[100dvh] bg-cream flex flex-col font-sans text-plum">
            <Navbar />

            <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-5 md:py-6 flex flex-col justify-center">
                <header className="mb-5 md:mb-6 animate-fade-up">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none mb-2">
                        The Variant <span className="text-berry italic">Lobby</span>
                    </h1>
                    <p className="text-sm sm:text-base md:text-lg text-plum/65 max-w-lg">
                        Mini-games and challenges to build your chess intuition.
                    </p>
                </header>

                <nav aria-label="Games">
                    <ol className="border-t border-plum/15">
                        {gamesList.map((game, index) => (
                            <li
                                key={game.id}
                                className="border-b border-plum/15 animate-fade-up"
                                style={{ animationDelay: `${(index + 1) * 50}ms` }}
                            >
                                <Link
                                    to={game.path}
                                    className="group flex items-center gap-3 sm:gap-5 py-2 sm:py-2.5 -mx-3 px-3 rounded-2xl hover:bg-white/50 focus-visible:bg-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berry/40 transition-colors duration-150"
                                >
                                    <span
                                        aria-hidden="true"
                                        className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl flex items-center justify-center bg-white/70 border border-plum/10 text-plum group-hover:text-berry group-hover:border-berry/30 transition-colors duration-150"
                                    >
                                        {game.icon}
                                    </span>

                                    <span className="flex-1 min-w-0">
                                        <span className="block font-serif font-black text-lg sm:text-2xl tracking-tight leading-tight group-hover:text-berry transition-colors duration-150">
                                            {game.title}
                                        </span>
                                        <span className="block text-[13px] sm:text-base leading-snug text-plum/60 mt-0.5">
                                            {game.description}
                                        </span>
                                    </span>

                                    <ArrowRight
                                        size={22}
                                        aria-hidden="true"
                                        className="shrink-0 text-plum/30 group-hover:text-berry group-hover:translate-x-1 transition-[color,transform] duration-150"
                                    />
                                </Link>
                            </li>
                        ))}
                    </ol>
                </nav>
            </main>

            <footer className="py-2.5 text-center border-t border-plum/5">
                <p className="text-xs text-plum/40 font-medium tracking-wide">© 2026 Chess Parfait</p>
            </footer>
        </div>
    );
}
