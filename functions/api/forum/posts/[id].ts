import { getAdminClient, getSessionUser, isUuid, json, withViewerFlags } from '../../../_lib/community';

// GET /api/forum/posts/:id  -> post with replies
export async function onRequestGet(context: any) {
    const { request, env, params } = context;

    try {
        if (!isUuid(params.id)) return json({ message: 'Post not found.' }, 404);

        const admin = getAdminClient(env);
        const viewer = await getSessionUser(request, env);

        const [{ data: post, error: postError }, { data: replies, error: repliesError }] = await Promise.all([
            admin.from('forum_posts').select('*').eq('id', params.id).maybeSingle(),
            admin.from('forum_replies').select('*').eq('post_id', params.id).order('created_at', { ascending: true }),
        ]);
        if (postError) throw postError;
        if (repliesError) throw repliesError;
        if (!post) return json({ message: 'Post not found.' }, 404);

        const [withFlags] = await withViewerFlags(admin, [post], viewer);
        return json({ post: withFlags, replies: replies || [] });
    } catch (err) {
        console.error('Forum thread error:', err);
        return json({ message: 'Could not load this thread.' }, 500);
    }
}
