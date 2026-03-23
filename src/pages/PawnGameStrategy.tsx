import React from 'react';
import Navbar from '../components/Navbar/Navbar';
import { ChevronLeft, Lightbulb, BookOpen, Target } from 'lucide-react';
import { Link } from 'react-router-dom';

const PawnGameStrategy: React.FC = () => {
    return (
        <div className="min-h-screen bg-cream flex flex-col font-sans text-plum overflow-x-hidden">
            <Navbar />

            <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 md:py-24">
                <Link
                    to="/PawnGame"
                    className="inline-flex items-center gap-2 text-plum/40 hover:text-berry font-bold uppercase text-xs tracking-widest transition-all mb-12 hover:translate-x-[-4px]"
                >
                    <ChevronLeft size={16} /> Back to Game
                </Link>

                <header className="mb-16">
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6">
                        Pawn Game <span className="text-berry italic">Strategy</span>
                    </h1>
                    <p className="text-xl text-plum/60 leading-relaxed font-medium">
                        This game has a special place in my chess journey. It was the first minigame introduced to me by my primary school chess teacher when I was just learning how to move the chess pieces.
                        Interestingly, the simple looking chess game has great depth and teaches many of the fundamentals of pawn structure and strategy.
                    </p>
                    <p className="text-xl text-plum/60 leading-relaxed font-medium">
                        After many years, I have come to the conclusion that White should be winning if they play either 1.b4, 1.c4, 1.f4 or 1.g4. All other moves result in the win for Black as Black ends up with a surperior structure and eventually a zugzwang.
                        Test your strategy out against the AI using minimax and transposition lookups!
                    </p>
                </header>

                <div className="grid gap-12">
                    <section className="soft-card p-8 md:p-12 mb-12">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-berry/10 rounded-2xl text-berry">
                                <Target size={28} />
                            </div>
                            <h2 className="text-3xl font-serif font-black">The Core Objective</h2>
                        </div>
                        <p className="text-plum/70 leading-relaxed text-lg mb-6">
                            The Pawn Game is a fundamental training exercise. The first player to reach the opponent's back rank wins. Alternatively, you win if your opponent has no legal moves or if you capture all their pawns.
                        </p>
                    </section>

                    <section className="space-y-8">
                        <h2 className="text-4xl font-serif font-black px-4">Key Principles</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="soft-card p-8">
                                <Lightbulb className="text-berry mb-4" size={32} />
                                <h3 className="text-xl font-black mb-3">Passed Pawns</h3>
                                <p className="text-plum/60 text-sm leading-relaxed">
                                    Creating a passed pawn (one that has no opposing pawns in front or on adjacent files) is your primary path to victory.
                                </p>
                            </div>
                            <div className="soft-card p-8">
                                <BookOpen className="text-plum mb-4" size={32} />
                                <h3 className="text-xl font-black mb-3">Zugzwang</h3>
                                <p className="text-plum/60 text-sm leading-relaxed">
                                    Just like in full chess endgames, when one player is forced to make the last bad move, they will lose the game. It is a fine line between having the last tempo to secure a zugzwang!
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            <footer className="py-12 text-center border-t border-plum/5 mt-12">
                <p className="text-plum/40 font-medium tracking-wide">© 2026 Chess Parfait. Documentation.</p>
            </footer>
        </div>
    );
};

export default PawnGameStrategy;
