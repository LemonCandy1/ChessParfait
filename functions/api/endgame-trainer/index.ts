import { getAdminClient, getSessionAuthUser, json, type SupabaseEnv } from '../../_lib/community';
import { THEME_COUNTS, trainerStats } from '../../_lib/endgameTrainer';

/** GET /api/endgame-trainer — the signed-in player's endgame rating, best rating and positions played, plus
 * how many positions each theme has (for choosing types to practise). */
export async function onRequestGet(context: { request: Request; env: SupabaseEnv }) {
    const { request, env } = context;
    try {
        const user = await getSessionAuthUser(request, env);
        if (!user) return json({ message: 'Please sign in to use the endgame trainer.' }, 401);
        return json({ ...(await trainerStats(getAdminClient(env), user.id)), themeCounts: THEME_COUNTS });
    } catch (err) {
        console.error('Endgame trainer GET error:', err);
        return json({ message: 'Could not load your endgame rating.' }, 500);
    }
}
