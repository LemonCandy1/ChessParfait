import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ExternalLink, X } from 'lucide-react';
import { BookOpen } from '@/lib/lucideOriginal';
import Navbar from '../components/Navbar/Navbar';
import { useAuth } from '../context/AuthContext';
import MonthCalendar from '../components/TrainingCalendar';
import { firstOfMonth, focusRing, formatDay, formatMinutes, lastOfMonth, monthKey } from '../lib/calendarFormat';
import { DEFAULT_PLAN_ID, TRAINING_PLANS, findPlan, type TrainingItem, type TrainingResource } from '../data/trainingPlans';
import {
    DAILY_TRAINING_POINTS,
    STREAK_BONUS_EVERY,
    STREAK_BONUS_POINTS,
    isDayComplete,
    minutesFor,
    toDayKey,
    type TrainingLog
} from '../lib/training';
import { getTraining, saveTrainingDay, saveTrainingPlan, setCoachSharing, type CoachStatus } from '../lib/trainingApi';

/** A guest's ticks for one day, kept in their browser until they sign up. */
interface GuestDay {
    day: string;
    planId: string;
    completedItems: string[];
}

const GUEST_KEY = 'chessparfait_guest_training';
const CARD_CLOSED_KEY = 'chessparfait_coaching_card_closed';

function readStored<T>(key: string): T | null {
    try {
        return JSON.parse(localStorage.getItem(key) || 'null') as T | null;
    } catch {
        return null;
    }
}

function writeStored(key: string, value: unknown) {
    try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(value));
    } catch { /* storage blocked: guest ticks just won't survive a reload */ }
}

/** One row of the open chapter's "Work through" list. */
function ResourceRow({ resource }: { resource: TrainingResource }) {
    const row = `flex items-center justify-between gap-4 py-2.5 lg:py-3 border-b border-plum/12 font-semibold ${focusRing} focus-visible:ring-offset-cream`;
    const hint = (text: string) => <span className="shrink-0 text-xs font-bold text-plum/70">{text}</span>;
    if (resource.kind === 'book' || !resource.url) {
        return (
            <li className={row}>
                <span className="flex items-center gap-2.5"><BookOpen size={16} className="text-berry shrink-0" />{resource.label}</span>
                {hint(resource.kind === 'file' ? 'PGN file' : 'Book')}
            </li>
        );
    }
    if (resource.kind === 'site') {
        return (
            <li>
                <Link to={resource.url} className={`${row} hover:text-berry`}>
                    {resource.label}
                    {hint('On Chess Parfait')}
                </Link>
            </li>
        );
    }
    return (
        <li>
            <a href={resource.url} target="_blank" rel="noopener noreferrer" className={`${row} hover:text-berry`}>
                <span className="flex items-center gap-2.5">{resource.label}<ExternalLink size={14} className="text-plum/60" /></span>
                {hint(resource.kind === 'file' ? 'Your file' : 'Opens in a new tab')}
            </a>
        </li>
    );
}

function PlanPicker({ currentId, onChoose, busy, preview = false }: { currentId: string | null; onChoose: (id: string) => void; busy: boolean; preview?: boolean }) {
    return (
        <ul className="divide-y divide-plum/12 border-y border-plum/12">
            {TRAINING_PLANS.map(plan => {
                const required = plan.items.filter(i => i.required);
                const isCurrent = plan.id === currentId;
                return (
                    <li key={plan.id}>
                        <button
                            type="button"
                            onClick={() => onChoose(plan.id)}
                            disabled={busy}
                            aria-pressed={isCurrent}
                            className={`w-full text-left py-5 px-1 grid sm:grid-cols-[1fr_auto] gap-x-8 gap-y-1 items-center group disabled:cursor-not-allowed ${focusRing} focus-visible:ring-offset-cream`}
                        >
                            <span>
                                <span className="block text-2xl font-serif font-black group-hover:text-berry transition-colors">{plan.name}</span>
                                <span className="block text-sm font-bold text-plum/70 mt-0.5">
                                    {plan.level} · {formatMinutes(minutesFor(plan, required.map(i => i.id)))} a day · {required.length} activities
                                </span>
                                <span className="block text-plum/80 mt-2 max-w-prose">{plan.summary}</span>
                            </span>
                            {!preview && (
                                <span className={`text-sm font-bold ${isCurrent ? 'text-emerald-700' : 'text-berry'}`}>
                                    {isCurrent ? 'Your current plan' : 'Choose this plan'}
                                </span>
                            )}
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

export default function Training() {
    const { user, loading: authLoading, updateUserStats } = useAuth();
    const today = useMemo(() => toDayKey(new Date()), []);
    const [month, setMonth] = useState(monthKey(today));
    const [selectedDay, setSelectedDay] = useState(today);
    const [planId, setPlanId] = useState<string | null>(null);
    const [choosingPlan, setChoosingPlan] = useState(false);
    const [openId, setOpenId] = useState<string | null>(null);
    const [logs, setLogs] = useState<Record<string, TrainingLog>>({});
    const [streak, setStreak] = useState(0);
    const [restDays, setRestDays] = useState<Set<string>>(new Set());
    const [coach, setCoach] = useState<CoachStatus>(null);
    const [cardClosedOn, setCardClosedOn] = useState(() => readStored<string>(CARD_CLOSED_KEY));
    const [loaded, setLoaded] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [reward, setReward] = useState('');
    // Saves run one after another so ticks can never arrive at the server out of order.
    const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
    const guest = !authLoading && !user;

    const loadMonth = useCallback(async (target: string) => {
        try {
            const data = await getTraining(firstOfMonth(target), lastOfMonth(target), today);
            setLogs(prev => ({ ...prev, ...Object.fromEntries(data.logs.map(l => [l.day, l])) }));
            setStreak(data.streak);
            setRestDays(prev => new Set([...prev, ...data.restDays]));
            setCoach(data.coach);
            // Players who never chose a plan start on the default (Quick) plan.
            setPlanId(current => current ?? data.planId ?? data.defaultPlanId);
            setError('');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoaded(true);
        }
    }, [today]);

    useEffect(() => {
        if (!authLoading && user) void loadMonth(month);
    }, [authLoading, loadMonth, month, user]);

    // Guests keep today's ticks in their browser.
    useEffect(() => {
        if (!guest) return;
        const saved = readStored<GuestDay>(GUEST_KEY);
        const plan = findPlan(saved?.planId) ?? findPlan(DEFAULT_PLAN_ID)!;
        setPlanId(plan.id);
        if (saved?.day === today) {
            const items = saved.completedItems.filter(id => plan.items.some(i => i.id === id));
            setLogs({ [today]: { day: today, planId: plan.id, completedItems: items, minutes: minutesFor(plan, items), completed: isDayComplete(plan, items), pointsAwarded: 0 } });
        }
        setLoaded(true);
    }, [guest, today]);

    // After a guest signs up or logs in, today's ticks move to their account (and earn today's points).
    // Older guest days are dropped: the server only accepts today.
    useEffect(() => {
        if (!user || !loaded) return;
        const saved = readStored<GuestDay>(GUEST_KEY);
        writeStored(GUEST_KEY, null);
        if (saved?.day === today && saved.completedItems.length > 0 && findPlan(saved.planId)) {
            setPlanId(saved.planId);
            void saveTrainingPlan(saved.planId).catch(() => undefined);
            saveCompleted(saved.planId, saved.completedItems);
        }
        // Runs once per sign-in; saveCompleted only uses stable setters.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, loaded, today]);

    const plan = findPlan(planId) ?? findPlan(DEFAULT_PLAN_ID)!;
    const todayLog = logs[today];
    const ticked = useMemo(
        () => (todayLog ? todayLog.completedItems.filter(id => plan.items.some(i => i.id === id)) : []),
        [plan, todayLog]
    );
    const requiredItems = plan.items.filter(i => i.required);
    const requiredDone = requiredItems.filter(i => ticked.includes(i.id)).length;
    const dayFinished = isDayComplete(plan, ticked);
    const nextBonusIn = STREAK_BONUS_EVERY - (streak % STREAK_BONUS_EVERY);

    // The open chapter: the player's pick, else the first activity not yet done.
    const firstUndone = plan.items.find(i => !ticked.includes(i.id)) ?? plan.items[0];
    const open: TrainingItem = plan.items.find(i => i.id === openId) ?? firstUndone;
    const openIndex = plan.items.indexOf(open);
    const openDone = ticked.includes(open.id);
    const nextAfterOpen = plan.items.slice(openIndex + 1).find(i => !ticked.includes(i.id))
        ?? plan.items.find(i => i.id !== open.id && !ticked.includes(i.id));

    const choosePlan = async (id: string) => {
        if (guest) {
            setPlanId(id);
            setOpenId(null);
            setChoosingPlan(false);
            writeStored(GUEST_KEY, { day: today, planId: id, completedItems: ticked });
            return;
        }
        setBusy(true);
        try {
            await saveTrainingPlan(id);
            setPlanId(id);
            setOpenId(null);
            setChoosingPlan(false);
            setError('');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const toggleItem = (itemId: string) => {
        const next = ticked.includes(itemId) ? ticked.filter(id => id !== itemId) : [...ticked, itemId];
        const optimistic: TrainingLog = {
            day: today,
            planId: plan.id,
            completedItems: next,
            minutes: minutesFor(plan, next),
            completed: isDayComplete(plan, next),
            pointsAwarded: todayLog?.pointsAwarded ?? 0
        };
        setLogs(prev => ({ ...prev, [today]: optimistic }));
        if (guest) writeStored(GUEST_KEY, { day: today, planId: plan.id, completedItems: next });
        else saveCompleted(plan.id, next);
    };

    function saveCompleted(forPlan: string, next: string[]) {
        saveQueue.current = saveQueue.current.then(async () => {
            try {
                const result = await saveTrainingDay(today, forPlan, next);
                setLogs(prev => ({ ...prev, [today]: result.log }));
                setStreak(result.streak);
                if (result.pointsAwarded > 0) {
                    updateUserStats(result.totalPoints, user?.solvedPuzzles ?? []);
                    setReward(result.bonus > 0
                        ? `Plan finished: +${result.pointsAwarded} points, including a +${result.bonus} bonus for your ${result.streak}-day streak.`
                        : `Plan finished: +${result.pointsAwarded} points.`);
                }
                setError('');
            } catch (err) {
                setError((err as Error).message);
            }
        });
    }

    const changeSharing = async (action: 'accept' | 'stop') => {
        setBusy(true);
        try {
            setCoach((await setCoachSharing(action)).coach);
            setError('');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const closeCard = () => {
        setCardClosedOn(today);
        writeStored(CARD_CLOSED_KEY, today);
    };
    // The coaching card shows on days a streak bonus was earned, except to students already linked to Luis.
    const showCoachingCard = !!user && coach !== 'accepted' && (todayLog?.pointsAwarded ?? 0) > DAILY_TRAINING_POINTS && cardClosedOn !== today;

    const markOpenDone = () => {
        toggleItem(open.id);
        if (nextAfterOpen) setOpenId(nextAfterOpen.id);
    };

    const pointsLine = guest
        ? (dayFinished ? `Day finished! Sign up to keep it and earn +${DAILY_TRAINING_POINTS} points.` : `Finish all ${requiredItems.length} required activities to finish the day.`)
        : reward || (dayFinished
            ? (todayLog?.pointsAwarded ? `Plan finished today: +${todayLog.pointsAwarded} points.` : 'Plan finished today.')
            : `Finish all ${requiredItems.length} required activities to earn +${DAILY_TRAINING_POINTS} points.`);

    return (
        <div className="min-h-screen flex flex-col font-sans text-plum bg-cream selection:bg-berry/20">
            <div className="relative z-50">
                <Navbar />
            </div>
            <h1 className="sr-only">Daily training</h1>

            {!loaded && (
                <div className="flex-1 lg:grid lg:grid-cols-[300px_minmax(0,1fr)_300px]" aria-busy="true">
                    <div className="h-48 lg:h-auto bg-plum" />
                    <div className="p-10 space-y-4">
                        <div className="h-28 rounded-2xl bg-plum/5 animate-pulse" />
                        <div className="h-12 w-2/3 rounded-xl bg-plum/5 animate-pulse" />
                        <div className="h-40 rounded-2xl bg-plum/5 animate-pulse" />
                    </div>
                </div>
            )}

            {loaded && choosingPlan && (
                <main className="flex-1 max-w-3xl mx-auto w-full px-5 sm:px-8 py-14">
                    <h2 className="text-4xl font-serif font-black tracking-tight">Choose your plan</h2>
                    <p className="mt-3 text-plum/80 max-w-prose">Pick the plan that fits your level. You can switch at any time and your history is kept.</p>
                    {error && <p className="mt-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3" role="alert">{error}</p>}
                    <div className="mt-8"><PlanPicker currentId={planId} onChoose={choosePlan} busy={busy} /></div>
                    {planId && (
                        <button type="button" onClick={() => setChoosingPlan(false)} className={`mt-5 text-sm font-bold text-plum/75 hover:text-berry ${focusRing}`}>
                            Back to today
                        </button>
                    )}
                </main>
            )}

            {loaded && planId && !choosingPlan && (
                <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[300px_minmax(0,1fr)_300px]">
                    {/* Chapter rail */}
                    <nav className="order-1 lg:order-none bg-plum text-cream px-5 py-5 lg:py-9" aria-label="Today's activities">
                        <h2 className="px-2 text-2xl font-serif font-black leading-tight">
                            {formatDay(today, { weekday: 'long', day: 'numeric', month: 'long' })}
                        </h2>
                        <p className="px-2 mt-1 text-sm text-cream/80">
                            {plan.name} plan · {requiredDone} of {requiredItems.length} done
                        </p>

                        <ol className="mt-3 lg:mt-5 space-y-1">
                            {plan.items.map((item, index) => {
                                const done = ticked.includes(item.id);
                                const isOpen = item.id === open.id;
                                return (
                                    <li
                                        key={item.id}
                                        className={`flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors ${isOpen ? 'bg-cream text-plum' : 'hover:bg-cream/10'} ${
                                            !item.required && index > 0 ? 'mt-3 border-t border-cream/20 pt-4 rounded-t-none' : ''
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            role="checkbox"
                                            aria-checked={done}
                                            aria-label={`${item.activity} done`}
                                            onClick={() => toggleItem(item.id)}
                                            className={`mt-0.5 shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${focusRing} ${
                                                isOpen ? 'focus-visible:ring-offset-cream' : 'focus-visible:ring-offset-plum'
                                            } ${done ? 'bg-emerald-600 border-emerald-600 text-white' : isOpen ? 'border-berry' : 'border-cream/60'}`}
                                        >
                                            {done && <Check size={16} strokeWidth={3} />}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setOpenId(item.id)}
                                            aria-current={isOpen ? 'step' : undefined}
                                            className={`flex-1 min-w-0 text-left rounded ${focusRing} ${isOpen ? 'focus-visible:ring-offset-cream' : 'focus-visible:ring-offset-plum'}`}
                                        >
                                            <span className="flex items-baseline justify-between gap-3">
                                                <span className={`font-bold ${done ? 'line-through decoration-2 decoration-emerald-500/80' : ''}`}>{item.activity}</span>
                                                <span className={`shrink-0 text-xs font-bold tabular-nums ${isOpen ? 'text-plum/75' : 'text-cream/75'}`}>
                                                    {item.required ? formatMinutes(item.minutes) : 'optional'}
                                                </span>
                                            </span>
                                            <span className={`block text-xs mt-0.5 leading-snug ${isOpen ? 'text-plum/75' : 'text-cream/75'}`}>{item.focus}</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ol>

                        <p className={`px-2 mt-4 lg:mt-6 text-sm ${dayFinished ? 'text-emerald-300 font-bold' : 'text-cream/80'}`} aria-live="polite">{pointsLine}</p>
                        <button
                            type="button"
                            onClick={() => setChoosingPlan(true)}
                            className={`mx-2 mt-2 lg:mt-4 text-sm font-bold text-[#F5B7C6] hover:text-white underline-offset-4 hover:underline ${focusRing} focus-visible:ring-offset-plum`}
                        >
                            Change plan
                        </button>
                    </nav>

                    {/* Goals and the open chapter */}
                    <main className="order-2 lg:order-none flex flex-col lg:block px-5 sm:px-8 lg:px-12 pb-8 lg:py-9">
                        {/* On phones the plan summary follows the activity, so the activity and its button come first */}
                        <section className="order-last lg:order-none mt-8 lg:mt-0 rounded-2xl bg-white px-6 py-5 shadow-[0_6px_20px_-14px_rgb(74,21,75,0.45)]" aria-labelledby="goals-heading">
                            <h2 id="goals-heading" className="text-lg font-serif font-black">What this plan builds</h2>
                            <ul className="mt-2 grid sm:grid-cols-2 gap-x-8 gap-y-1.5 text-plum/85">
                                {plan.goals.map(goal => (
                                    <li key={goal} className="flex gap-2.5">
                                        <span className="mt-2 w-1.5 h-1.5 rotate-45 bg-berry shrink-0" aria-hidden="true" />
                                        {goal}
                                    </li>
                                ))}
                            </ul>
                        </section>

                        {error && <p className="mt-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3" role="alert">{error}</p>}

                        {coach === 'pending' && (
                            <section className="mt-6 rounded-2xl border-2 border-berry/30 bg-white px-6 py-5" aria-labelledby="invite-heading">
                                <h2 id="invite-heading" className="text-lg font-serif font-black">Luis wants to see your training</h2>
                                <p className="mt-1 text-plum/80 max-w-prose">
                                    If you accept, Luis can see your plan, your streak and your training calendar, so he can follow up in lessons.
                                    You can stop sharing at any time.
                                </p>
                                <div className="mt-4 flex flex-wrap gap-3">
                                    <button type="button" onClick={() => changeSharing('accept')} disabled={busy} className={`py-2.5 px-6 soft-button-berry text-sm ${focusRing}`}>Share with Luis</button>
                                    <button type="button" onClick={() => changeSharing('stop')} disabled={busy} className={`py-2.5 px-6 soft-button text-sm ${focusRing}`}>No thanks</button>
                                </div>
                            </section>
                        )}

                        {showCoachingCard && (
                            <section className="mt-6 relative rounded-2xl bg-plum text-cream px-6 py-5" aria-labelledby="coaching-heading">
                                <button type="button" onClick={closeCard} aria-label="Close for today" className={`absolute top-3 right-3 p-1.5 rounded-lg text-cream/80 hover:text-white ${focusRing} focus-visible:ring-offset-plum`}>
                                    <X size={18} />
                                </button>
                                <h2 id="coaching-heading" className="text-lg font-serif font-black pr-8">Another week of training done</h2>
                                <p className="mt-1 text-cream/85 max-w-prose">Want a plan made for you? Book a lesson with Luis and he'll build your training around your games.</p>
                                <Link to="/chess-coaching-melbourne" className={`mt-4 inline-flex items-center gap-2 py-2.5 px-6 soft-button-berry text-sm ${focusRing} focus-visible:ring-offset-plum`}>
                                    See coaching <ArrowRight size={16} />
                                </Link>
                            </section>
                        )}

                        <article
                            key={open.id}
                            className="mt-4 lg:mt-9 animate-fade-up"
                            aria-labelledby="chapter-heading"
                        >
                            <h2 id="chapter-heading" className="text-3xl md:text-5xl font-serif font-black tracking-tight leading-[1.05]">{open.activity}</h2>
                            <p className="mt-2 text-sm font-bold text-berry">
                                Chapter {openIndex + 1} of {plan.items.length} · {formatMinutes(open.minutes)}{open.required ? '' : ' · optional'}
                            </p>
                            <p className="mt-3 lg:mt-5 text-lg font-bold max-w-prose">{open.focus}</p>
                            <p className="mt-2 text-plum/80 leading-relaxed max-w-prose">{open.notes}</p>

                            {open.resources.length > 0 && (
                                <section className="mt-5 lg:mt-7 max-w-2xl" aria-labelledby="resources-heading">
                                    <h3 id="resources-heading" className="text-sm font-bold text-plum/75">Work through</h3>
                                    <ul className="mt-1 border-t border-plum/12">
                                        {open.resources.map(r => <ResourceRow key={r.label} resource={r} />)}
                                    </ul>
                                </section>
                            )}

                            <div className="mt-8 flex flex-wrap items-center gap-4">
                                {openDone ? (
                                    <>
                                        <span className="inline-flex items-center gap-2 font-bold text-emerald-700"><Check size={18} strokeWidth={3} /> Done</span>
                                        {nextAfterOpen && (
                                            <button type="button" onClick={() => setOpenId(nextAfterOpen.id)} className={`inline-flex items-center gap-2 py-3 px-6 soft-button-berry text-sm ${focusRing} focus-visible:ring-offset-cream`}>
                                                Open {nextAfterOpen.activity} <ArrowRight size={16} />
                                            </button>
                                        )}
                                        <button type="button" onClick={() => toggleItem(open.id)} className={`text-sm font-bold text-plum/75 hover:text-berry underline-offset-4 hover:underline ${focusRing}`}>
                                            Undo
                                        </button>
                                    </>
                                ) : (
                                    <button type="button" onClick={markOpenDone} className={`inline-flex items-center gap-2 py-3 px-6 soft-button-berry text-sm ${focusRing} focus-visible:ring-offset-cream`}>
                                        {nextAfterOpen ? <>Mark done and open {nextAfterOpen.activity} <ArrowRight size={16} /></> : <>Mark done <Check size={16} strokeWidth={3} /></>}
                                    </button>
                                )}
                            </div>
                        </article>
                    </main>

                    {/* Streak and calendar */}
                    <aside className="order-3 lg:order-none px-5 sm:px-8 lg:pl-0 lg:pr-8 py-8 lg:py-9 lg:border-t-0" aria-label="Streak and calendar">
                        {guest ? (
                            <section aria-labelledby="signup-heading">
                                <h2 id="signup-heading" className="text-2xl font-serif font-black">Keep your streak</h2>
                                <p className="mt-1 text-sm text-plum/80">
                                    Sign up to keep your streak and earn +{DAILY_TRAINING_POINTS} points for every day you finish.
                                    Today's ticks come with you.
                                </p>
                                <div className="flex flex-wrap gap-3 mt-4">
                                    <Link to="/register?next=/training" className="py-2.5 px-6 soft-button-berry text-sm">Sign up</Link>
                                    <Link to="/login?next=/training" className="py-2.5 px-6 soft-button text-sm">Log in</Link>
                                </div>
                            </section>
                        ) : (
                            <>
                                <h2 className="text-2xl font-serif font-black">{streak > 0 ? `${streak}-day streak` : 'Start a streak'}</h2>
                                <p className="mt-1 text-sm text-plum/80">
                                    {streak > 0
                                        ? `${nextBonusIn} more finished ${nextBonusIn === 1 ? 'day' : 'days'} for the +${STREAK_BONUS_POINTS} bonus.`
                                        : `Finish ${STREAK_BONUS_EVERY} days for a +${STREAK_BONUS_POINTS} bonus.`}
                                    {' '}One missed day a week counts as a rest day and won't break your streak.
                                </p>
                                {coach === 'accepted' && (
                                    <p className="mt-3 text-sm text-plum/80">
                                        Sharing your training with Luis.{' '}
                                        <button type="button" onClick={() => changeSharing('stop')} disabled={busy} className={`font-bold text-berry hover:underline underline-offset-4 ${focusRing}`}>
                                            Stop sharing
                                        </button>
                                    </p>
                                )}
                                <div className="mt-6">
                                    <MonthCalendar
                                        month={month}
                                        today={today}
                                        logs={logs}
                                        restDays={restDays}
                                        plan={plan}
                                        selected={selectedDay}
                                        onSelect={setSelectedDay}
                                        onMonthChange={setMonth}
                                    />
                                </div>
                            </>
                        )}
                    </aside>
                </div>
            )}
        </div>
    );
}
