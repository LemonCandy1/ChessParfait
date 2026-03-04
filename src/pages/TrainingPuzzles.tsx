import { useState, useMemo } from 'react';
import { Send, CheckCircle2, Trophy, Brain, Target, Loader2 } from 'lucide-react';
import { Chessboard } from 'react-chessboard';
import Navbar from '../components/Navbar/Navbar';
import { supabase } from '../lib/supabaseClient';

type Difficulty = 'Piece of Cake' | 'Doughnut Elo' | 'Challenge';

interface Challenge {
    difficulty: Difficulty;
    title: string;
    fen: string;
    question: string;
    hint?: string;
}

const CHALLENGES: Challenge[] = [
    {
        difficulty: 'Piece of Cake',
        title: 'Basic Mates',
        fen: '4k3/4Q3/4K3/8/8/8/8/8 b - - 0 1',
        question: 'White to move. Is this a checkmate?',
    },
    {
        difficulty: 'Doughnut Elo',
        title: 'Tactical Awareness',
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1',
        question: 'White to move. Find the quickest way to win the game.',
    },
    {
        difficulty: 'Challenge',
        title: 'Master Level Strategy',
        fen: 'rnbq1rk1/pp2bppp/4pn2/2pp4/2PP4/2N2NP1/PP2PPBP/R1BQ1RK1 w - - 0 1',
        question: 'White to move. What is the most instructive strategic plan in this Catalan position?',
    }
];

export default function TrainingPuzzles() {
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [formData, setFormData] = useState<{ [key: string]: { name: string, answer: string } }>({
        'Piece of Cake': { name: '', answer: '' },
        'Doughnut Elo': { name: '', answer: '' },
        'Challenge': { name: '', answer: '' }
    });

    const handleInputChange = (difficulty: Difficulty, field: 'name' | 'answer', value: string) => {
        setFormData(prev => ({
            ...prev,
            [difficulty]: { ...prev[difficulty], [field]: value }
        }));
    };

    const handleSubmit = async (e: React.FormEvent, difficulty: Difficulty) => {
        e.preventDefault();
        setSubmitting(difficulty);

        const { name, answer } = formData[difficulty];

        try {
            const { error } = await supabase
                .from('ChallengeAnswers')
                .insert([
                    {
                        user_name: name,
                        difficulty: difficulty,
                        answer: answer,
                        created_at: new Date().toISOString()
                    }
                ]);

            if (error) throw error;

            setShowSuccess(true);
            setFormData(prev => ({
                ...prev,
                [difficulty]: { name: '', answer: '' }
            }));
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error: any) {
            alert(`Error submitting answer: ${error.message}`);
        } finally {
            setSubmitting(null);
        }
    };

    const boardStyles = useMemo(() => ({
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
    }), []);

    return (
        <div className="min-h-screen bg-cream flex flex-col relative overflow-x-hidden text-plum font-sans">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-[1000px] h-[1000px] bg-berry/5 rounded-full blur-3xl -z-10 -translate-x-1/2 -translate-y-1/2" />
            
            <Navbar />

            <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-16 relative z-10">
                <header className="text-center mb-20 max-w-3xl mx-auto">
                    <div className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest text-berry uppercase bg-berry/10 rounded-full">
                        Test Your Intuition
                    </div>
                    <h1 className="text-6xl md:text-7xl font-black text-plum mb-8 tracking-tight leading-tight">
                        Training <span className="text-berry italic">Puzzles</span>
                    </h1>
                    <p className="text-xl text-plum/60 leading-relaxed">
                        Curated positions from Master-level games. Solve them to build your strategic repertoire and earn your place on the leaderboard.
                    </p>
                </header>

                <div className="grid lg:grid-cols-3 gap-10">
                    {CHALLENGES.map((challenge) => (
                        <div key={challenge.difficulty} className="glass rounded-[3rem] border-plum/5 shadow-2xl overflow-hidden flex flex-col hover:border-berry/20 transition-all duration-500 group relative">
                            {/* Card Header */}
                            <div className={`p-8 flex items-center justify-between border-b border-plum/5 ${
                                challenge.difficulty === 'Piece of Cake' ? 'bg-emerald-50/30' :
                                challenge.difficulty === 'Doughnut Elo' ? 'bg-amber-50/30' :
                                'bg-berry/5'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-white shadow-sm">
                                        {challenge.difficulty === 'Piece of Cake' ? <Target size={20} className="text-emerald-600" /> :
                                         challenge.difficulty === 'Doughnut Elo' ? <Brain size={20} className="text-amber-600" /> :
                                         <Trophy size={20} className="text-berry" />}
                                    </div>
                                    <span className="font-black uppercase tracking-[0.2em] text-[10px] text-plum/40">{challenge.difficulty}</span>
                                </div>
                            </div>

                            {/* Chessboard Section */}
                            <div className="p-8 bg-white/30 flex items-center justify-center">
                                <div className="w-full aspect-square max-w-[320px] shadow-2xl rounded-2xl overflow-hidden border-8 border-white/50 relative">
                                    <Chessboard
                                        {...({
                                            id: `Challenge-${challenge.difficulty}`,
                                            position: challenge.fen,
                                            arePiecesDraggable: false,
                                            customBoardStyle: boardStyles,
                                            customDarkSquareStyle: { background: '#6B5B95' },
                                            customLightSquareStyle: { background: '#F8F5F2' }
                                        } as any)}
                                    />
                                </div>
                            </div>

                            {/* Question Section */}
                            <div className="p-10 flex-1 flex flex-col">
                                <h3 className="text-3xl font-serif font-black text-plum mb-4 tracking-tight">{challenge.title}</h3>
                                <p className="text-plum/70 mb-10 leading-relaxed font-medium italic">
                                    "{challenge.question}"
                                </p>

                                <form onSubmit={(e) => handleSubmit(e, challenge.difficulty)} className="space-y-4 mt-auto">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            required
                                            placeholder="Your Name"
                                            value={formData[challenge.difficulty].name}
                                            onChange={(e) => handleInputChange(challenge.difficulty, 'name', e.target.value)}
                                            className="w-full bg-white/50 border-2 border-plum/5 rounded-2xl px-5 py-4 text-plum focus:outline-none focus:border-berry transition-all placeholder:text-plum/30 font-bold text-sm"
                                        />
                                    </div>
                                    <div className="relative">
                                        <textarea
                                            required
                                            rows={3}
                                            placeholder="Explain your strategic plan..."
                                            value={formData[challenge.difficulty].answer}
                                            onChange={(e) => handleInputChange(challenge.difficulty, 'answer', e.target.value)}
                                            className="w-full bg-white/50 border-2 border-plum/5 rounded-2xl px-5 py-4 text-plum focus:outline-none focus:border-berry transition-all placeholder:text-plum/30 font-bold text-sm resize-none"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={submitting === challenge.difficulty}
                                        className={`w-full py-5 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-3 shadow-xl ${
                                            submitting === challenge.difficulty 
                                            ? 'bg-plum/20 cursor-not-allowed text-plum/40' 
                                            : 'bg-berry hover:bg-berry/90 shadow-berry/30 hover:scale-[1.02] active:scale-95'
                                        }`}
                                    >
                                        {submitting === challenge.difficulty ? (
                                            <Loader2 size={22} className="animate-spin" />
                                        ) : (
                                            <>
                                                <Send size={20} />
                                                Submit Analysis
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Success Toast */}
            <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 bg-plum text-cream px-10 py-5 rounded-[2rem] font-black shadow-2xl flex items-center gap-4 z-[100] transition-all duration-700 border border-white/10 ${
                showSuccess ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-90 pointer-events-none'
            }`}>
                <CheckCircle2 size={24} className="text-berry" />
                Analysis Received!
            </div>
        </div>
    );
}
