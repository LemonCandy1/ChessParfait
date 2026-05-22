import React from 'react';
import Navbar from '../components/Navbar/Navbar';
import { Link } from 'react-router-dom';
import { Trophy, Target, Dices, Ghost, ChevronRight, Sparkles, Lock } from 'lucide-react';

interface GameItem {
    id: string;
    title: string;
    description: string;
    longDescription: string;
    path: string;
    icon: React.ReactNode;
    difficulty: 'Piece of Cake' | 'Hard Tart' | 'Brain Freeze' | 'Challenge' | 'Special';
    difficultyColor: string;
    status: 'Playable' | 'Weekly' | 'Coming Soon';
    statusColor: string;
    gradient: string;
    highlightColor: string;
}

export default function Games() {
    const gamesList: GameItem[] = [
        {
            id: 'pawn-game',
            title: 'Pawn Game',
            description: 'Classic pawn structure training game.',
            longDescription: 'Race to the back rank, capture all opposing pawns, or force a zugzwang. Test your endgame planning against our Minimax search AI.',
            path: '/PawnGame',
            icon: <Trophy size={36} />,
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
            icon: <Target size={36} />,
            difficulty: 'Piece of Cake',
            difficultyColor: 'bg-emerald-50 text-emerald-600 border-emerald-200/50',
            status: 'Weekly',
            statusColor: 'bg-blue-50 text-blue-600 border-blue-200/50',
            gradient: 'from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/15 hover:to-teal-500/15',
            highlightColor: 'group-hover:text-emerald-500',
        },
        {
            id: 'challenge-roulette',
            title: 'Challenge Roulette',
            description: 'Draw random match handicaps.',
            longDescription: 'Spice up your friendly games! Spin the wheel to receive funny, tactical, or strategic handicaps created by Luis and his coaching students.',
            path: '/Challenge_Rulette',
            icon: <Dices size={36} />,
            difficulty: 'Challenge',
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
            icon: <Ghost size={36} />,
            difficulty: 'Special',
            difficultyColor: 'bg-purple-50 text-purple-600 border-purple-200/50',
            status: 'Coming Soon',
            statusColor: 'bg-plum/5 text-plum/50 border-plum/10',
            gradient: 'from-purple-500/5 to-plum/5 hover:from-purple-500/10 hover:to-plum/10',
            highlightColor: 'group-hover:text-purple-600',
        }
    ];

    return (
        <div className="min-h-screen bg-cream flex flex-col font-sans text-plum relative overflow-x-hidden">
            {/* Background Decorative Gradients */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-berry/5 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-plum/5 rounded-full blur-[100px] -z-10" />

            <Navbar />

            <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-16 md:py-24 relative z-10">
                {/* Hero / Header */}
                <header className="text-center mb-16 md:mb-24 max-w-3xl mx-auto space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-berry/10 text-berry text-xs font-bold uppercase tracking-widest animate-fade-in">
                        <Sparkles size={14} className="animate-pulse" />
                        <span>Interactive Chess Lab</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight text-plum leading-tight">
                        The Variant <span className="text-berry italic">Lobby</span>
                    </h1>
                    <p className="text-xl text-plum/60 leading-relaxed font-medium">
                        Explore custom mini-games, weekly strategy challenges, and tactical rule mutations designed to build Chess Parfait intuition.
                    </p>
                </header>

                {/* Games Cards Grid */}
                <div className="grid md:grid-cols-2 gap-8 md:gap-12 w-full">
                    {gamesList.map((game) => {
                        const isComingSoon = game.status === 'Coming Soon';
                        const cardClass = `group soft-card soft-card-hover rounded-[3rem] p-8 md:p-10 flex flex-col justify-between bg-white/40 backdrop-blur-xl border border-plum/5 hover:-translate-y-2 duration-500 transition-all bg-gradient-to-br ${game.gradient} relative overflow-hidden`;

                        const cardInner = (
                            <>
                                {/* Glow element */}
                                <div className="absolute -right-24 -top-24 w-48 h-48 bg-white/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                                <div>
                                    {/* Header Row: Icon & Status badges */}
                                    <div className="flex items-start justify-between mb-8">
                                        <div className={`p-5 rounded-[2rem] bg-white shadow-md shadow-plum/5 border border-plum/5 text-plum transition-transform duration-500 group-hover:scale-115 ${game.highlightColor}`}>
                                            {game.icon}
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${game.statusColor}`}>
                                                {game.status}
                                            </span>
                                            <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${game.difficultyColor}`}>
                                                {game.difficulty}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content Section */}
                                    <div className="space-y-4 mb-8">
                                        <h2 className="text-3xl font-serif font-black tracking-tight group-hover:text-berry transition-colors duration-300">
                                            {game.title}
                                        </h2>
                                        <p className="text-lg font-bold text-plum/70">
                                            {game.description}
                                        </p>
                                        <p className="text-sm leading-relaxed text-plum/50 font-medium">
                                            {game.longDescription}
                                        </p>
                                    </div>
                                </div>

                                {/* Footer Action Button */}
                                <div className="pt-4 border-t border-plum/5 flex items-center justify-between mt-auto">
                                    {isComingSoon ? (
                                        <span className="inline-flex items-center gap-2 text-plum/30 font-bold uppercase text-[10px] tracking-widest">
                                            <Lock size={14} /> Under Construction
                                        </span>
                                    ) : (
                                        <>
                                            <span className="inline-flex items-center gap-2 text-berry group-hover:text-plum font-black uppercase text-[10px] tracking-widest transition-colors duration-300">
                                                Enter Game
                                            </span>
                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-plum shadow-sm group-hover:bg-berry group-hover:text-white transition-all duration-300 transform group-hover:translate-x-2 border border-plum/5">
                                                <ChevronRight size={18} />
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
                                    style={{ cursor: 'default' }}
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
                            >
                                {cardInner}
                            </Link>
                        );
                    })}
                </div>
            </main>

            {/* Footer */}
            <footer className="py-12 text-center border-t border-plum/5 mt-16 bg-white/20 backdrop-blur-sm relative z-10">
                <p className="text-plum/40 font-medium tracking-wide">© 2026 Chess Parfait. Interactive Zone.</p>
            </footer>
        </div>
    );
}
