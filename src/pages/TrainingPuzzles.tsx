import { useState, useMemo, useEffect } from 'react';
import { Send, CheckCircle2, Skull, Donut, Cake, Loader2, ChevronLeft, Calendar, RotateCcw } from 'lucide-react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import Navbar from '../components/Navbar/Navbar';
import { supabase } from '../lib/supabaseClient';

type Difficulty = 'Piece of Cake' | 'Hard Tart' | 'Challenge';

interface Puzzle {
    title: string;
    fen: string;
    question: string;
}

type PuzzlesData = Record<Difficulty, Puzzle[]>;

export default function TrainingPuzzles() {
    const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [formData, setFormData] = useState({ name: '', answer: '' });
    const [game, setGame] = useState(new Chess());

    // ── Puzzle data fetched from the Cloudflare Worker → Google Sheets ──
    const [puzzlesData, setPuzzlesData] = useState<PuzzlesData | null>(null);
    const [puzzlesLoading, setPuzzlesLoading] = useState(true);
    const [puzzlesError, setPuzzlesError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/puzzles')
            .then(async (res) => {
                if (!res.ok) {
                    let errorMessage = `Failed to load puzzles (${res.status})`;
                    try {
                        const errData = await res.json();
                        if (errData.error) errorMessage += `: ${errData.error}`;
                    } catch (_) {}
                    throw new Error(errorMessage);
                }
                return res.json() as Promise<PuzzlesData>;
            })
            .then((data) => {
                setPuzzlesData(data);
                setPuzzlesLoading(false);
            })
            .catch((err: Error) => {
                setPuzzlesError(err.message);
                setPuzzlesLoading(false);
            });
    }, []);

    /**
     * Logic to determine the puzzle week.
     * We use a reference Monday (March 2, 2026) as the start of "Week 1".
     * Puzzles refresh every Monday at 12:00 AM.
     */
    const puzzleInfo = useMemo(() => {
        if (!puzzlesData) return null;

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
            const pool = puzzlesData[diff];
            return pool[weekIndex % pool.length];
        };

        return {
            weekNumber: currentWeekNumber,
            puzzles: {
                'Piece of Cake': select('Piece of Cake'),
                'Hard Tart': select('Hard Tart'),
                'Challenge': select('Challenge')
            }
        };
    }, [puzzlesData]);

    const weeklyPuzzles = puzzleInfo?.puzzles ?? null;
    const activePuzzle = selectedDifficulty && weeklyPuzzles ? weeklyPuzzles[selectedDifficulty] : null;
    const initialTurn = activePuzzle ? activePuzzle.fen.split(' ')[1] : 'w';
    const puzzleOrientation = initialTurn === 'b' ? 'black' : 'white';

    useEffect(() => {
        if (selectedDifficulty && weeklyPuzzles) {
            setGame(new Chess(weeklyPuzzles[selectedDifficulty].fen));
        }
    }, [selectedDifficulty, weeklyPuzzles]);

    const onDrop = ({ sourceSquare, targetSquare }: { sourceSquare: string, targetSquare: string | null }) => {
        if (!targetSquare) return false;
        try {
            const gameCopy = new Chess(game.fen());
            const move = gameCopy.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q',
            });
            
            if (move === null) return false;
            
            setGame(gameCopy);
            return true;
        } catch(e) {
            return false;
        }
    };

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
                        week: puzzleInfo?.weekNumber,
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

    // ── Early returns for loading / error state (also consumes puzzlesLoading / puzzlesError) ──
    if (puzzlesLoading) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center text-plum font-sans">
                <Navbar />
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={40} className="animate-spin text-berry" />
                    <p className="text-plum/50 font-bold uppercase tracking-widest text-xs">Loading puzzles…</p>
                </div>
            </div>
        );
    }

    if (puzzlesError || !puzzleInfo) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center text-plum font-sans">
                <Navbar />
                <div className="flex flex-col items-center gap-4 text-center">
                    <p className="text-berry font-black text-lg">Failed to load puzzles</p>
                    <p className="text-plum/50 text-sm">{puzzlesError ?? 'Unknown error'}</p>
                </div>
            </div>
        );
    }

    const themes = {
        'Piece of Cake': { bg: 'bg-emerald-50/30', text: 'text-emerald-600', icon: <Cake size={32} /> },
        'Hard Tart': { bg: 'bg-amber-50/30', text: 'text-amber-600', icon: <Donut size={32} /> },
        'Challenge': { bg: 'bg-berry/5', text: 'text-berry', icon: <Skull size={32} /> }
    };

    return (
        <div className="min-h-screen bg-cream flex flex-col relative overflow-x-hidden text-plum font-sans">
            <div className="absolute top-0 left-0 w-250 h-250 bg-berry/5 rounded-full blur-3xl -z-10 -translate-x-1/2 -translate-y-1/2" />
            
            <Navbar />

            <main className={`flex-1 max-w-7xl mx-auto w-full px-6 flex flex-col relative z-10 py-4 ${!selectedDifficulty ? 'justify-center' : 'justify-start'}`}>
                
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
                                    className="soft-card soft-card-hover rounded-[3rem] p-12 flex flex-col items-center gap-8 group"
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
                        <div className="flex justify-between items-center mb-2">
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

                        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start mt-2">
                            <div className="flex flex-col items-center w-full">
                                <div className="flex items-center gap-3 mb-2 px-4 py-2 rounded-xl bg-white/70 backdrop-blur-sm border border-plum/5 shadow-sm">
                                    <div className={`w-3 h-3 rounded-full ${initialTurn === 'w' ? 'bg-white border-[1.5px] border-plum/20 shadow-inner' : 'bg-plum shadow-inner'}`} />
                                    <span className="font-black text-[10px] uppercase tracking-widest text-plum/70">
                                        {initialTurn === 'w' ? 'White to move' : 'Black to move'}
                                    </span>
                                </div>
                                <div className="w-full aspect-square max-w-[420px] mx-auto relative group">
                                    <div className="p-4 soft-card shadow-2xl h-full flex flex-col">
                                        <div className="w-full h-full rounded-2xl overflow-hidden shadow-inner border border-plum/10 bg-white translate-z-0">
                                            <Chessboard 
                                                options={{
                                                    position: game.fen(),
                                                    boardOrientation: puzzleOrientation,
                                                    onPieceDrop: onDrop,
                                                    darkSquareStyle: { backgroundColor: '#b58863' },
                                                    lightSquareStyle: { backgroundColor: '#f0d9b5' },
                                                    animationDurationInMs: 300
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setGame(new Chess(activePuzzle!.fen))}
                                    className="mt-3 flex items-center justify-center gap-2 py-3 px-6 soft-button w-full max-w-[420px]"
                                >
                                    <RotateCcw size={16} />
                                    Reset Puzzle
                                </button>
                            </div>

                            {/* Puzzle Info & Form */}
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className={`inline-flex items-center gap-3 px-3 py-1.5 rounded-lg ${themes[selectedDifficulty].bg}`}>
                                        <span className={themes[selectedDifficulty].text}>{themes[selectedDifficulty].icon}</span>
                                        <span className="font-black uppercase tracking-widest text-[10px] text-plum/60">{selectedDifficulty}</span>
                                    </div>
                                    <h2 className="text-4xl font-serif font-black tracking-tight">{weeklyPuzzles?.[selectedDifficulty]?.title}</h2>
                                    <p className="text-xl text-plum/70 italic leading-relaxed">
                                        "{weeklyPuzzles?.[selectedDifficulty]?.question}"
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
                                        className={`w-full py-4 soft-button-berry flex items-center justify-center gap-3 ${
                                            submitting 
                                            ? 'opacity-50 pointer-events-none' 
                                            : ''
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
