import type { TrainingPlan } from '../data/trainingPlans';

/**
 * Rules for the daily training checklist, shared by the Training page and the /api/training
 * endpoints so the two always agree on what counts as a finished day and what it is worth.
 */

/** Points for finishing every required item of the day's plan (paid at most once per day). */
export const DAILY_TRAINING_POINTS = 30;
/** Extra points each time the streak of finished days reaches a multiple of STREAK_BONUS_EVERY. */
export const STREAK_BONUS_POINTS = 50;
export const STREAK_BONUS_EVERY = 7;

export interface TrainingLog {
    day: string; // YYYY-MM-DD, the user's local date
    planId: string;
    completedItems: string[];
    minutes: number;
    completed: boolean;
    pointsAwarded: number;
}

/** Keeps only ids that belong to the plan, once each, in the plan's order. */
export function sanitiseItems(plan: TrainingPlan, ids: unknown): string[] {
    const wanted = new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []);
    return plan.items.filter(item => wanted.has(item.id)).map(item => item.id);
}

export function minutesFor(plan: TrainingPlan, ids: string[]): number {
    return plan.items.filter(item => ids.includes(item.id)).reduce((sum, item) => sum + item.minutes, 0);
}

/** A day is finished when every required item is ticked (optional items don't matter). */
export function isDayComplete(plan: TrainingPlan, ids: string[]): boolean {
    return plan.items.every(item => !item.required || ids.includes(item.id));
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDayKey(value: unknown): value is string {
    return typeof value === 'string' && DAY_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** The local calendar date of `date` as YYYY-MM-DD. */
export function toDayKey(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Calendar arithmetic on YYYY-MM-DD keys (done in UTC, so daylight saving never shifts the date). */
export function addDays(day: string, delta: number): string {
    const date = new Date(`${day}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + delta);
    return date.toISOString().slice(0, 10);
}

/**
 * Users log their own local "today", which can be a day either side of the server's UTC date
 * depending on their time zone. Anything further away (back-filling old days, or the future) is refused.
 */
export function isLoggableDay(day: string, now: Date = new Date()): boolean {
    if (!isDayKey(day)) return false;
    const utcToday = now.toISOString().slice(0, 10);
    return day >= addDays(utcToday, -1) && day <= addDays(utcToday, 1);
}

/** Consecutive finished days ending on `day` (0 if `day` itself is not finished). */
export function streakEndingOn(finishedDays: Set<string>, day: string): number {
    let streak = 0;
    for (let d = day; finishedDays.has(d); d = addDays(d, -1)) streak++;
    return streak;
}

/** The streak to show today: it stays alive until the end of today even if today isn't finished yet. */
export function currentStreak(finishedDays: Set<string>, today: string): number {
    return finishedDays.has(today) ? streakEndingOn(finishedDays, today) : streakEndingOn(finishedDays, addDays(today, -1));
}

/** Points for finishing a day that brings the streak to `streak` days. */
export function rewardForFinishedDay(streak: number): { daily: number; bonus: number; total: number } {
    const bonus = streak > 0 && streak % STREAK_BONUS_EVERY === 0 ? STREAK_BONUS_POINTS : 0;
    return { daily: DAILY_TRAINING_POINTS, bonus, total: DAILY_TRAINING_POINTS + bonus };
}
