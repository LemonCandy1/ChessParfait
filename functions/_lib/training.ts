import type { SupabaseClient } from '@supabase/supabase-js';
import { addDays, currentStreak, isDayKey, isRestDay, type TrainingLog } from '../../src/lib/training';

// Shared helpers for the /api/training and /api/coach endpoints. No onRequest handlers, so Pages does not route it.

export interface TrainingLogRow {
    day: string;
    plan_id: string;
    completed_items: string[];
    minutes: number;
    completed: boolean;
    points_awarded: number;
}

export const toLog = (row: TrainingLogRow): TrainingLog => ({
    day: row.day,
    planId: row.plan_id,
    completedItems: row.completed_items ?? [],
    minutes: row.minutes,
    completed: row.completed,
    pointsAwarded: row.points_awarded
});

/** Finished days in the year up to and including `today`, for streaks. */
export async function finishedDays(admin: SupabaseClient, userId: string, today: string): Promise<Set<string>> {
    const { data, error } = await admin
        .from('training_logs')
        .select('day')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('day', addDays(today, -400))
        .lte('day', addDays(today, 1));
    if (error) throw error;
    return new Set((data ?? []).map((row: { day: string }) => row.day));
}

/**
 * A user's logs between `from` and `to` (callers keep the range to about 2 months), their current
 * streak as of their local `today`, and which missed days in the range were used as rest days.
 */
export async function trainingHistory(admin: SupabaseClient, userId: string, from: string, to: string, today: string) {
    const [{ data, error }, finished] = await Promise.all([
        admin
            .from('training_logs')
            .select('day, plan_id, completed_items, minutes, completed, points_awarded')
            .eq('user_id', userId)
            .gte('day', from)
            .lte('day', to)
            .order('day'),
        finishedDays(admin, userId, today)
    ]);
    if (error) throw error;

    const restDays: string[] = [];
    for (let d = from; d <= to && d < today; d = addDays(d, 1)) if (isRestDay(finished, d)) restDays.push(d);

    return { logs: ((data ?? []) as TrainingLogRow[]).map(toLog), streak: currentStreak(finished, today), restDays };
}

/** The ?from=&to=&today= range a calendar asks for (YYYY-MM-DD, at most about 2 months), or null if invalid. */
export function readRange(request: Request): { from: string; to: string; today: string } | null {
    const params = new URL(request.url).searchParams;
    const from = params.get('from');
    const to = params.get('to');
    const today = params.get('today');
    if (!isDayKey(from) || !isDayKey(to) || !isDayKey(today) || from > to || addDays(from, 62) < to) return null;
    return { from, to, today };
}
