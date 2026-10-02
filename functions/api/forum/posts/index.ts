import {
    FORUM_CATEGORIES,
    UNAUTHORIZED,
    getAdminClient,
    getSessionUser,
    json,
    withViewerFlags,
} from '../../../_lib/community';

const PAGE_SIZE = 50;
const POST_COOLDOWN_MS = 30_000;

// GET /api/forum/posts?sort=top|new&category=feedback&following=1
export async function onRequestGet(context: any) {
    const { request, env } = context;

    try {
        const url = new URL(request.url);
        const sort = url.searchParams.get('sort') === 'top' ? 'top' : 'new';
        const category = url.searchParams.get('category');
        const followingOnly = url.searchParams.get('following') === '1';

        const admin = getAdminClient(env);
        const viewer = await getSessionUser(request, env);

        let query = admin.from('forum_posts').select('*').limit(PAGE_SIZE);

        if (category && (FORUM_CATEGORIES as readonly string[]).includes(category)) {
            query = query.eq('category', category);
        }

        if (followingOnly) {
            if (!viewer) return UNAUTHORIZED();
            const { data: follows, error } = await admin
                .from('forum_follows')
                .select('post_id')
                .eq('user_id', viewer.id);
            if (error) throw error;
            const ids = (follows || []).map((f: any) => f.post_id);
            if (ids.length === 0) return json({ posts: [] });
            query = query.in('id', ids);
        }

        query = sort === 'top'
            ? query.order('upvote_count', { ascending: false }).order('created_at', { ascending: false })
            : query.order('last_activity_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;

        return json({ posts: await withViewerFlags(admin, data || [], viewer) });
    } catch (err) {
        console.error('Forum list error:', err);
        return json({ message: 'Could not load forum posts.' }, 500);
    }
}

// POST /api/forum/posts  { title, body, category }
export async function onRequestPost(context: any) {
    const { request, env } = context;

    try {
        const viewer = await getSessionUser(request, env);
        if (!viewer) return UNAUTHORIZED();

        const payload = await request.json().catch(() => ({}));
        const title = typeof payload.title === 'string' ? payload.title.trim() : '';
        const body = typeof payload.body === 'string' ? payload.body.trim() : '';
        const category = (FORUM_CATEGORIES as readonly string[]).includes(payload.category) ? payload.category : 'general';

        if (title.length < 3 || title.length > 120) {
            return json({ message: 'Title must be between 3 and 120 characters.' }, 400);
        }
        if (body.length < 1 || body.length > 5000) {
            return json({ message: 'Post must be between 1 and 5000 characters.' }, 400);
        }

        const admin = getAdminClient(env);

        const { data: recent } = await admin
            .from('forum_posts')
            .select('created_at')
            .eq('author_id', viewer.id)
            .order('created_at', { ascending: false })
            .limit(1);
        if (recent?.[0] && Date.now() - new Date(recent[0].created_at).getTime() < POST_COOLDOWN_MS) {
            return json({ message: 'You are posting too quickly. Please wait a moment.' }, 429);
        }

        const { data: post, error } = await admin
            .from('forum_posts')
            .insert({
                author_id: viewer.id,
                author_name: viewer.username,
                author_avatar: viewer.avatarUrl,
                category,
                title,
                body,
            })
            .select()
            .single();
        if (error) throw error;

        // Authors follow their own threads automatically.
        await admin.from('forum_follows').insert({ post_id: post.id, user_id: viewer.id });

        return json({ post: { ...post, hasUpvoted: false, isFollowing: true } }, 201);
    } catch (err) {
        console.error('Forum create error:', err);
        return json({ message: 'Could not create your post.' }, 500);
    }
}
