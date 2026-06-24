import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, User, Lock, LogOut, ChevronDown, Check, AlertCircle } from 'lucide-react';
import logo from '../../assets/Logo-bg-removed.png';
import { ChessPawnIcon, PuzzleIcon, RouletteIcon, GhostChefIcon } from '../Icons';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
    const { user, remembered, login, logout } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        if (remembered) {
            setUsername(remembered.username);
            setPassword('');
            setRememberMe(true);
        } else {
            setUsername('');
            setPassword('');
            setRememberMe(false);
        }
    }, [remembered, isLoginOpen]);

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        const res = await login(username, password, rememberMe);
        if (res.success) {
            setSuccessMsg(res.message);
            setTimeout(() => {
                setIsLoginOpen(false);
                setSuccessMsg(null);
                setPassword('');
                if (!rememberMe) {
                    setUsername('');
                }
            }, 1000);
        } else {
            setErrorMsg(res.message);
        }
    };

    const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMenu = () => setIsMobileMenuOpen(false);

    return (
        <nav className="sticky top-0 z-[9999] bg-cream/80 backdrop-blur-lg border-b-2 border-plum/15 py-3 px-6">
            <div className="relative max-w-7xl mx-auto flex items-center justify-between">

                {/* Left: Logo */}
                <div className="flex items-center justify-start z-10">
                    <Link to="/" onClick={closeMenu} className="flex items-center group gap-3 transition-all">
                        <div className="h-12 w-12 rounded-xl overflow-hidden shadow-md group-hover:shadow-berry/20 transition-all border-2 border-plum/15">
                            <img
                                src={logo}
                                alt="Logo"
                                className="h-full w-full object-cover"
                            />
                        </div>
                        <span className="font-serif text-2xl font-black text-plum tracking-tight group-hover:text-berry transition-colors">
                            Chess<span className="text-berry italic">Parfait</span>
                        </span>
                    </Link>
                </div>

                {/* Center: Desktop Navigation Links */}
                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-10">
                    <NavLink to="/" label="Home" />
                    
                    {/* Play Link with Dropdown */}
                    <div className="relative group py-2">
                        <Link
                            to="/games"
                            className="text-plum/70 font-bold hover:text-berry transition text-sm md:text-xs uppercase tracking-widest relative block"
                        >
                            Play
                            <span className="hidden md:block absolute -bottom-1 left-0 w-0 h-0.5 bg-berry transition-all group-hover:w-full"></span>
                        </Link>
                        
                        {/* Dropdown Menu */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-white rounded-2xl shadow-xl border-2 border-plum/15 py-2 px-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform -translate-y-2 group-hover:translate-y-0 z-[10000] before:absolute before:-top-2.5 before:left-0 before:w-full before:h-2.5 before:content-['']">
                            {/* Arrow indicator */}
                            <div className="absolute -top-1.5 w-3 h-3 bg-white border-t-2 border-l-2 border-plum/15 rotate-45 left-1/2 -translate-x-1/2" />
                            
                            <div className="relative z-10 space-y-0.5">
                                <DropdownItem 
                                    to="/PawnGame" 
                                    title="Pawn Game" 
                                    description="Endgame struct training game" 
                                    icon={<ChessPawnIcon size={18} />} 
                                />
                                <DropdownItem 
                                    to="/TrainingPuzzles" 
                                    title="Weekly Puzzles" 
                                    description="Calculation & tactical exercises" 
                                    icon={<PuzzleIcon size={18} />} 
                                />
                                <DropdownItem 
                                    to="/Challenge_Rulette" 
                                    title="Challenge Roulette" 
                                    description="Draw funny match handicaps" 
                                    icon={<RouletteIcon size={18} />} 
                                />
                                <DropdownItem 
                                    to="/ImposterChess" 
                                    title="Imposter Chess" 
                                    description="Hidden-information variant" 
                                    icon={<GhostChefIcon size={18} />} 
                                    isComingSoon 
                                />
                            </div>
                        </div>
                    </div>

                    <NavLink to="/contact" label="Contact" />
                    <NavLink to="/about" label="About" />
                </div>

                {/* Right: Mobile Toggle & Auth */}
                <div className="flex items-center justify-end gap-4 z-20">
                    
                    {/* User Auth Section */}
                    <div className="relative">
                        {!user ? (
                            <button
                                onClick={() => {
                                    setIsLoginOpen(!isLoginOpen);
                                    setIsProfileOpen(false);
                                    setErrorMsg(null);
                                    setSuccessMsg(null);
                                }}
                                className="soft-button shadow-none hover:shadow-none flex items-center gap-2 py-2 px-4 text-[10px] font-black uppercase tracking-widest text-plum hover:text-berry transition-colors"
                            >
                                <User size={14} />
                                <span>Login</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    setIsProfileOpen(!isProfileOpen);
                                    setIsLoginOpen(false);
                                }}
                                className="flex items-center gap-2 p-1.5 rounded-full border-2 border-plum/15 hover:border-berry/50 transition-all bg-white/50 backdrop-blur-sm shadow-sm"
                            >
                                <div className="h-7 w-7 rounded-full bg-berry text-cream font-serif font-black flex items-center justify-center text-xs shadow-inner uppercase">
                                    {user.username.charAt(0)}
                                </div>
                                <span className="hidden sm:inline text-xs font-black text-plum max-w-[80px] truncate select-none">
                                    {user.username}
                                </span>
                                <ChevronDown size={12} className={`text-plum/40 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                            </button>
                        )}

                        {/* Login Dropdown Form (Desktop dropdown or Centered Modal on mobile) */}
                        {isLoginOpen && (
                            <>
                                {/* Overlay for click-away */}
                                <div 
                                    className="fixed inset-0 z-[9998] bg-plum/10 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none"
                                    onClick={() => setIsLoginOpen(false)}
                                />
                                
                                <div className="fixed md:absolute left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 top-1/4 md:top-full right-auto md:right-0 mt-2.5 w-[300px] sm:w-[320px] bg-white rounded-3xl shadow-2xl border-2 border-plum/15 p-6 z-[9999] animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex justify-between items-center mb-1">
                                        <h3 className="font-serif font-black text-plum text-xl">ChessParfait Account</h3>
                                        <button 
                                            onClick={() => setIsLoginOpen(false)}
                                            className="text-plum/30 hover:text-berry md:hidden"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-plum/50 font-bold mb-4">Enter your credentials to sign in.</p>
                                    
                                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                                        {errorMsg && (
                                            <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-150 text-[10px] font-bold flex items-center gap-2">
                                                <AlertCircle size={14} className="flex-shrink-0" />
                                                <span>{errorMsg}</span>
                                            </div>
                                        )}
                                        {successMsg && (
                                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-150 text-[10px] font-bold flex items-center gap-2">
                                                <Check size={14} className="flex-shrink-0" />
                                                <span>{successMsg}</span>
                                            </div>
                                        )}
                                        <div className="space-y-1">
                                            <label className="block text-[9px] font-black uppercase tracking-widest text-plum/40 ml-2">Username</label>
                                            <div className="relative">
                                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-plum/30" size={14} />
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Enter username"
                                                    value={username}
                                                    onChange={(e) => setUsername(e.target.value)}
                                                    className="w-full bg-cream/50 border-2 border-plum/10 rounded-xl pl-9 pr-4 py-2.5 text-plum focus:outline-none focus:border-berry transition-all font-bold text-xs"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-[9px] font-black uppercase tracking-widest text-plum/40 ml-2">Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-plum/30" size={14} />
                                                <input
                                                    type="password"
                                                    required
                                                    placeholder="Enter password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="w-full bg-cream/50 border-2 border-plum/10 rounded-xl pl-9 pr-4 py-2.5 text-plum focus:outline-none focus:border-berry transition-all font-bold text-xs"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-1">
                                            <input
                                                type="checkbox"
                                                id="rememberMe"
                                                checked={rememberMe}
                                                onChange={(e) => setRememberMe(e.target.checked)}
                                                className="h-4 w-4 rounded border-plum/20 text-berry focus:ring-berry cursor-pointer"
                                            />
                                            <label htmlFor="rememberMe" className="text-[10px] font-bold text-plum/60 select-none cursor-pointer">
                                                Remember credentials
                                            </label>
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full py-3 soft-button-berry shadow-none hover:shadow-none flex items-center justify-center gap-2 text-xs font-bold"
                                        >
                                            Sign In
                                        </button>
                                        <div className="text-center mt-4">
                                            <span className="text-[10px] font-bold text-plum/40">Don't have an account? </span>
                                            <Link 
                                                to="/register" 
                                                onClick={() => setIsLoginOpen(false)}
                                                className="text-[10px] font-black text-berry hover:underline"
                                            >
                                                Register here
                                            </Link>
                                        </div>
                                        <div className="text-center mt-1">
                                            <Link 
                                                to="/forgot-password"
                                                onClick={() => setIsLoginOpen(false)}
                                                className="text-[10px] font-bold text-plum/40 hover:text-berry hover:underline transition-colors"
                                            >
                                                Forgot password?
                                            </Link>
                                        </div>
                                    </form>
                                </div>
                            </>
                        )}

                        {/* Profile Dropdown */}
                        {isProfileOpen && (
                            <>
                                {/* Overlay for click-away */}
                                <div 
                                    className="fixed inset-0 z-[9998]"
                                    onClick={() => setIsProfileOpen(false)}
                                />
                                
                                <div className="absolute right-0 top-full mt-2.5 w-56 bg-white rounded-3xl shadow-2xl border-2 border-plum/15 p-4 z-[9999] animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="px-2 py-1 border-b border-plum/10 pb-3 mb-2">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-plum/30">Logged in as</p>
                                        <h4 className="font-serif font-black text-plum text-base leading-tight truncate">{user?.username}</h4>
                                        {user?.email && (
                                            <p className="text-[10px] text-plum/50 font-bold truncate mt-0.5" title={user.email}>{user.email}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            logout();
                                            setIsProfileOpen(false);
                                        }}
                                        className="w-full text-left flex items-center gap-2.5 p-2 rounded-xl text-plum hover:text-berry hover:bg-berry/5 transition font-bold text-xs"
                                    >
                                        <LogOut size={14} />
                                        Logout
                                    </button>
                                    <Link
                                        to="/link-email"
                                        onClick={() => setIsProfileOpen(false)}
                                        className="w-full flex items-center gap-2.5 p-2 rounded-xl text-plum hover:text-berry hover:bg-berry/5 transition font-bold text-xs"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                        {user?.email ? 'Change Email' : 'Link Email'}
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Toggle Button */}
                    <button 
                        className="md:hidden text-plum hover:text-berry transition-colors flex items-center"
                        onClick={toggleMenu}
                        aria-label="Toggle mobile menu"
                    >
                        {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 w-full z-[9999] bg-cream/95 backdrop-blur-xl border-b border-plum/10 shadow-2xl py-8 px-6 flex flex-col items-center gap-6 animate-in slide-in-from-top-2 duration-300">
                    <NavLink to="/" label="Home" onClick={closeMenu} />
                    <NavLink to="/games" label="Play" onClick={closeMenu} />
                    <NavLink to="/contact" label="Contact" onClick={closeMenu} />
                    <NavLink to="/about" label="About" onClick={closeMenu} />
                </div>
            )}
        </nav>
    );
};

const NavLink = ({ to, label, onClick }: { to: string; label: string; onClick?: () => void }) => (
    <Link
        to={to}
        onClick={onClick}
        className="text-plum/70 font-bold hover:text-berry transition text-sm md:text-xs uppercase tracking-widest relative group block"
    >
        {label}
        <span className="hidden md:block absolute -bottom-1 left-0 w-0 h-0.5 bg-berry transition-all group-hover:w-full"></span>
    </Link>
);

const DropdownItem = ({
    to,
    title,
    description,
    icon,
    isComingSoon = false
}: {
    to: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    isComingSoon?: boolean;
}) => (
    <Link
        to={to}
        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-berry/5 transition-all text-left group/item"
    >
        <div className="p-2 rounded-lg bg-cream text-plum group-hover/item:text-berry group-hover/item:bg-white shadow-sm border-2 border-plum/15 transition-all duration-300 flex-shrink-0">
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
                <span className="font-serif font-black text-plum group-hover/item:text-berry transition-colors text-sm truncate">
                    {title}
                </span>
                {isComingSoon && (
                    <span className="text-[8px] font-black uppercase tracking-widest text-plum/30 bg-plum/5 px-2 py-0.5 rounded-full flex-shrink-0">
                        Soon
                    </span>
                )}
            </div>
            <p className="text-[10px] text-plum/50 font-bold leading-relaxed truncate">
                {description}
            </p>
        </div>
    </Link>
);

export default Navbar;