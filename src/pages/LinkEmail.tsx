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
                <div className="w-full max-w-[420px] bg-white rounded-[2.5rem] border-2 border-plum/15 p-8 md:p-10 shadow-inner backdrop-blur-sm animate-in fade-in zoom-in-95 duration-500">
                    <div className="mb-6">
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 text-plum/40 hover:text-berry font-bold uppercase text-[10px] tracking-widest transition-colors mb-4"
                        >
                            <ArrowLeft size={12} /> Back to home
                        </Link>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-11 w-11 rounded-full bg-berry text-cream font-serif font-black flex items-center justify-center text-lg shadow-inner uppercase select-none">
                                {user.username.charAt(0)}
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-plum/30">Logged in as</p>
                                <h2 className="font-serif font-black text-plum text-xl leading-tight">{user.username}</h2>
                            </div>
                        </div>
                        <h3 className="text-3xl font-serif font-black tracking-tight mt-3 mb-1">
                            {user.email ? 'Change Email' : 'Link Email'}
                        </h3>
                        {user.email ? (
                            <div className="space-y-1.5 mt-2">
                                <p className="text-xs text-plum/50 font-bold">
                                    Current email: <span className="text-berry font-black">{user.email}</span>
                                </p>
                                <p className="text-[10px] text-plum/40 font-bold leading-normal">
                                    To change your email, enter a new address below. A confirmation link will be sent to confirm and activate the new address.
                                </p>
                            </div>
                        ) : (
                            <p className="text-xs text-plum/50 font-bold">
                                Add a real email to your account. You can use it to reset your password if you ever forget it.
                            </p>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {errorMsg && (
                            <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-[11px] font-bold flex items-center gap-2">
                                <AlertCircle size={16} className="flex-shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}
                        {successMsg && (
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 text-[11px] font-bold flex items-center gap-2">
                                <Check size={16} className="flex-shrink-0" />
                                <span>{successMsg}</span>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="block text-[9px] font-black uppercase tracking-widest text-plum/40 ml-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-plum/30" size={16} />
                                <input
                                    type="email"
                                    required
                                    placeholder="Enter your real email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-cream/50 border-2 border-plum/10 rounded-xl pl-10 pr-4 py-3 text-plum focus:outline-none focus:border-berry transition-all font-bold text-sm"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 soft-button-berry shadow-none hover:shadow-none flex items-center justify-center gap-2 text-xs font-bold disabled:opacity-50"
                        >
                            {loading ? (user.email ? 'Updating...' : 'Linking...') : (user.email ? 'Update Email Address' : 'Link Email Address')}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}
