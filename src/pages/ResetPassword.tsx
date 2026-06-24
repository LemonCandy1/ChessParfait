import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, AlertCircle, Check } from 'lucide-react';
import Navbar from '../components/Navbar/Navbar';
import { supabase } from '../lib/supabaseClient';

export default function ResetPassword() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // Supabase triggers PASSWORD_RECOVERY event when user arrives from reset email link
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setReady(true);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        if (!password) {
            setErrorMsg('Password cannot be empty.');
            return;
        }
        if (password.length < 4) {
            setErrorMsg('Password must be at least 4 characters long.');
            return;
        }
        if (password !== confirmPassword) {
            setErrorMsg('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) {
                setErrorMsg(error.message);
            } else {
                setSuccessMsg('Password updated successfully! Redirecting you to home...');
                setTimeout(() => navigate('/'), 2000);
            }
        } catch {
            setErrorMsg('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-cream flex flex-col relative overflow-x-hidden text-plum font-sans">
            <div className="absolute top-0 left-0 w-250 h-250 bg-berry/5 rounded-full blur-3xl -z-10 -translate-x-1/2 -translate-y-1/2" />
            <Navbar />

            <main className="flex-1 flex items-center justify-center py-12 px-6">
                <div className="w-full max-w-[420px] bg-white rounded-[2.5rem] border-2 border-plum/15 p-8 md:p-10 shadow-inner backdrop-blur-sm animate-in fade-in zoom-in-95 duration-500">
                    <div className="mb-6">
                        <h2 className="text-4xl font-serif font-black tracking-tight mb-2">Reset Password</h2>
                        <p className="text-xs text-plum/50 font-bold">Enter and confirm your new password below.</p>
                    </div>

                    {!ready ? (
                        <div className="p-4 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 text-[11px] font-bold flex items-center gap-2">
                            <AlertCircle size={16} className="flex-shrink-0" />
                            <span>Waiting for password recovery session... Make sure you arrived here from the reset email link.</span>
                        </div>
                    ) : (
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
                                    New Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-plum/30" size={16} />
                                    <input
                                        type="password"
                                        required
                                        placeholder="Enter new password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-cream/50 border-2 border-plum/10 rounded-xl pl-10 pr-4 py-3 text-plum focus:outline-none focus:border-berry transition-all font-bold text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-plum/40 ml-2">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-plum/30" size={16} />
                                    <input
                                        type="password"
                                        required
                                        placeholder="Repeat new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-cream/50 border-2 border-plum/10 rounded-xl pl-10 pr-4 py-3 text-plum focus:outline-none focus:border-berry transition-all font-bold text-sm"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 soft-button-berry shadow-none hover:shadow-none flex items-center justify-center gap-2 text-xs font-bold disabled:opacity-50"
                            >
                                {loading ? 'Updating...' : 'Set New Password'}
                            </button>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
}
