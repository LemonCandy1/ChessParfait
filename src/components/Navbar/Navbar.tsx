import { Link } from 'react-router-dom';
import logo from '../../assets/Logo.jpg';
import chessParfaitText from '../../assets/Chess Parfait text.jpg';

const Navbar = () => {
    return (
        <nav className="py-1 px-2 bg-white shadow-sm border-b border-slate-100 relative z-50">
            <div className="max-w-7xl mx-auto grid grid-cols-3 items-center">

                {/* 1. Left Column: Logo + Text */}
                <div className="flex justify-start">
                    <Link to="/" className="flex items-center group transition-all">
                        <div className="flex items-center bg-transparent">
                            <img
                                src={logo}
                                alt="Logo"
                                className="h-16 md:h-20 w-auto object-contain mix-blend-multiply"
                            />
                            <img
                                src={chessParfaitText}
                                alt="Chess Parfait"
                                className="h-10 md:h-12 w-auto ml-2 object-contain"
                            />
                        </div>
                    </Link>
                </div>

                {/* 2. Center Column: Navigation Links */}
                <div className="flex justify-center items-center gap-10">
                    <NavLink to="/" label="Home" />
                    <NavLink to="/Challenge_Rulette" label="Challenge Rulette" />
                    <NavLink to="/about" label="About Me" />
                </div>
            </div>
        </nav>
    );
};

// Small helper component to keep the code clean
const NavLink = ({ to, label }: { to: string; label: string }) => (
    <Link
        to={to}
        className="text-slate-600 font-bold hover:text-indigo-600 transition text-xs md:text-sm uppercase tracking-widest"
    >
        {label}
    </Link>
);

export default Navbar;