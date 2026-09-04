import {
    Mail,
    ChevronRight,
    Award
} from 'lucide-react';
import Navbar from '../components/Navbar/Navbar.tsx';
import { Link } from 'react-router-dom';
import profilePicture from '../assets/Profile Photo.jpeg';
import ClientFeedback from '@/components/ui/testimonial';
import ParallaxBackground from '@/components/ui/ParallaxBackground';

export default function Home() {

    return (
        <div className="min-h-screen flex flex-col font-sans text-plum relative bg-cream overflow-x-clip">
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

            {/* HERO SECTION */}
            <header className="relative pt-16 pb-20 px-6 md:px-12 max-w-7xl mx-auto w-full z-10">
                <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
                    <h1 className="text-5xl md:text-7xl font-black mb-6 leading-[1.08] tracking-tight text-plum">
                        Perfect Your <span className="text-berry">Chess Intuition</span>
                    </h1>

                    <p className="text-lg md:text-xl text-plum/80 font-medium mb-10 leading-relaxed max-w-2xl mx-auto">
                        Welcome to <span className="font-serif font-black italic text-plum">ChessParfait</span> — a premier training space designed for chess players with interactive games, tactical puzzles, and masterclass instruction.
                    </p>

                    <div className="flex flex-wrap justify-center gap-4 w-full sm:w-auto">
                        <Link
                            to="/games"
                            className="soft-button-berry px-8 py-4 flex items-center justify-center gap-2 group w-full sm:w-auto text-sm"
                        >
                            <span>Play & Learn</span>
                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                            to="/contact"
                            className="soft-button-outline px-8 py-4 flex items-center justify-center gap-2 w-full sm:w-auto text-sm"
                        >
                            <span>Book a Session</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* SOCIAL PROOF METRIC RIBBON */}
            <section className="bg-plum py-8 px-6 text-cream relative z-10 shadow-lg border-y-2 border-plum/10">
                <div className="max-w-7xl mx-auto flex flex-wrap justify-around items-center gap-8 text-center">
                    <div className="space-y-1">
                        <span className="block text-4xl font-serif font-black text-white">7+ Years</span>
                        <span className="text-[11px] uppercase font-black text-cream/75 tracking-wider block">Coaching Experience</span>
                    </div>
                    <div className="hidden md:block h-10 w-px bg-white/15" />
                    <div className="space-y-1">
                        <span className="block text-4xl font-serif font-black text-berry">5k+ Hrs</span>
                        <span className="text-[11px] uppercase font-black text-cream/75 tracking-wider block">Instructional Time</span>
                    </div>
                    <div className="hidden md:block h-10 w-px bg-white/15" />
                    <div className="space-y-1">
                        <span className="block text-4xl font-serif font-black text-white">Online & In-Person</span>
                        <span className="text-[11px] uppercase font-black text-cream/75 tracking-wider block">Structured Support</span>
                    </div>
                </div>
            </section>

            {/* COACHING REVIEWS SECTION */}
            <ClientFeedback />

            {/* COACH SHOWCASE: FM LUIS CHAN */}
            <section className="py-24 px-6 md:px-12 bg-plum text-cream z-10 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-berry/15 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
                </div>

                <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-16 relative z-10">

                    {/* Profile Picture Panel */}
                    <div className="relative order-2 lg:order-1 flex-shrink-0">
                        <div className="w-72 h-[380px] bg-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-cream/30">
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

                        <blockquote className="border-l-4 border-berry pl-4 italic text-cream/90 text-lg leading-relaxed">
                            "Chess is not just about memorising lines; it's about learning the subtle logic behind every position and refining your raw intuition."
                        </blockquote>

                        <p className="text-cream/80 leading-relaxed text-sm">
                            I am a FIDE Master based in Melbourne, Australia. Having coached for over 7 years, I have successfully trained players from complete beginners to competitive tournament players achieving 2000+ FIDE rating milestones.
                        </p>

                        {/* Stats blocks inside Coach section */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                                <span className="block text-2xl font-black text-berry">2280</span>
                                <span className="text-[11px] text-cream/80 uppercase tracking-wider font-black">FIDE Rating</span>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                                <span className="block text-2xl font-black text-white">2318</span>
                                <span className="text-[11px] text-cream/80 uppercase tracking-wider font-black">ACF Rating</span>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                                <span className="block text-2xl font-black text-berry">7+ Yrs</span>
                                <span className="text-[11px] text-cream/80 uppercase tracking-wider font-black">Experience</span>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                                <span className="block text-2xl font-black text-white">#16</span>
                                <span className="text-[11px] text-cream/80 uppercase tracking-wider font-black">Active AUS Rank</span>
                            </div>
                        </div>

                        <div className="pt-4 flex flex-wrap gap-4">
                            <Link
                                to="/contact"
                                className="soft-button-berry px-8 py-4 text-sm"
                            >
                                Secure a Coaching Slot
                            </Link>
                            <Link
                                to="/about"
                                className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-cream font-bold rounded-xl transition-colors text-sm active:scale-95"
                            >
                                Read My Story
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* CALL TO ACTION ZONE */}
            <section className="py-24 px-6 md:px-12 text-center relative z-10 max-w-4xl mx-auto">
                <div className="space-y-8 bg-cream/30 backdrop-blur-md p-10 md:p-14 rounded-[2.5rem] border-2 border-plum/15 shadow-lg">
                    <h2 className="text-4xl md:text-5xl font-black text-plum">Let's Perfect Your Chess!</h2>
                    <p className="text-lg text-plum/80 max-w-xl mx-auto leading-relaxed font-medium">
                        Improve your rating, solve weekly calculation challenges and prepare for upcoming tournaments with structured support.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/contact"
                            className="soft-button-berry inline-flex items-center gap-2.5 px-9 py-4 text-sm w-full sm:w-auto justify-center"
                        >
                            <Mail size={18} />
                            <span>Contact for Booking</span>
                        </Link>
                        <Link
                            to="/games"
                            className="soft-button inline-flex items-center gap-2 px-9 py-4 text-sm w-full sm:w-auto justify-center"
                        >
                            <span>Explore Variant Games</span>
                        </Link>
                    </div>
                    <p className="text-xs text-plum/50 font-bold uppercase tracking-widest pt-2">
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
