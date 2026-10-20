import { getAdminClient, getSessionAuthUser, json, type SupabaseEnv } from '../../_lib/community';
import { createAttempt, latestAttempt } from '../../_lib/endgameTrainer';

/**
 * POST /api/endgame-trainer/prepare
 * Called while the player is on a position: makes the next one in the background and saves it as 'queued',
 * so "Next position" only has to switch it on. A queued position is never scored. Does nothing if one is
 * already waiting.
 */
export async function onRequestPost(context: { request: Request; env: SupabaseEnv }) {
    const { request, env } = context;
    try {
        const user = await getSessionAuthUser(request, env);
        if (!user) return json({ message: 'Please sign in to use the endgame trainer.' }, 401);
        const admin = getAdminClient(env);

        const { count, error } = await admin
            .from('endgame_attempts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'queued');
        if (error) throw error;
        if (count) return json({ ready: true });

        // Never prepare the endgame being played now.
        const current = await latestAttempt(admin, user.id);
        await createAttempt(admin, user.id, current?.endgame_id ?? null, 'queued');
        return json({ ready: true });
    } catch (err) {
        console.error('Endgame trainer prepare error:', err);
        return json({ message: 'Could not prepare the next position.' }, 500);
    }
}
