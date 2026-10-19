import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Navbar from '../components/Navbar/Navbar';
import MonthCalendar from '../components/TrainingCalendar';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_PLAN_ID, findPlan } from '../data/trainingPlans';
import { firstOfMonth, focusRing, formatDay, lastOfMonth, monthKey } from '../lib/calendarFormat';
import { addDays, toDayKey, type TrainingLog } from '../lib/training';
import { getStudentTraining, getStudents, inviteStudent, removeStudent, type CoachStudent } from '../lib/trainingApi';

/** Last 14 days as small squares: finished, partly done, rest day or missed. */
function RecentDays({ student, today }: { student: CoachStudent; today: string }) {
    const byDay = new Map(student.logs.map(l => [l.day, l]));
    const rest = new Set(student.restDays);
    const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
    return (
        <ol className="flex gap-1" aria-label="Last 14 days">
            {days.map(day => {
                const log = byDay.get(day);
                const [style, label] = log?.completed
                    ? ['bg-berry', 'finished']
                    : rest.has(day) ? ['bg-amber-200', 'rest day']
                    : log && log.minutes > 0 ? ['bg-berry/30', 'partly done']
                    : ['bg-plum/10', day === today ? 'not yet' : 'missed'];
                return <li key={day} className={`w-4 h-4 rounded ${style}`} title={`${formatDay(day, { weekday: 'short', day: 'numeric', month: 'short' })}: ${label}`} aria-label={`${formatDay(day, { weekday: 'long', day: 'numeric', month: 'long' })}: ${label}`} />;
            })}
        </ol>
    );
}

/** One accepted student's full calendar, month by month. */
function StudentCalendar({ student, today }: { student: CoachStudent; today: string }) {
    const [month, setMonth] = useState(monthKey(today));
    const [selected, setSelected] = useState(today);
    const [logs, setLogs] = useState<Record<string, TrainingLog>>({});
    const [restDays, setRestDays] = useState<Set<string>>(new Set());
    const [error, setError] = useState('');

    useEffect(() => {
        getStudentTraining(student.id, firstOfMonth(month), lastOfMonth(month), today)
            .then(data => {
                setLogs(prev => ({ ...prev, ...Object.fromEntries(data.logs.map(l => [l.day, l])) }));
                setRestDays(prev => new Set([...prev, ...data.restDays]));
                setError('');
            })
            .catch((err: Error) => setError(err.message));
    }, [student.id, month, today]);

    return (
        <div className="mt-4 max-w-sm">
            {error && <p className="mb-3 text-sm text-rose-800" role="alert">{error}</p>}
            <MonthCalendar
                month={month}
                today={today}
                logs={logs}
                restDays={restDays}
                plan={findPlan(student.planId) ?? findPlan(DEFAULT_PLAN_ID)!}
                selected={selected}
                onSelect={setSelected}
                onMonthChange={setMonth}
            />
        </div>
    );
}

export default function Coach() {
    const { user, loading: authLoading } = useAuth();
    const today = useMemo(() => toDayKey(new Date()), []);
    const [students, setStudents] = useState<CoachStudent[] | null>(null);
    const [openId, setOpenId] = useState<string | null>(null);
    const [username, setUsername] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            setStudents((await getStudents(today)).students);
            setError('');
        } catch (err) {
            setError((err as Error).message);
        }
    }, [today]);

    useEffect(() => {
        if (user?.isCoach) void load();
    }, [user?.isCoach, load]);

    const invite = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setMessage('');
        try {
            await inviteStudent(username);
            setMessage(`Invite sent to ${username.trim()}. They'll see it on their Training page.`);
            setUsername('');
            await load();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const remove = async (student: CoachStudent) => {
        if (!window.confirm(student.status === 'pending' ? `Cancel the invite to ${student.username}?` : `Remove ${student.username}? You'll need to invite them again to see their training.`)) return;
        setBusy(true);
        try {
            await removeStudent(student.id);
            await load();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const accepted = students?.filter(s => s.status === 'accepted') ?? [];
    const pending = students?.filter(s => s.status === 'pending') ?? [];

    return (
        <div className="min-h-screen flex flex-col font-sans text-plum bg-cream">
            <div className="relative z-50"><Navbar /></div>
            <main className="flex-1 max-w-4xl mx-auto w-full px-5 sm:px-8 py-12">
                <h1 className="text-4xl font-serif font-black tracking-tight">Your students</h1>

                {!authLoading && !user?.isCoach ? (
                    <p className="mt-4 text-plum/80">Only the coach can see this page.</p>
                ) : (
                    <>
                        <p className="mt-2 text-plum/80 max-w-prose">Invite students by username. Once they accept, you can see their plan, streak and calendar here.</p>

                        <form onSubmit={invite} className="mt-6 flex flex-wrap gap-3 items-end">
                            <label className="flex flex-col gap-1 text-sm font-bold">
                                Username
                                <input
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                    className={`w-64 max-w-full rounded-xl border-2 border-plum/15 bg-white px-4 py-2.5 font-normal ${focusRing}`}
                                />
                            </label>
                            <button type="submit" disabled={busy || !username.trim()} className={`py-3 px-6 soft-button-berry text-sm ${focusRing}`}>Send invite</button>
                        </form>
                        {message && <p className="mt-3 text-sm text-emerald-700" role="status">{message}</p>}
                        {error && <p className="mt-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3" role="alert">{error}</p>}

                        {students === null && !error && <div className="mt-10 h-40 rounded-2xl bg-plum/5 animate-pulse" aria-busy="true" />}

                        {students !== null && (
                            <section className="mt-10" aria-labelledby="sharing-heading">
                                <h2 id="sharing-heading" className="text-2xl font-serif font-black">Sharing with you ({accepted.length})</h2>
                                {accepted.length === 0 && <p className="mt-2 text-plum/75">No students are sharing their training yet.</p>}
                                <ul className="mt-3 divide-y divide-plum/12 border-y border-plum/12">
                                    {accepted.map(student => (
                                        <li key={student.id} className="py-4">
                                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setOpenId(openId === student.id ? null : student.id)}
                                                    aria-expanded={openId === student.id}
                                                    className={`text-left min-w-40 ${focusRing}`}
                                                >
                                                    <span className="block text-lg font-bold hover:text-berry">{student.username}</span>
                                                    <span className="block text-sm text-plum/75">
                                                        {(findPlan(student.planId) ?? findPlan(DEFAULT_PLAN_ID)!).name} plan · {student.streak}-day streak
                                                    </span>
                                                </button>
                                                <RecentDays student={student} today={today} />
                                                <button type="button" onClick={() => remove(student)} disabled={busy} className={`ml-auto text-sm font-bold text-plum/70 hover:text-berry ${focusRing}`}>Remove</button>
                                            </div>
                                            {openId === student.id && <StudentCalendar student={student} today={today} />}
                                        </li>
                                    ))}
                                </ul>

                                {pending.length > 0 && (
                                    <>
                                        <h2 className="mt-10 text-2xl font-serif font-black">Waiting to accept ({pending.length})</h2>
                                        <ul className="mt-3 divide-y divide-plum/12 border-y border-plum/12">
                                            {pending.map(student => (
                                                <li key={student.id} className="py-3 flex items-center gap-4">
                                                    <span className="font-bold">{student.username}</span>
                                                    <span className="text-sm text-plum/70">Invite sent</span>
                                                    <button type="button" onClick={() => remove(student)} disabled={busy} className={`ml-auto text-sm font-bold text-plum/70 hover:text-berry ${focusRing}`}>Cancel invite</button>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </section>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
