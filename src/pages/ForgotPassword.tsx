import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, Check, ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar/Navbar';

export default function ForgotPassword() {
    const [value, setValue] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        const trimmed = value.trim();
        if (!trimmed) {
            setErrorMsg('Please enter your username or email address.');
            return;
        }

        setLoading(true);
        try {
            // Determine if input is email or username
            const isEmail = trimmed.includes('@');
            const body = isEmail ? { email: trimmed } : { username: trimmed };

            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (!res.ok) {
                setErrorMsg(data.message || 'Failed to send reset email.');
            } else {
                setSuccessMsg(data.message);
            }
        } catch {
            setErrorMsg('Could not connect to server. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-cream flex flex-col relative overflow-x-hidden text-plum font-sans">
            <div className="absolute top-0 right-0 w-250 h-250 bg-berry/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2" />

            <Navbar />

            <main className="flex-1 flex items-center justify-center py-12 px-6">
                <div className="w-full max-w-[420px] bg-white rounded-[2.5rem] border-2 border-plum/15 p-8 md:p-10 shadow-lg shadow-plum/5 backdrop-blur-sm animate-fade-up">
                    <div className="mb-6">
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 text-plum/60 hover:text-berry font-bold uppercase text-[10px] tracking-widest transition-colors mb-4"
                        >
                            <ArrowLeft size={12} /> Back to home
                        </Link>
                        <h2 className="text-3xl md:text-4xl font-serif font-black tracking-tight mb-2 text-plum">Forgot Password</h2>
                        <p className="text-xs text-plum/70 font-semibold">
                            Enter your username or linked email address. We'll send a reset link to your email.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {errorMsg && (
                            <div className="p-3.5 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 text-xs font-bold flex items-center gap-2 animate-fade-up">
                                <AlertCircle size={16} className="flex-shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}
                        {successMsg && (
                            <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-bold flex items-center gap-2 animate-fade-up">
                                <Check size={16} className="flex-shrink-0" />
                                <span>{successMsg}</span>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-plum/70 ml-2">
                                Username or Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-plum/45" size={16} />
                                <input
                                    type="text"
                                    required
                                    placeholder="Enter your username or email"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    className="w-full bg-cream/40 border-2 border-plum/15 rounded-xl pl-10 pr-4 py-3 text-plum focus:outline-none focus:border-berry focus:ring-4 focus:ring-berry/15 focus:bg-white transition-[border-color,box-shadow,background-color] duration-150 font-semibold text-sm"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 soft-button-berry flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50 mt-4 cursor-pointer"
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>

                    <div className="text-center mt-6 border-t border-plum/10 pt-4 space-y-1">
                        <div>
                            <span className="text-xs font-bold text-plum/70">Remember your password? </span>
                            <Link to="/login" className="text-xs font-black text-berry hover:underline">
                                Sign in
                            </Link>
                        </div>
                        <div>
                            <span className="text-xs font-bold text-plum/70">No account? </span>
                            <Link to="/register" className="text-xs font-black text-berry hover:underline">
                                Register here
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
