import { useState, useMemo } from 'react';
import { Send, CheckCircle2, Skull, Donut, Cake, Loader2, ChevronLeft, Calendar } from 'lucide-react';
import { Chess } from 'chess.js';
import Navbar from '../components/Navbar/Navbar';
import { supabase } from '../lib/supabaseClient';
import puzzlesData from '../data/puzzles.json';

type Difficulty = 'Piece of Cake' | 'Hard Tart' | 'Challenge';

interface Puzzle {
    title: string;
    fen: string;
    question: string;
}

const StaticBoard = ({ fen, size = "small" }: { fen: string, size?: "small" | "large" }) => {
    const board = useMemo(() => {
        try {
            const game = new Chess(fen);
            return game.board();
        } catch (e) {
            console.error("Invalid FEN:", fen);
            return new Chess().board();
        }
    }, [fen]);

    const getPieceImg = (type: string, color: string) => {
        const piece = color + type.toUpperCase();
        return `https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/wikipedia/${piece}.svg`;
    };

    return (
        <div className={`grid grid-cols-8 grid-rows-8 w-full h-full border border-plum/10 rounded-lg overflow-hidden shadow-inner bg-white ${size === 'large' ? 'shadow-2xl' : ''}`}>
            {board.map((row, rowIndex) => 
                row.map((square, colIndex) => {
                    const isDark = (rowIndex + colIndex) % 2 === 1;
                    return (
                        <div 
                            key={`${rowIndex}-${colIndex}`}
                            className="flex items-center justify-center relative aspect-square"
                            style={{
                                background: isDark 
                                    ? 'linear-gradient(135deg, #D18B47 0%, #B58863 100%)' 
                                    : 'linear-gradient(135deg, #F8F5F2 0%, #FFFDD0 100%)'
                            }}
                        >
                            {square && (
                                <img 
                                    src={getPieceImg(square.type, square.color)} 
                                    alt={`${square.color}${square.type}`}
                                    className="w-[85%] h-[85%] select-none pointer-events-none drop-shadow-sm z-10"
                                    onError={(e) => {
                                        const piece = square.color + square.type.toUpperCase();
                                        e.currentTarget.src = `https://chessboardjs.com/img/chesspieces/wikipedia/${piece}.png`;
                                    }}
                                />
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
};

export default function TrainingPuzzles() {
    const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [formData, setFormData] = useState({ name: '', answer: '' });

    /**
     * Logic to determine the puzzle week.
     * We use a reference Monday (March 2, 2026) as the start of "Week 1".
     * Puzzles refresh every Monday at 12:00 AM.
     */
    const puzzleInfo = useMemo(() => {
        const now = new Date();
        
        // Reference Monday: March 2nd, 2026
        const referenceDate = new Date('2026-03-02T00:00:00');
        
        // Calculate the difference in milliseconds
        const diffInMs = now.getTime() - referenceDate.getTime();
        
        // Convert to weeks (7 days * 24h * 60m * 60s * 1000ms)
        const msInWeek = 1000 * 60 * 60 * 24 * 7;
        
        // Week number (1-indexed)
        // If before reference date, default to 1
        const weekIndex = diffInMs < 0 ? 0 : Math.floor(diffInMs / msInWeek);
        const currentWeekNumber = weekIndex + 1;

        const select = (diff: Difficulty) => {
            const pool = (puzzlesData as any)[diff];
            return pool[weekIndex % pool.length] as Puzzle;
        };

        return {
            weekNumber: currentWeekNumber,
            puzzles: {
                'Piece of Cake': select('Piece of Cake'),
                'Hard Tart': select('Hard Tart'),
                'Challenge': select('Challenge')
            }
        };
    }, []);

    const weeklyPuzzles = puzzleInfo.puzzles;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDifficulty) return;
        setSubmitting(true);

        try {
            const { error } = await supabase
                .from('ChallengeAnswers')
                .insert([
                    {
                        user_name: formData.name,
                        difficulty: selectedDifficulty,
                        answer: formData.answer,
                        week: puzzleInfo.weekNumber, // Added week tracking
                        created_at: new Date().toISOString()
                    }
                ]);

            if (error) throw error;

            setShowSuccess(true);
            setFormData({ name: '', answer: '' });
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error: any) {
            alert(`Error submitting answer: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const themes = {
        'Piece of Cake': { bg: 'bg-emerald-50/30', text: 'text-emerald-600', icon: <Cake size={32} /> },
        'Hard Tart': { bg: 'bg-amber-50/30', text: 'text-amber-600', icon: <Donut size={32} /> },
        'Challenge': { bg: 'bg-berry/5', text: 'text-berry', icon: <Skull size={32} /> }
    };

    return (
        <div className="h-screen bg-cream flex flex-col relative overflow-hidden text-plum font-sans">
            <div className="absolute top-0 left-0 w-250 h-250 bg-berry/5 rounded-full blur-3xl -z-10 -translate-x-1/2 -translate-y-1/2" />
            
            <Navbar />

            <main className="flex-1 max-w-7xl mx-auto w-full px-6 flex flex-col justify-center relative z-10 py-8">
                
                {!selectedDifficulty ? (
                    <>
                        {/* Landing View Header */}
                        <header className="text-center mb-12 max-w-3xl mx-auto">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 text-xs font-bold tracking-widest text-berry uppercase bg-berry/10 rounded-full">
                                Puzzle Week {puzzleInfo.weekNumber}
                            </div>
                            <h1 className="text-5xl md:text-6xl font-black text-plum mb-6 tracking-tight leading-tight">
                                Training <span className="text-berry italic">Puzzles</span>
                            </h1>
                            <div className="space-y-4">
                                <p className="text-xl text-plum/60 leading-relaxed">
                                    Select your desired intensity to begin this week's strategic challenge.
                                </p>
                                <div className="flex items-center justify-center gap-2 text-plum/40 text-sm font-bold uppercase tracking-widest">
                                    <Calendar size={16} />
                                    <span>Puzzles refresh every Monday</span>
                                </div>
                            </div>
                        </header>

                        {/* Difficulty Selection View */}
                        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto w-full pb-12">
                            {(['Piece of Cake', 'Hard Tart', 'Challenge'] as Difficulty[]).map((level) => (
                                <button
                                    key={level}
                                    onClick={() => setSelectedDifficulty(level)}
                                    className="glass rounded-[3rem] p-12 flex flex-col items-center gap-8 group hover:-translate-y-2 transition-all duration-500 border-plum/5 hover:border-berry/20 shadow-xl"
                                >
                                    <div className={`p-8 rounded-[2.5rem] bg-white shadow-sm group-hover:scale-110 transition-transform duration-500 ${themes[level].text}`}>
                                        {themes[level].icon}
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-3xl font-serif font-black tracking-tight mb-2">{level}</h3>
                                        <span className="font-black uppercase tracking-[0.2em] text-[10px] text-plum/30">Difficulty</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    /* Puzzle Detail View */
                    <div className="w-full max-w-6xl mx-auto animate-in fade-in zoom-in-95 duration-500">
                        <div className="flex justify-between items-center mb-6">
                            <button 
                                onClick={() => setSelectedDifficulty(null)}
                                className="inline-flex items-center gap-2 text-plum/40 hover:text-berry font-bold uppercase text-[10px] tracking-widest transition-colors"
                            >
                                <ChevronLeft size={16} /> Back to selection
                            </button>
                            <span className="text-[10px] font-black uppercase tracking-widest text-plum/30">
                                Week {puzzleInfo.weekNumber} Challenge
                            </span>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            {/* Enlarged Board */}
                            <div className="w-full aspect-square max-w-120 mx-auto relative group">
                                <div className="absolute -inset-4 border-2 border-berry/10 rounded-[2.5rem] -z-10 group-hover:border-berry/20 transition-colors" />
                                <div className="p-4 glass rounded-[2.5rem] shadow-2xl h-full">
                                    <StaticBoard fen={weeklyPuzzles[selectedDifficulty].fen} size="large" />
                                </div>
                            </div>

                            {/* Puzzle Info & Form */}
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className={`inline-flex items-center gap-3 px-3 py-1.5 rounded-lg ${themes[selectedDifficulty].bg}`}>
                                        <span className={themes[selectedDifficulty].text}>{themes[selectedDifficulty].icon}</span>
                                        <span className="font-black uppercase tracking-widest text-[10px] text-plum/60">{selectedDifficulty}</span>
                                    </div>
                                    <h2 className="text-4xl font-serif font-black tracking-tight">{weeklyPuzzles[selectedDifficulty].title}</h2>
                                    <p className="text-xl text-plum/70 italic leading-relaxed">
                                        "{weeklyPuzzles[selectedDifficulty].question}"
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4 bg-white/30 p-6 rounded-[2.5rem] border border-plum/5 backdrop-blur-sm shadow-inner">
                                    <div className="space-y-1">
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-plum/40 ml-4">Your Name</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Enter your name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-white/50 border border-plum/5 rounded-xl px-5 py-3 text-plum focus:outline-none focus:border-berry transition-all font-bold text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-plum/40 ml-4">Your Analysis</label>
                                        <textarea
                                            required
                                            rows={3}
                                            placeholder="Your answer"
                                            value={formData.answer}
                                            onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                                            className="w-full bg-white/50 border border-plum/5 rounded-xl px-5 py-3 text-plum focus:outline-none focus:border-berry transition-all font-bold text-sm resize-none"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className={`w-full py-4 rounded-xl font-black text-white transition-all flex items-center justify-center gap-3 shadow-xl ${
                                            submitting 
                                            ? 'bg-plum/20 cursor-not-allowed text-plum/40' 
                                            : 'bg-berry hover:bg-berry/90 shadow-berry/30 hover:scale-[1.02] active:scale-95'
                                        }`}
                                    >
                                        {submitting ? (
                                            <Loader2 size={20} className="animate-spin" />
                                        ) : (
                                            <>
                                                <Send size={18} />
                                                Submit Analysis
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Success Toast */}
            <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 bg-plum text-cream px-10 py-5 rounded-4xl font-black shadow-2xl flex items-center gap-4 z-100 transition-all duration-700 border border-white/10 ${
                showSuccess ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-90 pointer-events-none'
            }`}>
                <CheckCircle2 size={24} className="text-berry" />
                Analysis Received!
            </div>
        </div>
    );
}
