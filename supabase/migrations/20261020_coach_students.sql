-- Coach view: lets the coach see the training of students who accepted an invite.
-- Run once in the Supabase SQL editor BEFORE deploying the matching code (login reads profiles.is_coach).
--
-- As with the other tables, every read and write goes through the Cloudflare Pages Functions with
-- the service-role key. RLS is enabled with no policies, so the anon key cannot touch this table.

alter table public.profiles add column if not exists is_coach boolean not null default false;

-- One row per invite. 'pending' until the student accepts; declining or stopping sharing deletes
-- the row, so the coach can invite again later.
create table if not exists public.coach_students (
    coach_id    uuid not null references auth.users (id) on delete cascade,
    student_id  uuid not null references auth.users (id) on delete cascade,
    status      text not null default 'pending' check (status in ('pending', 'accepted')),
    invited_at  timestamptz not null default now(),
    accepted_at timestamptz,
    primary key (coach_id, student_id),
    check (coach_id <> student_id)
);

create index if not exists coach_students_student_idx on public.coach_students (student_id);

alter table public.coach_students enable row level security;

-- Make your account the coach: put your username in and run this line once.
-- update public.profiles set is_coach = true where lower(username) = lower('YOUR_USERNAME');
