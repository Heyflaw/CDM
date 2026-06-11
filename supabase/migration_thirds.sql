-- Migration « meilleurs troisièmes » — à coller dans l'éditeur SQL Supabase.
-- Prono bonus : choisir les 8 équipes qui se qualifient en 16es comme
-- meilleurs 3e de groupe. 1 pt par équipe correcte (lib/scoring.ts).
-- Verrouillage : au coup d'envoi du premier match de la 3e journée.

-- ----- 1) Journée de groupe sur les matchs -------------------------
-- (alimentée par /api/sync depuis football-data ; null en élimination)
alter table public.matches add column if not exists matchday int;

-- ----- 2) Table des pronos -----------------------------------------
create table if not exists public.third_place_predictions (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  teams      text[] not null check (array_length(teams, 1) = 8),
  points     int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.third_place_predictions enable row level security;

-- ----- 3) RLS -------------------------------------------------------
-- Verrou global : dès que la 3e journée de groupes a commencé.
-- Tant que matchday n'est pas renseigné (sync pas encore passé), on
-- considère le prono ouvert (coalesce -> 'infinity').
drop policy if exists "third_preds_read"   on public.third_place_predictions;
drop policy if exists "third_preds_insert" on public.third_place_predictions;
drop policy if exists "third_preds_update" on public.third_place_predictions;

create policy "third_preds_read" on public.third_place_predictions
  for select to authenticated
  using (
    auth.uid() = user_id
    or now() >= coalesce(
      (select min(kickoff_at) from public.matches
        where matchday = 3 and group_code is not null),
      'infinity'::timestamptz
    )
  );

create policy "third_preds_insert" on public.third_place_predictions
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and now() < coalesce(
      (select min(kickoff_at) from public.matches
        where matchday = 3 and group_code is not null),
      'infinity'::timestamptz
    )
  );

create policy "third_preds_update" on public.third_place_predictions
  for update to authenticated
  using (
    auth.uid() = user_id
    and now() < coalesce(
      (select min(kickoff_at) from public.matches
        where matchday = 3 and group_code is not null),
      'infinity'::timestamptz
    )
  );

grant all                    on public.third_place_predictions to service_role;
grant select, insert, update on public.third_place_predictions to authenticated;

-- ----- 4) Classement : ajoute les points des 3e ---------------------
create or replace function public.get_leaderboard()
returns table (
  user_id       uuid,
  display_name  text,
  total_points  bigint,
  correct_count bigint
)
language sql
security definer
set search_path = public
as $$
  with ko as (
    select user_id,
           coalesce(sum(points), 0)            as pts,
           coalesce(sum((points > 0)::int), 0) as correct
    from public.predictions
    group by user_id
  ),
  grp as (
    select user_id,
           coalesce(sum(points), 0)            as pts,
           coalesce(sum((points > 0)::int), 0) as correct
    from public.group_predictions
    group by user_id
  ),
  thirds as (
    -- 1 pt par équipe correcte -> points = nb de bonnes pioches
    select user_id,
           coalesce(sum(points), 0) as pts,
           coalesce(sum(points), 0) as correct
    from public.third_place_predictions
    group by user_id
  )
  select
    p.id,
    p.display_name,
    coalesce(ko.pts, 0) + coalesce(grp.pts, 0) + coalesce(thirds.pts, 0)
      as total_points,
    coalesce(ko.correct, 0) + coalesce(grp.correct, 0) + coalesce(thirds.correct, 0)
      as correct_count
  from public.profiles p
  left join ko     on ko.user_id     = p.id
  left join grp    on grp.user_id    = p.id
  left join thirds on thirds.user_id = p.id
  order by total_points desc, correct_count desc, p.display_name asc;
$$;

grant execute on function public.get_leaderboard() to authenticated;
