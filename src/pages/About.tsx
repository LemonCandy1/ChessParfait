import { Award, Star, Medal, ExternalLink } from 'lucide-react';
import profilePicture from '../assets/Profile Photo.jpeg'; 
import Navbar from '../components/Navbar/Navbar.tsx';

export default function About() {
    return (
        <div className="min-h-screen bg-cream text-plum font-sans">
            <Navbar />
            
            <main className="max-w-5xl mx-auto px-6 py-16 animate-fade-up">
                <section className="mb-24 flex flex-col lg:flex-row items-center gap-16">
                    <div className="flex-1 order-2 lg:order-1">
                        <div className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest text-berry uppercase bg-berry/10 rounded-full border border-berry/20">
                            FIDE Master & Coach
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black mb-8 leading-tight tracking-tight">
                            About <span className="text-berry">Me</span>
                        </h1>
                        <div className="space-y-6 text-xl text-plum/80 leading-relaxed">
                            <p>
                                Hey! My name is Luis and I am a FIDE Master based in Melbourne, Australia. I started learning chess when I was 6 years old in primary school and have loved it ever since!
                            </p>
                            <p>
                                I have over 7 years of coaching experience and have taught students from their first games to achieving 2000+ FIDE ratings.
                            </p>
                            <p>
                                I'm always happy to hear any questions! Reach out at <a href="mailto:luischanchess@gmail.com" className="text-berry font-bold hover:underline">luischanchess@gmail.com</a>.
                            </p>
                        </div>
                    </div>
                    
                    <div className="relative order-1 lg:order-2">
                        <div className="w-72 h-96 bg-plum/10 rounded-[2.5rem] shadow-2xl shadow-plum/15 overflow-hidden border-4 border-white ring-2 ring-plum/15 transition-transform duration-200 ease-out hover:scale-[1.02]">
                            <img src={profilePicture} fetchPriority="high" className="w-full h-full object-cover" alt="Luis Chan" />
                        </div>
                        <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-berry/10 rounded-full blur-2xl -z-10" />
                        <div className="absolute -top-6 -left-6 w-24 h-24 bg-plum/5 rounded-full blur-xl -z-10" />
                    </div>
                </section>

                {/* Statistics Cards */}
                <div className="mb-24">
                    <section className="grid md:grid-cols-3 gap-8 mb-4">
                        <StatCard icon={<Award className="text-berry" />} label="FIDE Rating" value="2280" />
                        <StatCard icon={<Star className="text-plum" />} label="ACF Rating" value="2318" />
                        <StatCard icon={<Medal className="text-berry" />} label="Australia Rank*" value="#16" />
                    </section>
                    <p className="text-xs text-plum/70 italic text-right px-4">
                        *Based on Australian Chess Federation ranking among active players
                    </p>
                </div>

                {/* The Story Section */}
                <section className="grid lg:grid-cols-2 gap-16 mb-24 items-center">
                    <div className="p-10 md:p-12 glass rounded-[2.5rem] border-2 border-plum/15 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-berry/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">Chess Parfait Story</h2>
                        <div className="space-y-4 text-base md:text-lg text-plum/80 leading-relaxed">
                            <p>
                                In addition to my coaching, I created Chess Parfait to showcase the parts of chess that I love most. Chess puzzles, instructive endgames, and creative variants are all crafted with purpose.
                            </p>
                            <p>
                                From master-level tablebase analysis to variants like <span className="text-berry font-bold">Fog of War</span>, this is where I share the passion that sparked my love for the game.
                            </p>
                        </div>
                    </div>
                    
                    <div>
                        <h3 className="text-3xl font-bold mb-4">Fog of War Journey</h3>
                        <p className="text-base md:text-lg text-plum/80 mb-6 leading-relaxed">
                            My favourite variant is Fog of War Chess, a game of hidden information where you can only see the squares which your pieces can move to. In 2024, I became the first world champion after a gruelling double knockout tournament against some of the best players in the world.
                        </p>
                        <a 
                            href="https://www.chess.com/news/view/2024-chesscom-fog-of-war-chess-championship-knockout-chan-wins"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 font-bold text-berry hover:text-plum transition-colors border-b-2 border-berry/20 pb-1"
                        >
                            Read about the Championship <ExternalLink size={18} />
                        </a>
                    </div>
                </section>
            </main>
        </div>
    );
}

function StatCard({ icon, label, value }: { icon: any, label: string, value: string }) {
    return (
        <div className="p-8 md:p-10 glass rounded-3xl group hover:bg-white/90 hover:-translate-y-1 hover:shadow-lg transition-[transform,background-color,box-shadow] duration-200 ease-out border-2 border-plum/15">
            <div className="mb-4 text-plum/80 group-hover:scale-105 transition-transform duration-200">{icon}</div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-plum/70 mb-2">{label}</h3>
            <p className="text-3xl md:text-4xl font-serif font-black text-plum group-hover:text-berry transition-colors duration-200">{value}</p>
        </div>
    );
}