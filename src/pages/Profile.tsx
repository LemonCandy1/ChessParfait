import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
    Trophy, 
    Award, 
    Crown, 
    Calendar, 
    Sparkles, 
    CheckCircle2, 
    Mail, 
    LogOut, 
    ArrowRight,
    Zap,
    Flame,
    Lock
} from 'lucide-react';
import Navbar from '../components/Navbar/Navbar';
import { useAuth } from '../context/AuthContext';
import { calculateLevelInfo, formatJoinDate, LEVEL_TIERS } from '../lib/levelSystem';
import { ChessCakeSliceIcon, PieIcon, CherryBombIcon, PuzzleIcon, ChessPawnIcon } from '../components/Icons';

export default function Profile() {
    const { user, loading, logout } = useAuth();
    const navigate = useNavigate();
    const [showTierModal, setShowTierModal] = useState(false);

    if (loading) {
        return (
            <div className="min-h-screen bg-cream flex flex-col justify-center items-center font-sans text-plum">
                <Navbar />
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-berry/20 border-t-berry rounded-full animate-spin" />
                    <p className="text-sm font-black uppercase tracking-widest text-plum/50">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-cream flex flex-col font-sans text-plum">
                <Navbar />
                <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-16 flex flex-col items-center justify-center text-center">
                    <div className="p-6 bg-berry/10 rounded-full text-berry mb-6">
                        <Lock size={48} />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black font-serif text-plum mb-4">
                        Profile <span className="text-berry italic">Access</span>
                    </h1>
                    <p className="text-lg text-plum/60 max-w-md mb-8">
                        Sign in to ChessParfait to track your points, account levels, and puzzle solving achievements.
                    </p>
                    <div className="flex gap-4">
                        <Link to="/login" className="py-3 px-8 soft-button-berry font-bold text-sm">
                            Log In
                        </Link>
                        <Link to="/register" className="py-3 px-8 soft-button font-bold text-sm">
                            Create Account
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    const totalPoints = user.points || 0;
    const solvedPuzzles = user.solvedPuzzles || [];
    const levelInfo = calculateLevelInfo(totalPoints);
    const { formattedDate, relativeTime } = formatJoinDate(user.createdAt);

    // Calculate puzzle breakdown
    const cakeCount = solvedPuzzles.filter((p) => p.difficulty === 'Piece of Cake').length;
    const tartCount = solvedPuzzles.filter((p) => p.difficulty === 'Hard Tart').length;
    const bombCount = solvedPuzzles.filter((p) => p.difficulty === 'Cherry Bomb' || p.difficulty === 'Challenge').length;

    return (
        <div className="min-h-screen bg-cream flex flex-col font-sans text-plum relative overflow-x-clip">
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-berry/5 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl -z-10 -translate-x-1/3 translate-y-1/3 pointer-events-none" />

            <Navbar />

            <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10 space-y-8">
                
                {/* ── Top Header Profile Card ── */}
                <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] p-8 md:p-10 border-2 border-plum/15 shadow-xl relative overflow-hidden">
                    <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 relative z-10">
                        <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                            {/* Avatar */}
                            <div className="relative group">
                                <div className="w-24 h-24 md:w-28 md:h-28 rounded-3xl bg-gradient-to-br from-berry to-berry/80 text-cream font-serif font-black text-4xl md:text-5xl flex items-center justify-center shadow-lg border-4 border-white uppercase">
                                    {user.username.charAt(0)}
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-plum text-white text-[11px] font-black uppercase px-2.5 py-1 rounded-full shadow-md border-2 border-white flex items-center gap-1">
                                    <Sparkles size={12} className="text-amber-300" />
                                    <span>Lvl {levelInfo.level}</span>
                                </div>
                            </div>

                            {/* User details */}
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                    <h1 className="text-3xl md:text-4xl font-serif font-black text-plum tracking-tight">
                                        {user.username}
                                    </h1>
                                    <span className="bg-berry/10 text-berry border border-berry/20 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5">
                                        <Crown size={14} />
                                        {levelInfo.title}
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-bold text-plum/60">
                                    <div className="flex items-center gap-1.5" title="Account creation date">
                                        <Calendar size={14} className="text-berry" />
                                        <span>Member since {formattedDate}</span>
                                        <span className="text-plum/30">•</span>
                                        <span className="text-berry font-extrabold">{relativeTime}</span>
                                    </div>
                                    {user.email && (
                                        <div className="flex items-center gap-1.5">
                                            <Mail size={14} className="text-plum/40" />
                                            <span>{user.email}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 w-full md:w-auto justify-center">
                            <Link
                                to="/link-email"
                                className="soft-button py-2.5 px-4 text-xs font-bold flex items-center gap-2"
                            >
                                <Mail size={14} />
                                <span>{user.email ? 'Change Email' : 'Link Email'}</span>
                            </Link>
                            <button
                                onClick={async () => {
                                    await logout();
                                    navigate('/');
                                }}
                                className="p-2.5 rounded-2xl border-2 border-plum/15 hover:border-berry/40 text-plum/60 hover:text-berry transition-all bg-white shadow-sm"
                                title="Sign out"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Level & Points Progression Card ── */}
                <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] p-8 md:p-10 border-2 border-plum/15 shadow-xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-plum/40">Account Progression</span>
                            <h2 className="text-2xl md:text-3xl font-serif font-black text-plum flex items-center gap-3">
                                Level {levelInfo.level}: <span className="text-berry italic">{levelInfo.title}</span>
                            </h2>
                        </div>

                        {/* Points Counter Badge */}
                        <div className="inline-flex items-center gap-3 bg-cream px-5 py-2.5 rounded-2xl border-2 border-plum/10 self-start sm:self-auto shadow-inner">
                            <Trophy size={20} className="text-amber-500" />
                            <div>
                                <span className="text-xl font-black text-plum leading-none">{totalPoints}</span>
                                <span className="text-[10px] font-black uppercase tracking-wider text-plum/40 ml-1.5">Total Points</span>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="space-y-3 bg-cream/70 p-6 rounded-2xl border border-plum/10 shadow-inner">
                        <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-plum/70 flex items-center gap-1.5">
                                <Flame size={14} className="text-berry" />
                                {levelInfo.isMaxLevel ? (
                                    <span className="text-berry font-black">Max Rank Achieved!</span>
                                ) : (
                                    <span>
                                        <strong className="text-plum font-black">{totalPoints - levelInfo.currentTierMin}</strong> / {levelInfo.nextTierPoints - levelInfo.currentTierMin} XP to next level
                                    </span>
                                )}
                            </span>
                            <span className="text-berry font-black text-sm">
                                {levelInfo.progressPercentage}%
                            </span>
                        </div>

                        {/* Animated Bar */}
                        <div className="h-4 w-full bg-white rounded-full overflow-hidden p-0.5 border border-plum/15 shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-amber-400 via-berry to-berry rounded-full transition-all duration-1000 ease-out shadow-sm"
                                style={{ width: `${Math.max(4, levelInfo.progressPercentage)}%` }}
                            />
                        </div>

                        {/* Subtext info */}
                        <div className="flex justify-between items-center text-[11px] font-bold text-plum/50">
                            <span>Level {levelInfo.level} ({levelInfo.currentTierMin} pts)</span>
                            {!levelInfo.isMaxLevel ? (
                                <span className="text-berry font-extrabold flex items-center gap-1">
                                    <Zap size={12} />
                                    {levelInfo.pointsToNextLevel} more points till Level {levelInfo.level + 1}
                                </span>
                            ) : (
                                <span>Grand Champion</span>
                            )}
                        </div>
                    </div>

                    {/* Tier Roadmap Preview Toggle */}
                    <div className="pt-2 flex justify-between items-center border-t border-plum/10">
                        <p className="text-xs text-plum/60 font-medium">
                            Earn points by solving weekly puzzles (Piece of Cake +25, Hard Tart +50, Challenge +100).
                        </p>
                        <button
                            onClick={() => setShowTierModal(!showTierModal)}
                            className="text-xs font-black uppercase tracking-wider text-berry hover:text-plum transition-colors flex items-center gap-1"
                        >
                            <span>{showTierModal ? 'Hide Ranks' : 'View All Ranks'}</span>
                            <ArrowRight size={14} className={`transition-transform ${showTierModal ? 'rotate-90' : ''}`} />
                        </button>
                    </div>

                    {/* Expandable Tier List */}
                    {showTierModal && (
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-4 border-t border-plum/10 animate-in fade-in slide-in-from-top-2 duration-300">
                            {LEVEL_TIERS.map((tier) => {
                                const isCurrent = tier.level === levelInfo.level;
                                const isUnlocked = totalPoints >= tier.minPoints;

                                return (
                                    <div
                                        key={tier.level}
                                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between gap-2 ${
                                            isCurrent
                                                ? 'bg-berry/10 border-berry shadow-md'
                                                : isUnlocked
                                                ? 'bg-white border-plum/15'
                                                : 'bg-white/40 border-plum/5 opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                                isCurrent ? 'bg-berry text-white' : 'bg-plum/10 text-plum/70'
                                            }`}>
                                                Lvl {tier.level}
                                            </span>
                                            {isCurrent ? (
                                                <Sparkles size={14} className="text-berry" />
                                            ) : isUnlocked ? (
                                                <CheckCircle2 size={14} className="text-emerald-500" />
                                            ) : (
                                                <Lock size={12} className="text-plum/30" />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-serif font-black text-sm text-plum">{tier.title}</h4>
                                            <p className="text-[10px] font-bold text-plum/50">{tier.minPoints} - {tier.maxPoints} pts</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Stats Summary Grid ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border-2 border-plum/15 shadow-md flex flex-col items-center text-center gap-2">
                        <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 border border-amber-200 shadow-sm">
                            <Trophy size={24} />
                        </div>
                        <span className="text-2xl md:text-3xl font-black text-plum">{totalPoints}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-plum/40">Total Points</span>
                    </div>

                    <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border-2 border-plum/15 shadow-md flex flex-col items-center text-center gap-2">
                        <div className="p-3 bg-berry/10 rounded-2xl text-berry border border-berry/20 shadow-sm">
                            <Crown size={24} />
                        </div>
                        <span className="text-2xl md:text-3xl font-black text-plum">Level {levelInfo.level}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-plum/40">{levelInfo.title}</span>
                    </div>

                    <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border-2 border-plum/15 shadow-md flex flex-col items-center text-center gap-2">
                        <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-200 shadow-sm">
                            <PuzzleIcon size={24} />
                        </div>
                        <span className="text-2xl md:text-3xl font-black text-plum">{solvedPuzzles.length}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-plum/40">Puzzles Solved</span>
                    </div>

                    <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border-2 border-plum/15 shadow-md flex flex-col items-center text-center gap-2">
                        <div className="p-3 bg-purple-50 rounded-2xl text-purple-600 border border-purple-200 shadow-sm">
                            <Award size={24} />
                        </div>
                        <span className="text-2xl md:text-3xl font-black text-plum">{relativeTime}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-plum/40">Account Age</span>
                    </div>
                </div>

                {/* ── Solved Weekly Puzzles History ── */}
                <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] p-8 md:p-10 border-2 border-plum/15 shadow-xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-plum/40">Activity & Records</span>
                            <h2 className="text-2xl md:text-3xl font-serif font-black text-plum flex items-center gap-3">
                                Weekly Puzzles <span className="text-berry italic">Solved</span>
                            </h2>
                        </div>

                        {/* Breakdown pills */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black">
                                <ChessCakeSliceIcon size={14} /> Cake: {cakeCount}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-black">
                                <PieIcon size={14} /> Tart: {tartCount}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-berry/10 text-berry border border-berry/20 text-xs font-black">
                                <CherryBombIcon size={14} /> Bomb: {bombCount}
                            </span>
                        </div>
                    </div>

                    {solvedPuzzles.length === 0 ? (
                        <div className="p-10 bg-cream/50 rounded-3xl border-2 border-dashed border-plum/15 flex flex-col items-center justify-center text-center gap-4">
                            <div className="p-4 bg-white rounded-2xl shadow-sm text-plum/40">
                                <PuzzleIcon size={36} />
                            </div>
                            <div className="space-y-1 max-w-sm">
                                <h4 className="font-serif font-black text-lg text-plum">No Puzzles Solved Yet</h4>
                                <p className="text-xs text-plum/60 leading-relaxed">
                                    Take on this week's strategic puzzles to earn points, level up your profile, and climb the ranks!
                                </p>
                            </div>
                            <Link to="/TrainingPuzzles" className="soft-button-berry py-2.5 px-6 text-xs font-bold flex items-center gap-2 mt-2">
                                <PuzzleIcon size={16} />
                                <span>Go to Weekly Puzzles</span>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="grid gap-3">
                                {solvedPuzzles.map((puzzle, idx) => {
                                    const dateStr = puzzle.solvedAt
                                        ? new Date(puzzle.solvedAt).toLocaleDateString('en-US', {
                                              month: 'short',
                                              day: 'numeric',
                                              year: 'numeric'
                                          })
                                        : 'Completed';

                                    const isCherryBomb = puzzle.difficulty === 'Cherry Bomb' || puzzle.difficulty === 'Challenge';
                                    const displayDifficulty = isCherryBomb ? 'Cherry Bomb' : puzzle.difficulty;

                                    const diffBadge =
                                        puzzle.difficulty === 'Piece of Cake'
                                            ? { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <ChessCakeSliceIcon size={14} /> }
                                            : puzzle.difficulty === 'Hard Tart'
                                            ? { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: <PieIcon size={14} /> }
                                            : { bg: 'bg-berry/10 text-berry border-berry/20', icon: <CherryBombIcon size={14} /> };

                                    return (
                                        <div
                                            key={puzzle.id || idx}
                                            className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-plum/10 shadow-sm flex items-center justify-between gap-4 hover:border-plum/20 transition-all"
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-cream flex items-center justify-center text-plum font-bold shrink-0 border border-plum/10">
                                                    <CheckCircle2 size={20} className="text-emerald-600" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-plum/40">
                                                            Week {puzzle.week}
                                                        </span>
                                                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${diffBadge.bg}`}>
                                                            {diffBadge.icon}
                                                            {displayDifficulty}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-serif font-black text-sm text-plum truncate">
                                                        {puzzle.title || `${displayDifficulty} Puzzle`}
                                                    </h4>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className="inline-block font-black text-berry text-sm">
                                                    +{puzzle.points} pts
                                                </span>
                                                <p className="text-[10px] font-bold text-plum/40">{dateStr}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="pt-4 flex justify-center">
                                <Link
                                    to="/TrainingPuzzles"
                                    className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-berry hover:text-plum transition-colors"
                                >
                                    <span>Play More Puzzles</span>
                                    <ArrowRight size={14} />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Quick Links / Other Games ── */}
                <div className="grid sm:grid-cols-3 gap-4">
                    <Link
                        to="/TrainingPuzzles"
                        className="bg-white/70 hover:bg-white p-5 rounded-2xl border-2 border-plum/15 shadow-sm hover:shadow-md transition-all group flex items-center gap-4"
                    >
                        <div className="p-3 bg-cream rounded-xl text-berry group-hover:scale-110 transition-transform border border-plum/10">
                            <PuzzleIcon size={22} />
                        </div>
                        <div>
                            <h4 className="font-serif font-black text-sm text-plum group-hover:text-berry transition-colors">Weekly Puzzles</h4>
                            <p className="text-[10px] font-bold text-plum/50">Earn points every week</p>
                        </div>
                    </Link>

                    <Link
                        to="/PawnGame"
                        className="bg-white/70 hover:bg-white p-5 rounded-2xl border-2 border-plum/15 shadow-sm hover:shadow-md transition-all group flex items-center gap-4"
                    >
                        <div className="p-3 bg-cream rounded-xl text-plum group-hover:text-berry group-hover:scale-110 transition-transform border border-plum/10">
                            <ChessPawnIcon size={22} />
                        </div>
                        <div>
                            <h4 className="font-serif font-black text-sm text-plum group-hover:text-berry transition-colors">Pawn Game</h4>
                            <p className="text-[10px] font-bold text-plum/50">Endgame struct training</p>
                        </div>
                    </Link>

                    <Link
                        to="/Challenge_Rulette"
                        className="bg-white/70 hover:bg-white p-5 rounded-2xl border-2 border-plum/15 shadow-sm hover:shadow-md transition-all group flex items-center gap-4"
                    >
                        <div className="p-3 bg-cream rounded-xl text-plum group-hover:text-berry group-hover:scale-110 transition-transform border border-plum/10">
                            <Trophy size={22} />
                        </div>
                        <div>
                            <h4 className="font-serif font-black text-sm text-plum group-hover:text-berry transition-colors">Challenge Rulette</h4>
                            <p className="text-[10px] font-bold text-plum/50">Fun handicap wheel</p>
                        </div>
                    </Link>
                </div>
            </main>
        </div>
    );
}
