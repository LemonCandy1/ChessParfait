-- Community forum schema.
-- Run once in the Supabase SQL editor (or `supabase db push`).
--
-- All reads and writes go through the Cloudflare Pages Functions in functions/api/forum,
-- which verify the session cookie and use the service-role key. RLS is enabled with no
-- policies, so the public anon key cannot read or write these tables directly.

create extension if not exists pgcrypto;

create table if not exists public.forum_posts (
    id            uuid primary key default gen_random_uuid(),
    author_id     uuid not null references auth.users (id) on delete cascade,
    author_name   text not null,
    author_avatar text,
    category      text not null default 'general'
                  check (category in ('feedback', 'feature', 'bug', 'general')),
    title         text not null check (char_length(title) between 3 and 120),
    body          text not null check (char_length(body) between 1 and 5000),
    upvote_count  integer not null default 0,
    reply_count   integer not null default 0,
    created_at    timestamptz not null default now(),
    last_activity_at timestamptz not null default now()
);

create table if not exists public.forum_replies (
    id            uuid primary key default gen_random_uuid(),
    post_id       uuid not null references public.forum_posts (id) on delete cascade,
    author_id     uuid not null references auth.users (id) on delete cascade,
    author_name   text not null,
    author_avatar text,
    body          text not null check (char_length(body) between 1 and 2000),
    created_at    timestamptz not null default now()
);

create table if not exists public.forum_post_votes (
    post_id    uuid not null references public.forum_posts (id) on delete cascade,
    user_id    uuid not null references auth.users (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (post_id, user_id)
);

create table if not exists public.forum_follows (
    post_id    uuid not null references public.forum_posts (id) on delete cascade,
    user_id    uuid not null references auth.users (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (post_id, user_id)
);

create index if not exists forum_posts_created_idx   on public.forum_posts (created_at desc);
create index if not exists forum_posts_upvotes_idx   on public.forum_posts (upvote_count desc, created_at desc);
create index if not exists forum_replies_post_idx    on public.forum_replies (post_id, created_at);
create index if not exists forum_follows_user_idx    on public.forum_follows (user_id);
create index if not exists forum_votes_user_idx      on public.forum_post_votes (user_id);

-- Keep denormalised counters in sync.
create or replace function public.forum_sync_upvote_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
    if tg_op = 'INSERT' then
        update forum_posts set upvote_count = upvote_count + 1 where id = new.post_id;
    elsif tg_op = 'DELETE' then
        update forum_posts set upvote_count = greatest(upvote_count - 1, 0) where id = old.post_id;
    end if;
    return null;
end $$;

create or replace function public.forum_sync_reply_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
    if tg_op = 'INSERT' then
        update forum_posts
           set reply_count = reply_count + 1,
               last_activity_at = new.created_at
         where id = new.post_id;
    elsif tg_op = 'DELETE' then
        update forum_posts set reply_count = greatest(reply_count - 1, 0) where id = old.post_id;
    end if;
    return null;
end $$;

drop trigger if exists forum_votes_count on public.forum_post_votes;
create trigger forum_votes_count
    after insert or delete on public.forum_post_votes
    for each row execute function public.forum_sync_upvote_count();

drop trigger if exists forum_replies_count on public.forum_replies;
create trigger forum_replies_count
    after insert or delete on public.forum_replies
    for each row execute function public.forum_sync_reply_count();

alter table public.forum_posts      enable row level security;
alter table public.forum_replies    enable row level security;
alter table public.forum_post_votes enable row level security;
alter table public.forum_follows    enable row level security;
