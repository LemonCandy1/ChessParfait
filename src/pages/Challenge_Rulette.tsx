import { useState } from 'react';
import { X, MessageSquarePlus, CheckCircle2 } from 'lucide-react';
import rulesData from '../data/rules.json';
import Navbar from '../components/Navbar/Navbar';
import { supabase } from '../lib/supabaseClient.ts';
import { ChessCakeSliceIcon, PieIcon, SnowflakeIcon, CherryBombIcon } from '../components/Icons';

type Difficulty = 'Piece of Cake' | 'Hard Tart' | 'Brain Freeze' | 'Cherry Bomb';

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
    const [formData, setFormData] = useState({ name: '', title: '', rule: "", level: 'Hard Tart' });

    const drawRule = (level: Difficulty) => {
        setIsRevealing(true);
        setDifficulty(level);

        setTimeout(() => {
            const rulesForLevel = (rulesData as any)[level] || (level === 'Cherry Bomb' ? (rulesData as any)['Challenge'] : []);
            const availableRules = rulesForLevel.filter((r: Rule) => !history.includes(r.rule));
            const pool = availableRules.length > 0 ? availableRules : rulesForLevel;
            const nextRule = pool[Math.floor(Math.random() * pool.length)];
            setHistory(prev => [nextRule.rule, ...prev].slice(0, BLOCK_REPEAT_VALUE));
            setCurrentRule(nextRule);
            setIsRevealing(false);
        }, 180);
    };

    const getIcon = (level: Difficulty, size = 20) => {
        switch (level) {
            case 'Piece of Cake': return <ChessCakeSliceIcon size={size} />;
            case 'Hard Tart': return <PieIcon size={size} />;
            case 'Brain Freeze': return <SnowflakeIcon size={size} />;
            case 'Cherry Bomb': return <CherryBombIcon size={size} />;
            default: return <ChessCakeSliceIcon size={size} />;
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
        setFormData({ name: '', title: '', rule: '', level: 'Hard Tart' });
        setTimeout(() => setShowSuccess(false), 2000);
        setIsLoading(false);
        return data;
    };

    const themes = {
        'Piece of Cake': { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', active: 'bg-emerald-600 border-emerald-700 shadow-emerald-200', glow: 'bg-emerald-400' },
        'Hard Tart': { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', active: 'bg-amber-500 border-amber-600 shadow-amber-200', glow: 'bg-amber-400' },
        'Brain Freeze': { bg: 'bg-berry/5', border: 'border-berry/30', text: 'text-berry', active: 'bg-berry border-berry shadow-berry/20', glow: 'bg-berry' },
        'Cherry Bomb': { bg: 'bg-plum/10', border: 'border-plum/40', text: 'text-plum', active: 'bg-[#2D0D2E] border-plum shadow-[#2D0D2E]/40', glow: 'bg-[#1A051B]' },
    };

    return (
        <div className="min-h-screen bg-cream text-plum font-sans flex flex-col relative overflow-x-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-150 h-150 bg-berry/5 rounded-full blur-3xl -z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-100 h-100 bg-plum/5 rounded-full blur-3xl -z-10 pointer-events-none" />
                
            <Navbar />

            <div className="max-w-7xl mx-auto w-full relative px-6 mt-4 flex justify-end">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/60 backdrop-blur-md text-plum font-bold hover:bg-berry hover:text-white transition-[background-color,color,transform] duration-150 active:scale-95 group shadow-sm border-2 border-plum/15 text-sm"
                >
                    <MessageSquarePlus size={16} className="group-hover:scale-105 transition-transform duration-150" />
                    <span>Suggest a Rule</span>
                </button>
            </div>          

            <main className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full py-6 md:py-8 gap-5 md:gap-6 px-6 animate-fade-up">
                {/* Header */}
                <div className="text-center space-y-1.5 max-w-2xl">
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight text-plum">
                        Challenge <span className="text-berry italic">Rulette</span>
                    </h1>
                    <p className="text-sm md:text-base text-plum/75 leading-relaxed font-medium">
                        All handicaps are created by me and my students. You must follow the rule or resign.
                    </p>
                </div>

                <div className={`w-full max-w-3xl bg-white/50 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-8 shadow-xl relative overflow-hidden flex flex-col items-center text-center min-h-[19rem] md:min-h-[21rem] justify-center transition-[border-color,box-shadow] duration-200 border-2 ${themes[difficulty].active.split(' ')[1]}`}>

                    {/* Dynamic background glow */}
                    <div className={`absolute inset-0 opacity-10 blur-3xl transition-colors duration-300 pointer-events-none ${themes[difficulty].glow}`} />

                    <div className="relative z-10 w-full flex flex-col items-center justify-center">
                        <div className={`flex flex-col items-center gap-1.5 mb-3 md:mb-4 transition-[opacity,transform] duration-180 ease-out ${isRevealing ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'}`}>
                            <div className={`p-3 rounded-2xl bg-white shadow-sm mb-0.5 transition-colors duration-200 ${themes[difficulty].text}`}>
                                {getIcon(difficulty, 28)}
                            </div>
                            <span className="text-[10px] md:text-[11px] font-bold tracking-widest uppercase text-plum/70">
                                {difficulty}
                            </span>
                            <h2 className="text-xl md:text-2xl font-serif font-black text-plum leading-tight max-w-xl">
                                {currentRule.title}
                            </h2>
                        </div>

                        {/* The Rule Text */}
                        <div className={`w-full max-w-2xl mx-auto bg-white/75 backdrop-blur-sm px-6 py-4 md:px-8 md:py-5 rounded-2xl border-2 border-plum/15 shadow-sm transition-[opacity,transform] duration-180 ease-out flex items-center justify-center min-h-[5.5rem] max-h-44 md:max-h-48 overflow-y-auto ${isRevealing ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'}`}>
                            <p className={`font-medium leading-relaxed text-plum/90 italic text-center break-words ${
                                currentRule.rule.length > 150 
                                    ? 'text-sm md:text-base' 
                                    : 'text-base md:text-lg'
                            }`}>
                                {currentRule.rule}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Difficulty Selectors */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl relative z-10">
                    {(['Piece of Cake', 'Hard Tart', 'Brain Freeze', 'Cherry Bomb'] as Difficulty[]).map((level) => {
                        const theme = themes[level];
                        const isActive = difficulty === level;

                        return (
                            <button
                                key={level}
                                onClick={() => drawRule(level)}
                                className={`group p-4 rounded-2xl font-bold flex flex-col items-center gap-2 transition-[transform,box-shadow,background-color] duration-150 hover:-translate-y-0.5 active:scale-[0.97] border-2 cursor-pointer ${isActive
                                        ? `${theme.active} text-white shadow-lg scale-105 z-20`
                                        : `${theme.bg} ${theme.border} ${theme.text} opacity-80 hover:opacity-100 shadow-sm bg-white/60 backdrop-blur-sm`
                                    }`}
                            >
                                <span className={`${isActive ? 'text-white' : theme.text} transition-transform group-hover:scale-110 duration-150`}>
                                    {getIcon(level, 24)}
                                </span>
                                <span className="text-[10px] md:text-[11px] uppercase tracking-wider font-black">
                                    {level}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </main>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-plum/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-up">
                    <div className="bg-cream border-2 border-plum/15 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="flex justify-between items-center p-6 border-b-2 border-plum/15 bg-white/40">
                            <h3 className="text-xl font-black flex items-center gap-3 text-plum">
                                <MessageSquarePlus className="text-berry" />
                                Suggest a Rule
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-plum/60 hover:text-berry transition-colors p-2 hover:bg-berry/10 rounded-full cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSendSuggestion} className="p-8 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-plum/70 mb-2 ml-1">Your Name</label>
                                    <input
                                        type="text" required
                                        className="w-full bg-white/70 border-2 border-plum/15 rounded-xl px-4 py-2.5 text-plum focus:outline-none focus:border-berry focus:ring-4 focus:ring-berry/15 transition-[border-color,box-shadow] text-sm"
                                        placeholder="Magnus C."
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-plum/70 mb-2 ml-1">Difficulty</label>
                                    <select
                                        className="w-full bg-white/70 border-2 border-plum/15 rounded-xl px-4 py-2.5 text-plum focus:outline-none focus:border-berry focus:ring-4 focus:ring-berry/15 appearance-none cursor-pointer transition-[border-color,box-shadow] text-sm font-medium"
                                        value={formData.level}
                                        onChange={e => setFormData({ ...formData, level: e.target.value })}
                                    >
                                        <option value="Piece of Cake">Piece of Cake</option>
                                        <option value="Hard Tart">Hard Tart</option>
                                        <option value="Brain Freeze">Brain Freeze</option>
                                        <option value="Cherry Bomb">Cherry Bomb</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-plum/70 mb-2 ml-1">Rule Name</label>
                                <input
                                    className="w-full bg-white/70 border-2 border-plum/15 rounded-xl px-4 py-2.5 text-plum focus:outline-none focus:border-berry focus:ring-4 focus:ring-berry/15 transition-[border-color,box-shadow] text-sm"
                                    placeholder="e.g. The Pacifist King"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-plum/70 mb-2 ml-1">Rule Description</label>
                                <textarea
                                    required rows={3}
                                    className="w-full bg-white/70 border-2 border-plum/15 rounded-xl px-4 py-2.5 text-plum focus:outline-none focus:border-berry focus:ring-4 focus:ring-berry/15 resize-none transition-[border-color,box-shadow] text-sm"
                                    placeholder="Explain the rule clearly..."
                                    value={formData.rule}
                                    onChange={e => setFormData({ ...formData, rule: e.target.value })}
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 px-4 soft-button-outline text-sm font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 py-3 px-4 soft-button-berry text-sm font-bold disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    {isLoading ? 'Sending...' : 'Submit Rule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-plum text-cream px-6 py-3 rounded-xl font-bold shadow-xl flex items-center gap-3 z-50 transition-[transform,opacity] duration-200 border border-white/10 ${showSuccess ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'}`}>
                <CheckCircle2 size={20} className="text-berry" />
                Suggestion Sent!
            </div>
        </div>
    );
}