import { getAdminClient, getSessionAuthUser, json, type SupabaseEnv } from '../../_lib/community';
import {
    activateQueued,
    closeAttempt,
    createAttempt,
    currentEndgames,
    dueReview,
    latestAttempt,
    trainerStats,
    type NewAttempt
} from '../../_lib/endgameTrainer';
import type { TrainerEndgame } from '../../../src/lib/endgameTrainer';

const positionPayload = ({ attempt, endgame, stats, review }: NewAttempt, extra: { resumed: boolean; missed: { change: number } | null }) => ({
    attemptId: attempt.id,
    fen: attempt.fen,
    playerColor: attempt.player_color,
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
    fastestMate: attempt.optimal_moves,
    stats,
    review,
    ...extra
});

/**
 * POST /api/endgame-trainer/next { skip?: boolean }
 * The position to play now. An unfinished one is handed back from the start without penalty; only an
 * explicit skip counts it as a miss. Otherwise the position prepared in the background (see prepare.ts) is
 * switched on, which is quick, or a new one is made if none is ready.
 */
export async function onRequestPost(context: { request: Request; env: SupabaseEnv }) {
    const { request, env } = context;
    try {
        const user = await getSessionAuthUser(request, env);
        if (!user) return json({ message: 'Please sign in to use the endgame trainer.' }, 401);
        const admin = getAdminClient(env);
        const { skip } = await request.json().catch(() => ({ skip: false }));

        const last = await latestAttempt(admin, user.id);
        const lookup = async (endgameId: string): Promise<TrainerEndgame | undefined> => (await currentEndgames(admin)).find(e => e.id === endgameId);

        if (last?.status === 'open' && !skip) {
            const [stats, endgame] = await Promise.all([trainerStats(admin, user.id), lookup(last.endgame_id)]);
            if (endgame) return json(positionPayload({ attempt: last, endgame, stats, review: false }, { resumed: true, missed: null }));
        }
        const missed = last?.status === 'open' ? await closeAttempt(admin, last, false) : null;
        const extra = { resumed: false, missed: missed ? { change: missed.change } : null };

        const stats = await trainerStats(admin, user.id);
        const queued = await activateQueued(admin, user.id, stats.rating);
        if (queued) {
            const [endgame, reviewId] = await Promise.all([lookup(queued.endgame_id), dueReview(admin, user.id, last?.endgame_id ?? null)]);
            if (endgame) return json(positionPayload({ attempt: queued, endgame, stats, review: reviewId === endgame.id }, extra));
        }

        const created = await createAttempt(admin, user.id, last?.endgame_id ?? null, 'open');
        if (!created) return json({ message: 'A position is already open in another tab.' }, 409);
        return json(positionPayload(created, extra));
    } catch (err) {
        console.error('Endgame trainer next error:', err);
        return json({ message: 'Could not load the next position.' }, 500);
    }
}
