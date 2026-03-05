import { useState, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Target, Trophy, BarChart3, Mail, ChevronRight } from 'lucide-react';
import Navbar from '../components/Navbar/Navbar.tsx';

export default function Home() {
    const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const [game, setGame] = useState(new Chess(fen));
    const [moveFrom, setMoveFrom] = useState("");
    const [optionSquares, setOptionSquares] = useState({});

    function onSquareClick(square: string) {
        // from square
        if (!moveFrom) {
            const moves = game.moves({
                square: square as any,
                verbose: true
            });
            if (moves.length === 0) return;

            const newSquares: any = {};
            moves.map((move) => {
                const fromPiece = game.get(square as any);
                const toPiece = game.get(move.to as any);
                
                newSquares[move.to] = {
                    background:
                        toPiece && fromPiece && toPiece.color !== fromPiece.color
                            ? "radial-gradient(circle, rgba(210, 49, 87, .1) 85%, transparent 85%)"
                            : "radial-gradient(circle, rgba(210, 49, 87, .6) 25%, transparent 25%)",
                    borderRadius: "50%",
                };
                return move;
            });
            newSquares[square] = {
                background: "rgba(210, 49, 87, 0.2)",
            };
            setOptionSquares(newSquares);
            setMoveFrom(square);
            return;
        }

        // to square
        const gameCopy = new Chess(game.fen());
        const move = gameCopy.move({
            from: moveFrom,
            to: square,
            promotion: "q",
        });

        if (move === null) {
            const moves = game.moves({
                square: square as any,
                verbose: true
            });
            if (moves.length === 0) {
                setMoveFrom("");
                setOptionSquares({});
                return;
            }

            const newSquares: any = {};
            moves.map((move) => {
                const fromPiece = game.get(square as any);
                const toPiece = game.get(move.to as any);

                newSquares[move.to] = {
                    background:
                        toPiece && fromPiece && toPiece.color !== fromPiece.color
                            ? "radial-gradient(circle, rgba(210, 49, 87, .1) 85%, transparent 85%)"
                            : "radial-gradient(circle, rgba(210, 49, 87, .6) 25%, transparent 25%)",
                    borderRadius: "50%",
                };
                return move;
            });
            newSquares[square] = {
                background: "rgba(210, 49, 87, 0.2)",
            };
            setOptionSquares(newSquares);
            setMoveFrom(square);
            return;
        }

        setGame(gameCopy);
        setMoveFrom("");
        setOptionSquares({});
    }

    function onPieceDrop(sourceSquare: string, targetSquare: string) {
        const gameCopy = new Chess(game.fen());
        const move = gameCopy.move({
            from: sourceSquare,
            to: targetSquare,
            promotion: "q",
        });
        if (move === null) return false;
        setGame(gameCopy);
        setOptionSquares({});
        return true;
    }

    const boardStyles = useMemo(() => ({
        borderRadius: '8px',
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
    }), []);

    return (
        <div className="min-h-screen bg-cream flex flex-col font-sans text-plum">
            <Navbar /> 
            
            <header className="relative overflow-hidden pt-12 pb-24 px-6">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-150 h-150 bg-berry/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-100 h-100 bg-plum/5 rounded-full blur-3xl" />

                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 relative z-10">
                    <div className="flex-1 text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 text-xs font-bold tracking-widest text-berry uppercase bg-berry/10 rounded-full">
                            Luis Chan | FIDE Master 
                        </div>
                        <h1 className="text-6xl md:text-7xl font-black mb-8 leading-tight tracking-tight">
                            Master the Art of <span className="text-berry">Chess Strategy</span>
                        </h1>
                        <p className="text-xl text-plum/70 mb-10 max-w-xl leading-relaxed">
                            Personalised coaching designed to refine your chess intuition through structured training and external support. Learn through instructive and engaging face-to-face sessions in Melbourne.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <a href="#contact" className="px-8 py-4 bg-plum text-cream font-bold rounded-xl hover:bg-plum/90 transition-all shadow-lg shadow-plum/20 flex items-center gap-2">
                                Book a Session <ChevronRight size={18} />
                            </a>
                            <a href="/about" className="px-8 py-4 bg-white/50 border border-plum/10 text-plum font-bold rounded-xl hover:bg-white transition-all">
                                Learn More
                            </a>
                        </div>
                    </div>

                    <div className="flex-1 w-full max-w-md relative">
                        {/* Board Container with Glassmorphism shadow */}
                        <div className="relative z-10 p-4 glass rounded-3xl">
                            <Chessboard
                                {...({
                                    id: "ParfaitBoard",
                                    position: game.fen(),
                                    onPieceDrop: onPieceDrop,
                                    onSquareClick: onSquareClick,
                                    customBoardStyle: boardStyles,
                                    customDarkSquareStyle: { 
                                        background: 'linear-gradient(135deg, #6B5B95 0%, #4A154B 100%)' 
                                    },
                                    customLightSquareStyle: { 
                                        background: 'linear-gradient(135deg, #F8F5F2 0%, #FFFDD0 100%)' 
                                    },
                                    customSquareStyles: optionSquares,
                                    animationDuration: 300,
                                    boardOrientation: "white"
                                } as any)}
                            />
                        </div>
                        {/* Decorative "Parfait" ring */}
                        <div className="absolute -inset-4 border-2 border-berry/20 rounded-[2.5rem] z-0 pointer-events-none" />
                    </div>
                </div>
            </header>

            <section className="py-24 px-6 relative z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                        <div className="max-w-2xl">
                            <h2 className="text-4xl font-bold mb-4">Exceptional Training Services</h2>
                            <p className="text-lg text-plum/60">Comprehensive programs tailored to your specific rating goals and learning style.</p>
                        </div>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-8">
                        <ServiceCard 
                            icon={<Target className="text-berry" />} 
                            title="Custom Repertoires" 
                            desc="Learn from a collection of pre-prepared lines and ideas, tailored to your playstyle." 
                        />
                        <ServiceCard 
                            icon={<BarChart3 className="text-plum" />} 
                            title="Game Analysis" 
                            desc="Identify recurring mistakes and areas for improvement." 
                        />
                        <ServiceCard 
                            icon={<Trophy className="text-berry" />} 
                            title="Tournament Strategy" 
                            desc="Psychological preparation, time management and opening for upcoming opponents." 
                        />
                    </div>
                </div>
            </section>

            <section className="py-24 px-6 bg-plum text-cream overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                   <div className="absolute top-10 left-10 w-64 h-64 border-4 border-white rounded-full" />
                   <div className="absolute bottom-10 right-10 w-96 h-96 border-8 border-berry rounded-full" />
                </div>
                
                <div id="contact" className="max-w-4xl mx-auto text-center relative z-10">
                    <h2 className="text-5xl font-bold mb-8">Ready to elevate your game?</h2>
                    <p className="text-xl mb-12 text-cream/80">
                        Whether you're a beginner or a seasoned player, give me a message to we can discuss some game plans!
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <a href="mailto:luischanchess@gmail.com" className="inline-flex items-center gap-3 bg-berry hover:bg-berry/90 text-white px-10 py-5 rounded-2xl font-bold transition-all transform hover:scale-105 shadow-xl shadow-berry/30">
                            <Mail size={22} /> Contact for Availability
                        </a>
                        <div className="text-cream/60 font-medium">
                            Based in Melbourne, Australia
                        </div>
                    </div>
                </div>
            </section>

            <footer className="py-12 text-center border-t border-plum/5 bg-white/30 backdrop-blur-sm">
                <p className="text-plum/40 font-medium">© 2026 Chess Parfait.</p>
            </footer>
        </div>
    );
}

function ServiceCard({ icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="p-10 glass rounded-3xl hover:bg-white/80 transition-all duration-500 group border-plum/5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 bg-cream group-hover:scale-110 transition-transform duration-500 shadow-sm">
                {icon}
            </div>
            <h3 className="text-2xl font-bold mb-4 group-hover:text-berry transition-colors">{title}</h3>
            <p className="text-plum/70 leading-relaxed">{desc}</p>
        </div>
    );
}

