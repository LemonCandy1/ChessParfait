import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar/Navbar';

export default function Contact() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [question, setQuestion] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

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
            <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-16 md:py-24 relative z-10">
                <div className="glass p-8 md:p-12 rounded-[2.5rem] border-2 border-plum/15 shadow-xl shadow-plum/5 animate-fade-up">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">Contact Me</h1>
                    <p className="text-plum/80 mb-8 text-center text-base md:text-lg">
                        Have a question or want to book a session? Fill out the form below.
                    </p>
                    
                    {status === 'success' && (
                        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl font-medium text-center animate-fade-up">
                            Thank you! Your message has been sent successfully.
                        </div>
                    )}
                    
                    {status === 'error' && (
                        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl font-medium text-center animate-fade-up">
                            There was an error sending your message. Please try again.
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-bold mb-2 ml-1 text-plum/90">Name</label>
                            <input
                                id="name"
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border-2 border-plum/15 bg-white/60 focus:bg-white focus:outline-none focus:border-berry focus:ring-4 focus:ring-berry/15 transition-[border-color,box-shadow,background-color] duration-150"
                                placeholder="Your name"
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="email" className="block text-sm font-bold mb-2 ml-1 text-plum/90">Email</label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border-2 border-plum/15 bg-white/60 focus:bg-white focus:outline-none focus:border-berry focus:ring-4 focus:ring-berry/15 transition-[border-color,box-shadow,background-color] duration-150"
                                placeholder="your@email.com"
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="question" className="block text-sm font-bold mb-2 ml-1 text-plum/90">Question</label>
                            <textarea
                                id="question"
                                required
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                rows={5}
                                className="w-full px-4 py-3 rounded-xl border-2 border-plum/15 bg-white/60 focus:bg-white focus:outline-none focus:border-berry focus:ring-4 focus:ring-berry/15 transition-[border-color,box-shadow,background-color] duration-150 resize-none"
                                placeholder="How can I help you?"
                            />
                        </div>
                        
                        <button
                            type="submit"
                            disabled={status === 'submitting'}
                            className="w-full py-4 soft-button-berry text-base font-bold rounded-xl disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {status === 'submitting' ? 'Sending...' : 'Send Message'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
