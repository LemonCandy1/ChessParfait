import { useState } from 'react';
import {
    Mail,
    ChevronRight,
    BookOpen,
    Award,
    ArrowRight,
    BrainCircuit
} from 'lucide-react';
import Navbar from '../components/Navbar/Navbar.tsx';
import { Link } from 'react-router-dom';
import profilePicture from '../assets/Profile Photo.jpeg';
import { PuzzleIcon, RouletteIcon } from '../components/Icons';
import ClientFeedback from '@/components/ui/testimonial';
import ParallaxBackground from '@/components/ui/ParallaxBackground';


export default function Home() {



    // ----------------------------------------------------
    // 3. LEARN-TRAIN-TEST LOOP STATE & DATA
    // ----------------------------------------------------
    const [activeLoopStep, setActiveLoopStep] = useState<number>(0);
    const loopSteps = [
        {
            title: "1. Learn (Weekly Lessons)",
            desc: "Build structured theoretical foundations with FIDE Master Luis Chan. Create personalized opening repertoires, analyze your game database, and master critical positional principles.",
            icon: <BookOpen size={20} />
        },
        {
            title: "2. Train (Weekly Puzzles)",
            desc: "Consolidate your knowledge by solving handpicked tactical positions updated every Monday. Build visual memory, pattern recognition, and sharp calculation skills.",
            icon: <PuzzleIcon size={20} />
        },
        {
            title: "3. Test (Variant Zone)",
            desc: "Put your skills into action against our minimax AI bot in the Pawn Game. Break routine habits using Challenge Rulette handicaps, testing your raw chess intuition.",
            icon: <RouletteIcon size={20} />
        }
    ];

    return (
        <div className="min-h-screen flex flex-col font-sans text-plum relative bg-cream overflow-x-hidden">
            {/* Background Decorative Mesh Gradients (Warmer yellow & light orange palette) */}
            <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/4 w-[600px] h-[600px] bg-berry/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/4 left-0 -translate-x-1/4 w-[650px] h-[650px] bg-orange-400/10 rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute top-[45%] right-0 translate-x-1/4 w-[600px] h-[600px] bg-amber-400/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/3 left-0 -translate-x-1/4 w-[650px] h-[650px] bg-orange-300/10 rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute bottom-10 right-0 translate-x-1/3 w-[550px] h-[550px] bg-berry/5 rounded-full blur-[110px] pointer-events-none" />

            {/* Floating Parallax Chess Elements */}
            <ParallaxBackground />

            <div className="relative z-50">
                <Navbar />
            </div>

            {/* HERO SECTION WITH INTEGRATED INTUITION QUIZ */}
            <header className="relative pt-16 pb-20 px-6 md:px-12 max-w-7xl mx-auto w-full z-10">
                <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">

                    {/* Left Column: Core Value Proposition */}
                    <div className="lg:col-span-12 flex flex-col items-center text-center">


                        <h1 className="text-5xl md:text-7xl font-black mb-6 leading-[1.1] tracking-tight">
                            Perfect Your <span className="text-berry">Chess Intuition</span>
                        </h1>

                        <p className="text-lg md:text-xl text-plum/70 mb-10 leading-relaxed max-w-xl mx-auto">
                            Welcome to ChessParfait—a premier training space designed to guide players sequentially from casual games to strategic mastery.
                        </p>

                        <div className="flex flex-wrap justify-center gap-4 w-full sm:w-auto">
                            <Link
                                to="/games"
                                className="px-8 py-4 bg-berry hover:bg-berry/90 text-white font-bold rounded-2xl transition-all transform hover:scale-[1.02] shadow-lg shadow-berry/20 flex items-center justify-center gap-2 group w-full sm:w-auto text-sm"
                            >
                                Play & Learn <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                to="/contact"
                                className="px-8 py-4 bg-white/70 border-2 border-plum/15 text-plum font-bold rounded-2xl hover:bg-white hover:border-plum/30 transition-all flex items-center justify-center gap-2 w-full sm:w-auto text-sm"
                            >
                                Book a Session
                            </Link>
                        </div>
                    </div>


                </div>
            </header>

            {/* SOCIAL PROOF METRIC RIBBON */}
            <section className="bg-plum py-8 px-6 text-cream relative z-10 shadow-lg border-y-2 border-plum/10">
                <div className="max-w-7xl mx-auto flex flex-wrap justify-around items-center gap-8 text-center">
                    <div className="space-y-1">
                        <span className="block text-4xl font-serif font-black text-white">7+ Years</span>
                        <span className="text-[10px] uppercase font-black text-cream/50 tracking-widest block">Coaching Experience</span>
                    </div>
                    <div className="hidden md:block h-10 w-px bg-white/10" />
                    <div className="space-y-1">
                        <span className="block text-4xl font-serif font-black text-berry">5k+ Hrs</span>
                        <span className="text-[10px] uppercase font-black text-cream/50 tracking-widest block">Instructional Time</span>
                    </div>
                    <div className="hidden md:block h-10 w-px bg-white/10" />
                    <div className="space-y-1">
                        <span className="block text-4xl font-serif font-black text-white">100%</span>
                        <span className="text-[10px] uppercase font-black text-cream/50 tracking-widest block">Student Progression</span>
                    </div>
                </div>
            </section>

            {/* COACHING REVIEWS SECTION */}
            <ClientFeedback />

            {/* THE "LEARN, TRAIN, TEST" STRUCTURED LOOP */}
            <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto w-full z-10 relative">
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-black uppercase tracking-widest text-plum bg-plum/5 rounded-full">
                        <BrainCircuit size={12} />
                        The ChessParfait Loop
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight text-plum">
                        Learn, Train, Test
                    </h2>
                    <p className="text-lg text-plum/60 font-medium">
                        Our structured cycle bypasses dry memorization, developing your intuition through active learning and play.
                    </p>
                </div>

                <div className="grid lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
                    {/* Step selector */}
                    <div className="lg:col-span-5 space-y-3">
                        {loopSteps.map((step, idx) => {
                            const isActive = activeLoopStep === idx;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => setActiveLoopStep(idx)}
                                    className={`w-full p-5 text-left rounded-3xl border-2 transition-all flex items-center gap-4 group ${isActive
                                        ? 'bg-plum border-plum text-cream shadow-lg shadow-plum/20'
                                        : 'bg-white/40 border-plum/10 text-plum hover:bg-white/80 hover:border-plum/25'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border transition-all ${isActive ? 'bg-berry border-berry text-white' : 'bg-cream border-plum/15 text-plum'
                                        }`}>
                                        {step.icon}
                                    </div>
                                    <span className="font-serif font-black text-lg truncate">
                                        {step.title}
                                    </span>
                                    <ChevronRight size={18} className={`ml-auto transition-transform ${isActive ? 'translate-x-1 text-berry' : 'text-plum/30 group-hover:translate-x-0.5'
                                        }`} />
                                </button>
                            );
                        })}
                    </div>

                    {/* Step detail panel */}
                    <div className="lg:col-span-7">
                        <div className="p-8 md:p-10 glass rounded-[3.5rem] border-2 border-plum/15 shadow-xl text-left space-y-6 min-h-[300px] flex flex-col justify-center relative">
                            {/* Graphic background */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 text-plum pointer-events-none">
                                <BrainCircuit size={280} />
                            </div>

                            <span className="text-[10px] font-black uppercase tracking-widest text-berry">
                                Pillar {activeLoopStep + 1} details
                            </span>

                            <h3 className="font-serif font-black text-plum text-3xl">
                                {loopSteps[activeLoopStep].title}
                            </h3>

                            <p className="text-sm text-plum/70 leading-relaxed font-medium relative z-10">
                                {loopSteps[activeLoopStep].desc}
                            </p>

                            <div className="pt-4 border-t border-plum/5 relative z-10">
                                {activeLoopStep === 0 && (
                                    <Link to="/contact" className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-berry hover:underline">
                                        Schedule an FM consultation <ArrowRight size={14} />
                                    </Link>
                                )}
                                {activeLoopStep === 1 && (
                                    <Link to="/TrainingPuzzles" className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-berry hover:underline">
                                        Solve puzzles now <ArrowRight size={14} />
                                    </Link>
                                )}
                                {activeLoopStep === 2 && (
                                    <Link to="/games" className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-berry hover:underline">
                                        Browse the game variants <ArrowRight size={14} />
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* COACH SHOWCASE: FM LUIS CHAN */}
            <section className="py-24 px-6 md:px-12 bg-plum text-cream z-10 relative">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-10 left-10 w-64 h-64 border-4 border-white rounded-full" />
                    <div className="absolute bottom-10 right-10 w-96 h-96 border-8 border-berry rounded-full" />
                </div>

                <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-16 relative z-10">

                    {/* Profile Picture Panel */}
                    <div className="relative order-2 lg:order-1 flex-shrink-0">
                        <div className="w-72 h-[380px] bg-white/10 rounded-[3rem] shadow-2xl overflow-hidden border-8 border-cream transform rotate-2 hover:rotate-0 transition-transform duration-500">
                            <img
                                src={profilePicture}
                                fetchPriority="high"
                                className="w-full h-full object-cover"
                                alt="Luis Chan FIDE Master"
                            />
                        </div>
                        <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-berry/20 rounded-full blur-2xl -z-10" />
                        <div className="absolute -top-6 -left-6 w-24 h-24 bg-white/5 rounded-full blur-xl -z-10" />
                    </div>

                    {/* Text Details */}
                    <div className="flex-1 text-left order-1 lg:order-2 space-y-6">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-berry bg-berry/20 rounded-full">
                            <Award size={12} />
                            FIDE Master & Head Coach
                        </div>

                        <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                            Meet Your Coach, <span className="text-berry">FM Luis Chan</span>
                        </h2>

                        <blockquote className="border-l-4 border-berry pl-4 italic text-cream/80 text-lg leading-relaxed">
                            "Chess is not just about memorising lines; it's about learning the subtle logic behind every position and refining your raw intuition."
                        </blockquote>

                        <p className="text-cream/70 leading-relaxed text-sm">
                            I am a FIDE Master based in Melbourne, Australia. Having coached for over 7 years, I have successfully trained players from complete beginners to competitive players achieving 2000+ FIDE rating milestones.
                        </p>

                        {/* Stats blocks inside Coach section */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                                <span className="block text-2xl font-black text-berry">2280</span>
                                <span className="text-[10px] text-cream/50 uppercase tracking-widest font-bold">FIDE Rating</span>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                                <span className="block text-2xl font-black text-white">2318</span>
                                <span className="text-[10px] text-cream/50 uppercase tracking-widest font-bold">ACF Rating</span>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                                <span className="block text-2xl font-black text-berry">7+ Yrs</span>
                                <span className="text-[10px] text-cream/50 uppercase tracking-widest font-bold">Experience</span>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                                <span className="block text-2xl font-black text-white">#16</span>
                                <span className="text-[10px] text-cream/50 uppercase tracking-widest font-bold">Active AUS Rank</span>
                            </div>
                        </div>

                        <div className="pt-6 flex flex-wrap gap-4">
                            <Link
                                to="/contact"
                                className="px-8 py-4 bg-berry hover:bg-berry/95 text-white font-bold rounded-2xl transition-all transform hover:scale-[1.02] shadow-xl shadow-berry/30 text-sm"
                            >
                                Secure a Coaching Slot
                            </Link>
                            <Link
                                to="/about"
                                className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold rounded-2xl transition-all text-sm"
                            >
                                Read My Story
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* CALL TO ACTION ZONE */}
            <section className="py-24 px-6 md:px-12 text-center relative z-10 max-w-4xl mx-auto">
                <div className="space-y-8 bg-cream/30 backdrop-blur-md p-12 md:p-16 rounded-[4rem] border-2 border-plum/15 shadow-lg">
                    <h2 className="text-4xl md:text-5xl font-black text-plum">Ready to elevate your chess?</h2>
                    <p className="text-lg text-plum/70 max-w-xl mx-auto mx-auto leading-relaxed">
                        Improve your rating, solve weekly calculation challenges, or prepare for upcoming tournaments with structured support.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/contact"
                            className="inline-flex items-center gap-3 bg-berry hover:bg-berry/90 text-white px-10 py-5 rounded-2xl font-bold transition-all transform hover:scale-105 shadow-xl shadow-berry/30 text-sm w-full sm:w-auto justify-center"
                        >
                            <Mail size={18} /> Contact for Booking
                        </Link>
                        <Link
                            to="/games"
                            className="inline-flex items-center gap-2 bg-plum hover:bg-plum/90 text-cream px-10 py-5 rounded-2xl font-bold transition-all transform hover:scale-105 shadow-xl shadow-plum/20 text-sm w-full sm:w-auto justify-center"
                        >
                            Explore Variant Games
                        </Link>
                    </div>
                    <p className="text-xs text-plum/40 font-bold uppercase tracking-widest pt-2">
                        Based in Melbourne, Australia • Available Online & Face-to-Face
                    </p>
                </div>
            </section>

            <footer className="py-12 text-center border-t border-plum/5 bg-white/30 backdrop-blur-sm relative z-10">
                <p className="text-plum/40 font-medium">© 2026 Chess Parfait. Designed for Premium Learning.</p>
            </footer>
        </div>
    );
}
