import { getAdminClient, getSessionAuthUser, json, type SupabaseEnv } from '../../_lib/community';
import { streakFor, toLog, type TrainingLogRow } from '../../_lib/training';
import { DEFAULT_PLAN_ID, findPlan } from '../../../src/data/trainingPlans';
import { addDays, isDayKey } from '../../../src/lib/training';
import { getProfile } from '../../_lib/profiles';

/**
 * GET /api/training?from=YYYY-MM-DD&to=YYYY-MM-DD&today=YYYY-MM-DD
 * The signed-in user's chosen plan, their logs between `from` and `to` (at most ~2 months)
 * and their current streak as of their local `today`.
 */
export async function onRequestGet(context: { request: Request; env: SupabaseEnv }) {
    const { request, env } = context;
    try {
        const user = await getSessionAuthUser(request, env);
        if (!user) return json({ message: 'Please sign in to use training plans.' }, 401);

        const params = new URL(request.url).searchParams;
        const from = params.get('from');
        const to = params.get('to');
        const today = params.get('today');
        if (!isDayKey(from) || !isDayKey(to) || !isDayKey(today) || from > to || addDays(from, 62) < to) {
            return json({ message: 'Invalid date range.' }, 400);
        }

        const admin = getAdminClient(env);
        const { data, error } = await admin
            .from('training_logs')
            .select('day, plan_id, completed_items, minutes, completed, points_awarded')
            .eq('user_id', user.id)
            .gte('day', from)
            .lte('day', to)
            .order('day');
        if (error) throw error;

        const savedPlan = (await getProfile(admin, user)).training_plan;
        return json({
            planId: findPlan(savedPlan) ? savedPlan : null,
            defaultPlanId: DEFAULT_PLAN_ID,
            logs: ((data ?? []) as TrainingLogRow[]).map(toLog),
            streak: await streakFor(admin, user.id, today)
        });
    } catch (err) {
        console.error('Training GET error:', err);
        return json({ message: 'Could not load your training.' }, 500);
    }
}
