import React, { useState } from 'react';
import { Mail, MapPin, User, MessageSquare, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar/Navbar';

const MESSAGE_LIMIT = 1000;

const inputClass =
    'w-full pl-11 pr-4 py-3 rounded-xl border border-plum/15 bg-white/70 text-plum placeholder:text-plum/40 hover:border-plum/30 focus:bg-white focus:outline-none focus:border-berry focus:ring-4 focus:ring-berry/10 transition-[border-color,box-shadow,background-color] duration-150 disabled:opacity-60';

export default function Contact() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [question, setQuestion] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

    const isSubmitting = status === 'submitting';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('submitting');

        try {
            const { error } = await supabase
                .from('contacts')
                .insert([{ name, email, question }]);

            if (error) throw error;

            setStatus('success');
            setName('');
            setEmail('');
            setQuestion('');
        } catch (error) {
            console.error('Error submitting form:', error);
            setStatus('error');
        }
    };

    return (
        <div className="min-h-screen flex flex-col font-sans text-plum bg-cream">
            <div className="relative z-50">
                <Navbar />
            </div>

            <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-12 md:py-20 relative z-10">
                <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-16 items-start animate-fade-up">
                    {/* Intro and contact details */}
                    <section className="lg:pt-6">
                        <h1 className="text-4xl md:text-5xl font-black mb-5 leading-tight tracking-tight">
                            Get in touch
                        </h1>
                        <p className="text-base md:text-lg text-plum/75 leading-relaxed mb-10 max-w-md">
                            Whether you're looking to book coaching sessions or just have a question, send a message and I'll get back to you by email.
                        </p>

                        <ul className="space-y-4">
                            <ContactDetail icon={<Mail size={20} />} label="Email">
                                <a href="mailto:luischanchess@gmail.com" className="hover:text-berry transition-colors break-all">
                                    luischanchess@gmail.com
                                </a>
                            </ContactDetail>
                            <ContactDetail icon={<MapPin size={20} />} label="Based in">
                                Glen Waverley, Melbourne
                            </ContactDetail>
                        </ul>
                    </section>

                    {/* Form card */}
                    <section className="glass rounded-[2rem] p-6 sm:p-8 md:p-10 shadow-xl shadow-plum/5">
                        {status === 'success' ? (
                            <div className="text-center py-10 animate-fade-up" role="status" aria-live="polite">
                                <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                                    <CheckCircle2 size={32} className="text-emerald-600" />
                                </div>
                                <h2 className="text-2xl md:text-3xl font-bold mb-3">Message sent</h2>
                                <p className="text-plum/75 mb-8 max-w-sm mx-auto">
                                    Thank you! Your message has been sent successfully. I'll reply to the email you provided.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setStatus('idle')}
                                    className="soft-button-outline px-6 py-3 text-sm"
                                >
                                    Send another message
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-8">
                                    <h2 className="text-2xl md:text-3xl font-bold mb-2">Send a message</h2>
                                    <p className="text-sm text-plum/65">All fields are required.</p>
                                </div>

                                {status === 'error' && (
                                    <div
                                        role="alert"
                                        className="mb-6 flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-medium animate-fade-up"
                                    >
                                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                                        <span>There was an error sending your message. Please try again, or email me directly.</span>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="grid sm:grid-cols-2 gap-5">
                                        <Field id="name" label="Name" icon={<User size={18} />}>
                                            <input
                                                id="name"
                                                type="text"
                                                required
                                                autoComplete="name"
                                                disabled={isSubmitting}
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className={inputClass}
                                            />
                                        </Field>

                                        <Field id="email" label="Email" icon={<Mail size={18} />}>
                                            <input
                                                id="email"
                                                type="email"
                                                required
                                                autoComplete="email"
                                                disabled={isSubmitting}
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className={inputClass}
                                            />
                                        </Field>
                                    </div>

                                    <Field
                                        id="question"
                                        label="Question"
                                        icon={<MessageSquare size={18} />}
                                        iconTop
                                        hint={`${question.length}/${MESSAGE_LIMIT}`}
                                    >
                                        <textarea
                                            id="question"
                                            required
                                            maxLength={MESSAGE_LIMIT}
                                            disabled={isSubmitting}
                                            value={question}
                                            onChange={(e) => setQuestion(e.target.value)}
                                            rows={6}
                                            className={`${inputClass} resize-none leading-relaxed`}
                                            placeholder="Tell me about your goals, current rating, or what you'd like to ask..."
                                        />
                                    </Field>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-4 soft-button-berry text-base font-bold rounded-xl inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                Send Message
                                                <Send size={18} aria-hidden="true" />
                                            </>
                                        )}
                                    </button>

                                    <p className="text-xs text-plum/55 text-center">
                                        Your details are only used to reply to your message.
                                    </p>
                                </form>
                            </>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}

function ContactDetail({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
    return (
        <li className="flex items-center gap-4">
            <div className="w-11 h-11 shrink-0 rounded-xl bg-white/70 border border-plum/10 text-berry flex items-center justify-center shadow-sm">
                {icon}
            </div>
            <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-wider text-plum/55">{label}</div>
                <div className="font-semibold text-plum">{children}</div>
            </div>
        </li>
    );
}

function Field({
    id,
    label,
    icon,
    iconTop = false,
    hint,
    children,
}: {
    id: string;
    label: string;
    icon: React.ReactNode;
    iconTop?: boolean;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <div className="flex items-baseline justify-between mb-2">
                <label htmlFor={id} className="text-sm font-semibold text-plum/90">{label}</label>
                {hint && <span className="text-xs text-plum/50 tabular-nums">{hint}</span>}
            </div>
            <div className="relative">
                <span
                    className={`absolute left-4 text-plum/40 pointer-events-none ${iconTop ? 'top-3.5' : 'top-1/2 -translate-y-1/2'}`}
                    aria-hidden="true"
                >
                    {icon}
                </span>
                {children}
            </div>
        </div>
    );
}
