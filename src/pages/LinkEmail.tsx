import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, AlertCircle, Check, ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar/Navbar';
import { useAuth } from '../context/AuthContext';

export default function LinkEmail() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Redirect if not logged in
    if (!user) {
        return (
            <div className="min-h-screen bg-cream flex flex-col">
                <Navbar />
                <main className="flex-1 flex items-center justify-center px-6 py-12">
                    <div className="text-center space-y-4">
                        <p className="font-serif text-2xl font-black text-plum">You must be logged in.</p>
                        <Link to="/" className="text-berry font-bold hover:underline text-sm">← Back to home</Link>
                    </div>
                </main>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        const trimmed = email.trim();
        if (!trimmed) {
            setErrorMsg('Email address cannot be empty.');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
            setErrorMsg('Please enter a valid email address.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/link-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: trimmed })
            });

            const data = await res.json();
            if (!res.ok) {
                setErrorMsg(data.message || 'Failed to link email.');
            } else {
                setSuccessMsg(data.message);
                setTimeout(() => navigate('/'), 2500);
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
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-11 w-11 rounded-full bg-berry text-cream font-serif font-black flex items-center justify-center text-lg shadow-inner uppercase select-none overflow-hidden">
                                {user.avatarUrl ? (
                                    <img
                                        src={user.avatarUrl}
                                        alt={user.username}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    user.username.charAt(0)
                                )}
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-plum/60">Logged in as</p>
                                <h2 className="font-serif font-black text-plum text-xl leading-tight">{user.username}</h2>
                            </div>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-serif font-black tracking-tight mt-3 mb-1 text-plum">
                            {user.email ? 'Change Email' : 'Link Email'}
                        </h3>
                        {user.email ? (
                            <div className="space-y-1.5 mt-2">
                                <p className="text-xs text-plum/70 font-bold">
                                    Current email: <span className="text-berry font-black">{user.email}</span>
                                </p>
                                <p className="text-xs text-plum/60 font-medium leading-normal">
                                    To change your email, enter a new address below. A confirmation link will be sent to confirm and activate the new address.
                                </p>
                            </div>
                        ) : (
                            <p className="text-xs text-plum/70 font-medium">
                                Add a real email to your account. You can use it to reset your password if you ever forget it.
                            </p>
                        )}
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
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-plum/45" size={16} />
                                <input
                                    type="email"
                                    required
                                    placeholder="Enter your real email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-cream/40 border-2 border-plum/15 rounded-xl pl-10 pr-4 py-3 text-plum focus:outline-none focus:border-berry focus:ring-4 focus:ring-berry/15 focus:bg-white transition-[border-color,box-shadow,background-color] duration-150 font-semibold text-sm"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 soft-button-berry flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50 mt-4 cursor-pointer"
                        >
                            {loading ? (user.email ? 'Updating...' : 'Linking...') : (user.email ? 'Update Email Address' : 'Link Email Address')}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}
