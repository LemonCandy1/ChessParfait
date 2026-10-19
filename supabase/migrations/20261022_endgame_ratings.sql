-- Endgame Trainer: each endgame's own rating adjusts from results (failed often: up, solved often: down).
-- Run once in the Supabase SQL editor, after 20261021_endgame_trainer.sql and BEFORE deploying the matching code.
--
-- The ratings in src/data/endgames.json are starting values: an endgame gets a row here the first time it
-- is played, and from then on this table is its rating. Delete a row to reset that endgame to the JSON value.
-- Reads and writes go through the Cloudflare Pages Functions with the service-role key (RLS, no policies).

create table if not exists public.endgame_ratings (
    endgame_id text primary key,
    rating     integer not null,
    plays      integer not null default 0,
    updated_at timestamptz not null default now()
);

alter table public.endgame_ratings enable row level security;

-- Adds `p_change` to an endgame's rating in one statement, starting from `p_start` the first time,
-- so results landing together are all counted. Never goes below 100. Returns the new rating.
create or replace function public.adjust_endgame_rating(p_endgame text, p_start integer, p_change integer) returns integer
language sql security definer set search_path = public as $$
    insert into endgame_ratings (endgame_id, rating, plays)
    values (p_endgame, greatest(100, p_start + p_change), 1)
    on conflict (endgame_id) do update
        set rating = greatest(100, endgame_ratings.rating + p_change),
            plays = endgame_ratings.plays + 1,
            updated_at = now()
    returning rating
$$;

revoke all on function public.adjust_endgame_rating(text, integer, integer) from public, anon, authenticated;
grant execute on function public.adjust_endgame_rating(text, integer, integer) to service_role;
