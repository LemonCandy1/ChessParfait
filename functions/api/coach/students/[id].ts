import { isUuid, json, type SupabaseEnv } from '../../../_lib/community';
import { requireCoach, sharesWithCoach } from '../../../_lib/coach';
import { readRange, trainingHistory } from '../../../_lib/training';

/**
 * GET /api/coach/students/:id?from=&to=&today=
 * One student's calendar for the coach. Only students who accepted the invite are visible.
 */
export async function onRequestGet(context: { request: Request; env: SupabaseEnv; params: { id: string } }) {
    const { request, env, params } = context;
    try {
        const auth = await requireCoach(request, env);
        if (auth instanceof Response) return auth;
        const { admin, coach } = auth;

        if (!isUuid(params.id) || !(await sharesWithCoach(admin, coach, params.id))) {
            return json({ message: 'This player isn\'t sharing their training with you.' }, 404);
        }
        const range = readRange(request);
        if (!range) return json({ message: 'Invalid date range.' }, 400);

        return json(await trainingHistory(admin, params.id, range.from, range.to, range.today));
    } catch (err) {
        console.error('Coach student error:', err);
        return json({ message: 'Could not load this student\'s training.' }, 500);
    }
}
