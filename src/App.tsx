import { useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Target, Trophy, BarChart3, Mail } from 'lucide-react';

export default function App() {
  // Initialize a game state - you can put a FEN string in Chess() 
  // to start at a specific position!
  const [game, setGame] = useState(new Chess());

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
      promotion: 'q', // always promote to queen for simplicity
    });
    if (move === null) return false;
    return true;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <nav className="p-6 flex justify-between items-center bg-white shadow-sm border-b border-slate-100">
        <h1 className="text-2xl font-bold tracking-tight text-indigo-600">Chess Parfait</h1>
        <button className="bg-indigo-600 text-white px-5 py-2 rounded-full font-medium hover:bg-indigo-700 transition">
          Book a Lesson
        </button>
      </nav>

      <header className="max-w-6xl mx-auto px-6 py-16 flex flex-col md:flex-row items-center gap-12">
        {/* Text Side */}
        <div className="flex-1 text-left">
          <div className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wide text-indigo-600 uppercase bg-indigo-50 rounded-full">
            FIDE Master | 7+ years coaching experience
          </div>
          <h2 className="text-5xl font-extrabold mb-6 leading-tight">
            Elevate Your Game with <span className="text-indigo-600">Data-Driven</span> Coaching
          </h2>
          <p className="text-xl text-slate-600 mb-8">
            Personalized training for ambitious players. Stop guessing and start 
            calculating with FM-level insights.
          </p>
          <div className="flex gap-4">
            <button className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-700">Get Started</button>
            <button onClick={() => setGame(new Chess())} className="border border-slate-300 px-8 py-3 rounded-lg font-bold hover:bg-slate-100">Reset Board</button>
          </div>
        </div>

        {/* Chessboard Side */}
        <div className="flex-1 w-full max-w-[500px] shadow-2xl rounded-lg overflow-hidden border-8 border-white bg-white">
          <Chessboard 
            {...({
              position: game.fen(),
              onPieceDrop: onDrop,
              boardOrientation: "white",
              customDarkSquareStyle: { backgroundColor: '#818cf8' },
              customLightSquareStyle: { backgroundColor: '#e2e8f0' }
            } as any)}
          />
        </div>
      </header>

      {/* Services Grid */}
      <section className="bg-white py-20 px-6 border-t border-slate-100">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12">
          <ServiceCard icon={<Target />} title="Custom Repertoires" desc="Build a robust opening suite tailored to your style." />
          <ServiceCard icon={<BarChart3 />} title="Game Analysis" desc="Deep-dive sessions to identify and fix your tactical leaks." />
          <ServiceCard icon={<Trophy />} title="Tournament Prep" desc="Preparation strategies for your next big rating milestone." />
        </div>
      </section>

      <footer className="py-20 text-center bg-slate-900 text-white px-6">
        <h3 className="text-3xl font-bold mb-6">Ready to reach the next level?</h3>
        <a href="mailto:hello@chessparfait.com" className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 px-8 py-3 rounded-lg font-bold transition">
          <Mail size={20} /> Contact for Availability
        </a>
      </footer>
    </div>
  );
}

// Small helper component for the grid
function ServiceCard({ icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="text-center group">
      <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 p-4 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-600">{desc}</p>
    </div>
  );
}