import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowBigUp, Bell, BellRing, Share2, Check } from '../../lib/lucideOriginal';
import { useAuth } from '../../context/AuthContext';
import { sharePost, toggleFollow, toggleUpvote, type ForumPost } from '../../lib/communityApi';

export function Avatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const showImage = !!url && failedUrl !== url;

    return (
        <div
            className="rounded-full bg-berry text-cream font-serif font-black flex items-center justify-center uppercase overflow-hidden shrink-0"
            style={{ width: size, height: size, fontSize: size * 0.4 }}
        >
            {showImage ? (
                <img src={url} alt="" loading="lazy" onError={() => setFailedUrl(url)} className="h-full w-full object-cover" />
            ) : (
                name.charAt(0)
            )}
        </div>
    );
}

export function SignInPrompt({ action = 'join the conversation' }: { action?: string }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/60 border border-plum/10">
            <p className="text-sm text-plum/75">
                <span className="font-semibold text-plum">Want to {action}?</span> Only registered members can post, reply, upvote, share and follow.
            </p>
            <div className="flex gap-2 shrink-0">
                <Link to="/login" className="soft-button-outline px-4 py-2 text-xs">Log in</Link>
                <Link to="/register" className="soft-button-berry px-4 py-2 text-xs">Sign up</Link>
            </div>
        </div>
    );
}

type PostUpdate = Partial<Pick<ForumPost, 'hasUpvoted' | 'upvote_count' | 'isFollowing'>>;

/**
 * Upvote control. Guests see the count but cannot vote.
 */
export function UpvoteButton({
    post,
    onChange,
    onError,
    vertical = false,
}: {
    post: ForumPost;
    onChange: (update: PostUpdate) => void;
    onError: (message: string) => void;
    vertical?: boolean;
}) {
    const { user } = useAuth();
    const [busy, setBusy] = useState(false);

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user || busy) return;

        // Optimistic update, rolled back on failure.
        const previous = { hasUpvoted: post.hasUpvoted, upvote_count: post.upvote_count };
        onChange({ hasUpvoted: !post.hasUpvoted, upvote_count: post.upvote_count + (post.hasUpvoted ? -1 : 1) });
        setBusy(true);
        try {
            const res = await toggleUpvote(post.id);
            onChange({ hasUpvoted: res.hasUpvoted, upvote_count: res.upvoteCount });
        } catch (err) {
            onChange(previous);
            onError((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={!user}
            aria-pressed={post.hasUpvoted}
            aria-label={post.hasUpvoted ? 'Remove upvote' : 'Upvote'}
            title={user ? undefined : 'Sign in to upvote'}
            className={`flex items-center justify-center gap-1 rounded-xl border font-bold text-sm tabular-nums transition-colors duration-150 ${
                vertical ? 'flex-col w-12 py-2' : 'px-3 py-1.5'
            } ${
                post.hasUpvoted
                    ? 'bg-berry/10 border-berry/30 text-berry'
                    : 'bg-white/60 border-plum/10 text-plum/70 enabled:hover:border-berry/40 enabled:hover:text-berry'
            } disabled:cursor-not-allowed`}
        >
            <ArrowBigUp size={18} strokeWidth={2} fill={post.hasUpvoted ? 'currentColor' : 'none'} />
            <span>{post.upvote_count}</span>
        </button>
    );
}

/**
 * Follow + share buttons. Only rendered for signed-in users.
 */
export function PostActions({
    post,
    onChange,
    onError,
}: {
    post: ForumPost;
    onChange: (update: PostUpdate) => void;
    onError: (message: string) => void;
}) {
    const { user } = useAuth();
    const [followBusy, setFollowBusy] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!user) return null;

    const stop = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleFollow = async (e: React.MouseEvent) => {
        stop(e);
        if (followBusy) return;
        setFollowBusy(true);
        try {
            const res = await toggleFollow(post.id);
            onChange({ isFollowing: res.isFollowing });
        } catch (err) {
            onError((err as Error).message);
        } finally {
            setFollowBusy(false);
        }
    };

    const handleShare = async (e: React.MouseEvent) => {
        stop(e);
        try {
            if ((await sharePost(post)) === 'copied') {
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
            }
        } catch {
            onError('Could not share this post.');
        }
    };

    const base = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors duration-150';

    return (
        <div className="flex items-center gap-1.5">
            <button
                type="button"
                onClick={handleFollow}
                disabled={followBusy}
                aria-pressed={post.isFollowing}
                className={`${base} ${post.isFollowing ? 'text-berry bg-berry/10' : 'text-plum/60 hover:text-berry hover:bg-berry/5'}`}
            >
                {post.isFollowing ? <BellRing size={14} /> : <Bell size={14} />}
                {post.isFollowing ? 'Following' : 'Follow'}
            </button>
            <button type="button" onClick={handleShare} className={`${base} text-plum/60 hover:text-berry hover:bg-berry/5`}>
                {copied ? <Check size={14} /> : <Share2 size={14} />}
                {copied ? 'Link copied' : 'Share'}
            </button>
        </div>
    );
}

export function CategoryBadge({ label }: { label: string }) {
    return (
        <span className="text-[10px] font-bold uppercase tracking-wider text-plum/60 bg-plum/5 border border-plum/10 px-2 py-0.5 rounded-full">
            {label}
        </span>
    );
}

export function Toast({ message }: { message: string }) {
    return (
        <div
            role="status"
            aria-live="polite"
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] max-w-[calc(100vw-2rem)] px-4 py-2.5 rounded-xl bg-plum text-cream text-sm font-medium shadow-xl transition-opacity duration-200 ${
                message ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
        >
            {message}
        </div>
    );
}
