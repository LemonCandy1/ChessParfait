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
            <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-24 relative z-10">
                <div className="glass p-10 rounded-3xl border-2 border-plum/15 shadow-xl shadow-plum/5">
                    <h1 className="text-4xl font-bold mb-6 text-center">Contact Me</h1>
                    <p className="text-plum/70 mb-8 text-center text-lg">
                        Have a question or want to book a session? Fill out the form below.
                    </p>
                    
                    {status === 'success' && (
                        <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-xl font-medium text-center">
                            Thank you! Your message has been sent successfully.
                        </div>
                    )}
                    
                    {status === 'error' && (
                        <div className="mb-6 p-4 bg-red-100 text-red-800 rounded-xl font-medium text-center">
                            There was an error sending your message. Please try again.
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-bold mb-2 ml-1">Name</label>
                            <input
                                id="name"
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border-2 border-plum/15 bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-berry/50 transition-all"
                                placeholder="Your name"
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="email" className="block text-sm font-bold mb-2 ml-1">Email</label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border-2 border-plum/15 bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-berry/50 transition-all"
                                placeholder="your@email.com"
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="question" className="block text-sm font-bold mb-2 ml-1">Question</label>
                            <textarea
                                id="question"
                                required
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                rows={5}
                                className="w-full px-4 py-3 rounded-xl border-2 border-plum/15 bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-berry/50 transition-all resize-none"
                                placeholder="How can I help you?"
                            />
                        </div>
                        
                        <button
                            type="submit"
                            disabled={status === 'submitting'}
                            className="w-full px-8 py-4 bg-berry text-white font-bold rounded-xl hover:bg-berry/90 transition-all transform hover:scale-[1.02] shadow-lg shadow-berry/20 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {status === 'submitting' ? 'Sending...' : 'Send Message'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
