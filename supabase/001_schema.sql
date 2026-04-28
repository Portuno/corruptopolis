-- ─────────────────────────────────────────────────────────────────────────
-- 001_schema.sql — Corruptópolis base schema
-- Run this FIRST in the Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ── profiles ─────────────────────────────────────────────────────────────
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

-- ── matches ──────────────────────────────────────────────────────────────
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

-- ── feedback ─────────────────────────────────────────────────────────────
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

-- ── api_logs ─────────────────────────────────────────────────────────────
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
