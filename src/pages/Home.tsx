import {
    Mail,
    ChevronRight,
    Award
} from 'lucide-react';
import Navbar from '../components/Navbar/Navbar.tsx';
import { Link } from 'react-router-dom';
import profilePicture from '../assets/Profile Photo.jpeg';
import wutccPhoto from '../assets/wutcc-2026-board1-1600.webp';
import wutccPhotoSmall from '../assets/wutcc-2026-board1-900.webp';
import { ACHIEVEMENTS } from '../data/coach';
import ClientFeedback from '@/components/ui/testimonial';
import ParallaxBackground from '@/components/ui/ParallaxBackground';
import SpecularButton from './SpecularButton';

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
                <div className="flex flex-col items-center text-center max-w-6xl mx-auto w-full">
                    <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[4.25rem] xl:text-7xl font-black mb-6 leading-[1.08] tracking-tight font-serif text-plum">
                        Perfect Your <span className="text-berry">Chess Intuition</span>
                    </h1>

                    <p className="text-lg md:text-xl text-plum/80 font-medium mb-10 leading-relaxed max-w-2xl mx-auto">
                        Welcome to <span className="font-serif font-black italic text-plum">ChessParfait</span> — a premier training space designed for chess players with interactive games, tactical puzzles, and masterclass instruction.
                    </p>

                    <div className="flex flex-wrap justify-center gap-4 w-full sm:w-auto">
                        <SpecularButton
                            to="/games"
                            size="md"
                            radius={14}
                            tint="#D23157"
                            tintOpacity={1}
                            textColor="#ffffff"
                            lineColor="#ffffff"
                            baseColor="#991b3b"
                            intensity={1.2}
                            shineSize={14}
                            shineFade={35}
                            thickness={1.5}
                            speed={0.35}
                            followMouse={true}
                            proximity={250}
                            className="w-full sm:w-auto"
                        >
                            <span className="flex items-center justify-center gap-2 group text-sm font-bold">
                                <span>Play & Learn</span>
                                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                        </SpecularButton>
                        <SpecularButton
                            to="/contact"
                            size="md"
                            radius={14}
                            tint="#ffffff"
                            tintOpacity={0.95}
                            blur={8}
                            textColor="#4A154B"
                            lineColor="#D23157"
                            baseColor="#e5d0de"
                            intensity={1.2}
                            shineSize={14}
                            shineFade={35}
                            thickness={1.5}
                            speed={0.35}
                            followMouse={true}
                            proximity={250}
                            className="w-full sm:w-auto border border-plum/10"
                        >
                            <span className="flex items-center justify-center gap-2 text-sm font-bold">
                                <span>Book a Session</span>
                            </span>
                        </SpecularButton>
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
                            Meet Your Coach, <span className="text-berry whitespace-nowrap">FM Luis Chan</span>
                        </h2>

                        <blockquote className="border-l-4 border-berry pl-4 italic text-cream/90 text-lg leading-relaxed">
                            "Chess is not just about memorising lines; it's about learning the subtle logic behind every position and refining your raw intuition."
                        </blockquote>

                        <p className="text-cream/80 leading-relaxed text-sm">
                            I am a FIDE Master based in Glen Waverley, Melbourne. Having coached for over 7 years, I have successfully trained players from complete beginners to competitive tournament players achieving 2000+ FIDE rating milestones. I offer{' '}
                            <Link to="/chess-coaching-melbourne" className="text-cream font-bold underline decoration-berry decoration-2 underline-offset-4 hover:text-berry transition-colors">
                                home visits, school coaching and online lessons
                            </Link>.
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

            {/* ACHIEVEMENTS */}
            <section className="py-20 md:py-24 px-4 sm:px-6 md:px-12 relative z-10">
                <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-14 items-center">
                    <figure className="space-y-3">
                        <div className="rounded-[2rem] overflow-hidden border-2 border-plum/15 shadow-xl shadow-plum/10 bg-plum/5">
                            <img
                                src={wutccPhoto}
                                srcSet={`${wutccPhotoSmall} 900w, ${wutccPhoto} 1600w`}
                                sizes="(min-width: 1024px) 600px, 100vw"
                                width={1600}
                                height={1067}
                                loading="lazy"
                                decoding="async"
                                alt="FM Luis Chan playing on board 1 at the FIDE World University Team Chess Championship 2026"
                                className="w-full h-auto object-cover"
                            />
                        </div>
                        <figcaption className="text-xs text-plum/60 px-2">
                            Board 1 at the FIDE World University Team Chess Championship 2026, Almaty. Photo: Boris Pozhidayev.
                        </figcaption>
                    </figure>

                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-berry mb-3">Achievements</p>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight text-plum mb-8">
                            Proven over the board
                        </h2>
                        <ol className="border-t border-plum/15">
                            {ACHIEVEMENTS.map((item) => (
                                <li key={item.title} className="flex gap-5 py-4 border-b border-plum/15">
                                    <span className="font-serif font-black text-xl text-berry w-14 shrink-0 tabular-nums leading-tight">
                                        {item.year}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block font-bold text-plum leading-snug">{item.title}</span>
                                        <span className="block text-sm text-plum/65 mt-0.5">{item.detail}</span>
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </section>

            {/* COACHING REVIEWS SECTION */}
            <ClientFeedback />

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
