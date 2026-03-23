import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import logo from '../../assets/Logo-bg-removed.png';

const Navbar = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMenu = () => setIsMobileMenuOpen(false);

    return (
        <nav className="sticky top-0 z-50 bg-cream/80 backdrop-blur-lg border-b border-plum/5 py-3 px-6">
            <div className="max-w-7xl mx-auto flex items-center justify-between">

                {/* Left: Logo */}
                <div className="flex items-center">
                    <Link to="/" onClick={closeMenu} className="flex items-center group gap-3 transition-all">
                        <div className="h-12 w-12 rounded-xl overflow-hidden shadow-md group-hover:shadow-berry/20 transition-all border border-plum/5">
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
                <div className="hidden md:flex items-center gap-10">
                    <NavLink to="/" label="Home" />
                    <NavLink to="/Challenge_Rulette" label="Challenge Rulette" />
                    <NavLink to="/TrainingPuzzles" label="Weekly Puzzles" />
                    <NavLink to="/PawnGame" label="Pawn Game" />
                    <NavLink to="/ImposterChess" label="Imposter Chess" />
                    <NavLink to="/about" label="About" />
                </div>

                {/* Right: CTA and Mobile Toggle */}
                <div className="flex items-center gap-4">
                    <a href="#contact" className="hidden md:block px-6 py-2.5 soft-button text-sm">
                        Get Started
                    </a>
                    
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
                <div className="md:hidden absolute top-full left-0 w-full bg-cream/95 backdrop-blur-xl border-b border-plum/10 shadow-2xl py-8 px-6 flex flex-col gap-6 animate-in slide-in-from-top-2 duration-300">
                    <NavLink to="/" label="Home" onClick={closeMenu} />
                    <NavLink to="/Challenge_Rulette" label="Challenge Rulette" onClick={closeMenu} />
                    <NavLink to="/TrainingPuzzles" label="Weekly Puzzles" onClick={closeMenu} />
                    <NavLink to="/PawnGame" label="Pawn Game" onClick={closeMenu} />
                    <NavLink to="/ImposterChess" label="Imposter Chess" onClick={closeMenu} />
                    <NavLink to="/about" label="About" onClick={closeMenu} />
                    <a href="#contact" onClick={closeMenu} className="text-center w-full px-5 py-4 mt-2 bg-plum text-cream text-sm font-bold rounded-xl hover:bg-berry transition-all shadow-sm active:scale-95">
                        Get Started
                    </a>
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

export default Navbar;