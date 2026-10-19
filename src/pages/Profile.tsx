import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Camera, Loader2, Lock, Trash2 } from 'lucide-react';
import Navbar from '../components/Navbar/Navbar';
import { useAuth } from '../context/AuthContext';
import { calculateLevelInfo, LEVEL_TIERS } from '../lib/levelSystem';
import { ChessCakeSliceIcon, PieIcon, CherryBombIcon } from '../components/Icons';
import { ProfileSkeleton } from '../components/skeletons/PageSkeletons';
import { findPlan } from '../data/trainingPlans';
import { DAILY_TRAINING_POINTS, toDayKey, addDays, type TrainingLog } from '../lib/training';
import { LEADERBOARD_MIN_PLAYED } from '../lib/endgameTrainer';
import { getTraining, type TrainingOverview } from '../lib/trainingApi';

/** One dessert layer per rank, bottom of the glass first. */
const LAYER_COLOURS = ['#C89B66', '#EBD7AE', '#E58AA0', '#D23157', '#7B2D6B', '#4A154B', '#E2B24C'];

/** Glass geometry in SVG units: a tapered bowl on a short stem. */
const BOWL_TOP = 16;
const BOWL_BOTTOM = 296;
const GLASS_HEIGHT = 344;
const BAND = (BOWL_BOTTOM - BOWL_TOP) / LEVEL_TIERS.length;
const edgeAt = (y: number) => {
    // Bowl is 184 wide at the rim and 116 wide at the bottom, centred on x = 100.
    const t = (y - BOWL_TOP) / (BOWL_BOTTOM - BOWL_TOP);
    const half = 92 - 34 * t;
    return [100 - half, 100 + half];
};
const bandPath = (index: number) => {
    const bottom = BOWL_BOTTOM - index * BAND;
    const top = bottom - BAND;
    const [bl, br] = edgeAt(bottom);
    const [tl, tr] = edgeAt(top);
    return `M${bl},${bottom} L${br},${bottom} L${tr},${top} L${tl},${top} Z`;
};

const DIFFICULTY = {
    'Piece of Cake': { Icon: ChessCakeSliceIcon, tone: 'text-emerald-700' },
    'Hard Tart': { Icon: PieIcon, tone: 'text-amber-700' },
    'Cherry Bomb': { Icon: CherryBombIcon, tone: 'text-berry' }
} as const;

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

function ParfaitGlass({ level, progress, label }: { level: number; progress: number; label: string }) {
    // Fill the current layer after mount so it pours in once; reduced motion shows it filled.
    const [poured, setPoured] = useState(false);
    useEffect(() => {
        const frame = requestAnimationFrame(() => setPoured(true));
        return () => cancelAnimationFrame(frame);
    }, []);

    return (
        <svg viewBox={`0 0 200 ${GLASS_HEIGHT}`} className="w-[150px] sm:w-[180px] h-auto shrink-0" role="img" aria-label={label}>
            <defs>
                <clipPath id="parfait-bowl">
                    <path d={`M${edgeAt(BOWL_TOP)[0]},${BOWL_TOP} L${edgeAt(BOWL_TOP)[1]},${BOWL_TOP} L${edgeAt(BOWL_BOTTOM)[1]},${BOWL_BOTTOM} L${edgeAt(BOWL_BOTTOM)[0]},${BOWL_BOTTOM} Z`} />
                </clipPath>
            </defs>
            <g clipPath="url(#parfait-bowl)">
                {LEVEL_TIERS.map((tier, i) => {
                    const done = tier.level < level;
                    const current = tier.level === level;
                    const bottom = BOWL_BOTTOM - i * BAND;
                    return (
                        <g key={tier.level}>
                            <path d={bandPath(i)} fill={done ? LAYER_COLOURS[i] : '#FFFFFF'} fillOpacity={done ? 1 : 0.7} />
                            {current && (
                                <rect
                                    x={0}
                                    y={bottom - BAND}
                                    width={200}
                                    height={BAND}
                                    fill={LAYER_COLOURS[i]}
                                    className="motion-safe:transition-transform motion-safe:duration-[1200ms] motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]"
                                    style={{
                                        transformBox: 'fill-box',
                                        transformOrigin: 'bottom',
                                        transform: `scaleY(${poured ? Math.max(progress, 0.04) : 0})`
                                    }}
                                />
                            )}
                            {i > 0 && <line x1={0} x2={200} y1={bottom} y2={bottom} stroke="#4A154B" strokeOpacity={0.14} strokeWidth={1} />}
                        </g>
                    );
                })}
            </g>
            {/* Glass, stem and foot */}
            <path
                d={`M${edgeAt(BOWL_TOP)[0]},${BOWL_TOP} L${edgeAt(BOWL_BOTTOM)[0]},${BOWL_BOTTOM} Q100,${BOWL_BOTTOM + 14} ${edgeAt(BOWL_BOTTOM)[1]},${BOWL_BOTTOM} L${edgeAt(BOWL_TOP)[1]},${BOWL_TOP}`}
                fill="none"
                stroke="#4A154B"
                strokeWidth={2.5}
                strokeLinejoin="round"
            />
            <path d={`M94,${BOWL_BOTTOM + 7} L94,330 M106,${BOWL_BOTTOM + 7} L106,330`} stroke="#4A154B" strokeWidth={2.5} />
            <ellipse cx={100} cy={334} rx={46} ry={7} fill="none" stroke="#4A154B" strokeWidth={2.5} />
            <path d={`M${edgeAt(BOWL_TOP)[0] + 10},${BOWL_TOP + 14} L${edgeAt(BOWL_BOTTOM)[0] + 10},${BOWL_BOTTOM - 20}`} stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={3} strokeLinecap="round" />
        </svg>
    );
}

interface NextStep {
    title: string;
    detail: string;
    to: string;
    action: string;
}

export default function Profile() {
    const { user, loading, logout, updateAvatar, removeAvatar } = useAuth();
    const navigate = useNavigate();
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [showAllPuzzles, setShowAllPuzzles] = useState(false);
    const [training, setTraining] = useState<TrainingOverview | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const today = useMemo(() => toDayKey(new Date()), []);

    useEffect(() => {
        if (!user) return;
        getTraining(addDays(today, -13), today, today).then(setTraining).catch(() => setTraining(null));
    }, [today, user]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setAvatarError('Please choose an image file (PNG, JPEG or WebP).');
            return;
        }

        setUploadingAvatar(true);
        setAvatarError(null);

        try {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = async () => {
                    // Centre-crop to a 256x256 square
                    const canvas = document.createElement('canvas');
                    const size = 256;
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        setAvatarError('Could not process that image.');
                        setUploadingAvatar(false);
                        return;
                    }
                    const minDim = Math.min(img.width, img.height);
                    ctx.drawImage(img, (img.width - minDim) / 2, (img.height - minDim) / 2, minDim, minDim, 0, 0, size, size);

                    const res = await updateAvatar(canvas.toDataURL('image/jpeg', 0.88));
                    if (!res.success) setAvatarError(res.message);
                    setUploadingAvatar(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error('Avatar upload processing error:', err);
            setAvatarError('Could not upload that picture. Please try again.');
            setUploadingAvatar(false);
        }
    };

    const handleRemoveAvatar = async () => {
        if (!window.confirm('Remove your profile picture?')) return;
        setUploadingAvatar(true);
        await removeAvatar();
        setUploadingAvatar(false);
    };

    if (loading) return <ProfileSkeleton />;

    if (!user) {
        return (
            <div className="min-h-screen bg-cream flex flex-col font-sans text-plum">
                <Navbar />
                <main className="flex-1 max-w-xl mx-auto w-full px-6 py-20 flex flex-col items-center justify-center text-center">
                    <Lock size={36} className="text-berry mb-5" />
                    <h1 className="text-4xl font-black font-serif text-plum mb-3">Your profile</h1>
                    <p className="text-plum/70 mb-8">
                        Sign in to see your rank, your points and the next step in your training.
                    </p>
                    <div className="flex gap-3">
                        <Link to="/login" className="py-3 px-7 soft-button-berry text-sm">Log in</Link>
                        <Link to="/register" className="py-3 px-7 soft-button text-sm">Create account</Link>
                    </div>
                </main>
            </div>
        );
    }

    const totalPoints = user.points || 0;
    const solvedPuzzles = user.solvedPuzzles || [];
    const levelInfo = calculateLevelInfo(totalPoints);
    const nextTier = LEVEL_TIERS.find((t) => t.level === levelInfo.level + 1);
    const memberSince = user.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;
const pawn = user.pawnStats || { whiteWins: 0, whiteLosses: 0, blackWins: 0, blackLosses: 0 };
    const pawnWins = pawn.whiteWins + pawn.blackWins;
    const pawnLosses = pawn.whiteLosses + pawn.blackLosses;

    const weekStart = addDays(today, -6);
    const solvedThisWeek = solvedPuzzles.some((p) => p.solvedAt && toDayKey(new Date(p.solvedAt)) >= weekStart);
    const plan = findPlan(training?.planId);
    const todayLog: TrainingLog | undefined = training?.logs.find((l) => l.day === today);
    const requiredItems = plan?.items.filter((i) => i.required) ?? [];
    const requiredDone = requiredItems.filter((i) => todayLog?.completedItems.includes(i.id)).length;
    const streak = training?.streak ?? 0;

    // One next step: today's plan first, then this week's puzzle, then a plan, then an endgame.
    const nextStep: NextStep =
        plan && !todayLog?.completed
            ? {
                  title: "Finish today's training",
                  detail: `${requiredDone} of ${requiredItems.length} activities done on your ${plan.name} plan. Finishing earns ${DAILY_TRAINING_POINTS} points.`,
                  to: '/training',
                  action: "Open today's plan"
              }
            : !solvedThisWeek
              ? {
                    title: "Solve this week's puzzle",
                    detail: 'Three new puzzles every Monday, worth 25, 50 or 100 points.',
                    to: '/TrainingPuzzles',
                    action: 'Go to the puzzles'
                }
              : !plan
                ? {
                      title: 'Choose a daily training plan',
                      detail: `A checklist for each day that earns ${DAILY_TRAINING_POINTS} points when you finish it.`,
                      to: '/training',
                      action: 'Choose a plan'
                  }
                : {
                      title: 'Practise an endgame',
                      detail: 'Each endgame earns 10 to 30 points the first time you complete it.',
                      to: '/EndgamePractice',
                      action: 'Pick an endgame'
                  };

    const toGo = levelInfo.pointsToNextLevel;
    const hardTarts = Math.ceil(toGo / 50);
    const glassLabel = levelInfo.isMaxLevel
        ? `Top rank reached: ${levelInfo.title}, with ${totalPoints} points.`
        : `Level ${levelInfo.level} of ${LEVEL_TIERS.length}, ${levelInfo.title}: ${levelInfo.progressPercentage}% of the way to ${nextTier?.title}.`;

    const shownPuzzles = showAllPuzzles ? solvedPuzzles : solvedPuzzles.slice(0, 6);

    return (
        <div className="min-h-screen bg-cream flex flex-col font-sans text-plum selection:bg-berry/20">
            <Navbar />

            <main className="flex-1 max-w-5xl mx-auto w-full px-5 sm:px-8 py-10 md:py-14">
                {/* Identity */}
                <header className="flex flex-col sm:flex-row sm:items-center gap-5 pb-8 border-b border-plum/15">
                    <div className="relative group/avatar self-start">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingAvatar}
                            className="relative block w-20 h-20 rounded-2xl overflow-hidden bg-plum text-cream font-serif font-black text-3xl uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berry focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
                            aria-label="Change profile picture"
                        >
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="flex w-full h-full items-center justify-center">{user.username.charAt(0)}</span>
                            )}
                            <span className="absolute inset-0 flex items-center justify-center bg-plum/65 text-white opacity-0 group-hover/avatar:opacity-100 group-focus-within/avatar:opacity-100 transition-opacity">
                                {uploadingAvatar ? <Loader2 size={22} className="animate-spin" /> : <Camera size={20} />}
                            </span>
                        </button>
                        {user.avatarUrl && (
                            <button
                                type="button"
                                onClick={handleRemoveAvatar}
                                disabled={uploadingAvatar}
                                className="absolute -top-2 -right-2 p-1.5 rounded-full bg-white text-rose-600 shadow-[0_2px_6px_rgb(74,21,75,0.18)] opacity-0 group-hover/avatar:opacity-100 focus-visible:opacity-100 transition-opacity"
                                aria-label="Remove profile picture"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png, image/jpeg, image/webp, image/gif"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h1 className="text-3xl md:text-4xl font-serif font-black tracking-tight truncate">{user.username}</h1>
                        <p className="mt-1 text-plum/70">
                            <span className="font-bold text-berry">{levelInfo.title}</span>
                            <span className="mx-2 text-plum/30" aria-hidden="true">·</span>
                            Level {levelInfo.level} of {LEVEL_TIERS.length}
                            {memberSince && (
                                <>
                                    <span className="mx-2 text-plum/30" aria-hidden="true">·</span>
                                    Member since {memberSince}
                                </>
                            )}
                        </p>
                        {avatarError && <p className="mt-2 text-sm font-bold text-rose-700" role="alert">{avatarError}</p>}
                    </div>

                    <div className="flex items-center gap-5 text-sm font-bold">
                        <Link to="/link-email" className="text-plum/70 hover:text-berry underline-offset-4 hover:underline">
                            {user.email ? 'Change email' : 'Link an email'}
                        </Link>
                        <button
                            type="button"
                            onClick={async () => {
                                await logout();
                                navigate('/');
                            }}
                            className="text-plum/70 hover:text-berry underline-offset-4 hover:underline"
                        >
                            Sign out
                        </button>
                    </div>
                </header>

                {/* The parfait and the next step */}
                <section className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-10 md:gap-14 py-10" aria-labelledby="progress-heading">
                    <div className="order-2 md:order-1 self-center flex justify-center md:justify-start gap-5">
                        <ParfaitGlass level={levelInfo.level} progress={levelInfo.progressPercentage / 100} label={glassLabel} />
                        {/* Each rank name sits at the height of its own layer in the glass */}
                        <ol className="relative w-44 sm:w-48 text-sm" aria-label="Ranks">
                            {LEVEL_TIERS.map((tier, i) => {
                                const isCurrent = tier.level === levelInfo.level;
                                const reached = tier.level <= levelInfo.level;
                                const centre = (BOWL_BOTTOM - (i + 0.5) * BAND) / GLASS_HEIGHT;
                                return (
                                    <li
                                        key={tier.level}
                                        className={`absolute left-0 right-0 -translate-y-1/2 leading-tight ${isCurrent ? 'text-plum' : reached ? 'text-plum font-semibold' : 'text-plum/70'}`}
                                        style={{ top: `${centre * 100}%` }}
                                        aria-current={isCurrent ? 'step' : undefined}
                                    >
                                        <span className={isCurrent ? 'font-serif font-black text-base' : undefined}>{tier.title}</span>
                                        {isCurrent && (
                                            <span className="block text-xs tabular-nums">
                                                {totalPoints} of {tier.maxPoints} points
                                            </span>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    </div>

                    <div className="order-1 md:order-2 flex flex-col justify-center gap-8">
                        <div>
                            <h2 id="progress-heading" className="text-3xl md:text-4xl font-serif font-black tracking-tight leading-tight">
                                {levelInfo.isMaxLevel ? 'Your parfait is complete.' : `${toGo} points to ${nextTier?.title}.`}
                            </h2>
                            <p className="mt-3 text-plum/70 max-w-prose">
                                {levelInfo.isMaxLevel
                                    ? `You have reached the top rank with ${totalPoints} points.`
                                    : `You have ${totalPoints} points. That is about ${hardTarts} Hard Tart ${hardTarts === 1 ? 'puzzle' : 'puzzles'} away from the next layer.`}
                            </p>
                        </div>

                        <div className="rounded-2xl bg-plum text-cream p-6 sm:p-7 shadow-[0_10px_30px_-12px_rgb(74,21,75,0.55)]" role="region" aria-label="Your next step">
                            <h3 className="text-2xl font-serif font-black">{nextStep.title}</h3>
                            <p className="mt-2 text-cream/80">{nextStep.detail}</p>
                            <Link
                                to={nextStep.to}
                                className="mt-5 inline-flex items-center gap-2 py-3 px-6 soft-button-berry text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-plum"
                            >
                                {nextStep.action} <ArrowRight size={16} />
                            </Link>
                        </div>

                        <p className="text-sm text-plum/70">
                            {streak > 0 ? `${streak}-day training streak` : 'No training streak yet'}
                            <span className="mx-2 text-plum/30" aria-hidden="true">·</span>
                            {solvedPuzzles.length} {solvedPuzzles.length === 1 ? 'puzzle' : 'puzzles'} solved
                            {!!user.endgamePlayed && (
                                <>
                                    <span className="mx-2 text-plum/30" aria-hidden="true">·</span>
                                    <Link to="/endgame-trainer" className="hover:text-berry">
                                        Endgame rating {user.endgameRating}{user.endgamePlayed < LEADERBOARD_MIN_PLAYED ? '?' : ''} (best {user.endgameBest})
                                    </Link>
                                </>
                            )}
                            {pawnWins + pawnLosses > 0 && (
                                <>
                                    <span className="mx-2 text-plum/30" aria-hidden="true">·</span>
                                    Pawn game {pawnWins} {pawnWins === 1 ? 'win' : 'wins'}, {pawnLosses} {pawnLosses === 1 ? 'loss' : 'losses'}
                                </>
                            )}
                        </p>
                    </div>
                </section>

                {/* Puzzle history */}
                <section className="pt-10 border-t border-plum/15" aria-labelledby="history-heading">
                    <div className="flex items-baseline justify-between gap-4 mb-5">
                        <h2 id="history-heading" className="text-2xl font-serif font-black">Puzzle history</h2>
                        <Link to="/TrainingPuzzles" className="text-sm font-bold text-berry hover:text-plum underline-offset-4 hover:underline">
                            This week's puzzles
                        </Link>
                    </div>

                    {solvedPuzzles.length === 0 ? (
                        <p className="text-plum/70 max-w-prose">
                            No puzzles solved yet. Each Monday brings three new puzzles: a Piece of Cake, a Hard Tart and a Cherry Bomb.
                            Solve one to add your first layer of points.
                        </p>
                    ) : (
                        <>
                            <ul className="divide-y divide-plum/10 border-y border-plum/10">
                                {shownPuzzles.map((puzzle, idx) => {
                                    const difficulty = puzzle.difficulty === 'Challenge' ? 'Cherry Bomb' : puzzle.difficulty;
                                    const style = DIFFICULTY[difficulty as keyof typeof DIFFICULTY] ?? DIFFICULTY['Cherry Bomb'];
                                    return (
                                        <li key={puzzle.id || idx} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-3.5">
                                            <style.Icon size={20} className={style.tone} aria-hidden="true" />
                                            <div className="min-w-0">
                                                <p className="font-semibold truncate">{puzzle.title || `${difficulty} puzzle`}</p>
                                                <p className="text-xs text-plum/70">
                                                    Week {puzzle.week} · {difficulty}
                                                    {puzzle.solvedAt && <> · {formatDate(puzzle.solvedAt)}</>}
                                                </p>
                                            </div>
                                            <span className="font-bold tabular-nums text-berry">+{puzzle.points}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                            {solvedPuzzles.length > 6 && (
                                <button
                                    type="button"
                                    onClick={() => setShowAllPuzzles(!showAllPuzzles)}
                                    className="mt-4 text-sm font-bold text-plum/70 hover:text-berry underline-offset-4 hover:underline"
                                >
                                    {showAllPuzzles ? 'Show fewer' : `Show all ${solvedPuzzles.length} puzzles`}
                                </button>
                            )}
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}
