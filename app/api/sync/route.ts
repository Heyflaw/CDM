import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computePoints } from "@/lib/scoring";
import { isFinished } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// football-data.org : la Coupe du Monde a le code compétition "WC".
const COMPETITION = "WC";

type ApiMatch = {
  id: number;
  utcDate: string;
  status: string; // SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED, ...
  stage: string | null; // GROUP_STAGE, LAST_16, FINAL, ...
  group: string | null; // GROUP_A, ... (null en phase à élimination directe)
  homeTeam: { name: string | null; crest: string | null };
  awayTeam: { name: string | null; crest: string | null };
  score: { fullTime: { home: number | null; away: number | null } };
};

// "GROUP_A" -> "Groupe A", "LAST_16" -> "8es de finale", etc.
const STAGE_FR: Record<string, string> = {
  GROUP_STAGE: "Phase de groupes",
  LAST_16: "8es de finale",
  ROUND_OF_16: "8es de finale",
  QUARTER_FINALS: "Quarts de finale",
  SEMI_FINALS: "Demi-finales",
  THIRD_PLACE: "Petite finale",
  FINAL: "Finale",
};

function roundLabel(m: ApiMatch): string {
  if (m.group) return m.group.replace("GROUP_", "Groupe ");
  if (m.stage) return STAGE_FR[m.stage] ?? m.stage.replace(/_/g, " ");
  return "Match";
}

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  // Permet aussi un test manuel : /api/sync?secret=...
  return request.nextUrl.searchParams.get("secret") === secret;
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

  // 1) Récupère les matchs de la CDM depuis football-data.org.
  const res = await fetch(
    `https://api.football-data.org/v4/competitions/${COMPETITION}/matches`,
    { headers: { "X-Auth-Token": token }, cache: "no-store" }
  );
  if (!res.ok) {
    return NextResponse.json(
      { error: "football-data error", status: res.status },
      { status: 502 }
    );
  }
  const payload = (await res.json()) as { matches?: ApiMatch[] };
  const matches = payload.matches ?? [];

  const supabase = createAdminClient();

  // 2) Upsert des matchs.
  const rows = matches
    .filter((m) => m.homeTeam.name && m.awayTeam.name)
    .map((m) => ({
      id: m.id,
      round: roundLabel(m),
      home_team: m.homeTeam.name as string,
      away_team: m.awayTeam.name as string,
      home_flag: m.homeTeam.crest,
      away_flag: m.awayTeam.crest,
      kickoff_at: m.utcDate,
      status: m.status,
      home_goals: m.score.fullTime.home,
      away_goals: m.score.fullTime.away,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length > 0) {
    const { error } = await supabase.from("matches").upsert(rows);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // 3) Recalcule les points pour les matchs terminés.
  const finished = rows.filter(
    (m) => isFinished(m.status) && m.home_goals !== null && m.away_goals !== null
  );

  let updatedPredictions = 0;
  for (const m of finished) {
    const { data: preds } = await supabase
      .from("predictions")
      .select("id, home_pred, away_pred, points")
      .eq("match_id", m.id);

    for (const p of preds ?? []) {
      const pts = computePoints(
        p.home_pred,
        p.away_pred,
        m.home_goals as number,
        m.away_goals as number
      );
      if (pts !== p.points) {
        await supabase.from("predictions").update({ points: pts }).eq("id", p.id);
        updatedPredictions++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    matches: rows.length,
    finished: finished.length,
    updatedPredictions,
  });
}
