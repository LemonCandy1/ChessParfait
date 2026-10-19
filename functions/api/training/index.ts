import { getAdminClient, getSessionAuthUser, json, type SupabaseEnv } from '../../_lib/community';
import { readRange, trainingHistory } from '../../_lib/training';
import { DEFAULT_PLAN_ID, findPlan } from '../../../src/data/trainingPlans';
import { getProfile } from '../../_lib/profiles';
import { coachStatusFor } from '../../_lib/coach';

/**
 * GET /api/training?from=YYYY-MM-DD&to=YYYY-MM-DD&today=YYYY-MM-DD
 * The signed-in user's chosen plan, their logs and rest days between `from` and `to` (at most
 * ~2 months), their current streak as of their local `today`, and their link to the coach.
 */
export async function onRequestGet(context: { request: Request; env: SupabaseEnv }) {
    const { request, env } = context;
    try {
        const user = await getSessionAuthUser(request, env);
        if (!user) return json({ message: 'Please sign in to use training plans.' }, 401);

        const range = readRange(request);
        if (!range) return json({ message: 'Invalid date range.' }, 400);

        const admin = getAdminClient(env);
        const [history, profile, coach] = await Promise.all([
            trainingHistory(admin, user.id, range.from, range.to, range.today),
            getProfile(admin, user),
            coachStatusFor(admin, user.id)
        ]);

        return json({
            planId: findPlan(profile.training_plan) ? profile.training_plan : null,
            defaultPlanId: DEFAULT_PLAN_ID,
            ...history,
            coach
        });
    } catch (err) {
        console.error('Training GET error:', err);
        return json({ message: 'Could not load your training.' }, 500);
    }
}
