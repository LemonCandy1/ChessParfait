import React from 'react';
import Navbar from '../components/Navbar/Navbar';
import { Link } from 'react-router-dom';
import { ChevronRight, Lock, Cpu } from 'lucide-react';
import { ChessPawnIcon, PuzzleIcon, RouletteIcon, GhostChefIcon } from '../components/Icons';

interface GameItem {
    id: string;
    title: string;
    description: string;
    longDescription: string;
    path: string;
    icon: React.ReactNode;
    difficulty: 'Piece of Cake' | 'Hard Tart' | 'Brain Freeze' | 'Cherry Bomb' | 'Special';
    difficultyColor: string;
    status: 'Playable' | 'Weekly' | 'Coming Soon';
    statusColor: string;
    gradient: string;
    highlightColor: string;
}

export default function Games() {
    const gamesList: GameItem[] = [
        {
            id: 'endgame-practice',
            title: 'Endgame Practice Arena',
            description: 'Master theoretical and practical endgames with tablebase validation.',
            longDescription: 'Practice Queen vs. Rook, Lucena bridge, Philidor rook defense, and King + Pawn opposition against 7-Piece Syzygy tablebases and masterclass lines.',
            path: '/EndgamePractice',
            icon: <Cpu size={32} />,
            difficulty: 'Cherry Bomb',
            difficultyColor: 'bg-rose-50 text-berry border-rose-200/50',
            status: 'Playable',
            statusColor: 'bg-emerald-50 text-emerald-600 border-emerald-200/50',
            gradient: 'from-rose-500/10 to-berry/10 hover:from-rose-500/15 hover:to-berry/15',
            highlightColor: 'group-hover:text-berry',
        },
        {
            id: 'pawn-game',
            title: 'Pawn Game',
            description: 'Classic pawn structure training game.',
            longDescription: 'Race to the back rank, capture all opposing pawns, or force a zugzwang. Test your endgame planning against our Minimax search AI.',
            path: '/PawnGame',
            icon: <ChessPawnIcon size={32} />,
            difficulty: 'Hard Tart',
            difficultyColor: 'bg-amber-50 text-amber-600 border-amber-200/50',
            status: 'Playable',
            statusColor: 'bg-emerald-50 text-emerald-600 border-emerald-200/50',
            gradient: 'from-amber-500/10 to-orange-500/10 hover:from-amber-500/15 hover:to-orange-500/15',
            highlightColor: 'group-hover:text-amber-500',
        },
        {
            id: 'weekly-puzzles',
            title: 'Weekly Puzzles',
            description: 'Handpicked tactical positions.',
            longDescription: 'Refresh your calculation skills. New tactical and positional puzzles are curated directly by FIDE Master Luis Chan every Monday.',
            path: '/TrainingPuzzles',
            icon: <PuzzleIcon size={32} />,
            difficulty: 'Piece of Cake',
            difficultyColor: 'bg-emerald-50 text-emerald-600 border-emerald-200/50',
            status: 'Weekly',
            statusColor: 'bg-blue-50 text-blue-600 border-blue-200/50',
            gradient: 'from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/15 hover:to-teal-500/15',
            highlightColor: 'group-hover:text-emerald-500',
        },
        {
            id: 'challenge-roulette',
            title: 'Challenge Rulette',
            description: 'Draw random match handicaps.',
            longDescription: 'Spice up your friendly games! Spin the wheel to receive funny, tactical, or strategic handicaps created by Luis and his coaching students.',
            path: '/Challenge_Rulette',
            icon: <RouletteIcon size={32} />,
            difficulty: 'Cherry Bomb',
            difficultyColor: 'bg-rose-50 text-berry border-rose-200/50',
            status: 'Playable',
            statusColor: 'bg-emerald-50 text-emerald-600 border-emerald-200/50',
            gradient: 'from-rose-500/10 to-berry/10 hover:from-rose-500/15 hover:to-berry/15',
            highlightColor: 'group-hover:text-berry',
        },
        {
            id: 'imposter-chess',
            title: 'Imposter Chess',
            description: 'Ultimate chess battle of deception.',
            longDescription: 'A unique hidden-information variant where pieces hide their true identities. Outsmart and deceive your opponent. Currently under construction.',
            path: '/ImposterChess',
            icon: <GhostChefIcon size={32} />,
            difficulty: 'Special',
            difficultyColor: 'bg-purple-50 text-purple-600 border-purple-200/50',
            status: 'Coming Soon',
            statusColor: 'bg-plum/5 text-plum/50 border-plum/10',
            gradient: 'from-purple-500/5 to-plum/5 hover:from-purple-500/10 hover:to-plum/10',
            highlightColor: 'group-hover:text-purple-600',
        }
    ];

    return (
        <div className="min-h-screen lg:h-screen lg:max-h-screen bg-cream flex flex-col font-sans text-plum relative overflow-x-clip overflow-y-auto lg:overflow-hidden justify-between">
            <Navbar />

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-4 md:py-6 flex flex-col justify-center relative z-10">
                {/* Hero / Header */}
                <header className="text-center mb-4 md:mb-6 max-w-2xl mx-auto space-y-1">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-plum leading-tight">
                        The Variant <span className="text-berry italic">Lobby</span>
                    </h1>
                    <p className="text-xs md:text-sm text-plum/60 leading-relaxed font-medium">
                        Explore custom mini-games, weekly challenges and other fun games designed to build your Chess Intuition!
                    </p>
                </header>

                {/* Games Cards Grid - All 5 cards fit on one screen */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 xl:gap-4 w-full items-stretch">
                    {gamesList.map((game, index) => {
                        const isComingSoon = game.status === 'Coming Soon';
                        const cardClass = `group soft-card rounded-2xl p-4 md:p-5 flex flex-col justify-between bg-white/60 backdrop-blur-xl border-2 border-plum/15 hover:-translate-y-1 hover:shadow-xl transition-[transform,box-shadow] duration-200 ease-out bg-gradient-to-br ${game.gradient} relative overflow-hidden animate-fade-up h-full`;

                        const cardInner = (
                            <>
                                {/* Glow element */}
                                <div className="absolute -right-24 -top-24 w-48 h-48 bg-white/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                                <div className="flex-1 flex flex-col">
                                    {/* Header Row: Icon & Status badges */}
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className={`p-2.5 rounded-xl bg-white shadow-sm border border-plum/15 text-plum transition-transform duration-200 ease-out group-hover:scale-105 ${game.highlightColor}`}>
                                            {game.icon}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border whitespace-nowrap ${game.statusColor}`}>
                                                {game.status}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border whitespace-nowrap ${game.difficultyColor}`}>
                                                {game.difficulty}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content Section */}
                                    <div className="space-y-1 flex-1">
                                        <h2 className="text-base md:text-lg font-serif font-black tracking-tight text-plum group-hover:text-berry transition-colors duration-200 line-clamp-1">
                                            {game.title}
                                        </h2>
                                        <p className="text-xs font-bold text-plum/80 leading-snug line-clamp-2">
                                            {game.description}
                                        </p>
                                        <p className="text-[11px] leading-relaxed text-plum/60 font-normal line-clamp-3 mt-1">
                                            {game.longDescription}
                                        </p>
                                    </div>
                                </div>

                                {/* Footer Action Button */}
                                <div className="pt-3 border-t border-plum/10 flex items-center justify-between mt-3">
                                    {isComingSoon ? (
                                        <span className="inline-flex items-center gap-1.5 text-plum/40 font-bold uppercase text-[10px] tracking-wider">
                                            <Lock size={12} /> Soon
                                        </span>
                                    ) : (
                                        <>
                                            <span className="inline-flex items-center gap-1.5 text-berry group-hover:text-plum font-bold uppercase text-[10px] tracking-wider transition-colors duration-200">
                                                Play
                                            </span>
                                            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-plum shadow-sm group-hover:bg-berry group-hover:text-white transition-all duration-200 transform group-hover:translate-x-1 border border-plum/15">
                                                <ChevronRight size={14} />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        );

                        if (isComingSoon) {
                            return (
                                <div
                                    key={game.id}
                                    className={cardClass}
                                    style={{ animationDelay: `${index * 60}ms`, cursor: 'default' }}
                                >
                                    {cardInner}
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={game.id}
                                to={game.path}
                                className={cardClass}
                                style={{ animationDelay: `${index * 60}ms` }}
                            >
                                {cardInner}
                            </Link>
                        );
                    })}
                </div>
            </main>

            {/* Footer */}
            <footer className="py-2.5 text-center border-t border-plum/5 bg-white/20 backdrop-blur-sm relative z-10">
                <p className="text-xs text-plum/40 font-medium tracking-wide">© 2026 Chess Parfait. Interactive Zone.</p>
            </footer>
        </div>
    );
}
