import { useState } from 'react';
import { Cake, Donut, AlertTriangle, Skull, X, MessageSquarePlus, CheckCircle2 } from 'lucide-react';
import rulesData from '../data/rules.json';
import Navbar from '../components/Navbar/Navbar';
import { supabase } from '../lib/supabaseClient.ts';
type Difficulty = 'Piece of Cake' | 'Doughnut Elo' | 'Pinned Down' | 'Challenge';

export default function ChallengeRulette() {
    interface Rule {
        title: string;
        rule: string;
    }
    const [isLoading, setIsLoading] = useState(false);
    const [difficulty, setDifficulty] = useState<Difficulty>('Piece of Cake');
    const [currentRule, setCurrentRule] = useState<Rule>({
        title: "Select a difficulty to draw your handicap",
        rule: "",
    });
    const BLOCK_REPEAT_VALUE = 3; // Number of recent rules to block from repeating
    const [isRevealing, setIsRevealing] = useState(false);
    const [history, setHistory] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [formData, setFormData] = useState({ name: '', rule: "", level: 'Doughnut Elo' });

    const drawRule = (level: Difficulty) => {
        setIsRevealing(true);
        setDifficulty(level);

        setTimeout(() => {
            const rulesForLevel = rulesData[level];
            const availableRules = rulesForLevel.filter(r => !history.includes(r.rule));
            const pool = availableRules.length > 0 ? availableRules : rulesForLevel;
            const nextRule = pool[Math.floor(Math.random() * pool.length)];
            setHistory(prev => [nextRule.rule, ...prev].slice(0, BLOCK_REPEAT_VALUE));
            setCurrentRule(nextRule);
            setIsRevealing(false);
        }, 200);
    };

    const getIcon = (level: Difficulty) => {
        switch (level) {
            case 'Piece of Cake': return <Cake size={24} />;
            case 'Doughnut Elo': return <Donut size={24} />;
            case 'Pinned Down': return <AlertTriangle size={24} />;
            case 'Challenge': return <Skull size={24} />;
            default: return <Cake size={24} />;
        }
    };
    const handleSendSuggestion = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        // Insert new suggestion to Supabase
        // data and error are returned. If save is successful, error will be null and data is an array of rules.
        const { data, error } = await supabase
            .from('Suggestions')
            .insert([
                {
                    user_name: formData.name,
                    difficulty: formData.level,
                    rule_text: formData.rule
                },
            ]);
        if (error) {
            console.error('Error inserting suggestion:', error);
            setIsModalOpen(false);
            alert(`Error: ${error.message}`);
            setIsLoading(false);
            return
        }

        if (!error) {
            setIsModalOpen(false);
            setShowSuccess(true);
            setFormData({ name: '', rule: '', level: 'Doughnut Elo' });
            //only show success messsage for 2 secs
            setTimeout(() => setShowSuccess(false), 2000);
        }
        setIsLoading(false);
    };
    return (

        <div className="min-h-screen bg-gradient-to-b from-slate-100 via-indigo-50 to-slate-200 text-slate-900 font-sans flex flex-col relative">
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect fill='%234338ca' width='40' height='40'/%3E%3Crect fill='%234338ca' x='40' y='40' width='40' height='40'/%3E%3C/svg%3E")` }}>
            </div>
                
            <Navbar />
            <div className="max-w-7xl mx-auto w-full relative">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="absolute top-4 left-6 z-40 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 backdrop-blur-sm text-indigo-600 font-bold hover:bg-white hover:text-indigo-800 transition-all active:scale-95 group shadow-sm border border-slate-200 text-xs md:text-sm"
                >
                    <MessageSquarePlus size={18} className="group-hover:scale-110 transition-transform" />
                    <span>Suggest a Rule</span>
                </button>
            </div>          
            <main className="flex-1 flex flex-col items-center justify-start max-w-4xl mx-auto w-full pt-20 gap-6 -mt-12">
                {/* Header */}
                <div className="text-center space-y-7">
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight text-black">
                        Challenge Rulette
                    </h1>
                    <p className="text-xl text-slate-500">A fun page to give yourself an extra challenge! Rules are created by either me or my students.
                    </p>
                    <p className="text-xl text-slate-500 italic">
                        You must follow the rule or resign.
                    </p>
                </div>

                <div className="w-full max-w-4xl bg-white border-4 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col items-center text-center min-h-[250px] justify-center transition-all duration-500 ring-1 ring-slate-100"
                    style={{
                        borderColor:
                            difficulty === 'Piece of Cake' ? '#3b82f6' :
                                difficulty === 'Doughnut Elo' ? '#f59e0b' :
                                    difficulty === 'Pinned Down' ? '#f97316' :
                                        difficulty === 'Challenge' ? '#e11d48' :
                                            '#e2e8f0'
                    }}>

                    {/* Dynamic background glow */}
                    <div className={`absolute inset-0 opacity-10 blur-3xl transition-colors duration-700 ${difficulty === 'Piece of Cake' ? 'bg-blue-400' :
                            difficulty === 'Doughnut Elo' ? 'bg-amber-400' :
                                difficulty === 'Pinned Down' ? 'bg-orange-400' :
                                    difficulty === 'Challenge' ? 'bg-rose-400' : 'bg-slate-200'
                        }`} />

                    <div className="relative z-10">
                        <div className={`min-h-[120px] flex flex-col items-center gap-2 mb-6 transition-all duration-300 ${isRevealing ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}`}>

                            {/* UPDATED: Icon color now maps to difficulty */}
                            <div className={`mb-2 transition-colors duration-500 ${difficulty === 'Piece of Cake' ? 'text-blue-500' :
                                    difficulty === 'Doughnut Elo' ? 'text-amber-500' :
                                        difficulty === 'Pinned Down' ? 'text-orange-500' :
                                            difficulty === 'Challenge' ? 'text-rose-600' : 'text-slate-400'
                                }`}>
                                {getIcon(difficulty)}
                            </div>

                            <span className="text-3xl font-black tracking-[0.1em] text-black">
                                {currentRule.title}
                            </span>
                        </div>

                        {/* The Rule Text */}
                        <h2 className={`text-l md:text-xl font-medium leading-tight text-slate-600 tracking-tight transition-all duration-300 ${isRevealing ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'
                            }`}>
                            {currentRule.rule}
                        </h2>
                    </div>
                </div>

                {/* Difficulty Selectors */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl relative z-10 px-4">
                    {(['Piece of Cake', 'Doughnut Elo', 'Pinned Down', 'Challenge'] as Difficulty[]).map((level) => {
                        // Mapping difficulty to specific theme colors
                        const themes = {
                            'Piece of Cake': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', active: 'bg-blue-600 border-blue-700 shadow-blue-200' },
                            'Doughnut Elo': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', active: 'bg-amber-500 border-amber-600 shadow-amber-200' },
                            'Pinned Down': { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', active: 'bg-orange-500 border-orange-600 shadow-orange-200' },
                            'Challenge': { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-600', active: 'bg-rose-600 border-rose-700 shadow-rose-200' },
                        }[level];

                        const isActive = difficulty === level;

                        return (
                            <button
                                key={level}
                                onClick={() => drawRule(level)}
                                className={`py-5 px-4 rounded-2xl font-black flex flex-col items-center gap-3 transition-all hover:-translate-y-1 active:scale-95 border-2 ${isActive
                                        ? `${themes.active} text-white shadow-xl scale-105 z-20`
                                        : `${themes.bg} ${themes.border} ${themes.text} opacity-80 hover:opacity-100 shadow-sm`
                                    }`}
                            >
                                <span className={`${isActive ? 'text-white' : themes.text} transition-colors`}>
                                    {getIcon(level)}
                                </span>
                                <span className="text-[10px] md:text-xs uppercase tracking-[0.15em]">
                                    {level}
                                </span>
                            </button>
                        );
                    })}
                </div>
                
            </main>
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[9999] p-4">

                    <div className="bg-white border-2 border-indigo-50 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">

                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-indigo-50/50">
                            <h3 className="text-xl font-black flex items-center gap-2 text-indigo-900">
                                <MessageSquarePlus className="text-indigo-600" />
                                Submit a Rule
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-indigo-600 transition p-1"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSendSuggestion} className="p-8 space-y-5">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Your Name</label>
                                <input
                                    type="text" required
                                    className="w-full bg-slate-50 border-2 border-slate-400 rounded-2xl px-4 py-3 text-slate-900 focus:outline-none focus:border-indigo-500 transition-all"
                                    placeholder="Magnus C."
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Target Difficulty</label>
                                <select
                                    className="w-full bg-slate-50 border-2 border-slate-400 rounded-2xl px-4 py-3 text-slate-900 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                                    value={formData.level}
                                    onChange={e => setFormData({ ...formData, level: e.target.value })}
                                >
                                    <option value="Piece of Cake">Piece of Cake</option>
                                    <option value="Doughnut Elo">Doughnut Elo</option>
                                    <option value="Pinned Down">Pinned Down</option>
                                    <option value="Challenge">Challenge</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">The Rule</label>
                                <textarea
                                    required rows={3}
                                    className="w-full bg-slate-50 border-2 border-slate-400 rounded-2xl px-4 py-3 text-slate-900 focus:outline-none focus:border-indigo-500 resize-none transition-all"
                                    placeholder="e.g. You cannot castle this game..."
                                    value={formData.rule}
                                    onChange={e => setFormData({ ...formData, rule: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 px-4 rounded-2xl font-bold border-2 border-slate-100 text-slate-500 hover:bg-slate-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading} // lock the button to prevent double sending
                                    className={`flex-1 py-4 rounded-2xl font-bold transition-all ${isLoading
                                            ? 'bg-slate-300 cursor-not-allowed'
                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                        }`}
                                >
                                    {isLoading ? 'Sending...' : 'Send Idea'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 z-[9999] transition-all duration-500 ${showSuccess ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'

                }`}>

                <CheckCircle2 size={20} />

                Suggestion Sent!

            </div>
        </div>
    );
}