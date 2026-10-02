import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

// Shared helpers for the community endpoints (leaderboard + forum).
// This module exports no onRequest handlers, so Pages does not route it.

export function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
    });
}

export function getAdminClient(env: any): SupabaseClient {
    if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Missing Supabase configurations in env.');
    }
    return createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

function readCookies(request: Request) {
    const cookies: Record<string, string> = {};
    (request.headers.get('Cookie') || '').split(';').forEach((cookie) => {
        const parts = cookie.split('=');
        if (parts.length >= 2) cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
    });
    return cookies;
}

export interface ForumUser {
    id: string;
    username: string;
    avatarUrl: string | null;
}

export function toForumUser(user: User): ForumUser {
    const meta = user.user_metadata || {};
    return {
        id: user.id,
        username: meta.username || user.email?.split('@')[0] || 'User',
        avatarUrl: avatarPath(user),
    };
}

/**
 * Small, cacheable avatar URL for a user, or null if they have no avatar.
 * Avatars may be large base64 data URLs, so lists never embed them directly.
 */
export function avatarPath(user: User): string | null {
    const meta = user.user_metadata || {};
    return meta.avatar_url || meta.picture ? `/api/community/avatar/${user.id}` : null;
}

/**
 * Resolves the signed-in user from the auth cookies, or null for guests.
 */
export async function getSessionUser(request: Request, env: any): Promise<ForumUser | null> {
    const { auth_token: token, refresh_token: refreshToken } = readCookies(request);
    if (!token) return null;

    if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
        throw new Error('Missing Supabase configurations in env.');
    }
    const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: refreshToken || token,
    });
    if (error || !data?.user) return null;
    return toForumUser(data.user);
}

export const UNAUTHORIZED = () =>
    json({ message: 'Please sign in or create an account to take part in the forum.' }, 401);

export const FORUM_CATEGORIES = ['feedback', 'feature', 'bug', 'general'] as const;

export const isUuid = (value: unknown): value is string =>
    typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/**
 * Adds hasUpvoted / isFollowing flags for the viewer to a list of posts.
 */
export async function withViewerFlags(admin: SupabaseClient, posts: any[], viewer: ForumUser | null) {
    if (!viewer || posts.length === 0) {
        return posts.map((p) => ({ ...p, hasUpvoted: false, isFollowing: false }));
    }
    const ids = posts.map((p) => p.id);
    const [votes, follows] = await Promise.all([
        admin.from('forum_post_votes').select('post_id').eq('user_id', viewer.id).in('post_id', ids),
        admin.from('forum_follows').select('post_id').eq('user_id', viewer.id).in('post_id', ids),
    ]);
    const voted = new Set((votes.data || []).map((v: any) => v.post_id));
    const followed = new Set((follows.data || []).map((f: any) => f.post_id));
    return posts.map((p) => ({ ...p, hasUpvoted: voted.has(p.id), isFollowing: followed.has(p.id) }));
}
