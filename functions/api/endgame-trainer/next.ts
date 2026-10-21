import { getAdminClient, getSessionAuthUser, json, type SupabaseEnv } from '../../_lib/community';
import {
    THEME_COUNTS,
    TRAINER_ENDGAMES,
    activateQueued,
    closeAttempt,
    closePracticeAttempt,
    createAttempt,
    currentEndgames,
    dueReview,
    latestAttempt,
    trainerStats,
    type NewAttempt
} from '../../_lib/endgameTrainer';
import type { TrainerEndgame } from '../../../src/lib/endgameTrainer';

const positionPayload = ({ attempt, endgame, stats, review }: NewAttempt, extra: { resumed: boolean; missed: { change: number } | null; practice: boolean }) => ({
    attemptId: attempt.id,
    fen: attempt.fen,
    playerColor: attempt.player_color,
    endgame: {
        id: endgame.id,
        title: endgame.title,
        category: endgame.category,
        theme: endgame.theme ?? null,
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

/** The chosen practice themes, if the request is a valid practice request; only known themes with positions count. */
function practiceThemes(value: unknown): Set<string> | null {
    if (!Array.isArray(value)) return null;
    const themes = new Set(value.filter((t): t is string => typeof t === 'string' && THEME_COUNTS[t] > 0).slice(0, 100));
    return themes.size ? themes : null;
}

/**
 * POST /api/endgame-trainer/next { skip?: boolean, practice?: string[] }
 * The position to play now. An unfinished one is handed back from the start without penalty; only an
 * explicit skip counts it as a miss. Otherwise the position prepared in the background (see prepare.ts) is
 * switched on, which is quick, or a new one is made if none is ready.
 * With `practice` (theme ids), it is an unrated practice position from those themes instead; the rated
 * position, if any, keeps waiting.
 */
export async function onRequestPost(context: { request: Request; env: SupabaseEnv }) {
    const { request, env } = context;
    try {
        const user = await getSessionAuthUser(request, env);
        if (!user) return json({ message: 'Please sign in to use the endgame trainer.' }, 401);
        const admin = getAdminClient(env);
        const body = await request.json().catch(() => ({}));
        const skip = body?.skip === true;
        const themes = practiceThemes(body?.practice);
        const practice = themes !== null;
        if (body?.practice !== undefined && !practice) return json({ message: 'Choose at least one type of endgame to practise.' }, 400);

        const last = await latestAttempt(admin, user.id, practice);
        const lookup = async (endgameId: string): Promise<TrainerEndgame | undefined> => (await currentEndgames(admin)).find(e => e.id === endgameId);
        const lastTheme = last ? TRAINER_ENDGAMES.find(e => e.id === last.endgame_id)?.theme : undefined;
        const fitsChoice = !themes || (!!lastTheme && themes.has(lastTheme));

        if (last?.status === 'open' && !skip && fitsChoice) {
            const [stats, endgame] = await Promise.all([trainerStats(admin, user.id), lookup(last.endgame_id)]);
            if (endgame) return json(positionPayload({ attempt: last, endgame, stats, review: false }, { resumed: true, missed: null, practice }));
        }

        let missed: { change: number } | null = null;
        if (last?.status === 'open') {
            if (practice && !skip) {
                // A practice position from types no longer chosen: never finished, so it simply goes.
                const { error } = await admin.from('endgame_attempts').delete().eq('id', last.id).eq('status', 'open');
                if (error) throw error;
            } else {
                const closed = practice ? await closePracticeAttempt(admin, last, false, false) : await closeAttempt(admin, last, false);
                missed = closed ? { change: closed.change } : null;
            }
        }
        const extra = { resumed: false, missed, practice };

        if (!practice) {
            const stats = await trainerStats(admin, user.id);
            const queued = await activateQueued(admin, user.id, stats.rating);
            if (queued) {
                const [endgame, reviewId] = await Promise.all([lookup(queued.endgame_id), dueReview(admin, user.id, last?.endgame_id ?? null)]);
                if (endgame) return json(positionPayload({ attempt: queued, endgame, stats, review: reviewId === endgame.id }, extra));
            }
        }

        const created = await createAttempt(admin, user.id, last?.endgame_id ?? null, 'open', themes);
        if (!created) return json({ message: 'A position is already open in another tab.' }, 409);
        return json(positionPayload(created, extra));
    } catch (err) {
        console.error('Endgame trainer next error:', err);
        return json({ message: 'Could not load the next position.' }, 500);
    }
}
