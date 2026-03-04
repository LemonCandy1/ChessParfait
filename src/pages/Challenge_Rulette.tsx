import { useState } from 'react';
import { Cake, Donut, AlertTriangle, Skull, X, MessageSquarePlus, CheckCircle2 } from 'lucide-react';
import rulesData from '../data/rules.json';
import Navbar from '../components/Navbar/Navbar';
import { supabase } from '../lib/supabaseClient.ts';

type Difficulty = 'Piece of Cake' | 'Doughnut Elo' | 'Brain Freeze' | 'Challenge';

export default function ChallengeRulette() {
    interface Rule {
        title: string;
        rule: string;
    }
    const [isLoading, setIsLoading] = useState(false);
    const [difficulty, setDifficulty] = useState<Difficulty>('Piece of Cake');
    const [currentRule, setCurrentRule] = useState<Rule>({
        title: "Draw your handicap",
        rule: "Select a difficulty below to begin your challenge.",
    });
    const BLOCK_REPEAT_VALUE = 3; 
    const [isRevealing, setIsRevealing] = useState(false);
    const [history, setHistory] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [formData, setFormData] = useState({ name: '', title: '', rule: "", level: 'Doughnut Elo' });

    const drawRule = (level: Difficulty) => {
        setIsRevealing(true);
        setDifficulty(level);

        setTimeout(() => {
            const rulesForLevel = (rulesData as any)[level];
            const availableRules = rulesForLevel.filter((r: Rule) => !history.includes(r.rule));
            const pool = availableRules.length > 0 ? availableRules : rulesForLevel;
            const nextRule = pool[Math.floor(Math.random() * pool.length)];
            setHistory(prev => [nextRule.rule, ...prev].slice(0, BLOCK_REPEAT_VALUE));
            setCurrentRule(nextRule);
            setIsRevealing(false);
        }, 300);
    };

    const getIcon = (level: Difficulty) => {
        switch (level) {
            case 'Piece of Cake': return <Cake size={20} />;
            case 'Doughnut Elo': return <Donut size={20} />;
            case 'Brain Freeze': return <AlertTriangle size={20} />;
            case 'Challenge': return <Skull size={20} />;
            default: return <Cake size={20} />;
        }
    };

    const handleSendSuggestion = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        const { data, error } = await supabase
            .from('Suggestions')
            .insert([
                {
                    user_name: formData.name,
                    difficulty: formData.level,
                    rule_title: formData.title,
                    rule_text: formData.rule
                },
            ]);

        if (error) {
            console.error('Error inserting suggestion:', error);
            setIsModalOpen(false);
            alert(`Error: ${error.message}`);
            setIsLoading(false);
            return;
        }

        setIsModalOpen(false);
        setShowSuccess(true);
        setFormData({ name: '', title: '', rule: '', level: 'Doughnut Elo' });
        setTimeout(() => setShowSuccess(false), 2000);
        setIsLoading(false);
        return data;
    };

    const themes = {
        'Piece of Cake': { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', active: 'bg-emerald-600 border-emerald-700 shadow-emerald-200', glow: 'bg-emerald-400' },
        'Doughnut Elo': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', active: 'bg-amber-500 border-amber-600 shadow-amber-200', glow: 'bg-amber-400' },
        'Brain Freeze': { bg: 'bg-berry/5', border: 'border-berry/20', text: 'text-berry', active: 'bg-berry border-berry shadow-berry/20', glow: 'bg-berry' },
        'Challenge': { bg: 'bg-plum/10', border: 'border-plum/40', text: 'text-plum', active: 'bg-[#2D0D2E] border-plum shadow-[#2D0D2E]/40', glow: 'bg-[#1A051B]' },
    };

    return (
        <div className="h-screen bg-cream text-plum font-sans flex flex-col relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-150 h-150 bg-berry/5 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-100 h-100 bg-plum/5 rounded-full blur-3xl -z-10" />
                
            <Navbar />

            <div className="max-w-7xl mx-auto w-full relative px-6 mt-4">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 backdrop-blur-md text-plum font-bold hover:bg-berry hover:text-white transition-all active:scale-95 group shadow-sm border border-plum/10 text-sm"
                >
                    <MessageSquarePlus size={16} className="group-hover:scale-110 transition-transform" />
                    <span>Suggest a Rule</span>
                </button>
            </div>          

            <main className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full pb-8 gap-6 px-6 overflow-hidden">
                {/* Header */}
                <div className="text-center space-y-2 max-w-2xl">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-plum">
                        Challenge <span className="text-berry italic">Rulette</span>
                    </h1>
                    <p className="text-sm md:text-base text-plum/60 leading-relaxed font-medium">
                        All handicaps are created by me and my students. You must follow the rule or resign.
                    </p>
                </div>

                <div className="w-full max-w-3xl glass rounded-[2.5rem] p-6 md:p-10 shadow-xl relative overflow-hidden flex flex-col items-center text-center h-80 justify-center transition-all duration-500 border-plum/10"
                    style={{
                        borderColor: themes[difficulty].active.split(' ')[1].replace('bg-', '')
                    }}>

                    {/* Dynamic background glow */}
                    <div className={`absolute inset-0 opacity-10 blur-3xl transition-colors duration-700 ${themes[difficulty].glow}`} />

                    <div className="relative z-10 w-full">
                        <div className={`flex flex-col items-center gap-3 mb-6 transition-all duration-500 ${isRevealing ? 'opacity-0 -translate-y-4 blur-lg' : 'opacity-100 translate-y-0'}`}>
                            <div className={`p-3 rounded-xl bg-white shadow-sm mb-1 transition-colors duration-500 ${themes[difficulty].text}`}>
                                {getIcon(difficulty)}
                            </div>
                            <span className="text-[10px] font-black tracking-[0.3em] uppercase text-plum/40">
                                {difficulty}
                            </span>
                            <h2 className="text-2xl md:text-3xl font-serif font-black text-plum leading-tight">
                                {currentRule.title}
                            </h2>
                        </div>

                        {/* The Rule Text */}
                        <div className={`bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-plum/5 transition-all duration-500 ${isRevealing ? 'opacity-0 scale-95 blur-md' : 'opacity-100 scale-100'}`}>
                            <p className="text-lg md:text-xl font-medium leading-relaxed text-plum/80 italic">
                                {currentRule.rule}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Difficulty Selectors */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl relative z-10">
                    {(['Piece of Cake', 'Doughnut Elo', 'Brain Freeze', 'Challenge'] as Difficulty[]).map((level) => {
                        const theme = themes[level];
                        const isActive = difficulty === level;

                        return (
                            <button
                                key={level}
                                onClick={() => drawRule(level)}
                                className={`group p-4 rounded-3xl font-black flex flex-col items-center gap-2 transition-all hover:-translate-y-1 active:scale-95 border-2 ${isActive
                                        ? `${theme.active} text-white shadow-lg scale-105 z-20`
                                        : `${theme.bg} ${theme.border} ${theme.text} opacity-70 hover:opacity-100 shadow-sm bg-white/50 backdrop-blur-sm`
                                    }`}
                            >
                                <span className={`${isActive ? 'text-white' : theme.text} transition-transform group-hover:scale-125 duration-300`}>
                                    {getIcon(level)}
                                </span>
                                <span className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-black">
                                    {level}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </main>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-plum/60 backdrop-blur-xl flex items-center justify-center z-9999 p-4 animate-in fade-in duration-300">
                    <div className="bg-cream border border-white/20 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center p-6 border-b border-plum/5 bg-white/30">
                            <h3 className="text-xl font-black flex items-center gap-3 text-plum">
                                <MessageSquarePlus className="text-berry" />
                                Suggest a Rule
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-plum/40 hover:text-berry transition-all p-2 hover:bg-berry/10 rounded-full"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSendSuggestion} className="p-8 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-plum/40 mb-2 ml-1">Your Name</label>
                                    <input
                                        type="text" required
                                        className="w-full bg-white/50 border border-plum/5 rounded-xl px-4 py-2 text-plum focus:outline-none focus:border-berry transition-all text-sm"
                                        placeholder="Magnus C."
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-plum/40 mb-2 ml-1">Difficulty</label>
                                    <select
                                        className="w-full bg-white/50 border border-plum/5 rounded-xl px-4 py-2 text-plum focus:outline-none focus:border-berry appearance-none cursor-pointer transition-all text-sm"
                                        value={formData.level}
                                        onChange={e => setFormData({ ...formData, level: e.target.value })}
                                    >
                                        <option value="Piece of Cake">Piece of Cake</option>
                                        <option value="Doughnut Elo">Doughnut Elo</option>
                                        <option value="Brain Freeze">Brain Freeze</option>
                                        <option value="Challenge">Challenge</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-plum/40 mb-2 ml-1">Rule Name</label>
                                <input
                                    className="w-full bg-white/50 border border-plum/5 rounded-xl px-4 py-2 text-plum focus:outline-none focus:border-berry transition-all text-sm"
                                    placeholder="e.g. The Pacifist King"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-plum/40 mb-2 ml-1">Rule Description</label>
                                <textarea
                                    required rows={3}
                                    className="w-full bg-white/50 border border-plum/5 rounded-xl px-4 py-3 text-plum focus:outline-none focus:border-berry resize-none transition-all text-sm"
                                    placeholder="Explain the rule clearly..."
                                    value={formData.rule}
                                    onChange={e => setFormData({ ...formData, rule: e.target.value })}
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 px-4 rounded-xl font-bold border border-plum/5 text-plum/50 hover:bg-white transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-all shadow-md text-sm ${isLoading
                                            ? 'bg-plum/20 cursor-not-allowed text-plum/40'
                                            : 'bg-berry hover:bg-berry/90 text-white shadow-berry/20'
                                        }`}
                                >
                                    {isLoading ? 'Sending...' : 'Submit Rule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-plum text-cream px-6 py-3 rounded-xl font-bold shadow-xl flex items-center gap-3 z-9999 transition-all duration-500 border border-white/10 ${showSuccess ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-90 pointer-events-none'}`}>
                <CheckCircle2 size={20} className="text-berry" />
                Suggestion Sent!
            </div>
        </div>
    );
}