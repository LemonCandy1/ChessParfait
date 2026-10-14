import { getAdminClient, getSessionAuthUser, json, type SupabaseEnv } from '../../_lib/community';
import { findPlan } from '../../../src/data/trainingPlans';
import { getProfile, updateProfile } from '../../_lib/profiles';

/** POST /api/training/plan { planId } — choose (or switch) the user's daily plan template. */
export async function onRequestPost(context: { request: Request; env: SupabaseEnv }) {
    const { request, env } = context;
    try {
        const user = await getSessionAuthUser(request, env);
        if (!user) return json({ message: 'Please sign in to use training plans.' }, 401);

        const { planId } = await request.json();
        if (!findPlan(planId)) return json({ message: 'Unknown training plan.' }, 400);

        const admin = getAdminClient(env);
        await getProfile(admin, user);
        await updateProfile(admin, user.id, { training_plan: planId });

        return json({ success: true, planId });
    } catch (err) {
        console.error('Training plan error:', err);
        return json({ message: 'Could not save your plan.' }, 500);
    }
}
