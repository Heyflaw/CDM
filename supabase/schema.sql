-- =============================================================
-- Pronos CDM 2026 — schéma Supabase (format hybride)
-- Pronos = 1er/2e de chaque groupe + qualifié de chaque match d'élimination.
-- À coller dans Supabase > SQL Editor et exécuter une fois (base neuve).
-- Base déjà créée avec une ancienne version ? Utilise migration_hybride.sql.
-- =============================================================

-- ----- Tables -------------------------------------------------

-- Profil joueur (lié à auth.users)
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

-- Matchs (alimentés par /api/sync depuis football-data.org ; id = match id)
create table if not exists public.matches (
  id          bigint primary key,
  round       text,                        -- libellé affichable : "Groupe A", "8es de finale"
  group_code  text,                        -- 'A'..'L' en phase de groupes, null en élimination
  stage       text,                        -- GROUP_STAGE, LAST_32, …, FINAL
  home_team   text not null,
  away_team   text not null,
  home_flag   text,                        -- url du logo/drapeau
  away_flag   text,
  kickoff_at  timestamptz not null,
  status      text not null default 'SCHEDULED',
  home_goals  int,
  away_goals  int,
  winner      text,                        -- 'HOME' | 'AWAY' | 'DRAW' | null (intègre les t.a.b.)
  updated_at  timestamptz not null default now()
);
create index if not exists matches_group_idx on public.matches (group_code);

-- Pronos d'élimination directe : on choisit l'équipe qui passe.
create table if not exists public.predictions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  match_id   bigint not null references public.matches (id) on delete cascade,
  pick       text not null check (pick in ('HOME', 'AWAY')),
  points     int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, match_id)
);
create index if not exists predictions_match_idx on public.predictions (match_id);
create index if not exists predictions_user_idx  on public.predictions (user_id);

-- Pronos de phase de groupes : 1er et 2e d'un groupe.
create table if not exists public.group_predictions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  group_code  text not null,               -- 'A'..'L'
  first_team  text not null,               -- équipe prédite 1re
  second_team text not null,               -- équipe prédite 2e
  points      int  not null default 0,
  created_at  timestamptz not null default now(),
  unique (user_id, group_code)
);
create index if not exists group_predictions_user_idx on public.group_predictions (user_id);

-- Classement officiel des groupes (alimenté par /api/sync).
create table if not exists public.standings (
  group_code    text not null,            -- 'A'..'L'
  position      int  not null,            -- 1..4
  team          text not null,
  team_flag     text,
  played        int  not null default 0,
  won           int  not null default 0,
  draw          int  not null default 0,
  lost          int  not null default 0,
  goals_for     int  not null default 0,
  goals_against int  not null default 0,
  goal_diff     int  not null default 0,
  points        int  not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (group_code, position)
);

-- ----- Row Level Security ------------------------------------

alter table public.profiles          enable row level security;
alter table public.matches           enable row level security;
alter table public.predictions       enable row level security;
alter table public.group_predictions enable row level security;
alter table public.standings         enable row level security;

-- profiles : tout le monde (connecté) lit ; chacun gère le sien
drop policy if exists "profiles_read"   on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_read"   on public.profiles for select to authenticated using (true);
create policy "profiles_insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update to authenticated using (auth.uid() = id);

-- matches : lecture seule pour les joueurs (écriture réservée au service role via sync)
drop policy if exists "matches_read" on public.matches;
create policy "matches_read" on public.matches for select to authenticated using (true);

-- predictions (élimination directe) :
--   lecture  -> les siennes toujours, celles des autres après le coup d'envoi
--   écriture -> les siennes, sur un match d'élimination, avant le coup d'envoi
drop policy if exists "predictions_read"   on public.predictions;
drop policy if exists "predictions_insert" on public.predictions;
drop policy if exists "predictions_update" on public.predictions;

create policy "predictions_read" on public.predictions for select to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.matches m
      where m.id = match_id and m.kickoff_at <= now()
    )
  );

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

-- group_predictions :
--   lecture  -> les siens toujours, ceux des autres une fois le groupe commencé
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

-- standings : lecture seule pour les joueurs (écriture réservée au sync).
drop policy if exists "standings_read" on public.standings;
create policy "standings_read" on public.standings
  for select to authenticated using (true);

-- ----- Privilèges de table -----------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant all on public.matches           to service_role;
grant all on public.predictions       to service_role;
grant all on public.group_predictions to service_role;
grant all on public.profiles          to service_role;
grant all on public.standings         to service_role;

grant select                 on public.matches           to authenticated;
grant select, insert, update on public.predictions       to authenticated;
grant select, insert, update on public.group_predictions to authenticated;
grant select, insert, update on public.profiles          to authenticated;
grant select                 on public.standings         to authenticated;

-- ----- Classement (RPC) --------------------------------------
-- SECURITY DEFINER : agrège les points (groupes + élim.) de tous les joueurs
-- sans exposer les pronos individuels.
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
