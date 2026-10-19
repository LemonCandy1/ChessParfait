import { getAdminClient, getSessionAuthUser, json, type SupabaseEnv } from '../../_lib/community';

/**
 * POST /api/training/coach { action: 'accept' | 'stop' }
 * The signed-in student accepts the coach's invite, or declines it / stops sharing. Stopping
 * deletes the link, so the coach loses access and has to invite them again.
 */
export async function onRequestPost(context: { request: Request; env: SupabaseEnv }) {
    const { request, env } = context;
    try {
        const user = await getSessionAuthUser(request, env);
        if (!user) return json({ message: 'Please sign in first.' }, 401);

        const { action } = await request.json();
        const admin = getAdminClient(env);
        const links = admin.from('coach_students');

        if (action === 'accept') {
            const { data, error } = await links
                .update({ status: 'accepted', accepted_at: new Date().toISOString() })
                .eq('student_id', user.id)
                .eq('status', 'pending')
                .select('status');
            if (error) throw error;
            if (!data?.length) return json({ message: 'There is no invite to accept.' }, 404);
            return json({ coach: 'accepted' });
        }

        if (action === 'stop') {
            const { error } = await links.delete().eq('student_id', user.id);
            if (error) throw error;
            return json({ coach: null });
        }

        return json({ message: 'Unknown action.' }, 400);
    } catch (err) {
        console.error('Training coach error:', err);
        return json({ message: 'Could not update sharing.' }, 500);
    }
}
