-- Endgame Trainer, ChessTempo-style additions: partial credit for slow wins and spaced repetition of failed endgames.
-- Run once in the Supabase SQL editor, after 20261021 and 20261022, and BEFORE deploying the matching code.
-- Reads and writes go through the Cloudflare Pages Functions with the service-role key (RLS, no policies).

-- The fastest mate (in moves) from the served position, when the endgame database knows it.
-- A solve taking longer than this gets partial credit.
alter table public.endgame_attempts add column if not exists optimal_moves integer;

-- Endgames a player has failed come back for review: 5 minutes after a fail, then a day, then doubling.
create table if not exists public.endgame_reviews (
    user_id      uuid not null references auth.users (id) on delete cascade,
    endgame_id   text not null,
    gap_minutes  integer not null,
    due_at       timestamptz not null,
    primary key (user_id, endgame_id)
);

create index if not exists endgame_reviews_due_idx on public.endgame_reviews (user_id, due_at);

alter table public.endgame_reviews enable row level security;
