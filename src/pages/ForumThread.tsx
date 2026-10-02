import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from '../lib/lucideOriginal';
import Navbar from '../components/Navbar/Navbar';
import { Avatar, CategoryBadge, PostActions, SignInPrompt, Toast, UpvoteButton } from '../components/community/CommunityUI';
import { useToast } from '../components/community/useToast';
import { useAuth } from '../context/AuthContext';
import { categoryLabel, createReply, getThread, timeAgo, type ForumPost, type ForumReply } from '../lib/communityApi';

export default function ForumThread() {
    const { id = '' } = useParams();
    const { user } = useAuth();
    const [thread, setThread] = useState<{ key: string; post: ForumPost | null; replies: ForumReply[]; error: string }>({
        key: '',
        post: null,
        replies: [],
        error: '',
    });
    const [toast, showToast] = useToast();

    const requestKey = `${id}|${user?.id ?? ''}`;
    const isCurrent = thread.key === requestKey;
    const post = isCurrent ? thread.post : null;
    const replies = isCurrent ? thread.replies : [];
    const loadError = isCurrent ? thread.error : '';

    useEffect(() => {
        let cancelled = false;
        getThread(id)
            .then((data) => !cancelled && setThread({ key: requestKey, post: data.post, replies: data.replies, error: '' }))
            .catch((err) => !cancelled && setThread({ key: requestKey, post: null, replies: [], error: err.message }));
        return () => {
            cancelled = true;
        };
    }, [id, requestKey]);

    const updatePost = (update: Partial<ForumPost>) =>
        setThread((prev) => (prev.post ? { ...prev, post: { ...prev.post, ...update } } : prev));

    return (
        <div className="min-h-screen flex flex-col font-sans text-plum bg-cream">
            <div className="relative z-50">
                <Navbar />
            </div>

            <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 md:py-14">
                <Link to="/forum" className="inline-flex items-center gap-1.5 text-sm font-semibold text-plum/60 hover:text-berry transition-colors mb-6">
                    <ArrowLeft size={16} /> Back to forum
                </Link>

                {loadError && <p className="p-8 text-center glass rounded-2xl text-sm text-rose-700">{loadError}</p>}

                {!loadError && !post && (
                    <div className="space-y-3" aria-busy="true">
                        <div className="h-48 rounded-2xl bg-white/50 border border-plum/10 animate-pulse" />
                        <div className="h-20 rounded-2xl bg-white/50 border border-plum/10 animate-pulse" />
                    </div>
                )}

                {post && (
                    <div className="animate-fade-up">
                        <article className="glass rounded-3xl p-5 sm:p-8 mb-8">
                            <div className="flex items-center gap-2 mb-3">
                                <CategoryBadge label={categoryLabel(post.category)} />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-4 break-words">{post.title}</h1>
                            <div className="flex items-center gap-2.5 mb-6 text-sm">
                                <Avatar name={post.author_name} url={post.author_avatar} size={32} />
                                <div className="leading-tight">
                                    <p className="font-semibold">{post.author_name}</p>
                                    <p className="text-xs text-plum/55">{timeAgo(post.created_at)}</p>
                                </div>
                            </div>
                            <p className="text-plum/85 leading-relaxed whitespace-pre-line break-words mb-6">{post.body}</p>
                            <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-plum/10">
                                <UpvoteButton post={post} onChange={updatePost} onError={showToast} />
                                <PostActions post={post} onChange={updatePost} onError={showToast} />
                            </div>
                        </article>

                        <section aria-labelledby="replies-heading">
                            <h2 id="replies-heading" className="flex items-center gap-2 text-lg font-bold font-sans mb-4">
                                <MessageCircle size={18} className="text-berry" />
                                {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                            </h2>

                            {replies.length > 0 && (
                                <ul className="space-y-3 mb-6">
                                    {replies.map((reply) => (
                                        <li key={reply.id} className="flex gap-3 p-4 rounded-2xl bg-white/60 border border-plum/10">
                                            <Avatar name={reply.author_name} url={reply.author_avatar} size={32} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm mb-1">
                                                    <span className="font-semibold">{reply.author_name}</span>
                                                    {reply.author_id === post.author_id && (
                                                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-berry">Author</span>
                                                    )}
                                                    <span className="text-plum/50 text-xs ml-2">{timeAgo(reply.created_at)}</span>
                                                </p>
                                                <p className="text-sm text-plum/85 leading-relaxed whitespace-pre-line break-words">{reply.body}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {user ? (
                                <ReplyForm
                                    postId={post.id}
                                    onReplied={(reply) =>
                                        setThread((prev) => ({
                                            ...prev,
                                            replies: [...prev.replies, reply],
                                            post: prev.post && { ...prev.post, reply_count: prev.post.reply_count + 1 },
                                        }))
                                    }
                                />
                            ) : (
                                <SignInPrompt action="reply to this thread" />
                            )}
                        </section>
                    </div>
                )}
            </main>

            <Toast message={toast} />
        </div>
    );
}

function ReplyForm({ postId, onReplied }: { postId: string; onReplied: (reply: ForumReply) => void }) {
    const { user } = useAuth();
    const [body, setBody] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            onReplied(await createReply(postId, body.trim()));
            setBody('');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-3 p-4 rounded-2xl bg-white/70 border border-plum/15">
            <Avatar name={user?.username ?? '?'} url={user?.avatarUrl} size={32} />
            <div className="flex-1 min-w-0 space-y-3">
                <label htmlFor="reply-body" className="sr-only">Write a reply</label>
                <textarea
                    id="reply-body"
                    required
                    maxLength={2000}
                    rows={3}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write a reply..."
                    className="w-full px-3 py-2.5 rounded-xl border border-plum/15 bg-white text-plum placeholder:text-plum/40 focus:outline-none focus:border-berry focus:ring-4 focus:ring-berry/10 transition-[border-color,box-shadow] duration-150 resize-y leading-relaxed"
                />
                {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
                <div className="flex items-center justify-between">
                    <span className="text-xs text-plum/50 tabular-nums">{body.length}/2000</span>
                    <button
                        type="submit"
                        disabled={submitting || !body.trim()}
                        className="soft-button-berry px-5 py-2 text-sm disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {submitting ? 'Replying...' : 'Reply'}
                    </button>
                </div>
            </div>
        </form>
    );
}
