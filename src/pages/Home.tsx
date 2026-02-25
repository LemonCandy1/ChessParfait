import { useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Target, Trophy, BarChart3, Mail } from 'lucide-react';
import { Link } from 'react-router-dom'; // Added for navigation
import logo from '../assets/Logo.jpg'; // Adjusted path for pages folder
import chessParfaitText from '../assets/Chess Parfait text.jpg'; // New asset for text logo

export default function Home() {
    const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const [game, setGame] = useState(new Chess(fen));

    function makeAMove(move: any) {
        const gameCopy = new Chess(game.fen());
        const result = gameCopy.move(move);
        setGame(gameCopy);
        return result;
    }

    function onDrop(sourceSquare: string, targetSquare: string) {
        const move = makeAMove({
            from: sourceSquare,
            to: targetSquare,
            promotion: 'q',
        });
        if (move === null) return false;
        return true;
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            <nav className="py-1 px-2 bg-white shadow-sm border-b border-slate-100">
                <div className="max-w-7xl mx-auto grid grid-cols-3 items-center">

                    {/* 1. Left Column: Logo */}
                    <div className="flex justify-start">
                        <Link
                            to="/"
                            className="flex flex-col items-center group transition-transform hover:scale-105 active:scale-95"
                            onClick={() => setGame(new Chess(fen))}
                        >
                            <img src={logo} alt="Chess Parfait Logo" className="h-12 w-auto md:h-16" />
                        </Link>
                        <Link
                            to="/"
                            className="hidden md:inline-flex items-center gap-2 text-indigo-600 font-semibold hover:text-indigo-700 transition ml-4"
                            onClick={() => setGame(new Chess(fen))}
                        >
                            <img
                                src={chessParfaitText} // Ensure this is imported at the top of your file
                                alt="Chess Parfait"
                                className="h-12 w-auto md:h-14 ml-3 object-contain"
                            />
                        </Link>
                    </div>

                    {/* 2. Center Column: Navigation Links */}
                    <div className="flex justify-center items-center gap-10">
                        <Link to="/" className="text-slate-600 font-bold hover:text-indigo-600 transition text-xs md:text-sm uppercase tracking-widest">
                            Home
                        </Link>

                        <Link to="/Challenge_Rulette" className="text-slate-600 font-bold hover:text-indigo-600 transition text-xs md:text-sm uppercase tracking-widest">
                            Challenge Rulette
                        </Link>

                        <Link to="/about" className="text-slate-600 font-bold hover:text-indigo-600 transition text-xs md:text-sm uppercase tracking-widest">
                            About Me
                        </Link>
                    </div>

                    <div className="flex justify-end">
                        <button className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold hover:bg-indigo-700 shadow-md transition text-xs md:text-sm">
                            Book a Lesson
                        </button>
                    </div>

                </div>
            </nav>

            <header className="max-w-6xl mx-auto px-6 py-16 flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1 text-left">
                    <div className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wide text-indigo-600 uppercase bg-indigo-50 rounded-full">
                        Luis Chan | FIDE Master 
                    </div>
                    <h2 className="text-5xl font-extrabold mb-6 leading-tight">
                        Elevate Your Game with <span className="text-indigo-600">Instructive and Engaging</span> Coaching
                    </h2>
                    <p className="text-xl text-slate-600 mb-8">
                        Personalised training for ambitious players.
                    </p>
                    <div className="flex gap-4">
                        <button className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-lg">Get Started</button>
                        <button
                            onClick={() => setGame(new Chess(fen))}
                            className="border border-slate-300 px-8 py-3 rounded-lg font-bold hover:bg-white transition"
                        >
                            Reset Board
                        </button>
                    </div>
                </div>

                <div className="flex-1 w-full max-w-[500px] shadow-2xl rounded-lg overflow-hidden border-8 border-white bg-white">
                    <Chessboard
                        id="BasicBoard"
                        position={game.fen()} // FIXED: Changed from boardPosition to position
                        onPieceDrop={onDrop}
                        {...({
                            boardOrientation: "white",
                            customDarkSquareStyle: { backgroundColor: '#6673eeff' },
                            customLightSquareStyle: { backgroundColor: '#5a5a5aff' }
                        } as any)}
                    />
                </div>
            </header>

            <section className="bg-white py-20 px-6 border-t border-slate-100">
                <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12">
                    <ServiceCard icon={<Target />} title="Custom Repertoires" desc="Build a robust opening suite tailored to your style." />
                    <ServiceCard icon={<BarChart3 />} title="Game Analysis" desc="Deep-dive sessions to identify and fix your tactical leaks." />
                    <ServiceCard icon={<Trophy />} title="Tournament Prep" desc="Preparation strategies for your next big rating milestone." />
                </div>
            </section>

            <footer className="py-20 text-center bg-slate-900 text-white px-6">
                <h3 className="text-3xl font-bold mb-6">Ready to reach the next level?</h3>
                <a href="mailto:luischanchess@gmail.com" className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 px-8 py-3 rounded-lg font-bold transition">
                    <Mail size={20} /> Contact for Availability
                </a>
            </footer>
        </div>
    );
}

function ServiceCard({ icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="text-center group">
            <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 p-4 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-3 group-hover:text-indigo-600 transition-colors">{title}</h3>
            <p className="text-slate-600">{desc}</p>
        </div>
    );
}