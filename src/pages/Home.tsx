import { useState, useRef } from 'react';
import {
    Mail,
    ChevronRight,
    ChevronLeft,
    Star,
    BookOpen,
    Play,
    Award,
    ArrowRight,
    BrainCircuit,
    RotateCcw
} from 'lucide-react';
import Navbar from '../components/Navbar/Navbar.tsx';
import { Link } from 'react-router-dom';
import profilePicture from '../assets/Profile Photo.jpeg';
import { PuzzleIcon, RouletteIcon } from '../components/Icons';
import { Chessboard } from 'react-chessboard';

// Type definitions for Quiz data
interface QuizQuestion {
    question: string;
    board: string;
    options: {
        text: string;
        type: 'aggressive' | 'defensive' | 'positional';
        feedback: string;
    }[];
}

export default function Home() {
    // ----------------------------------------------------
    // 1. CHESS INTUITION QUIZ STATE & DATA
    // ----------------------------------------------------
    const [quizStarted, setQuizStarted] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<('aggressive' | 'defensive' | 'positional')[]>([]);
    const [quizCompleted, setQuizCompleted] = useState(false);
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);

    const quizQuestions: QuizQuestion[] = [
        {
            question: "Your opponent launches an aggressive pawn storm near your king, but leaves their own king slightly exposed. What is your first instinct?",
            board: "4k3/8/5n2/8/3P2R1/8/8/4K3",
            options: [
                {
                    text: "Retreat my pieces to establish a solid defensive shield.",
                    type: "defensive",
                    feedback: "You value safety and prevention. Defensive structure is key to longevity on the board."
                },
                {
                    text: "Ignore their attack and launch a sharp tactical counter-strike.",
                    type: "aggressive",
                    feedback: "You have sharp combat instincts. You thrive on tactical complications and king hunts."
                },
                {
                    text: "Manoeuvre positional assets to exploit the weaknesses left behind.",
                    type: "positional",
                    feedback: "You appreciate positional balance. You prefer grinding down weaknesses over chaotic brawling."
                }
            ]
        },
        {
            question: "You enter a king and pawn endgame. You have a space advantage but the lines are locked. What is your priority?",
            board: "8/8/3k4/3pp3/3PP3/3K4/8/8",
            options: [
                {
                    text: "Calculate immediate forcing lines to promote a pawn.",
                    type: "aggressive",
                    feedback: "Calculation-heavy mindset. You look for direct tactical resolutions."
                },
                {
                    text: "Manoeuvre the king to claim opposition and induce Zugzwang.",
                    type: "positional",
                    feedback: "Positional precision! You understand king opposition and structural endgame patterns."
                },
                {
                    text: "Play it safe, trade everything, and lock down a solid draw.",
                    type: "defensive",
                    feedback: "Risk mitigation. You prioritize keeping the position sealed to avoid errors."
                }
            ]
        },
        {
            question: "Your opponent plays a bizarre, un-theoretical opening setup. How do you respond?",
            board: "r1bqkb1r/pppp1ppp/2n5/4p3/4P3/8/PPPP1PPP/RNBQKBNR",
            options: [
                {
                    text: "Hold the center, develop logically, and stick to classical principles.",
                    type: "defensive",
                    feedback: "Structured and reliable. You leverage fundamental rules to neutralize chaos."
                },
                {
                    text: "Directly open the center to attack their uncoordinated pieces.",
                    type: "aggressive",
                    feedback: "Punitive and alert. You seize dynamic opportunities to crash through."
                },
                {
                    text: "Create a customized structural layout to render their plan useless.",
                    type: "positional",
                    feedback: "Dynamic adaptation. You enjoy structuring customized answers to specific positions."
                }
            ]
        }
    ];

    const handleOptionSelect = (index: number) => {
        setSelectedOptionIndex(index);
    };

    const handleNextQuestion = () => {
        if (selectedOptionIndex === null) return;

        const selectedType = quizQuestions[currentQuestionIndex].options[selectedOptionIndex].type;
        const newAnswers = [...answers, selectedType];
        setAnswers(newAnswers);

        if (currentQuestionIndex < quizQuestions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setSelectedOptionIndex(null);
        } else {
            setQuizCompleted(true);
        }
    };

    const handleResetQuiz = () => {
        setQuizStarted(false);
        setCurrentQuestionIndex(0);
        setAnswers([]);
        setQuizCompleted(false);
        setSelectedOptionIndex(null);
    };

    const getDiagnosticResult = () => {
        const counts = answers.reduce((acc: Record<string, number>, curr) => {
            acc[curr] = (acc[curr] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const maxType = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, 'positional');

        if (maxType === 'aggressive') {
            return {
                title: "The Tactical Sword",
                description: "You have sharp combat instincts and love hunting the king. However, you might find yourself stuck in dry, structural endgames or overreaching in non-theoretical positions.",
                recommendation: "Master endgame structures with the Pawn Game AI to build concrete calculation and positional grounding.",
                linkText: "Play Pawn Game",
                linkPath: "/PawnGame"
            };
        } else if (maxType === 'defensive') {
            return {
                title: "The Strategic Shield",
                description: "You value structural safety and classic principles. However, you might pass up dynamic sacrifices or struggle when the board catches fire in complex calculations.",
                recommendation: "Sharpen your tactical vision and visualization speed with our Weekly Puzzles.",
                linkText: "Solve Weekly Puzzles",
                linkPath: "/TrainingPuzzles"
            };
        } else {
            return {
                title: "The Adaptive Positionalist",
                description: "You seek balance, space, and structural advantages. To take your game to the master level, you need tailored repertoires and deep game analysis to prune minor positional leaks.",
                recommendation: "Schedule a personalized session with FIDE Master Luis Chan to curate your tournament repertoires.",
                linkText: "Book coaching session",
                linkPath: "/contact"
            };
        }
    };

    // ----------------------------------------------------
    // 2. COACHING REVIEWS SCROLL
    // ----------------------------------------------------
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const { scrollLeft, clientWidth } = scrollContainerRef.current;
            const scrollAmount = clientWidth * 0.75;
            scrollContainerRef.current.scrollTo({
                left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const coachingReviews = [
        {
            name: "Sarah M.",
            ratingChange: "1150 → 1420 Elo",
            rating: 5,
            text: "Luis completely restructured my approach to endgames. His focus on pawn dynamics instead of dry memorization helped me win critical matches in my local tournament.",
            tag: "Endgame Mastery",
            avatarInitials: "SM"
        },
        {
            name: "David K.",
            ratingChange: "+240 ACF Rating",
            rating: 5,
            text: "The opening repertoires built during our coaching sessions are custom-fit for my style. No more guessing in the first 10 moves. Absolutely worth every hour.",
            tag: "Opening Repertoire",
            avatarInitials: "DK"
        },
        {
            name: "Elena R.",
            ratingChange: "1600 → 1910 Elo",
            rating: 5,
            text: "Luis helped me overcome a massive plateau. We analyzed my game database and rooted out recurring calculation errors. The chess intuition quiz is spot on!",
            tag: "Calculation Speed",
            avatarInitials: "ER"
        },
        {
            name: "Marcus T.",
            ratingChange: "+180 ACF Rating",
            rating: 5,
            text: "Incredible lessons. Luis doesn't just show you engine lines—he explains the human elements, positional balance, and defensive resilience under pressure.",
            tag: "Positional Play",
            avatarInitials: "MT"
        },
        {
            name: "Chloe W.",
            ratingChange: "900 → 1250 Elo",
            rating: 5,
            text: "As a beginner, I was overwhelmed by opening theory. Luis simplified the game down to piece safety and tactical awareness. My tactical vision has exploded.",
            tag: "Tactical Consistency",
            avatarInitials: "CW"
        }
    ];

    // ----------------------------------------------------
    // 3. LEARN-TRAIN-TEST LOOP STATE & DATA
    // ----------------------------------------------------
    const [activeLoopStep, setActiveLoopStep] = useState<number>(0);
    const loopSteps = [
        {
            title: "1. Learn (FM Lessons)",
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
            desc: "Put your skills into action against our minimax AI bot in the Pawn Game. Break routine habits using Challenge Roulette handicaps, testing your raw chess intuition.",
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

            <div className="relative z-50">
                <Navbar />
            </div>

            {/* HERO SECTION WITH INTEGRATED INTUITION QUIZ */}
            <header className="relative pt-16 pb-20 px-6 md:px-12 max-w-7xl mx-auto w-full z-10">
                <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">

                    {/* Left Column: Core Value Proposition */}
                    <div className="lg:col-span-6 flex flex-col items-start text-left">


                        <h1 className="text-5xl md:text-7xl font-black mb-6 leading-[1.1] tracking-tight">
                            Perfect Your <span className="text-berry">Chess Intuition</span>
                        </h1>

                        <p className="text-lg md:text-xl text-plum/70 mb-10 leading-relaxed max-w-xl">
                            Welcome to ChessParfait—a premier training space designed to guide players sequentially from casual games to strategic mastery.
                        </p>

                        <div className="flex flex-wrap gap-4 w-full sm:w-auto">
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
                                Book FM Lessons
                            </Link>
                        </div>
                    </div>

                    {/* Right Column: Chess Intuition Diagnostic Quiz */}
                    <div className="lg:col-span-6 flex justify-center w-full">
                        <div className="p-6 md:p-8 glass rounded-[3rem] border-2 border-plum/15 w-full max-w-[480px] shadow-2xl relative overflow-hidden">

                            {!quizStarted ? (
                                // Quiz Intro State
                                <div className="text-center py-6 space-y-6">
                                    <div className="mx-auto w-16 h-16 rounded-2xl bg-berry/10 text-berry flex items-center justify-center shadow-inner border border-berry/20">
                                        <BrainCircuit size={32} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-serif font-black text-plum text-2xl">Chess Intuition Quiz</h3>
                                        <p className="text-xs text-plum/60 leading-relaxed px-4">
                                            Answer 3 quick tactical & strategic questions to diagnose your chess blindspots. Receive targeted training recommendations from FM Luis Chan.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setQuizStarted(true)}
                                        className="w-full py-4 soft-button-berry text-sm font-bold flex items-center justify-center gap-2"
                                    >
                                        Diagnose My Style <Play size={12} fill="currentColor" />
                                    </button>
                                </div>
                            ) : quizCompleted ? (
                                // Quiz Completed Result State
                                <div className="text-left py-4 space-y-6">
                                    <div className="flex items-center justify-between border-b border-plum/10 pb-4">
                                        <div>
                                            <span className="text-[9px] font-black uppercase text-berry tracking-wider">Your Diagnostic Result</span>
                                            <h3 className="font-serif font-black text-plum text-2xl">{getDiagnosticResult().title}</h3>
                                        </div>
                                        <button
                                            onClick={handleResetQuiz}
                                            className="p-2 text-plum/40 hover:text-berry hover:bg-plum/5 rounded-xl transition-all"
                                            title="Retake Quiz"
                                        >
                                            <RotateCcw size={16} />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-xs text-plum/70 leading-relaxed font-medium">
                                            {getDiagnosticResult().description}
                                        </p>
                                        <div className="bg-white/70 p-4 rounded-2xl border border-plum/10 space-y-2">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-berry block">FM Recommendation</span>
                                            <p className="text-xs text-plum/60 font-semibold leading-relaxed">
                                                {getDiagnosticResult().recommendation}
                                            </p>
                                        </div>
                                    </div>

                                    <Link
                                        to={getDiagnosticResult().linkPath}
                                        className="w-full py-4 bg-plum hover:bg-plum/90 text-cream font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors shadow-md"
                                    >
                                        {getDiagnosticResult().linkText} <ChevronRight size={14} />
                                    </Link>
                                </div>
                            ) : (
                                // Active Quiz State
                                <div className="text-left space-y-5">
                                    <div className="flex justify-between items-center text-xs border-b border-plum/10 pb-3">
                                        <span className="font-bold text-plum/40">Question {currentQuestionIndex + 1} of {quizQuestions.length}</span>
                                        <span className="px-2.5 py-0.5 rounded-full bg-plum/5 text-[9px] font-black uppercase tracking-wider text-plum">Diagnostic Quiz</span>
                                    </div>

                                    <p className="text-xs font-bold text-plum leading-relaxed min-h-[44px]">
                                        {quizQuestions[currentQuestionIndex].question}
                                    </p>

                                    {/* Chessboard using react-chessboard */}
                                    <div className="w-full aspect-square max-w-[220px] mx-auto rounded-2xl overflow-hidden border-2 border-plum/15 bg-white shadow-md mb-4">
                                        <Chessboard 
                                            options={{
                                                position: quizQuestions[currentQuestionIndex].board,
                                                boardOrientation: 'white',
                                                darkSquareStyle: { backgroundColor: '#b58863' },
                                                lightSquareStyle: { backgroundColor: '#f0d9b5' }
                                            }}
                                        />
                                    </div>

                                    {/* Options selector */}
                                    <div className="space-y-2">
                                        {quizQuestions[currentQuestionIndex].options.map((option, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleOptionSelect(idx)}
                                                className={`w-full p-3 text-left rounded-xl border-2 text-xs transition-all flex items-start gap-2.5 ${selectedOptionIndex === idx
                                                        ? 'bg-berry/5 border-berry text-berry font-bold shadow-sm shadow-berry/5'
                                                        : 'bg-white/40 border-plum/10 text-plum hover:bg-white/80 hover:border-plum/20'
                                                    }`}
                                            >
                                                <span className={`h-4 w-4 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${selectedOptionIndex === idx ? 'border-berry text-berry bg-white' : 'border-plum/20'
                                                    }`}>
                                                    {selectedOptionIndex === idx && <span className="h-1.5 w-1.5 rounded-full bg-berry" />}
                                                </span>
                                                <span className="leading-tight">{option.text}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {selectedOptionIndex !== null && (
                                        <p className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl animate-in fade-in slide-in-from-top-1 duration-300">
                                            {quizQuestions[currentQuestionIndex].options[selectedOptionIndex].feedback}
                                        </p>
                                    )}

                                    <button
                                        onClick={handleNextQuestion}
                                        disabled={selectedOptionIndex === null}
                                        className="w-full py-3.5 bg-plum hover:bg-plum/90 disabled:bg-plum/30 text-cream font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        {currentQuestionIndex < quizQuestions.length - 1 ? "Next Position" : "Finish Diagnostics"} <ChevronRight size={14} />
                                    </button>
                                </div>
                            )}

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
            <section className="py-24 px-6 md:px-12 bg-cream/30 border-b border-plum/5 z-10 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                        <div className="text-left space-y-4 max-w-3xl">
                            <span className="text-[10px] font-black bg-berry/10 text-berry border border-berry/20 px-3.5 py-1 rounded-full uppercase tracking-widest inline-block">
                                Student Success
                            </span>
                            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-plum">
                                Reviews from the Coaching Sessions
                            </h2>
                            <p className="text-lg text-plum/60 font-medium leading-relaxed">
                                See how student players refined their chess intuition and broke rating plateaus under FM Luis Chan's guidance.
                            </p>
                        </div>
                        {/* Scroll controls */}
                        <div className="flex gap-3 justify-start">
                            <button
                                onClick={() => scroll('left')}
                                className="w-12 h-12 rounded-full border-2 border-plum/15 bg-white/60 text-plum flex items-center justify-center hover:bg-white hover:border-plum/30 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                aria-label="Scroll left"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={() => scroll('right')}
                                className="w-12 h-12 rounded-full border-2 border-plum/15 bg-white/60 text-plum flex items-center justify-center hover:bg-white hover:border-plum/30 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                aria-label="Scroll right"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Horizontal scroll container */}
                    <div
                        ref={scrollContainerRef}
                        className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-8 px-1 scrollbar-none"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {coachingReviews.map((review, idx) => (
                            <div
                                key={idx}
                                className="bg-white/40 border border-plum/10 rounded-[2.5rem] p-8 shadow-md hover:shadow-xl transition-all flex flex-col justify-between w-[310px] sm:w-[360px] flex-shrink-0 snap-center relative hover:bg-white/60 group"
                            >
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-0.5 text-amber-500">
                                            {[...Array(review.rating)].map((_, i) => (
                                                <Star key={i} size={16} fill="currentColor" className="stroke-amber-500" />
                                            ))}
                                        </div>
                                        <span className="text-[9px] font-black uppercase text-berry bg-berry/10 border border-berry/10 px-2.5 py-0.5 rounded-full tracking-wider">
                                            {review.tag}
                                        </span>
                                    </div>
                                    <p className="text-plum/80 text-sm leading-relaxed italic font-medium">
                                        "{review.text}"
                                    </p>
                                </div>

                                <div className="flex items-center gap-4 mt-8 pt-6 border-t border-plum/5">
                                    <div className="w-11 h-11 rounded-2xl bg-berry/10 text-berry border border-berry/20 flex items-center justify-center font-bold font-serif text-sm shadow-inner group-hover:scale-105 transition-transform">
                                        {review.avatarInitials}
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-serif font-black text-plum text-base leading-tight">
                                            {review.name}
                                        </h4>
                                        <span className="text-[11px] font-bold text-berry tracking-wide block mt-0.5">
                                            {review.ratingChange}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

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
                    <p className="text-lg text-plum/70 max-w-xl mx-auto leading-relaxed">
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
