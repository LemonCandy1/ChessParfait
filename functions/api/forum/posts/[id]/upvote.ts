import { UNAUTHORIZED, getAdminClient, getSessionUser, isUuid, json } from '../../../../_lib/community';

// POST /api/forum/posts/:id/upvote  -> toggles the viewer's upvote
export async function onRequestPost(context: any) {
    const { request, env, params } = context;

    try {
        const viewer = await getSessionUser(request, env);
        if (!viewer) return UNAUTHORIZED();
        if (!isUuid(params.id)) return json({ message: 'Post not found.' }, 404);

        const admin = getAdminClient(env);

        const { data: existing } = await admin
            .from('forum_post_votes')
            .select('post_id')
            .eq('post_id', params.id)
            .eq('user_id', viewer.id)
            .maybeSingle();

        const { error } = existing
            ? await admin.from('forum_post_votes').delete().eq('post_id', params.id).eq('user_id', viewer.id)
            : await admin.from('forum_post_votes').insert({ post_id: params.id, user_id: viewer.id });
        if (error) {
            if (error.code === '23503') return json({ message: 'Post not found.' }, 404);
            throw error;
        }

        const { data: post } = await admin.from('forum_posts').select('upvote_count').eq('id', params.id).maybeSingle();
        return json({ hasUpvoted: !existing, upvoteCount: post?.upvote_count ?? 0 });
    } catch (err) {
        console.error('Forum upvote error:', err);
        return json({ message: 'Could not update your vote.' }, 500);
    }
}
