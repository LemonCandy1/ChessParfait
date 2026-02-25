import { useState } from 'react';
import { ChevronLeft, Cake, Donut, AlertTriangle, Skull, X, MessageSquarePlus, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import rulesData from '../data/rules.json';

type Difficulty = 'Piece of Cake' | 'Doughnut Elo' | 'Pinned Down' | 'Challenge';

export default function EloStealo() {
    const [difficulty, setDifficulty] = useState<Difficulty>('Piece of Cake');
    const [currentRule, setCurrentRule] = useState<string>("Select a difficulty to draw your handicap.");
    const [isRevealing, setIsRevealing] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [formData, setFormData] = useState({ name: '', rule: '', level: 'Doughnut Elo' });

    const drawRule = (level: Difficulty) => {
        // Add a tiny delay to create a "drawing" animation effect
        setIsRevealing(true);
        setDifficulty(level);

        setTimeout(() => {
            const rules = rulesData[level];
            const randomRule = rules[Math.floor(Math.random() * rules.length)];
            setCurrentRule(randomRule);
            setIsRevealing(false);
        }, 200); // 300ms delay for the fade effect
    };

    // Helper to get the right icon for the difficulty
    const getIcon = (level: Difficulty) => {
        switch (level) {
            case 'Piece of Cake': return <Cake size={24} />;
            case 'Doughnut Elo': return <Donut size={24} />;
            case 'Pinned Down': return <AlertTriangle size={24} />;
            case 'Challenge': return <Skull size={24} />;
            default: return <Cake size={24} />;
        }
    };
    const handleSendSuggestion = (e: React.FormEvent) => {
        e.preventDefault(); // Prevents the page from refreshing

        // Here is where you would normally send the data to a database or email
        console.log("New Suggestion:", formData);

        setIsModalOpen(false); // Close the box
        setFormData({ name: '', rule: '', level: 'Doughnut Elo' }); // Reset form

        // Show the disappearing "Sent!" message
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000); // Disappears after 3 seconds
    };
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans flex flex-col">
            {/* Navigation */}
            <nav className="max-w-6xl mx-auto w-full mb-12">
                <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-indigo-400 transition font-medium">
                    <ChevronLeft size={20} /> Return to Dashboard
                </Link>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-full text-sm font-bold transition-colors border border-slate-700"
                >
                    <MessageSquarePlus size={16} /> Suggest a New Rule
                </button>
            </nav>

            <main className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full gap-12 -mt-12">

                {/* Header */}
                <div className="text-center space-y-7">
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white">
                        Challenge Rulette
                    </h1>
                    <p className="text-xl text-slate-400">A fun page to give yourself an extra challenge! Rules are created by either me or my students.
                    </p>
                    <p className="text-xl text-slate-400 italic">
                        You must follow the rule or resign.
                    </p>
                </div>

                <div className="w-full max-w-2xl bg-slate-900 border-2 border-slate-800 rounded-3xl p-10 md:p-16 shadow-2xl relative overflow-hidden flex flex-col items-center text-center min-h-[300px] justify-center">

                    {/* Subtle background glow based on difficulty */}
                    <div className={`absolute inset-0 opacity-20 blur-3xl transition-colors duration-700 ${difficulty === 'Piece of Cake' ? 'bg-blue-500' :
                            difficulty === 'Doughnut Elo' ? 'bg-yellow-500' :
                                difficulty === 'Pinned Down' ? 'bg-orange-500' : 'bg-red-600'
                        }`} />

                    <div className="relative z-10">
                        <div className={`text-indigo-400 flex justify-center mb-6 transition-opacity duration-300 ${isRevealing ? 'opacity-0' : 'opacity-100'}`}>
                            {currentRule !== "Select a difficulty to draw your handicap." && getIcon(difficulty)}
                        </div>

                        <h2 className={`text-3xl md:text-4xl font-bold leading-tight transition-all duration-300 ${isRevealing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                            }`}>
                            {currentRule}
                        </h2>
                    </div>
                </div>

                {/* Difficulty Selectors */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl">
                    {(['Piece of Cake', 'Doughnut Elo', 'Pinned Down', 'Challenge'] as Difficulty[]).map((level) => (
                        <button
                            key={level}
                            onClick={() => drawRule(level)}
                            className={`py-4 px-6 rounded-2xl font-bold flex flex-col items-center gap-2 transition-all hover:-translate-y-1 active:translate-y-0 ${difficulty === level
                                    ? 'bg-slate-800 border-2 border-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                                    : 'bg-slate-900 border-2 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                                }`}
                        >
                            {getIcon(level)}
                            {level}
                        </button>
                    ))}
                </div>

            </main>
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-800/50">
                            <h3 className="text-xl font-bold flex items-center gap-2"><MessageSquarePlus className="text-indigo-400" /> Submit a Handicap</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSendSuggestion} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Your Name</label>
                                <input
                                    type="text" required
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Magnus C."
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Target Difficulty</label>
                                <select
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                                    value={formData.level} onChange={e => setFormData({ ...formData, level: e.target.value })}
                                >
                                    <option value="Piece of Cake">Piece of Cake</option>
                                    <option value="Doughnut Elo">Doughnut Elo</option>
                                    <option value="Pinned Down">Pinned Down</option>
                                    <option value="Challenge">Challenge</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">The Rule</label>
                                <textarea
                                    required rows={3}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 resize-none"
                                    placeholder="e.g. You must move a new piece every turn..."
                                    value={formData.rule} onChange={e => setFormData({ ...formData, rule: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl font-bold border border-slate-700 text-slate-300 hover:bg-slate-800 transition">Cancel</button>
                                <button type="submit" className="flex-1 py-3 px-4 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition">Send</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- NEW: DISAPPEARING SUCCESS TOAST --- */}
            <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 transition-all duration-500 ${showSuccess ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
                }`}>
                <CheckCircle2 size={20} />
                Suggestion Sent!
            </div>
        </div>
    );
}