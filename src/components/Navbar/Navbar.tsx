import { Link } from 'react-router-dom';
import logo from '../../assets/Logo.jpg';
// import chessParfaitText from '../../assets/Chess Parfait text.jpg';

const Navbar = () => {
    return (
        <nav className="sticky top-0 z-50 bg-cream/80 backdrop-blur-lg border-b border-plum/5 py-3 px-6">
            <div className="max-w-7xl mx-auto flex items-center justify-between">

                {/* Left: Logo */}
                <div className="flex items-center">
                    <Link to="/" className="flex items-center group gap-3 transition-all">
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

                {/* Center: Navigation Links */}
                <div className="hidden md:flex items-center gap-10">
                    <NavLink to="/" label="Home" />
                    <NavLink to="/Challenge_Rulette" label="Challenge Rulette" />
                    <NavLink to="/TrainingPuzzles" label="Puzzles" />
                    <NavLink to="/about" label="About" />
                </div>

                {/* Right: CTA */}
                <div className="flex items-center">
                    <a href="#contact" className="px-5 py-2.5 bg-plum text-cream text-sm font-bold rounded-lg hover:bg-berry transition-all shadow-sm">
                        Get Started
                    </a>
                </div>
            </div>
        </nav>
    );
};

const NavLink = ({ to, label }: { to: string; label: string }) => (
    <Link
        to={to}
        className="text-plum/70 font-bold hover:text-berry transition text-xs uppercase tracking-widest relative group"
    >
        {label}
        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-berry transition-all group-hover:w-full"></span>
    </Link>
);

export default Navbar;