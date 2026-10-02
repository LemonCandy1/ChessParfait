import { Link } from 'react-router-dom';
import { ArrowRight, Mail } from 'lucide-react';
import { Home as HomeIcon, School, Monitor, ChevronDown } from '../lib/lucideOriginal';
import Navbar from '../components/Navbar/Navbar';
import profilePicture from '../assets/Profile Photo.jpeg';
import { ACHIEVEMENTS, COACH, COACHING_FAQ, LOCATION } from '../data/coach';
import { testimonials } from '../data/testimonials';

const FORMATS = [
    {
        icon: <HomeIcon size={22} strokeWidth={1.75} />,
        title: 'Home visits',
        body: `Private one-on-one lessons at your home in and around ${LOCATION.suburb}.`,
    },
    {
        icon: <School size={22} strokeWidth={1.75} />,
        title: 'Schools',
        body: 'Chess coaching for school chess clubs and programs, for students of every level.',
    },
    {
        icon: <Monitor size={22} strokeWidth={1.75} />,
        title: 'Online',
        body: 'Live lessons over video from anywhere in Melbourne, Australia or overseas.',
    },
];

const TOPICS = [
    'Rules, basic tactics and checkmates for new players',
    'Openings that suit your style',
    'Tactics and calculation in difficult positions',
    'Endgame technique',
    'Reviewing your own games',
    'Tournament preparation and practical decision-making',
];

export default function Coaching() {
    return (
        <div className="min-h-[100dvh] bg-cream font-sans text-plum">
            <Navbar />

            <main>
                {/* Hero */}
                <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 md:pt-20 pb-14 md:pb-20 grid lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-16 items-center">
                    <div className="animate-fade-up">
                        <p className="text-xs font-black uppercase tracking-widest text-berry mb-4">
                            Chess coaching in {LOCATION.suburb}, Melbourne
                        </p>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05] mb-6">
                            Chess lessons with <span className="text-berry whitespace-nowrap">FM Luis Chan</span>
                        </h1>
                        <p className="text-lg text-plum/75 leading-relaxed max-w-xl mb-8">
                            Private and group chess coaching from a FIDE Master with over {COACH.yearsCoaching.replace('+', '')} years
                            of teaching experience. Home visits around {LOCATION.suburb}, coaching for schools, and online lessons,
                            for complete beginners through to 2000+ rated tournament players.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <Link to="/contact" className="soft-button-berry inline-flex items-center gap-2 px-7 py-4 text-sm">
                                Enquire about lessons <ArrowRight size={16} />
                            </Link>
                            <a href={`mailto:${COACH.email}`} className="soft-button-outline inline-flex items-center gap-2 px-7 py-4 text-sm">
                                <Mail size={16} /> Email Luis
                            </a>
                        </div>
                    </div>
                    <div className="relative mx-auto w-64 sm:w-72 lg:w-full max-w-sm">
                        <div className="aspect-[3/4] rounded-[2.5rem] overflow-hidden border-4 border-white ring-2 ring-plum/15 shadow-2xl shadow-plum/15">
                            <img src={profilePicture} alt="FM Luis Chan at the chessboard" className="w-full h-full object-cover" />
                        </div>
                    </div>
                </section>

                {/* Quick facts */}
                <section aria-label="At a glance" className="bg-plum text-cream">
                    <dl className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                        {[
                            ['FIDE Master', 'Title since 2018'],
                            [String(COACH.fideRating), 'FIDE rating'],
                            [`${COACH.yearsCoaching} years`, 'Coaching experience'],
                            ['2000+', 'Student ratings reached'],
                        ].map(([value, label]) => (
                            <div key={label} className="flex flex-col-reverse">
                                <dt className="text-[11px] uppercase tracking-widest font-bold text-cream/70 mt-1">{label}</dt>
                                <dd className="font-serif font-black text-2xl md:text-3xl">{value}</dd>
                            </div>
                        ))}
                    </dl>
                </section>

                {/* Formats */}
                <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-20">
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">How lessons work</h2>
                    <p className="text-plum/70 max-w-2xl mb-10">
                        Every lesson is tailored to the student: what they already know, how they like to learn, and what they want to achieve.
                    </p>
                    <div className="grid md:grid-cols-3 gap-5">
                        {FORMATS.map((f) => (
                            <div key={f.title} className="soft-card rounded-3xl p-6 md:p-7">
                                <div className="w-11 h-11 rounded-xl bg-berry/10 text-berry flex items-center justify-center mb-5">{f.icon}</div>
                                <h3 className="text-xl font-black mb-2">{f.title}</h3>
                                <p className="text-sm text-plum/70 leading-relaxed">{f.body}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Topics + credentials */}
                <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 md:pb-20 grid lg:grid-cols-2 gap-12 lg:gap-16">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-6">What we work on</h2>
                        <ul className="space-y-3">
                            {TOPICS.map((t) => (
                                <li key={t} className="flex gap-3 text-plum/80">
                                    <span aria-hidden="true" className="mt-2 w-1.5 h-1.5 rounded-full bg-berry shrink-0" />
                                    {t}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-6">Your coach</h2>
                        <ol className="border-t border-plum/15">
                            {ACHIEVEMENTS.map((a) => (
                                <li key={a.title} className="flex gap-5 py-3.5 border-b border-plum/15">
                                    <span className="font-serif font-black text-lg text-berry w-12 shrink-0 tabular-nums">{a.year}</span>
                                    <span>
                                        <span className="block font-bold leading-snug">{a.title}</span>
                                        <span className="block text-sm text-plum/65">{a.detail}</span>
                                    </span>
                                </li>
                            ))}
                            <li className="flex gap-5 py-3.5 border-b border-plum/15">
                                <span className="font-serif font-black text-lg text-berry w-12 shrink-0 tabular-nums">2024</span>
                                <span>
                                    <span className="block font-bold leading-snug">Chess.com Fog of War Champion</span>
                                    <a href={COACH.fogOfWarArticle} target="_blank" rel="noopener noreferrer" className="block text-sm text-berry hover:underline">
                                        Read the Chess.com article
                                    </a>
                                </span>
                            </li>
                        </ol>
                        <p className="text-sm text-plum/65 mt-4">
                            Verify my rating on my{' '}
                            <a href={COACH.fideProfile} target="_blank" rel="noopener noreferrer" className="text-berry font-semibold hover:underline">FIDE profile</a>
                            {' '}or play me on{' '}
                            <a href={COACH.chessComProfile} target="_blank" rel="noopener noreferrer" className="text-berry font-semibold hover:underline">Chess.com</a>.
                        </p>
                    </div>
                </section>

                {/* Testimonials */}
                <section className="bg-white/40 border-y border-plum/10">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-20">
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-10">What students and parents say</h2>
                        <div className="grid md:grid-cols-2 gap-5">
                            {testimonials.map((t) => (
                                <figure key={t.name} className="soft-card rounded-3xl p-6 md:p-7 flex flex-col">
                                    <blockquote className="text-plum/80 leading-relaxed whitespace-pre-line flex-1">"{t.quote}"</blockquote>
                                    <figcaption className="mt-5 text-sm">
                                        <span className="font-bold">{t.name}</span>
                                        <span className="text-plum/55"> · {t.role}</span>
                                    </figcaption>
                                </figure>
                            ))}
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 md:py-20">
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-8">Frequently asked questions</h2>
                    <div className="border-t border-plum/15">
                        {COACHING_FAQ.map((f) => (
                            <details key={f.question} className="group border-b border-plum/15">
                                <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none font-bold text-lg [&::-webkit-details-marker]:hidden">
                                    {f.question}
                                    <ChevronDown size={20} className="shrink-0 text-plum/40 transition-transform duration-200 group-open:rotate-180" />
                                </summary>
                                <p className="pb-5 -mt-1 text-plum/75 leading-relaxed">{f.answer}</p>
                            </details>
                        ))}
                    </div>
                </section>

                {/* CTA */}
                <section className="px-4 sm:px-6 pb-20">
                    <div className="max-w-4xl mx-auto bg-plum text-cream rounded-[2.5rem] p-10 md:p-14 text-center">
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">Book a chess lesson in {LOCATION.suburb}</h2>
                        <p className="text-cream/80 max-w-xl mx-auto mb-8">
                            Tell me a little about the student and what you'd like to achieve, and I'll get back to you with availability and rates.
                        </p>
                        <Link to="/contact" className="soft-button-berry inline-flex items-center gap-2 px-8 py-4 text-sm">
                            Get in touch <ArrowRight size={16} />
                        </Link>
                    </div>
                </section>
            </main>
        </div>
    );
}
