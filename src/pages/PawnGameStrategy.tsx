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
                        Mastering the simplest form of chess requires a deep understanding of pawn structures and endgame principles.
                    </p>
                </header>

                <div className="grid gap-12">
                    <section className="glass p-8 md:p-12 rounded-[3rem] border-plum/5 shadow-xl">
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
                            <div className="glass p-8 rounded-[2.5rem] border-plum/5 shadow-lg">
                                <Lightbulb className="text-berry mb-4" size={32} />
                                <h3 className="text-xl font-black mb-3">Passed Pawns</h3>
                                <p className="text-plum/60 text-sm leading-relaxed">
                                    Creating a passed pawn (one that has no opposing pawns in front or on adjacent files) is your primary path to victory.
                                </p>
                            </div>
                            <div className="glass p-8 rounded-[2.5rem] border-plum/5 shadow-lg">
                                <BookOpen className="text-plum mb-4" size={32} />
                                <h3 className="text-xl font-black mb-3">Opposition</h3>
                                <p className="text-plum/60 text-sm leading-relaxed">
                                    Just like in full chess endgames, the concept of opposition—placing pawns to block your opponent's progress—is crucial.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="glass p-12 rounded-[3rem] border-plum/5 shadow-xl bg-plum text-cream">
                        <h2 className="text-3xl font-serif font-black mb-8 text-white">Experience Notes</h2>
                        <div className="space-y-6 opacity-80 italic text-lg leading-relaxed">
                            <p>"I've found that moving first as White provides a slight tempo advantage, but Black's defensive resources are often underestimated if they can force a locked position."</p>
                            <p>"Always calculate the 'Race to the Finish'. Sometimes it's better to ignore a capture if it means your pawn reaches the end one move sooner."</p>
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
