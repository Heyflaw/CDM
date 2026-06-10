-- =============================================================
-- Pronos CDM 2026 — schéma Supabase
-- À coller dans Supabase > SQL Editor et exécuter une fois.
-- =============================================================

-- ----- Tables -------------------------------------------------

-- Profil joueur (lié à auth.users)
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

-- Matchs (alimentés par /api/sync depuis API-Football ; id = fixture id)
create table if not exists public.matches (
  id          bigint primary key,
  round       text,                       -- ex. "Group Stage - 1", "Round of 16"
  home_team   text not null,
  away_team   text not null,
  home_flag   text,                        -- url du logo/drapeau
  away_flag   text,
  kickoff_at  timestamptz not null,
  status      text not null default 'NS',  -- code court API-Football (NS, 1H, FT, ...)
  home_goals  int,
  away_goals  int,
  updated_at  timestamptz not null default now()
);

-- Pronostics
create table if not exists public.predictions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  match_id   bigint not null references public.matches (id) on delete cascade,
  home_pred  int not null,
  away_pred  int not null,
  points     int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, match_id)
);

create index if not exists predictions_match_idx on public.predictions (match_id);
create index if not exists predictions_user_idx  on public.predictions (user_id);

-- ----- Row Level Security ------------------------------------

alter table public.profiles    enable row level security;
alter table public.matches     enable row level security;
alter table public.predictions enable row level security;

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

-- predictions :
--   lecture  -> les siennes toujours, celles des autres seulement après le coup d'envoi
--   écriture -> les siennes, et uniquement avant le coup d'envoi
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
      where m.id = match_id and m.kickoff_at > now()
    )
  );

create policy "predictions_update" on public.predictions for update to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id and m.kickoff_at > now()
    )
  );

-- ----- Privilèges de table -----------------------------------
-- Les policies RLS ne suffisent pas : il faut aussi le GRANT SQL sous-jacent.
-- (Certains projets Supabase ne l'accordent pas automatiquement.)
grant usage on schema public to anon, authenticated, service_role;

-- service_role (clé secrète, utilisé par /api/sync) : accès complet.
grant all on public.matches     to service_role;
grant all on public.predictions to service_role;
grant all on public.profiles    to service_role;

-- authenticated (joueurs connectés) : le RLS filtre ensuite les lignes.
grant select                 on public.matches     to authenticated;
grant select, insert, update on public.predictions to authenticated;
grant select, insert, update on public.profiles    to authenticated;

-- ----- Classement (RPC) --------------------------------------
-- SECURITY DEFINER : agrège les points de tous les joueurs sans exposer
-- les pronos individuels. Seuls les matchs terminés portent des points.
create or replace function public.get_leaderboard()
returns table (
  user_id      uuid,
  display_name text,
  total_points bigint,
  exact_count  bigint,
  played_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.display_name,
    coalesce(sum(pr.points), 0)                       as total_points,
    coalesce(sum((pr.points = 3)::int), 0)            as exact_count,
    coalesce(sum((pr.points > 0)::int), 0)            as played_count
  from public.profiles p
  left join public.predictions pr on pr.user_id = p.id
  group by p.id, p.display_name
  order by total_points desc, exact_count desc, p.display_name asc;
$$;

grant execute on function public.get_leaderboard() to authenticated;
