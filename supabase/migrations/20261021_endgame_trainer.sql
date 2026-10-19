-- Endless endgame trainer: player ratings, attempts and the endgame rating leaderboard.
-- Run once in the Supabase SQL editor BEFORE deploying the matching code (login reads the new profile columns).
--
-- As with the other tables, every read and write goes through the Cloudflare Pages Functions with
-- the service-role key. RLS is enabled with no policies, so the anon key cannot touch these tables.

alter table public.profiles
    add column if not exists endgame_rating integer not null default 1000,
    add column if not exists endgame_best   integer not null default 1000,
    add column if not exists endgame_played integer not null default 0;

-- One row per position served. The server remembers the position it handed out, so a "solved"
-- result can be checked by replaying the moves from it. An attempt still open when the player asks
-- for the next position (or comes back later) is closed as a miss.
create table if not exists public.endgame_attempts (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references auth.users (id) on delete cascade,
    endgame_id    text not null,
    fen           text not null,
    player_color  text not null check (player_color in ('w', 'b')),
    status        text not null default 'open' check (status in ('open', 'solved', 'failed')),
    rating_before integer not null,
    rating_after  integer,
    created_at    timestamptz not null default now(),
    finished_at   timestamptz
);

-- At most one open attempt per player.
create unique index if not exists endgame_attempts_one_open on public.endgame_attempts (user_id) where status = 'open';
create index if not exists endgame_attempts_user_idx on public.endgame_attempts (user_id, created_at desc);
create index if not exists profiles_endgame_leaderboard_idx on public.profiles (endgame_rating desc) where endgame_played >= 20 and username is not null;

alter table public.endgame_attempts enable row level security;

-- Top 50 by endgame rating, once a player has played 20 positions.
create or replace view public.endgame_leaderboard as
    select p.id, p.username, p.avatar_url is not null as has_avatar, p.endgame_rating, p.endgame_played
    from public.profiles p
    where p.endgame_played >= 20 and p.username is not null
    order by p.endgame_rating desc, lower(p.username)
    limit 50;

revoke all on public.endgame_leaderboard from public, anon, authenticated;
grant select on public.endgame_leaderboard to service_role;
