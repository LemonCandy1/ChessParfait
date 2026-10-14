import type { SupabaseClient } from '@supabase/supabase-js';
import { addDays, currentStreak, type TrainingLog } from '../../src/lib/training';

// Shared helpers for the /api/training endpoints. No onRequest handlers, so Pages does not route it.

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

export async function streakFor(admin: SupabaseClient, userId: string, today: string): Promise<number> {
    return currentStreak(await finishedDays(admin, userId, today), today);
}
