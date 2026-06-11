-- =============================================================
-- Pronos CDM 2026 — migration "classement des groupes"
-- Ajoute la table standings (classement officiel live des poules),
-- alimentée par /api/sync depuis football-data.org.
-- À exécuter UNE FOIS dans Supabase > SQL Editor (idempotent).
-- =============================================================

create table if not exists public.standings (
  group_code    text not null,            -- 'A'..'L'
  position      int  not null,            -- 1..4 dans le groupe
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

alter table public.standings enable row level security;

drop policy if exists "standings_read" on public.standings;
create policy "standings_read" on public.standings
  for select to authenticated using (true);

grant all    on public.standings to service_role;
grant select on public.standings to authenticated;
