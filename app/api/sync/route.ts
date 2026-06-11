import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  groupPredictionPoints,
  knockoutPoints,
  thirdPlacePoints,
} from "@/lib/scoring";
import { isFinished } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// football-data.org : la Coupe du Monde a le code compétition "WC".
const COMPETITION = "WC";

type ApiTeam = { name: string | null; crest: string | null };

type ApiMatch = {
  id: number;
  utcDate: string;
  status: string; // SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED, ...
  stage: string | null; // GROUP_STAGE, LAST_32, …, FINAL
  matchday: number | null; // 1..3 en phase de groupes
  group: string | null; // GROUP_A, … (null en phase à élimination directe)
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    fullTime: { home: number | null; away: number | null };
  };
};

type ApiStandingRow = {
  position: number;
  team: { name: string | null; crest: string | null };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

type ApiStanding = {
  type: string; // "TOTAL" | "HOME" | "AWAY"
  group: string | null; // "GROUP_A", …
  table: ApiStandingRow[];
};

// "LAST_16" -> "8es de finale", etc.
const STAGE_FR: Record<string, string> = {
  GROUP_STAGE: "Phase de groupes",
  LAST_32: "16es de finale",
  LAST_16: "8es de finale",
  QUARTER_FINALS: "Quarts de finale",
  SEMI_FINALS: "Demi-finales",
  THIRD_PLACE: "Petite finale",
  FINAL: "Finale",
};

function groupCode(m: ApiMatch): string | null {
  return m.group ? m.group.replace("GROUP_", "") : null;
}

function roundLabel(m: ApiMatch): string {
  const g = groupCode(m);
  if (g) return `Groupe ${g}`;
  if (m.stage) return STAGE_FR[m.stage] ?? m.stage.replace(/_/g, " ");
  return "Match";
}

function mapWinner(
  w: ApiMatch["score"]["winner"]
): "HOME" | "AWAY" | "DRAW" | null {
  if (w === "HOME_TEAM") return "HOME";
  if (w === "AWAY_TEAM") return "AWAY";
  if (w === "DRAW") return "DRAW";
  return null;
}

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  // Permet aussi un test manuel : /api/sync?secret=...
  return request.nextUrl.searchParams.get("secret") === secret;
}

function fdFetch(path: string, token: string) {
  return fetch(`https://api.football-data.org/v4/${path}`, {
    headers: { "X-Auth-Token": token },
    cache: "no-store",
  });
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = process.env.FOOTBALLDATA_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "missing FOOTBALLDATA_TOKEN" },
      { status: 500 }
    );
  }

  // 1) Récupère les matchs de la CDM.
  const matchesRes = await fdFetch(`competitions/${COMPETITION}/matches`, token);
  if (!matchesRes.ok) {
    return NextResponse.json(
      { error: "football-data error", status: matchesRes.status },
      { status: 502 }
    );
  }
  const matchesPayload = (await matchesRes.json()) as { matches?: ApiMatch[] };
  const apiMatches = matchesPayload.matches ?? [];

  const supabase = createAdminClient();

  // 2) Upsert des matchs (uniquement ceux dont les 2 équipes sont connues).
  const rows = apiMatches
    .filter((m) => m.homeTeam.name && m.awayTeam.name)
    .map((m) => ({
      id: m.id,
      round: roundLabel(m),
      group_code: groupCode(m),
      stage: m.stage,
      home_team: m.homeTeam.name as string,
      away_team: m.awayTeam.name as string,
      home_flag: m.homeTeam.crest,
      away_flag: m.awayTeam.crest,
      kickoff_at: m.utcDate,
      status: m.status,
      home_goals: m.score.fullTime.home,
      away_goals: m.score.fullTime.away,
      winner: mapWinner(m.score.winner),
      matchday: groupCode(m) ? m.matchday : null,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length > 0) {
    let { error } = await supabase.from("matches").upsert(rows);
    if (error && /matchday/i.test(error.message)) {
      // Migration « thirds » pas encore appliquée : on synchronise sans la colonne.
      ({ error } = await supabase
        .from("matches")
        .upsert(rows.map(({ matchday: _md, ...r }) => r)));
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // 3) Récupère le classement officiel des groupes (départage les égalités).
  //    Best-effort : si l'endpoint échoue, on ne score juste pas les groupes.
  const groupStandings = new Map<string, string[]>(); // 'A' -> [équipe par position]
  const standingRows: Record<string, unknown>[] = [];
  const standingsRes = await fdFetch(
    `competitions/${COMPETITION}/standings`,
    token
  );
  if (standingsRes.ok) {
    const sp = (await standingsRes.json()) as { standings?: ApiStanding[] };
    for (const s of sp.standings ?? []) {
      if (s.type !== "TOTAL" || !s.group) continue;
      // football-data renvoie "GROUP_A" (matches) ou "Group A" (standings) ->
      // on normalise vers "A".."L".
      const code = s.group.replace(/^group[_ ]/i, "").trim();
      const ordered: string[] = [];
      for (const t of [...s.table].sort((a, b) => a.position - b.position)) {
        if (!t.team.name) continue;
        ordered.push(t.team.name);
        standingRows.push({
          group_code: code,
          position: t.position,
          team: t.team.name,
          team_flag: t.team.crest,
          played: t.playedGames,
          won: t.won,
          draw: t.draw,
          lost: t.lost,
          goals_for: t.goalsFor,
          goals_against: t.goalsAgainst,
          goal_diff: t.goalDifference,
          points: t.points,
          updated_at: new Date().toISOString(),
        });
      }
      groupStandings.set(code, ordered);
    }
    // Snapshot complet : on remplace tout (auto-nettoyage si un code change).
    if (standingRows.length > 0) {
      await supabase.from("standings").delete().gte("position", 0);
      await supabase.from("standings").insert(standingRows);
    }
  }

  // 4) Score les pronos de groupe pour les groupes terminés.
  //    Un groupe est terminé quand tous ses matchs sont "finished".
  const byGroup = new Map<string, { total: number; finished: number }>();
  for (const r of rows) {
    if (!r.group_code) continue;
    const g = byGroup.get(r.group_code) ?? { total: 0, finished: 0 };
    g.total += 1;
    if (isFinished(r.status)) g.finished += 1;
    byGroup.set(r.group_code, g);
  }

  let groupsScored = 0;
  let updatedGroupPreds = 0;
  for (const [code, counts] of byGroup) {
    if (counts.total === 0 || counts.finished < counts.total) continue;
    const ordered = groupStandings.get(code);
    if (!ordered || ordered.length < 2) continue;
    groupsScored += 1;
    const [real1, real2] = ordered;

    const { data: preds } = await supabase
      .from("group_predictions")
      .select("id, first_team, second_team, points")
      .eq("group_code", code);

    for (const p of preds ?? []) {
      const pts = groupPredictionPoints(
        p.first_team,
        p.second_team,
        real1,
        real2
      );
      if (pts !== p.points) {
        await supabase
          .from("group_predictions")
          .update({ points: pts })
          .eq("id", p.id);
        updatedGroupPreds += 1;
      }
    }
  }

  // 5) Score les pronos d'élimination directe (matchs tranchés).
  const decided = rows.filter(
    (r) =>
      !r.group_code &&
      isFinished(r.status) &&
      (r.winner === "HOME" || r.winner === "AWAY")
  );

  let updatedKnockoutPreds = 0;
  for (const m of decided) {
    const { data: preds } = await supabase
      .from("predictions")
      .select("id, pick, points")
      .eq("match_id", m.id);

    for (const p of preds ?? []) {
      const pts = knockoutPoints(m.stage ?? "", p.pick === m.winner);
      if (pts !== p.points) {
        await supabase
          .from("predictions")
          .update({ points: pts })
          .eq("id", p.id);
        updatedKnockoutPreds += 1;
      }
    }
  }

  // 6) Score les pronos « meilleurs 3e ». Une équipe est qualifiée comme
  //    meilleur 3e si elle est 3e de son groupe au classement final ET
  //    apparaît dans un match de 16es (zéro calcul de départage maison).
  //    Best-effort : si la table n'existe pas encore (migration), on saute.
  let updatedThirdPreds = 0;
  const allGroupsFinished =
    byGroup.size >= 12 &&
    [...byGroup.values()].every((g) => g.total > 0 && g.finished === g.total);
  if (allGroupsFinished) {
    const thirds = new Set<string>();
    for (const ordered of groupStandings.values()) {
      if (ordered[2]) thirds.add(ordered[2]);
    }
    const inLast32 = new Set<string>();
    for (const r of rows) {
      if (r.stage === "LAST_32") {
        inLast32.add(r.home_team);
        inLast32.add(r.away_team);
      }
    }
    const qualified = new Set([...thirds].filter((t) => inLast32.has(t)));
    if (qualified.size > 0) {
      const { data: preds, error } = await supabase
        .from("third_place_predictions")
        .select("user_id, teams, points");
      if (!error) {
        for (const p of preds ?? []) {
          const pts = thirdPlacePoints(p.teams ?? [], qualified);
          if (pts !== p.points) {
            await supabase
              .from("third_place_predictions")
              .update({ points: pts })
              .eq("user_id", p.user_id);
            updatedThirdPreds += 1;
          }
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    matches: rows.length,
    groupsScored,
    decidedKnockouts: decided.length,
    updatedGroupPreds,
    updatedKnockoutPreds,
    updatedThirdPreds,
  });
}
