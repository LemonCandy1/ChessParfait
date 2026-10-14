-- Profiles and points (part B of 2).
-- Run AFTER 20261010_profiles_and_points.sql has been run and the matching code is deployed.
--
-- 1. Catches anything the old code wrote to user_metadata between part A and the deploy.
-- 2. Removes the moved data from user_metadata, so it no longer travels inside every login token
--    and cookie. Usernames stay in metadata (they are small and Supabase shows them in its dashboard).
--
-- Safe to run more than once.

-- ── 1. Final catch-up ─────────────────────────────────────────────────────────

update public.profiles p
set points        = greatest(p.points, public.jsonb_int(u.raw_user_meta_data -> 'points')),
    real_email    = coalesce(p.real_email, nullif(u.raw_user_meta_data ->> 'real_email', '')),
    avatar_url    = coalesce(p.avatar_url, nullif(u.raw_user_meta_data ->> 'avatar_url', ''), nullif(u.raw_user_meta_data ->> 'picture', '')),
    training_plan = coalesce(p.training_plan, nullif(u.raw_user_meta_data ->> 'training_plan', '')),
    updated_at    = now()
from auth.users u
where u.id = p.id
  and (public.jsonb_int(u.raw_user_meta_data -> 'points') > p.points
       or (p.real_email is null and u.raw_user_meta_data ? 'real_email')
       or (p.avatar_url is null and (u.raw_user_meta_data ? 'avatar_url' or u.raw_user_meta_data ? 'picture'))
       or (p.training_plan is null and u.raw_user_meta_data ? 'training_plan'));

insert into public.points_ledger (user_id, source, source_id, points, details, created_at)
select
    u.id,
    'puzzle',
    coalesce(nullif(p ->> 'id', ''), 'week-' || (p ->> 'week') || '-' || (p ->> 'difficulty')),
    greatest(public.jsonb_int(p -> 'points'), 0),
    jsonb_build_object('week', p -> 'week', 'difficulty', p -> 'difficulty', 'title', p -> 'title'),
    coalesce(nullif(p ->> 'solvedAt', '')::timestamptz, u.created_at)
from auth.users u
cross join lateral jsonb_array_elements(
    case when jsonb_typeof(u.raw_user_meta_data -> 'solved_puzzles') = 'array' then u.raw_user_meta_data -> 'solved_puzzles' else '[]' end
) as p
on conflict (user_id, source, source_id) do nothing;

insert into public.points_ledger (user_id, source, source_id, points, details, created_at)
select
    u.id,
    'endgame',
    e ->> 'id',
    greatest(public.jsonb_int(e -> 'points'), 0),
    jsonb_build_object('title', e -> 'title', 'difficulty', e -> 'difficulty'),
    coalesce(nullif(e ->> 'completedAt', '')::timestamptz, u.created_at)
from auth.users u
cross join lateral jsonb_array_elements(
    case when jsonb_typeof(u.raw_user_meta_data -> 'completed_endgames') = 'array' then u.raw_user_meta_data -> 'completed_endgames' else '[]' end
) as e
where nullif(e ->> 'id', '') is not null
on conflict (user_id, source, source_id) do nothing;

-- ── 2. Strip moved data from user_metadata ─────────────────────────────────────

-- Uploaded pictures are base64 data URLs (often tens of kilobytes); Google profile pictures are
-- short https links that Google sign-in writes back anyway, so only the data URLs are removed.
update auth.users
set raw_user_meta_data =
        (raw_user_meta_data - 'points' - 'solved_puzzles' - 'completed_endgames' - 'pawn_stats' - 'training_plan' - 'real_email')
        - (case when raw_user_meta_data ->> 'avatar_url' like 'data:%' then 'avatar_url' else '' end)
        - (case when raw_user_meta_data ->> 'picture' like 'data:%' then 'picture' else '' end)
where raw_user_meta_data ?| array['points', 'solved_puzzles', 'completed_endgames', 'pawn_stats', 'training_plan', 'real_email']
   or raw_user_meta_data ->> 'avatar_url' like 'data:%'
   or raw_user_meta_data ->> 'picture' like 'data:%';
