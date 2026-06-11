-- =============================================================
-- Pronos CDM 2026 — migration "format hybride"
-- Passe du score exact à : pronos de groupe (1er/2e) + bracket d'élimination.
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor sur une base déjà créée
-- avec l'ancien schema.sql. Le script est idempotent (rejouable sans risque).
-- =============================================================

-- ----- 1) Matchs : nouvelles colonnes -------------------------
alter table public.matches add column if not exists group_code text; -- 'A'..'L', null en élimination directe
alter table public.matches add column if not exists stage      text; -- GROUP_STAGE, LAST_32, LAST_16, QUARTER_FINALS, SEMI_FINALS, THIRD_PLACE, FINAL
alter table public.matches add column if not exists winner     text; -- 'HOME' | 'AWAY' | 'DRAW' | null (intègre les tirs au but)

create index if not exists matches_group_idx on public.matches (group_code);

-- ----- 2) Predictions : score exact -> "qui passe" (élim.) -----
-- Les anciens pronos étaient au score : ils n'ont plus de sens ici, on les purge.
delete from public.predictions;

alter table public.predictions add column if not exists pick text; -- 'HOME' | 'AWAY'
alter table public.predictions drop column if exists home_pred;
alter table public.predictions drop column if exists away_pred;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'predictions_pick_check'
  ) then
    alter table public.predictions
      add constraint predictions_pick_check check (pick in ('HOME', 'AWAY'));
  end if;
end $$;

-- ----- 3) Nouvelle table : pronos de groupe (1er / 2e) --------
create table if not exists public.group_predictions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  group_code  text not null,            -- 'A'..'L'
  first_team  text not null,            -- équipe prédite 1re
  second_team text not null,            -- équipe prédite 2e
  points      int  not null default 0,
  created_at  timestamptz not null default now(),
  unique (user_id, group_code)
);
create index if not exists group_predictions_user_idx on public.group_predictions (user_id);

alter table public.group_predictions enable row level security;

-- ----- 4) RLS predictions (élimination directe seulement) -----
drop policy if exists "predictions_read"   on public.predictions;
drop policy if exists "predictions_insert" on public.predictions;
drop policy if exists "predictions_update" on public.predictions;

-- lecture : les siennes toujours ; celles des autres après le coup d'envoi
create policy "predictions_read" on public.predictions for select to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.matches m
      where m.id = match_id and m.kickoff_at <= now()
    )
  );

-- écriture : seulement sur un match d'élimination (group_code null) et avant le coup d'envoi
create policy "predictions_insert" on public.predictions for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id and m.group_code is null and m.kickoff_at > now()
    )
  );

create policy "predictions_update" on public.predictions for update to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id and m.group_code is null and m.kickoff_at > now()
    )
  );

-- ----- 5) RLS group_predictions -------------------------------
--   lecture  -> les siens toujours ; ceux des autres une fois le groupe commencé
--   écriture -> les siens, et uniquement AVANT le 1er match du groupe
drop policy if exists "group_predictions_read"   on public.group_predictions;
drop policy if exists "group_predictions_insert" on public.group_predictions;
drop policy if exists "group_predictions_update" on public.group_predictions;

create policy "group_predictions_read" on public.group_predictions for select to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.matches m
      where m.group_code = group_predictions.group_code and m.kickoff_at <= now()
    )
  );

create policy "group_predictions_insert" on public.group_predictions for insert to authenticated
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.matches m
      where m.group_code = group_predictions.group_code and m.kickoff_at <= now()
    )
  );

create policy "group_predictions_update" on public.group_predictions for update to authenticated
  using (
    auth.uid() = user_id
    and not exists (
      select 1 from public.matches m
      where m.group_code = group_predictions.group_code and m.kickoff_at <= now()
    )
  );

-- ----- 6) Privilèges de table ---------------------------------
grant all                    on public.group_predictions to service_role;
grant select, insert, update on public.group_predictions to authenticated;

-- ----- 7) Classement (RPC) : additionne groupes + élim. -------
-- La signature change (correct_count remplace exact_count/played_count) :
-- on doit DROP avant de recréer.
drop function if exists public.get_leaderboard();
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
  )
  select
    p.id,
    p.display_name,
    coalesce(ko.pts, 0) + coalesce(grp.pts, 0)         as total_points,
    coalesce(ko.correct, 0) + coalesce(grp.correct, 0) as correct_count
  from public.profiles p
  left join ko  on ko.user_id  = p.id
  left join grp on grp.user_id = p.id
  order by total_points desc, correct_count desc, p.display_name asc;
$$;

grant execute on function public.get_leaderboard() to authenticated;
