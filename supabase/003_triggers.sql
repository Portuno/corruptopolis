-- ─────────────────────────────────────────────────────────────────────────
-- 003_triggers.sql — auto-create profile on signup
-- Run this AFTER 002_rls_policies.sql.
-- ─────────────────────────────────────────────────────────────────────────

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

-- ── Convenience view: per-user W/L stats ────────────────────────────────
create or replace view public.profile_stats as
select
    p.id as user_id,
    p.display_name,
    count(m.*) filter (where m.result = 'win')        as wins,
    count(m.*) filter (where m.result = 'loss')       as losses,
    count(m.*) filter (where m.result = 'abandoned')  as abandoned,
    count(m.*)                                        as total_matches,
    coalesce(avg(m.final_avg), 0)                     as avg_dominance,
    max(m.created_at)                                 as last_match_at
from public.profiles p
left join public.matches m on m.user_id = p.id
group by p.id, p.display_name;

-- The view inherits RLS from public.matches/profiles, so each user only
-- sees their own row.
grant select on public.profile_stats to anon, authenticated;
