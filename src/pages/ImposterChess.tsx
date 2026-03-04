import { Crown } from 'lucide-react';
import Navbar from '../components/Navbar/Navbar';

export default function ImposterChess() {
    return (
        <div className="min-h-screen bg-cream flex flex-col font-sans text-plum overflow-x-hidden">
            <Navbar />

            <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-32 flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-plum/5 text-plum/60 text-xs font-bold uppercase tracking-widest mb-8">
                    <Crown size={14} className="text-berry" />
                    Special Variant
                </div>
                
                <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-8">
                    Imposter <span className="text-berry italic">Chess</span>
                </h1>
                
                <p className="text-xl text-plum/60 max-w-2xl leading-relaxed">
                    A unique hidden-information variant. Development is currently in progress. Stay tuned for the ultimate battle of deception.
                </p>
                
                <div className="mt-16 w-24 h-1 bg-berry/20 rounded-full" />
            </main>

            <footer className="py-12 text-center border-t border-plum/5">
                <p className="text-plum/40 font-medium tracking-wide">© 2026 Chess Parfait. Imposter Chess Edition.</p>
            </footer>
        </div>
    );
}
