import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar/Navbar';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';

export default function Login() {
    const { login, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        setLoading(true);
        const res = await login(username, password, rememberMe);
        setLoading(false);

        if (res.success) {
            navigate('/');
        } else {
            setErrorMsg(res.message);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: any) => {
        if (!credentialResponse.credential) {
            setErrorMsg("Google login failed. No credential received.");
            return;
        }

        setLoading(true);
        const res = await loginWithGoogle(credentialResponse.credential);
        setLoading(false);

        if (res.success) {
            if (res.needsProfileSetup) {
                navigate('/setup-profile');
            } else {
                navigate('/');
            }
        } else {
            setErrorMsg(res.message);
        }
    };

    return (
        <div className="min-h-screen bg-cream flex flex-col relative overflow-x-hidden text-plum font-sans">
            <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-berry/5 rounded-full blur-3xl -z-10 -translate-x-1/4 -translate-y-1/4" />
            
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
                        <h2 className="text-4xl font-serif font-black tracking-tight mb-2">Welcome Back</h2>
                        <p className="text-xs text-plum/50 font-bold">Sign in to your ChessParfait account.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {errorMsg && (
                            <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-150 text-[11px] font-bold flex items-center gap-2">
                                <AlertCircle size={16} className="flex-shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="block text-[9px] font-black uppercase tracking-widest text-plum/40 ml-2">Username</label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-plum/30" size={16} />
                                <input
                                    type="text"
                                    required
                                    placeholder="Enter username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-cream/50 border-2 border-plum/10 rounded-xl pl-10 pr-4 py-3 text-plum focus:outline-none focus:border-berry transition-all font-bold text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between items-center ml-2">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-plum/40">Password</label>
                                <Link to="/forgot-password" className="text-[9px] font-black uppercase tracking-widest text-berry hover:underline">Forgot?</Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-plum/30" size={16} />
                                <input
                                    type="password"
                                    required
                                    placeholder="Enter password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-cream/50 border-2 border-plum/10 rounded-xl pl-10 pr-4 py-3 text-plum focus:outline-none focus:border-berry transition-all font-bold text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 ml-2 mt-2">
                            <input 
                                type="checkbox" 
                                id="rememberMeLogin" 
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-3 h-3 text-berry rounded border-plum/20 focus:ring-berry"
                            />
                            <label htmlFor="rememberMeLogin" className="text-[10px] font-bold text-plum/50 select-none cursor-pointer">
                                Keep me logged in
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 soft-button-berry shadow-none hover:shadow-none flex items-center justify-center gap-2 text-xs font-bold disabled:opacity-50 mt-4"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-plum/10"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-xs font-bold text-plum/40 uppercase tracking-widest">Or continue with</span>
                        </div>
                    </div>

                    <div className="flex justify-center w-full">
                        <GoogleLogin 
                            onSuccess={handleGoogleSuccess}
                            onError={() => setErrorMsg("Google login failed")}
                            useOneTap
                            theme="outline"
                            shape="pill"
                        />
                    </div>

                    <div className="text-center mt-8 border-t border-plum/10 pt-4">
                        <span className="text-[10px] font-bold text-plum/40">Don't have an account? </span>
                        <Link 
                            to="/register" 
                            className="text-[10px] font-black text-berry hover:underline"
                        >
                            Register here
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
