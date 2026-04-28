-- ─────────────────────────────────────────────────────────────────────────
-- 002_rls_policies.sql — Row-level security
-- Run this AFTER 001_schema.sql.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles  enable row level security;
alter table public.matches   enable row level security;
alter table public.feedback  enable row level security;
alter table public.api_logs  enable row level security;

-- ── profiles ─────────────────────────────────────────────────────────────
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

-- ── matches ──────────────────────────────────────────────────────────────
-- Anonymous users get a real auth.uid(), so they qualify here just like
-- registered users. After upgrade (linkIdentity), the user id is preserved
-- and history follows the player.

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

-- ── feedback ─────────────────────────────────────────────────────────────
-- Anyone (anonymous OR registered) may submit feedback. They may only read
-- their own. Server-side admins read via the service-role key.

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

-- ── api_logs ─────────────────────────────────────────────────────────────
-- No client may read or write api_logs. Inserts happen via the service-role
-- key from Next.js API routes, which bypasses RLS by design.

-- (No public policies on purpose.)
