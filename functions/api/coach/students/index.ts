import { json, type SupabaseEnv } from '../../../_lib/community';
import { requireCoach } from '../../../_lib/coach';
import { findProfileByUsername } from '../../../_lib/profiles';
import { trainingHistory } from '../../../_lib/training';
import { addDays, isDayKey } from '../../../../src/lib/training';


/**
 * GET /api/coach/students?today=YYYY-MM-DD
 * The coach's students: pending invites, and for students who accepted, their plan, streak and last 14 days.
 */
export async function onRequestGet(context: { request: Request; env: SupabaseEnv }) {
    const { request, env } = context;
    try {
        const auth = await requireCoach(request, env);
        if (auth instanceof Response) return auth;
        const { admin, coach } = auth;

        const today = new URL(request.url).searchParams.get('today');
        if (!isDayKey(today)) return json({ message: 'Invalid date.' }, 400);

        const { data: links, error } = await admin
            .from('coach_students')
            .select('student_id, status')
            .eq('coach_id', coach)
            .order('invited_at');
        if (error) throw error;
        const rows = (links ?? []) as { student_id: string; status: 'pending' | 'accepted' }[];

        const { data: profiles, error: profileError } = await admin
            .from('profiles')
            .select('id, username, training_plan')
            .in('id', rows.map(r => r.student_id));
        if (profileError) throw profileError;
        const profileOf = new Map(((profiles ?? []) as { id: string; username: string | null; training_plan: string | null }[]).map(p => [p.id, p]));

        // shortcut: one history query per student, fine for a class of tens; batch it if the list grows to hundreds.
        const students = await Promise.all(rows.map(async row => ({
            id: row.student_id,
            username: profileOf.get(row.student_id)?.username ?? 'Unknown player',
            status: row.status,
            planId: row.status === 'accepted' ? profileOf.get(row.student_id)?.training_plan ?? null : null,
            ...(row.status === 'accepted'
                ? await trainingHistory(admin, row.student_id, addDays(today, -13), today, today)
                : { logs: [], streak: 0, restDays: [] })
        })));

        return json({ students });
    } catch (err) {
        console.error('Coach students error:', err);
        return json({ message: 'Could not load your students.' }, 500);
    }
}

/** POST /api/coach/students { username } — invite a player. They must accept before anything is shared. */
export async function onRequestPost(context: { request: Request; env: SupabaseEnv }) {
    const { request, env } = context;
    try {
        const auth = await requireCoach(request, env);
        if (auth instanceof Response) return auth;
        const { admin, coach } = auth;

        const { username } = await request.json();
        if (typeof username !== 'string' || !username.trim()) return json({ message: 'Enter a username.' }, 400);

        const student = await findProfileByUsername(admin, username);
        if (!student) return json({ message: `No player is called "${username.trim()}".` }, 404);
        if (student.id === coach) return json({ message: 'You can\'t invite yourself.' }, 400);

        const { error } = await admin
            .from('coach_students')
            .upsert({ coach_id: coach, student_id: student.id }, { onConflict: 'coach_id,student_id', ignoreDuplicates: true });
        if (error) throw error;

        return json({ success: true });
    } catch (err) {
        console.error('Coach invite error:', err);
        return json({ message: 'Could not send the invite.' }, 500);
    }
}

/** DELETE /api/coach/students { studentId } — cancel an invite or remove a student. */
export async function onRequestDelete(context: { request: Request; env: SupabaseEnv }) {
    const { request, env } = context;
    try {
        const auth = await requireCoach(request, env);
        if (auth instanceof Response) return auth;
        const { admin, coach } = auth;

        const { studentId } = await request.json();
        const { error } = await admin.from('coach_students').delete().eq('coach_id', coach).eq('student_id', studentId);
        if (error) throw error;
        return json({ success: true });
    } catch (err) {
        console.error('Coach remove error:', err);
        return json({ message: 'Could not remove the student.' }, 500);
    }
}
