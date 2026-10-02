import { UNAUTHORIZED, getAdminClient, getSessionUser, isUuid, json } from '../../../../_lib/community';

// POST /api/forum/posts/:id/follow  -> toggles whether the viewer follows the thread
export async function onRequestPost(context: any) {
    const { request, env, params } = context;

    try {
        const viewer = await getSessionUser(request, env);
        if (!viewer) return UNAUTHORIZED();
        if (!isUuid(params.id)) return json({ message: 'Post not found.' }, 404);

        const admin = getAdminClient(env);

        const { data: existing } = await admin
            .from('forum_follows')
            .select('post_id')
            .eq('post_id', params.id)
            .eq('user_id', viewer.id)
            .maybeSingle();

        const { error } = existing
            ? await admin.from('forum_follows').delete().eq('post_id', params.id).eq('user_id', viewer.id)
            : await admin.from('forum_follows').insert({ post_id: params.id, user_id: viewer.id });
        if (error) {
            if (error.code === '23503') return json({ message: 'Post not found.' }, 404);
            throw error;
        }

        return json({ isFollowing: !existing });
    } catch (err) {
        console.error('Forum follow error:', err);
        return json({ message: 'Could not update follow status.' }, 500);
    }
}
