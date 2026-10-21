-- Endgame Trainer: practice mode. Players can practise chosen types of endgame, unrated: results count for
-- theme mastery and the review queue, never for the endgame rating or leaderboard.
-- Run once in the Supabase SQL editor, after 20261024_endgame_queued.sql and BEFORE deploying the matching code.

alter table public.endgame_attempts
    add column if not exists practice boolean not null default false,
    -- True if the player used a hint: a solve with help counts as a miss for mastery and reviews.
    add column if not exists helped boolean not null default false;

-- One open position per player in each mode, so a rated position can wait while the player practises.
drop index if exists public.endgame_attempts_one_open;
create unique index if not exists endgame_attempts_one_open_per_mode
    on public.endgame_attempts (user_id, practice) where status = 'open';
