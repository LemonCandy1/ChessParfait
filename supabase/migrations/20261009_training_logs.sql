-- Daily training plan logs.
-- Run once in the Supabase SQL editor (or `supabase db push`).
--
-- One row per user per day. All reads and writes go through the Cloudflare Pages Functions in
-- functions/api/training, which verify the session cookie and use the service-role key. RLS is
-- enabled with no policies, so the public anon key cannot read or write this table directly.

create table if not exists public.training_logs (
    user_id         uuid not null references auth.users (id) on delete cascade,
    day             date not null,
    plan_id         text not null,
    completed_items text[] not null default '{}',
    minutes         integer not null default 0 check (minutes >= 0),
    completed       boolean not null default false,
    -- Points already paid for this day (daily reward plus any streak bonus). Never paid twice.
    points_awarded  integer not null default 0 check (points_awarded >= 0),
    updated_at      timestamptz not null default now(),
    primary key (user_id, day)
);

create index if not exists training_logs_user_day_idx on public.training_logs (user_id, day desc);

alter table public.training_logs enable row level security;
