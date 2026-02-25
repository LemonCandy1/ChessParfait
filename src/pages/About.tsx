import { Award, Brain, Microscope } from 'lucide-react';
import profilePicture from '../assets/Profile Photo.jpeg'; 
import Navbar from '../components/Navbar/Navbar.tsx';

export default function About() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            <Navbar />
            <main className="max-w-4xl mx-auto px-6 py-12">
                <section className="mb-20 text-center md:text-left flex flex-col md:flex-row items-center gap-12">
                    <div className="flex-1">
                        <h1 className="text-5xl font-black mb-6 leading-tight">
                            About Me
                        </h1>
                        <p className="text-xl text-slate-600 leading-relaxed">
                            Hey! My name is Luis and I am a FIDE Master based in Melbourne, Australia. I started learning chess when I was 6 years old in primary school and have loved it ever since!
                        </p>
                        <p className="text-xl text-slate-600 leading-relaxed mt-4">
                        I have over 7 years of coaching experience for students of all levels, from complete beginners to 2000+ FIDE rated players. 
                        </p>
                        <p className="text-xl text-slate-600 leading-relaxed mt-4">  
                            Please contact me via email at luischanchess@gmail.com if you have any questions about my coaching or want to book a session!
                        </p>
                    </div>
                    <div className="w-64 h-100 bg-indigo-100 rounded-3xl rotate-0 shadow-xl overflow-hidden border-4 border-white">
                        <div className="w-full h-full flex items-center justify-center text-indigo-300">
                            <img src={profilePicture} fetchPriority= "high" className="w-full h-full object-cover" />
                        </div>
                    </div>
                </section>

                {/* The Three Pillars */}
                <section className="grid md:grid-cols-3 gap-8 mb-20">
                    <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100">
                        <Award className="text-indigo-600 mb-4" size={32} />
                        <h3 className="font-bold text-lg mb-2">FIDE Master</h3>
                        <p className="text-sm text-slate-600">test 2 3 4</p>
                    </div>
                    <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100">
                        <Microscope className="text-indigo-600 mb-4" size={32} />
                        <h3 className="font-bold text-lg mb-2">Analytical Rigor</h3>
                        <p className="text-sm text-slate-600">Some paragraph</p>
                    </div>
                    <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100">
                        <Brain className="text-indigo-600 mb-4" size={32} />
                        <h3 className="font-bold text-lg mb-2">Idk Broskis</h3>
                        <p className="text-sm text-slate-600">Testing 123.</p>
                    </div>
                </section>

                {/* Personal Story */}
                <section className="prose prose-slate lg:prose-xl">
                    <h2 className="text-3xl font-bold mb-6">The Chess Parfait Story</h2>
                    <p className="mb-4">
                        Super test.
                    </p>
                    <p className="mb-4">
                        In addition to my coaching, I have created this website to showcase the parts of chess that I really like. Chess puzzles, instructive games and other variants including fog of war chess and imposter chess is in the works!
                    </p>
                    <p>
                        Whether you are a club player in Melbourne or an aspiring Master overseas,
                        my aim is to provide the perfect blend of deep theory and practical
                        results to help students reach their goals in chess.
                    </p>
                </section>

                {/* Call to Action */}
                <footer className="mt-20 p-12 bg-indigo-600 rounded-3xl text-white text-center">
                    <h2 className="text-3xl font-bold mb-4">Ready to optimise your game?</h2>
                    <p className="mb-8 opacity-90">Booking limited sessions for the current tournament season.</p>
                    <button className="bg-white text-indigo-600 px-8 py-3 rounded-full font-bold hover:bg-indigo-50 transition">
                        Apply for Coaching
                    </button>
                </footer>
            </main>
        </div>
    );
}