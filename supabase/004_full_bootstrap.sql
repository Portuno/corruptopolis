-- ─────────────────────────────────────────────────────────────────────────
-- 004_full_bootstrap.sql — Corruptopolis full Supabase bootstrap
-- Safe to run on a clean project or on top of existing objects.
-- ─────────────────────────────────────────────────────────────────────────

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ── tables ───────────────────────────────────────────────────────────────
create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    display_name text,
    avatar_url text,
    gemini_key_encrypted text,
    eleven_key_encrypted text,
    created_at timestamptz not null default now()
);

comment on table public.profiles is
    'One row per auth.users entry (anonymous or registered). Holds optional player-supplied API keys.';

create table if not exists public.matches (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    started_at timestamptz not null,
    ended_at timestamptz not null,
    result text not null check (result in ('win', 'loss', 'abandoned')),
    final_avg double precision not null,
    districts_held integer not null,
    total_districts integer not null,
    epochs_played integer not null,
    cadence integer not null,
    payload jsonb,
    created_at timestamptz not null default now()
);

create index if not exists matches_user_id_created_at_idx
    on public.matches (user_id, created_at desc);

create table if not exists public.feedback (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users (id) on delete set null,
    kind text not null check (kind in ('bug', 'idea', 'praise', 'other')),
    message text not null check (char_length(message) between 1 and 4000),
    page text,
    user_agent text,
    created_at timestamptz not null default now()
);

create index if not exists feedback_created_at_idx
    on public.feedback (created_at desc);

create table if not exists public.api_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users (id) on delete set null,
    route text not null,
    model text,
    status integer,
    latency_ms integer,
    error text,
    request_id text,
    created_at timestamptz not null default now()
);

create index if not exists api_logs_route_created_at_idx
    on public.api_logs (route, created_at desc);

-- ── row-level security ───────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.feedback enable row level security;
alter table public.api_logs enable row level security;

-- profiles: each user owns exactly one profile row
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select"
    on public.profiles
    for select
    using (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
    on public.profiles
    for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert"
    on public.profiles
    for insert
    with check (auth.uid() = id);

-- matches: anonymous users still have auth.uid(), so this works for both
drop policy if exists "matches_self_select" on public.matches;
create policy "matches_self_select"
    on public.matches
    for select
    using (auth.uid() = user_id);

drop policy if exists "matches_self_insert" on public.matches;
create policy "matches_self_insert"
    on public.matches
    for insert
    with check (auth.uid() = user_id);

-- feedback: anyone can submit, users can only read their own
drop policy if exists "feedback_anyone_insert" on public.feedback;
create policy "feedback_anyone_insert"
    on public.feedback
    for insert
    with check (
        user_id is null
        or auth.uid() = user_id
    );

drop policy if exists "feedback_self_select" on public.feedback;
create policy "feedback_self_select"
    on public.feedback
    for select
    using (auth.uid() is not null and auth.uid() = user_id);

-- api_logs intentionally has no client-facing policies

-- ── auth trigger + convenience view ──────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, display_name)
    values (
        new.id,
        coalesce(
            new.raw_user_meta_data ->> 'display_name',
            split_part(coalesce(new.email, ''), '@', 1),
            'Commander'
        )
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

create or replace view public.profile_stats as
select
    p.id as user_id,
    p.display_name,
    count(m.*) filter (where m.result = 'win') as wins,
    count(m.*) filter (where m.result = 'loss') as losses,
    count(m.*) filter (where m.result = 'abandoned') as abandoned,
    count(m.*) as total_matches,
    coalesce(avg(m.final_avg), 0) as avg_dominance,
    max(m.created_at) as last_match_at
from public.profiles p
left join public.matches m on m.user_id = p.id
group by p.id, p.display_name;

-- ── grants ───────────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;

grant select, insert, update on public.profiles to anon, authenticated;
grant select, insert on public.matches to anon, authenticated;
grant select, insert on public.feedback to anon, authenticated;
grant select on public.profile_stats to anon, authenticated;

revoke all on public.api_logs from anon, authenticated;
