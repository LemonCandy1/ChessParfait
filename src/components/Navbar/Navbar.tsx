import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, User, LogOut, ChevronDown, Trophy, Award } from 'lucide-react';
import { ChessKnight, Book } from '../../lib/lucideOriginal';
import logo from '../../assets/Logo-bg-removed.png';
import { ChessPawnIcon, RouletteIcon, GhostChefIcon } from '../Icons';
import { useAuth } from '../../context/AuthContext';
import { calculateLevelInfo } from '../../lib/levelSystem';

const Navbar = () => {
    const { user, logout } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isProfileMounted, setIsProfileMounted] = useState(false);

    useEffect(() => {
        if (isProfileOpen) {
            setIsProfileMounted(true);
        } else {
            const timer = setTimeout(() => setIsProfileMounted(false), 160);
            return () => clearTimeout(timer);
        }
    }, [isProfileOpen]);

    const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMenu = () => setIsMobileMenuOpen(false);

    const levelInfo = calculateLevelInfo(user?.points || 0);

    return (
        <nav className="sticky top-0 z-[9999] bg-cream border-b-2 border-plum/15 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 px-4 md:px-6 shadow-sm">
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
                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-7 lg:gap-8">
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
                                    to="/Challenge_Rulette" 
                                    title="Challenge Rulette" 
                                    description="Draw funny match handicaps" 
                                    icon={<RouletteIcon size={18} />} 
                                />
                                <DropdownItem 
                                    to="/ImposterChess" 
                                    title="Imposter Chess" 
                                    description="Hidden-information variant" 
                                    icon={<GhostChefIcon size={18} />} 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Learn Link with Dropdown */}
                    <div className="relative group py-2">
                        <Link
                            to="/EndgamePractice"
                            className="text-plum/70 font-bold hover:text-berry transition text-sm md:text-xs uppercase tracking-widest relative block"
                        >
                            Learn
                            <span className="hidden md:block absolute -bottom-1 left-0 w-0 h-0.5 bg-berry transition-all group-hover:w-full"></span>
                        </Link>
                        
                        {/* Dropdown Menu */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-white rounded-2xl shadow-xl border-2 border-plum/15 py-2 px-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform -translate-y-2 group-hover:translate-y-0 z-[10000] before:absolute before:-top-2.5 before:left-0 before:w-full before:h-2.5 before:content-['']">
                            {/* Arrow indicator */}
                            <div className="absolute -top-1.5 w-3 h-3 bg-white border-t-2 border-l-2 border-plum/15 rotate-45 left-1/2 -translate-x-1/2" />
                            
                            <div className="relative z-10 space-y-0.5">
                                <DropdownItem 
                                    to="/EndgamePractice" 
                                    title="Endgame Practice" 
                                    description="Drill endgames against Maia or Stockfish" 
                                    icon={<ChessKnight size={18} strokeWidth={1.75} />} 
                                />
                                <DropdownItem 
                                    to="/EndgameStrategy" 
                                    title="Endgame Strategy" 
                                    description="Interactive diagrams & master lines" 
                                    icon={<Book size={18} strokeWidth={1.75} />} 
                                />
                            </div>
                        </div>
                    </div>

                    <NavLink to="/TrainingPuzzles" label="Puzzles" />
                    <NavLink to="/contact" label="Contact" />
                    <NavLink to="/about" label="About" />
                </div>

                {/* Right: Mobile Toggle & Auth */}
                <div className="flex items-center justify-end gap-4 z-20">
                    
                    {/* User Auth Section */}
                    <div className="relative">
                        {!user ? (
                            <Link
                                to="/login"
                                className="soft-button shadow-none hover:shadow-none flex items-center gap-2 py-2 px-4 text-[10px] font-black uppercase tracking-widest text-plum hover:text-berry transition-colors"
                            >
                                <User size={14} />
                                <span>Login</span>
                            </Link>
                        ) : (
                            <button
                                onClick={() => {
                                    setIsProfileOpen(!isProfileOpen);
                                }}
                                className="flex items-center gap-2 p-1.5 pr-2.5 rounded-full border-2 border-plum/15 hover:border-berry/50 transition-all bg-white/50 backdrop-blur-sm shadow-sm"
                            >
                                <div className="h-7 w-7 rounded-full bg-berry text-cream font-serif font-black flex items-center justify-center text-xs shadow-inner uppercase overflow-hidden">
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
                                <div className="hidden sm:flex flex-col items-start text-left leading-none">
                                    <span className="text-xs font-black text-plum max-w-[90px] truncate select-none">
                                        {user.username}
                                    </span>
                                    <span className="text-[9px] font-bold text-berry select-none mt-0.5">
                                        Lvl {levelInfo.level}
                                    </span>
                                </div>
                                <ChevronDown size={12} className={`text-plum/40 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                            </button>
                        )}


                        {/* Profile Dropdown */}
                        {isProfileMounted && (
                            <>
                                {/* Overlay for click-away */}
                                <div 
                                    className="fixed inset-0 z-[9998]"
                                    onClick={() => setIsProfileOpen(false)}
                                />
                                
                                <div className={`absolute right-0 top-full mt-2.5 w-64 bg-white rounded-3xl shadow-2xl border-2 border-plum/15 p-4 z-[9999] origin-top-right transition-[transform,opacity] ${
                                    isProfileOpen
                                        ? 'opacity-100 scale-100 translate-y-0 duration-180 ease-[cubic-bezier(0.23,1,0.32,1)]'
                                        : 'opacity-0 scale-[0.97] -translate-y-1 duration-140 ease-[cubic-bezier(0.4,0,1,1)] pointer-events-none'
                                }`}>
                                    <div className="px-2 py-1 border-b border-plum/10 pb-3 mb-2">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-plum/30">Logged in as</p>
                                            <span className="bg-berry/10 text-berry text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <Award size={10} />
                                                Lvl {levelInfo.level}
                                            </span>
                                        </div>
                                        <Link
                                            to="/profile"
                                            onClick={() => setIsProfileOpen(false)}
                                            className="flex items-center gap-2.5 my-1.5 p-1.5 -mx-1.5 rounded-2xl hover:bg-berry/5 transition group/header cursor-pointer"
                                        >
                                            <div className="h-9 w-9 rounded-xl bg-berry text-cream font-serif font-black flex items-center justify-center text-sm shadow-inner uppercase overflow-hidden shrink-0 group-hover/header:scale-105 transition-transform">
                                                {user?.avatarUrl ? (
                                                    <img
                                                        src={user.avatarUrl}
                                                        alt={user?.username || 'Avatar'}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    user?.username?.charAt(0) || 'U'
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-serif font-black text-plum text-sm leading-tight truncate group-hover/header:text-berry transition-colors">{user?.username}</h4>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-plum/60 bg-cream px-1.5 py-0.5 rounded-md border border-plum/10">
                                                        <Trophy size={10} className="text-amber-500" />
                                                        {user?.points || 0} pts
                                                    </span>
                                                    <span className="text-[9px] text-berry font-extrabold truncate">
                                                        {levelInfo.title}
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>

                                    <div className="space-y-0.5">
                                        <Link
                                            to="/profile"
                                            onClick={() => setIsProfileOpen(false)}
                                            className="w-full flex items-center gap-2.5 p-2 rounded-xl text-plum hover:text-berry hover:bg-berry/5 transition font-bold text-xs"
                                        >
                                            <User size={14} className="text-berry" />
                                            <span>My Profile & Stats</span>
                                        </Link>
                                        <Link
                                            to="/link-email"
                                            onClick={() => setIsProfileOpen(false)}
                                            className="w-full flex items-center gap-2.5 p-2 rounded-xl text-plum hover:text-berry hover:bg-berry/5 transition font-bold text-xs"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                            <span>{user?.email ? 'Change Email' : 'Link Email'}</span>
                                        </Link>
                                        <button
                                            onClick={() => {
                                                logout();
                                                setIsProfileOpen(false);
                                            }}
                                            className="w-full text-left flex items-center gap-2.5 p-2 rounded-xl text-plum hover:text-berry hover:bg-berry/5 transition font-bold text-xs"
                                        >
                                            <LogOut size={14} />
                                            <span>Logout</span>
                                        </button>
                                    </div>
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
                <div className="md:hidden absolute top-full left-0 w-full z-[9999] bg-cream/95 backdrop-blur-xl border-b border-plum/10 shadow-2xl py-6 px-6 flex flex-col items-center gap-5 max-h-[calc(100dvh-5rem)] overflow-y-auto animate-in slide-in-from-top-2 duration-300">
                    <NavLink to="/" label="Home" onClick={closeMenu} />
                    <NavLink to="/games" label="Play" onClick={closeMenu} />
                    <NavLink to="/EndgamePractice" label="Endgame" onClick={closeMenu} />
                    <NavLink to="/TrainingPuzzles" label="Puzzles" onClick={closeMenu} />
                    {user && (
                        <NavLink to="/profile" label={`Profile (Lvl ${levelInfo.level})`} onClick={closeMenu} />
                    )}
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
        <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-plum/5 text-plum group-hover/item:text-berry group-hover/item:bg-berry/10 transition-colors duration-200 flex-shrink-0">
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