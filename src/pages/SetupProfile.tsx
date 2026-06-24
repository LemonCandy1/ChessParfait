import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, AlertCircle, Check } from 'lucide-react';
import Navbar from '../components/Navbar/Navbar';
import { useAuth } from '../context/AuthContext';

export default function SetupProfile() {
    const { user, setupProfile, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Redirect if they already have a username or if they aren't logged in
    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                navigate('/login');
            } else if (user.username) {
                navigate('/');
            }
        }
    }, [user, authLoading, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        const trimmedUser = username.trim();
        if (!trimmedUser) {
            setErrorMsg('Username cannot be empty.');
            return;
        }
        if (trimmedUser.length < 3) {
            setErrorMsg('Username must be at least 3 characters long.');
            return;
        }

        setLoading(true);
        const res = await setupProfile(trimmedUser);
        setLoading(false);

        if (res.success) {
            setSuccessMsg(res.message);
            setTimeout(() => {
                navigate('/');
            }, 1000);
        } else {
            setErrorMsg(res.message);
        }
    };

    if (authLoading) return <div className="min-h-screen bg-cream"></div>;

    return (
        <div className="min-h-screen bg-cream flex flex-col relative overflow-x-hidden text-plum font-sans">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-berry/10 rounded-full blur-3xl -z-10 translate-x-1/4 -translate-y-1/4" />
            
            <Navbar />

            <main className="flex-1 flex items-center justify-center py-12 px-6">
                <div className="w-full max-w-[420px] bg-white rounded-[2.5rem] border-2 border-plum/15 p-8 md:p-10 shadow-inner backdrop-blur-sm animate-in fade-in zoom-in-95 duration-500">
                    <div className="mb-6">
                        <span className="inline-block px-3 py-1 bg-berry/10 text-berry text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
                            Almost Done
                        </span>
                        <h2 className="text-4xl font-serif font-black tracking-tight mb-2">Claim Username</h2>
                        <p className="text-xs text-plum/60 font-bold leading-relaxed">
                            You've successfully signed in with Google! Please choose a unique username to complete your ChessParfait profile.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {errorMsg && (
                            <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-150 text-[11px] font-bold flex items-center gap-2">
                                <AlertCircle size={16} className="flex-shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}
                        {successMsg && (
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-150 text-[11px] font-bold flex items-center gap-2">
                                <Check size={16} className="flex-shrink-0" />
                                <span>{successMsg}</span>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="block text-[9px] font-black uppercase tracking-widest text-plum/40 ml-2">Choose Username</label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-plum/30" size={16} />
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. GrandmasterX"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-cream/50 border-2 border-plum/10 rounded-xl pl-10 pr-4 py-3 text-plum focus:outline-none focus:border-berry transition-all font-bold text-sm"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 soft-button-berry shadow-none hover:shadow-none flex items-center justify-center gap-2 text-xs font-bold disabled:opacity-50"
                        >
                            {loading ? 'Saving Profile...' : 'Complete Setup'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}
