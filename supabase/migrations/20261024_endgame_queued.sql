-- Endgame Trainer: the next position is prepared while the current one is played, so it appears instantly.
-- Run once in the Supabase SQL editor, after 20261021-20261023 and BEFORE deploying the matching code.

-- 'queued' = prepared in the background and not yet shown. It becomes 'open' when the player asks for the
-- next position, so a queued position is never scored.
alter table public.endgame_attempts drop constraint if exists endgame_attempts_status_check;
alter table public.endgame_attempts
    add constraint endgame_attempts_status_check check (status in ('queued', 'open', 'solved', 'failed'));

-- At most one prepared position per player.
create unique index if not exists endgame_attempts_one_queued on public.endgame_attempts (user_id) where status = 'queued';
