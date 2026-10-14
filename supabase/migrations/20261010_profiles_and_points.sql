-- Profiles and points (part A of 2).
-- Moves player data out of auth user_metadata into tables so the leaderboard can use an index,
-- points can never be lost to two awards landing together and login tokens stop growing.
--
-- Run once in the Supabase SQL editor, then deploy the matching code straight away.
-- After the deploy, run 20261011_strip_user_metadata.sql (part B).
--
-- As with the forum tables, every read and write goes through the Cloudflare Pages Functions
-- with the service-role key. RLS is enabled with no policies, so the anon key cannot touch these tables.

-- ── Tables ────────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
    id            uuid primary key references auth.users (id) on delete cascade,
    username      text,      -- unique regardless of case (index below); the API validates the format
    email         text,      -- auth email, lower case (username accounts use a virtual @chessparfait.com address)
    real_email    text,      -- email linked by the player, used for password resets
    avatar_url    text,      -- https URL, or a data: URL for uploaded pictures
    points        integer not null default 0 check (points >= 0),
    pawn_stats    jsonb not null default '{"whiteWins": 0, "whiteLosses": 0, "blackWins": 0, "blackLosses": 0}',
    training_plan text,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

-- Usernames are unique regardless of case.
create unique index if not exists profiles_username_key on public.profiles (lower(username)) where username is not null;
create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_leaderboard_idx on public.profiles (points desc) where points > 0 and username is not null;

-- One row per reward. The unique key makes every reward idempotent: a puzzle, endgame or training
-- day can only ever be paid once per player, even if the request is sent twice.
create table if not exists public.points_ledger (
    id         bigint generated always as identity primary key,
    user_id    uuid not null references auth.users (id) on delete cascade,
    source     text not null check (source in ('puzzle', 'endgame', 'training')),
    source_id  text not null,
    points     integer not null check (points >= 0),
    details    jsonb not null default '{}',
    created_at timestamptz not null default now(),
    unique (user_id, source, source_id)
);

create index if not exists points_ledger_user_source_idx on public.points_ledger (user_id, source, created_at desc);

alter table public.profiles enable row level security;
alter table public.points_ledger enable row level security;

-- ── Functions ─────────────────────────────────────────────────────────────────

-- Reads a JSON number (or numeric text) as an integer, treating anything else as 0 (old metadata is untyped).
create or replace function public.jsonb_int(value jsonb) returns integer
language sql immutable as $$
    select case
        when jsonb_typeof(value) = 'number' then floor((value #>> '{}')::numeric)::integer
        when jsonb_typeof(value) = 'string' and trim(value #>> '{}') ~ '^-?[0-9]+(\.[0-9]+)?$' then floor(trim(value #>> '{}')::numeric)::integer
        else 0
    end
$$;

-- Records a reward and adds its points in one transaction. Returns awarded = false (and the
-- unchanged total) if this reward was already paid.
create or replace function public.award_points(
    p_user uuid, p_source text, p_source_id text, p_points integer, p_details jsonb default '{}'
) returns table (awarded boolean, total_points integer)
language plpgsql security definer set search_path = public as $$
declare
    inserted integer;
begin
    insert into points_ledger (user_id, source, source_id, points, details)
    values (p_user, p_source, p_source_id, p_points, coalesce(p_details, '{}'))
    on conflict (user_id, source, source_id) do nothing;
    get diagnostics inserted = row_count;

    if inserted > 0 then
        insert into profiles (id, points) values (p_user, p_points)
        on conflict (id) do update set points = profiles.points + excluded.points, updated_at = now()
        returning profiles.points into total_points;
        awarded := true;
    else
        select profiles.points into total_points from profiles where profiles.id = p_user;
        awarded := false;
    end if;
    return next;
end;
$$;

-- Adds one win or loss to a player's pawn game record atomically. Returns the new record.
create or replace function public.record_pawn_game(p_user uuid, p_color text, p_result text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
    stat_key text;
    stats jsonb;
begin
    if p_color not in ('white', 'black') or p_result not in ('win', 'loss') then
        raise exception 'Invalid pawn game result';
    end if;
    stat_key := p_color || case when p_result = 'win' then 'Wins' else 'Losses' end;

    insert into profiles (id) values (p_user) on conflict (id) do nothing;
    update profiles
    set pawn_stats = jsonb_set(pawn_stats, array[stat_key], to_jsonb(public.jsonb_int(pawn_stats -> stat_key) + 1)),
        updated_at = now()
    where id = p_user
    returning pawn_stats into stats;
    return stats;
end;
$$;

-- Exact, case-insensitive username lookup that uses the unique index on lower(username).
create or replace function public.find_profile_by_username(p_username text) returns setof public.profiles
language sql stable security definer set search_path = public as $$
    select * from profiles where lower(username) = lower(trim(p_username)) limit 1
$$;

-- Keeps profiles in step with auth.users: creates the row for every new account (whichever way it
-- signed up) and follows email changes. A username already taken by someone else is left blank,
-- so account creation never fails here; the API checks usernames before creating accounts.
create or replace function public.sync_profile_from_auth() returns trigger
language plpgsql security definer set search_path = public as $$
declare
    wanted text := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
begin
    if tg_op = 'INSERT' then
        if wanted is not null and exists (select 1 from profiles where lower(username) = lower(wanted)) then
            wanted := null;
        end if;
        insert into profiles (id, username, email, avatar_url, created_at)
        values (
            new.id,
            wanted,
            lower(new.email),
            coalesce(nullif(new.raw_user_meta_data ->> 'avatar_url', ''), nullif(new.raw_user_meta_data ->> 'picture', '')),
            coalesce(new.created_at, now())
        )
        on conflict (id) do nothing;
    elsif new.email is distinct from old.email then
        update profiles set email = lower(new.email), updated_at = now() where id = new.id;
    end if;
    return new;
end;
$$;

drop trigger if exists sync_profile_from_auth on auth.users;
create trigger sync_profile_from_auth
    after insert or update of email on auth.users
    for each row execute function public.sync_profile_from_auth();

-- Only the service role (the Pages Functions) may call these.
revoke all on function public.award_points(uuid, text, text, integer, jsonb) from public, anon, authenticated;
revoke all on function public.record_pawn_game(uuid, text, text) from public, anon, authenticated;
revoke all on function public.sync_profile_from_auth() from public, anon, authenticated;
revoke all on function public.find_profile_by_username(text) from public, anon, authenticated;
grant execute on function public.award_points(uuid, text, text, integer, jsonb) to service_role;
grant execute on function public.record_pawn_game(uuid, text, text) to service_role;
grant execute on function public.find_profile_by_username(text) to service_role;

-- Top players for the public leaderboard (an index scan, however many players there are).
create or replace view public.leaderboard as
    select
        p.id,
        p.username,
        p.avatar_url is not null as has_avatar,
        p.points,
        (select count(*) from public.points_ledger l where l.user_id = p.id and l.source = 'puzzle')::integer as puzzles_solved
    from public.profiles p
    where p.points > 0 and p.username is not null
    order by p.points desc, lower(p.username)
    limit 50;

revoke all on public.leaderboard from public, anon, authenticated;
grant select on public.leaderboard to service_role;

-- ── Backfill existing players from user_metadata ───────────────────────────────

-- Profiles. If two accounts share a username (possible before this fix), the older account keeps
-- it and the newer one gets a numbered suffix so the unique index can be created.
insert into public.profiles (id, username, email, real_email, avatar_url, points, pawn_stats, training_plan, created_at)
select
    u.id,
    case when ranked.rn = 1 then ranked.username else ranked.username || '_' || ranked.rn end,
    lower(u.email),
    nullif(u.raw_user_meta_data ->> 'real_email', ''),
    coalesce(nullif(u.raw_user_meta_data ->> 'avatar_url', ''), nullif(u.raw_user_meta_data ->> 'picture', '')),
    greatest(public.jsonb_int(u.raw_user_meta_data -> 'points'), 0),
    jsonb_build_object(
        'whiteWins',   public.jsonb_int(u.raw_user_meta_data -> 'pawn_stats' -> 'whiteWins'),
        'whiteLosses', public.jsonb_int(u.raw_user_meta_data -> 'pawn_stats' -> 'whiteLosses'),
        'blackWins',   public.jsonb_int(u.raw_user_meta_data -> 'pawn_stats' -> 'blackWins'),
        'blackLosses', public.jsonb_int(u.raw_user_meta_data -> 'pawn_stats' -> 'blackLosses')
    ),
    nullif(u.raw_user_meta_data ->> 'training_plan', ''),
    u.created_at
from auth.users u
left join (
    select id, nullif(trim(raw_user_meta_data ->> 'username'), '') as username,
           row_number() over (partition by lower(nullif(trim(raw_user_meta_data ->> 'username'), '')) order by created_at, id) as rn
    from auth.users
) ranked on ranked.id = u.id
on conflict (id) do nothing;

-- Puzzle history.
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

-- Endgame completions.
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

-- Training days already paid (only if the training table from 20261009 exists).
do $$
begin
    if to_regclass('public.training_logs') is not null then
        insert into public.points_ledger (user_id, source, source_id, points, details, created_at)
        select user_id, 'training', day::text, points_awarded, jsonb_build_object('planId', plan_id), updated_at
        from public.training_logs
        where points_awarded > 0
        on conflict (user_id, source, source_id) do nothing;
    end if;
end;
$$;
