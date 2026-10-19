import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { findPlan, type TrainingPlan } from '../data/trainingPlans';
import { addDays, type TrainingLog } from '../lib/training';
import { addMonths, firstOfMonth, focusRing, formatDay, formatMinutes, monthKey } from '../lib/calendarFormat';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function MonthCalendar({ month, today, logs, restDays, plan, selected, onSelect, onMonthChange }: {
    month: string;
    today: string;
    logs: Record<string, TrainingLog>;
    restDays: Set<string>;
    plan: TrainingPlan;
    selected: string;
    onSelect: (day: string) => void;
    onMonthChange: (month: string) => void;
}) {
    const first = firstOfMonth(month);
    const leadingBlanks = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
    const days: string[] = [];
    for (let d = first; monthKey(d) === month; d = addDays(d, 1)) days.push(d);

    const monthLogs = days.map(d => logs[d]).filter((l): l is TrainingLog => !!l && l.minutes > 0);
    const finished = monthLogs.filter(l => l.completed).length;
    const minutes = monthLogs.reduce((sum, l) => sum + l.minutes, 0);
    const selectedLog = logs[selected];
    const selectedPlan = findPlan(selectedLog?.planId) ?? plan;

    return (
        <section aria-labelledby="calendar-heading">
            <div className="flex items-center justify-between">
                <h3 id="calendar-heading" className="text-lg font-serif font-black">{formatDay(first, { month: 'long', year: 'numeric' })}</h3>
                <div className="flex items-center">
                    <button type="button" onClick={() => onMonthChange(addMonths(month, -1))} className={`p-1.5 rounded-lg hover:bg-plum/5 ${focusRing}`} aria-label="Previous month">
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onMonthChange(addMonths(month, 1))}
                        disabled={month >= monthKey(today)}
                        className={`p-1.5 rounded-lg hover:bg-plum/5 disabled:opacity-30 ${focusRing}`}
                        aria-label="Next month"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>
            <p className="text-sm text-plum/75 mt-0.5">
                {monthLogs.length} {monthLogs.length === 1 ? 'day' : 'days'} trained · {finished} finished · {formatMinutes(minutes)}
            </p>

            <div className="grid grid-cols-7 gap-1 text-center mt-4">
                {WEEKDAYS.map(w => (
                    <div key={w} className="text-[11px] font-bold text-plum/70 pb-1" aria-hidden="true">{w.charAt(0)}</div>
                ))}
                {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`blank-${i}`} />)}
                {days.map(day => {
                    const log = logs[day];
                    const trained = !!log && log.minutes > 0;
                    const rest = !log?.completed && restDays.has(day);
                    const style = log?.completed ? 'bg-berry text-white' : rest ? 'bg-amber-100 text-amber-900' : trained ? 'bg-berry/20 text-plum' : 'bg-plum/[0.05] text-plum/75';
                    return (
                        <button
                            type="button"
                            key={day}
                            onClick={() => onSelect(day)}
                            disabled={day > today}
                            aria-pressed={day === selected}
                            aria-label={`${formatDay(day, { weekday: 'long', day: 'numeric', month: 'long' })}: ${trained ? `${formatMinutes(log.minutes)}${log.completed ? ', plan finished' : ''}` : 'no training logged'}${rest ? ', rest day' : ''}`}
                            className={`aspect-square rounded-lg text-xs font-bold tabular-nums transition-colors disabled:opacity-30 ${style} ${
                                day === selected ? 'ring-2 ring-plum ring-offset-1 ring-offset-cream' : day === today ? 'ring-2 ring-berry/60 ring-offset-1 ring-offset-cream' : ''
                            } ${focusRing}`}
                        >
                            {Number(day.slice(8))}
                        </button>
                    );
                })}
            </div>
            <p className="flex items-center gap-4 mt-3 text-xs font-semibold text-plum/75">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-berry" /> Plan finished</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-berry/20" /> Partly done</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100" /> Rest day</span>
            </p>

            <div className="mt-5 pt-4 border-t border-plum/12">
                <h4 className="text-sm font-bold">{formatDay(selected, { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
                {selectedLog && selectedLog.minutes > 0 ? (
                    <ul className="mt-2 space-y-1.5 text-sm">
                        {selectedPlan.items.map(item => {
                            const done = selectedLog.completedItems.includes(item.id);
                            return (
                                <li key={item.id} className={`flex items-center gap-2 ${done ? 'text-plum' : 'text-plum/70'}`}>
                                    <Check size={14} className={done ? 'text-emerald-600' : 'invisible'} aria-hidden="true" />
                                    <span>{item.activity}</span>
                                    <span className="sr-only">{done ? '(done)' : '(not done)'}</span>
                                </li>
                            );
                        })}
                        <li className="text-xs font-semibold text-plum/75 pt-1">
                            {selectedPlan.name} plan · {formatMinutes(selectedLog.minutes)}
                            {selectedLog.pointsAwarded > 0 && ` · +${selectedLog.pointsAwarded} points`}
                        </li>
                    </ul>
                ) : (
                    <p className="text-sm text-plum/75 mt-1">
                        {restDays.has(selected) ? "Rest day: this week's free day off, so the streak carried on." : `No training logged${selected === today ? ' yet today' : ''}.`}
                    </p>
                )}
            </div>
        </section>
    );
}
