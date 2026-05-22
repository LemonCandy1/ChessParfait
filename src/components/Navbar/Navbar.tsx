import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import logo from '../../assets/Logo-bg-removed.png';
import { ChessPawnIcon, PuzzleIcon, RouletteIcon, GhostChefIcon } from '../Icons';

const Navbar = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

                {/* Right: Mobile Toggle */}
                <div className="flex items-center justify-end gap-4 z-10">
                    
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