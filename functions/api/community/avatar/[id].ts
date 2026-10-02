import { getAdminClient, isUuid, json } from '../../../_lib/community';

const RASTER_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

// GET /api/community/avatar/:userId
// Serves a user's avatar so lists (leaderboard, forum) reference a small cached URL
// instead of embedding base64 images stored in user metadata.
export async function onRequestGet(context: any) {
    const { env, params } = context;

    try {
        if (!isUuid(params.id)) return json({ message: 'Not found.' }, 404);

        const admin = getAdminClient(env);
        const { data, error } = await admin.auth.admin.getUserById(params.id);
        if (error || !data?.user) return json({ message: 'Not found.' }, 404);

        const meta = data.user.user_metadata || {};
        const avatar: string | undefined = meta.avatar_url || meta.picture;
        if (!avatar) return json({ message: 'Not found.' }, 404, { 'Cache-Control': 'public, max-age=300' });

        if (/^https:\/\//i.test(avatar)) {
            return new Response(null, {
                status: 302,
                headers: { Location: avatar, 'Cache-Control': 'public, max-age=3600' },
            });
        }

        const match = /^data:([^;,]+);base64,(.+)$/s.exec(avatar);
        if (!match || !RASTER_TYPES.has(match[1].toLowerCase())) return json({ message: 'Not found.' }, 404);

        const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
        return new Response(bytes, {
            headers: {
                'Content-Type': match[1].toLowerCase(),
                'Cache-Control': 'public, max-age=3600',
                'X-Content-Type-Options': 'nosniff',
            },
        });
    } catch (err) {
        console.error('Avatar API error:', err);
        return json({ message: 'Could not load avatar.' }, 500);
    }
}
