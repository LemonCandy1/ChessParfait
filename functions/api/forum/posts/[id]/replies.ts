import { UNAUTHORIZED, getAdminClient, getSessionUser, isUuid, json } from '../../../../_lib/community';

const REPLY_COOLDOWN_MS = 10_000;

// POST /api/forum/posts/:id/replies  { body }
export async function onRequestPost(context: any) {
    const { request, env, params } = context;

    try {
        const viewer = await getSessionUser(request, env);
        if (!viewer) return UNAUTHORIZED();
        if (!isUuid(params.id)) return json({ message: 'Post not found.' }, 404);

        const payload = await request.json().catch(() => ({}));
        const body = typeof payload.body === 'string' ? payload.body.trim() : '';
        if (body.length < 1 || body.length > 2000) {
            return json({ message: 'Reply must be between 1 and 2000 characters.' }, 400);
        }

        const admin = getAdminClient(env);

        const { data: post } = await admin.from('forum_posts').select('id').eq('id', params.id).maybeSingle();
        if (!post) return json({ message: 'Post not found.' }, 404);

        const { data: recent } = await admin
            .from('forum_replies')
            .select('created_at')
            .eq('author_id', viewer.id)
            .order('created_at', { ascending: false })
            .limit(1);
        if (recent?.[0] && Date.now() - new Date(recent[0].created_at).getTime() < REPLY_COOLDOWN_MS) {
            return json({ message: 'You are replying too quickly. Please wait a moment.' }, 429);
        }

        const { data: reply, error } = await admin
            .from('forum_replies')
            .insert({
                post_id: params.id,
                author_id: viewer.id,
                author_name: viewer.username,
                author_avatar: viewer.avatarUrl,
                body,
            })
            .select()
            .single();
        if (error) throw error;

        return json({ reply }, 201);
    } catch (err) {
        console.error('Forum reply error:', err);
        return json({ message: 'Could not post your reply.' }, 500);
    }
}
