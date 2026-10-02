import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Plus, X } from '../lib/lucideOriginal';
import Navbar from '../components/Navbar/Navbar';
import { Avatar, CategoryBadge, PostActions, SignInPrompt, Toast, UpvoteButton } from '../components/community/CommunityUI';
import { useToast } from '../components/community/useToast';
import { useAuth } from '../context/AuthContext';
import {
    FORUM_CATEGORIES,
    categoryLabel,
    createPost,
    getPosts,
    timeAgo,
    type ForumCategory,
    type ForumPost,
} from '../lib/communityApi';

type Tab = 'new' | 'top' | 'following';

const fieldClass =
    'w-full px-4 py-3 rounded-xl border border-plum/15 bg-white/70 text-plum placeholder:text-plum/40 hover:border-plum/30 focus:bg-white focus:outline-none focus:border-berry focus:ring-4 focus:ring-berry/10 transition-[border-color,box-shadow,background-color] duration-150';

export default function Forum() {
    const { user } = useAuth();
    const [selectedTab, setTab] = useState<Tab>('new');
    const [category, setCategory] = useState<ForumCategory | null>(null);
    const [result, setResult] = useState<{ key: string; posts: ForumPost[] | null; error: string }>({ key: '', posts: null, error: '' });
    const [toast, showToast] = useToast();
    const [composerOpen, setComposerOpen] = useState(false);

    // Guests can't see the Following tab.
    const tab: Tab = !user && selectedTab === 'following' ? 'new' : selectedTab;
    const requestKey = `${tab}|${category ?? ''}|${user?.id ?? ''}`;
    const isCurrent = result.key === requestKey;
    const posts = isCurrent ? result.posts : null;
    const loadError = isCurrent ? result.error : '';

    useEffect(() => {
        let cancelled = false;
        getPosts({ sort: tab === 'top' ? 'top' : 'new', category, following: tab === 'following' })
            .then((data) => !cancelled && setResult({ key: requestKey, posts: data, error: '' }))
            .catch((err) => !cancelled && setResult({ key: requestKey, posts: null, error: err.message }));
        return () => {
            cancelled = true;
        };
    }, [tab, category, requestKey]);

    const updatePost = (id: string, update: Partial<ForumPost>) =>
        setResult((prev) => ({ ...prev, posts: prev.posts?.map((p) => (p.id === id ? { ...p, ...update } : p)) ?? null }));

    const tabs: { id: Tab; label: string }[] = [
        { id: 'new', label: 'Latest' },
        { id: 'top', label: 'Top' },
        ...(user ? [{ id: 'following' as Tab, label: 'Following' }] : []),
    ];

    return (
        <div className="min-h-screen flex flex-col font-sans text-plum bg-cream">
            <div className="relative z-50">
                <Navbar />
            </div>

            <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-12 md:py-16 animate-fade-up">
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-berry mb-2">Community</p>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">Forum</h1>
                        <p className="text-plum/70">Share feedback, request features and talk chess with other members.</p>
                    </div>
                    {user && !composerOpen && (
                        <button
                            type="button"
                            onClick={() => setComposerOpen(true)}
                            className="soft-button-berry inline-flex items-center justify-center gap-2 px-5 py-3 text-sm shrink-0"
                        >
                            <Plus size={16} /> New post
                        </button>
                    )}
                </header>

                {!user && (
                    <div className="mb-6">
                        <SignInPrompt />
                    </div>
                )}

                {user && composerOpen && (
                    <Composer onCancel={() => setComposerOpen(false)} />
                )}

                {/* Sort tabs + category filter */}
                <div className="flex flex-col gap-3 mb-5">
                    <div role="tablist" aria-label="Sort posts" className="inline-flex self-start p-1 rounded-xl bg-plum/5 border border-plum/10">
                        {tabs.map((t) => (
                            <button
                                key={t.id}
                                role="tab"
                                aria-selected={tab === t.id}
                                onClick={() => setTab(t.id)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors duration-150 ${
                                    tab === t.id ? 'bg-white text-plum shadow-sm' : 'text-plum/60 hover:text-plum'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {[{ id: null, label: 'All' } as const, ...FORUM_CATEGORIES].map((c) => (
                            <button
                                key={c.id ?? 'all'}
                                onClick={() => setCategory(c.id)}
                                aria-pressed={category === c.id}
                                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors duration-150 ${
                                    category === c.id
                                        ? 'bg-plum text-cream border-plum'
                                        : 'bg-white/60 text-plum/70 border-plum/10 hover:border-plum/30'
                                }`}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loadError && (
                    <p className="p-6 text-center text-sm text-rose-700 glass rounded-2xl">{loadError}</p>
                )}

                {!loadError && !posts && (
                    <div className="space-y-3" aria-busy="true">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-28 rounded-2xl bg-white/50 border border-plum/10 animate-pulse" />
                        ))}
                    </div>
                )}

                {posts && posts.length === 0 && (
                    <div className="p-10 text-center glass rounded-2xl">
                        <MessageCircle size={28} className="mx-auto mb-3 text-plum/30" />
                        <p className="font-semibold mb-1">
                            {tab === 'following' ? "You're not following any threads yet" : 'No posts yet'}
                        </p>
                        <p className="text-sm text-plum/60">
                            {tab === 'following'
                                ? 'Follow a thread to keep it here.'
                                : user ? 'Start the conversation with the first post.' : 'Sign in to start the conversation.'}
                        </p>
                    </div>
                )}

                {posts && posts.length > 0 && (
                    <ul className="space-y-3">
                        {posts.map((post) => (
                            <li key={post.id}>
                                <PostCard post={post} onChange={(u) => updatePost(post.id, u)} onError={showToast} />
                            </li>
                        ))}
                    </ul>
                )}
            </main>

            <Toast message={toast} />
        </div>
    );
}

function PostCard({
    post,
    onChange,
    onError,
}: {
    post: ForumPost;
    onChange: (update: Partial<ForumPost>) => void;
    onError: (message: string) => void;
}) {
    return (
        <article className="relative flex gap-4 p-4 sm:p-5 rounded-2xl bg-white/60 border border-plum/10 hover:border-plum/25 hover:bg-white/80 transition-colors duration-150">
            <div className="relative z-10">
                <UpvoteButton post={post} onChange={onChange} onError={onError} vertical />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                    <CategoryBadge label={categoryLabel(post.category)} />
                </div>
                <h2 className="font-sans font-bold text-base sm:text-lg leading-snug mb-1">
                    {/* Stretched link: the whole card opens the thread, buttons stay clickable above it. */}
                    <Link to={`/forum/${post.id}`} className="hover:text-berry transition-colors after:absolute after:inset-0 after:rounded-2xl">
                        {post.title}
                    </Link>
                </h2>
                <p className="text-sm text-plum/70 line-clamp-2 mb-3 whitespace-pre-line">{post.body}</p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-plum/55 min-w-0">
                        <Avatar name={post.author_name} url={post.author_avatar} size={20} />
                        <span className="font-semibold text-plum/75 truncate">{post.author_name}</span>
                        <span aria-hidden="true">·</span>
                        <span className="shrink-0">{timeAgo(post.created_at)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 shrink-0">
                            <MessageCircle size={13} /> {post.reply_count}
                        </span>
                    </div>
                    <div className="relative z-10">
                        <PostActions post={post} onChange={onChange} onError={onError} />
                    </div>
                </div>
            </div>
        </article>
    );
}

function Composer({ onCancel }: { onCancel: () => void }) {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [category, setCategory] = useState<ForumCategory>('feedback');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const post = await createPost({ title: title.trim(), body: body.trim(), category });
            navigate(`/forum/${post.id}`);
        } catch (err) {
            setError((err as Error).message);
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-5 sm:p-6 mb-8 space-y-4 animate-fade-up">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">New post</h2>
                <button type="button" onClick={onCancel} aria-label="Close" className="text-plum/50 hover:text-berry transition-colors">
                    <X size={20} />
                </button>
            </div>

            {error && (
                <p role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">{error}</p>
            )}

            <div className="grid sm:grid-cols-[1fr_12rem] gap-4">
                <div>
                    <label htmlFor="post-title" className="block text-sm font-semibold mb-1.5">Title</label>
                    <input
                        id="post-title"
                        required
                        minLength={3}
                        maxLength={120}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className={fieldClass}
                        placeholder="Summarise your idea or question"
                    />
                </div>
                <div>
                    <label htmlFor="post-category" className="block text-sm font-semibold mb-1.5">Category</label>
                    <select
                        id="post-category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as ForumCategory)}
                        className={fieldClass}
                    >
                        {FORUM_CATEGORIES.map((c) => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <div className="flex items-baseline justify-between mb-1.5">
                    <label htmlFor="post-body" className="text-sm font-semibold">Details</label>
                    <span className="text-xs text-plum/50 tabular-nums">{body.length}/5000</span>
                </div>
                <textarea
                    id="post-body"
                    required
                    maxLength={5000}
                    rows={5}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className={`${fieldClass} resize-y leading-relaxed`}
                    placeholder="Share as much detail as you like..."
                />
            </div>

            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="soft-button-outline px-5 py-2.5 text-sm">Cancel</button>
                <button
                    type="submit"
                    disabled={submitting || title.trim().length < 3 || !body.trim()}
                    className="soft-button-berry px-5 py-2.5 text-sm disabled:opacity-50 disabled:pointer-events-none"
                >
                    {submitting ? 'Posting...' : 'Post'}
                </button>
            </div>
        </form>
    );
}
