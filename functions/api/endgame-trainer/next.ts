import { getAdminClient, getSessionAuthUser, json, type SupabaseEnv } from '../../_lib/community';
import { UNIQUE_VIOLATION } from '../../_lib/profiles';
import { ATTEMPT_COLUMNS, closeAttempt, currentEndgames, dueReview, fastestMate, makeVariation, trainerStats, type AttemptRow } from '../../_lib/endgameTrainer';
import { pickEndgame } from '../../../src/lib/endgameTrainer';

/**
 * POST /api/endgame-trainer/next
 * Serves the next position near the player's rating. A position still open (skipped, or left when the
 * tab closed) is first counted as a miss, so walking away from a hard position never saves rating.
 */
export async function onRequestPost(context: { request: Request; env: SupabaseEnv }) {
    const { request, env } = context;
    try {
        const user = await getSessionAuthUser(request, env);
        if (!user) return json({ message: 'Please sign in to use the endgame trainer.' }, 401);
        const admin = getAdminClient(env);

        const { data: recent, error: recentError } = await admin
            .from('endgame_attempts')
            .select(ATTEMPT_COLUMNS)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);
        if (recentError) throw recentError;
        const last = (recent?.[0] ?? null) as AttemptRow | null;
        const missed = last?.status === 'open' ? await closeAttempt(admin, last, false) : null;

        const stats = await trainerStats(admin, user.id);
        // A failed endgame that is due for review comes first; otherwise one near the player's rating.
        const endgames = await currentEndgames(admin);
        const reviewId = await dueReview(admin, user.id, last?.endgame_id ?? null);
        const endgame = endgames.find(e => e.id === reviewId) ?? pickEndgame(endgames, stats.rating, last?.endgame_id ?? null);
        const variation = await makeVariation(endgame);
        const optimal = endgame.target === 'win' ? await fastestMate(variation.fen, variation.playerColor) : null;

        const { data: attempt, error } = await admin
            .from('endgame_attempts')
            .insert({ user_id: user.id, endgame_id: endgame.id, fen: variation.fen, player_color: variation.playerColor, rating_before: stats.rating, optimal_moves: optimal })
            .select('id')
            .single();
        if (error) {
            // Another tab opened a position at the same moment; only one may be open.
            if ((error as { code?: string }).code === UNIQUE_VIOLATION) return json({ message: 'A position is already open in another tab.' }, 409);
            throw error;
        }

        return json({
            attemptId: (attempt as { id: string }).id,
            fen: variation.fen,
            playerColor: variation.playerColor,
            endgame: {
                id: endgame.id,
                title: endgame.title,
                category: endgame.category,
                target: endgame.target,
                mateRequired: endgame.mateRequired,
                rating: endgame.rating,
                keyTip: endgame.keyTip ?? '',
                description: endgame.description ?? '',
                theoryNotes: endgame.theoryNotes ?? ''
            },
            stats,
            review: reviewId === endgame.id,
            fastestMate: optimal,
            missed: missed ? { change: missed.change } : null
        });
    } catch (err) {
        console.error('Endgame trainer next error:', err);
        return json({ message: 'Could not load the next position.' }, 500);
    }
}
