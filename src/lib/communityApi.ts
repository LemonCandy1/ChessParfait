export type ForumCategory = 'feedback' | 'feature' | 'bug' | 'general';

export const FORUM_CATEGORIES: { id: ForumCategory; label: string }[] = [
    { id: 'feedback', label: 'Feedback' },
    { id: 'feature', label: 'Feature Request' },
    { id: 'bug', label: 'Bug Report' },
    { id: 'general', label: 'General' },
];

export const categoryLabel = (id: string) => FORUM_CATEGORIES.find((c) => c.id === id)?.label ?? 'General';

export interface ForumPost {
    id: string;
    author_id: string;
    author_name: string;
    author_avatar: string | null;
    category: ForumCategory;
    title: string;
    body: string;
    upvote_count: number;
    reply_count: number;
    created_at: string;
    last_activity_at: string;
    hasUpvoted: boolean;
    isFollowing: boolean;
}

export interface ForumReply {
    id: string;
    post_id: string;
    author_id: string;
    author_name: string;
    author_avatar: string | null;
    body: string;
    created_at: string;
}

export interface LeaderboardEntry {
    id: string;
    username: string;
    avatarUrl: string | null;
    points: number;
    puzzlesSolved: number;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        ...init,
        headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
    return data as T;
}

export const getLeaderboard = () =>
    request<{ leaderboard: LeaderboardEntry[] }>('/api/community/leaderboard').then((d) => d.leaderboard);

export const getPosts = (params: { sort: 'new' | 'top'; category?: ForumCategory | null; following?: boolean }) => {
    const qs = new URLSearchParams({ sort: params.sort });
    if (params.category) qs.set('category', params.category);
    if (params.following) qs.set('following', '1');
    return request<{ posts: ForumPost[] }>(`/api/forum/posts?${qs}`).then((d) => d.posts);
};

export const getThread = (id: string) =>
    request<{ post: ForumPost; replies: ForumReply[] }>(`/api/forum/posts/${encodeURIComponent(id)}`);

export const createPost = (input: { title: string; body: string; category: ForumCategory }) =>
    request<{ post: ForumPost }>('/api/forum/posts', { method: 'POST', body: JSON.stringify(input) }).then((d) => d.post);

export const createReply = (postId: string, body: string) =>
    request<{ reply: ForumReply }>(`/api/forum/posts/${encodeURIComponent(postId)}/replies`, {
        method: 'POST',
        body: JSON.stringify({ body }),
    }).then((d) => d.reply);

export const toggleUpvote = (postId: string) =>
    request<{ hasUpvoted: boolean; upvoteCount: number }>(`/api/forum/posts/${encodeURIComponent(postId)}/upvote`, {
        method: 'POST',
    });

export const toggleFollow = (postId: string) =>
    request<{ isFollowing: boolean }>(`/api/forum/posts/${encodeURIComponent(postId)}/follow`, { method: 'POST' });

/**
 * Shares a thread link with the native share sheet, falling back to the clipboard.
 * Returns 'copied' when the link was copied so the caller can confirm it.
 */
export async function sharePost(post: Pick<ForumPost, 'id' | 'title'>): Promise<'shared' | 'copied' | 'cancelled'> {
    const url = `${window.location.origin}/forum/${post.id}`;
    if (navigator.share) {
        try {
            await navigator.share({ title: post.title, text: `${post.title} — Chess Parfait Community`, url });
            return 'shared';
        } catch (e) {
            if ((e as Error).name === 'AbortError') return 'cancelled';
        }
    }
    await navigator.clipboard.writeText(url);
    return 'copied';
}

export function timeAgo(iso: string): string {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (seconds < 60) return 'just now';
    const units: [number, string][] = [
        [60 * 60 * 24 * 365, 'y'],
        [60 * 60 * 24 * 30, 'mo'],
        [60 * 60 * 24 * 7, 'w'],
        [60 * 60 * 24, 'd'],
        [60 * 60, 'h'],
        [60, 'm'],
    ];
    for (const [size, label] of units) {
        if (seconds >= size) return `${Math.floor(seconds / size)}${label} ago`;
    }
    return 'just now';
}
