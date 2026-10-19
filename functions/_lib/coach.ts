import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminClient, getSessionAuthUser, json, type SupabaseEnv } from './community';

// Coach/student links (see the 20261020 migration). No onRequest handlers, so Pages does not route it.

export type CoachStatus = 'pending' | 'accepted';

export async function isCoach(admin: SupabaseClient, userId: string): Promise<boolean> {
    const { data, error } = await admin.from('profiles').select('is_coach').eq('id', userId).maybeSingle();
    if (error) throw error;
    return !!(data as { is_coach: boolean } | null)?.is_coach;
}

/** The student's link to the coach: an open invite, accepted sharing, or none. */
export async function coachStatusFor(admin: SupabaseClient, studentId: string): Promise<CoachStatus | null> {
    const { data, error } = await admin.from('coach_students').select('status').eq('student_id', studentId).limit(1).maybeSingle();
    if (error) throw error;
    return (data as { status: CoachStatus } | null)?.status ?? null;
}

/** True only once the student has accepted, so the coach never sees pending or declined students. */
export async function sharesWithCoach(admin: SupabaseClient, coach: string, studentId: string): Promise<boolean> {
    const { data, error } = await admin
        .from('coach_students')
        .select('status')
        .eq('coach_id', coach)
        .eq('student_id', studentId)
        .eq('status', 'accepted')
        .maybeSingle();
    if (error) throw error;
    return !!data;
}

/** The signed-in coach's id, or a ready-made 401/403 response for anyone else. */
export async function requireCoach(request: Request, env: SupabaseEnv): Promise<{ admin: SupabaseClient; coach: string } | Response> {
    const user = await getSessionAuthUser(request, env);
    if (!user) return json({ message: 'Please sign in first.' }, 401);
    const admin = getAdminClient(env);
    if (!(await isCoach(admin, user.id))) return json({ message: 'Only the coach can see this.' }, 403);
    return { admin, coach: user.id };
}
