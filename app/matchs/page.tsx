import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  hasKickedOff,
  isFinished,
  type GroupPrediction,
  type Match,
  type Prediction,
  type Standing,
} from "@/lib/types";
import Nav from "../components/Nav";
import { MatchRow } from "../components/MatchRow";
import { CollapsibleStandings } from "../components/CollapsibleStandings";
import {
  GroupPredictionForm,
  type GroupTeam,
} from "./GroupPredictionForm";
import { KnockoutPredictionForm } from "./KnockoutPredictionForm";
import { PointsBadge } from "../components/PointsBadge";
import { frTeam } from "@/lib/teams";

export const dynamic = "force-dynamic";

type GroupBucket = {
  code: string;
  teams: GroupTeam[];
  matches: Match[];
};

export default async function MatchsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/onboarding");

  const { data: matchesData } = await supabase
    .from("matches")
    .select("*")
    .order("kickoff_at", { ascending: true });
  const matches = (matchesData ?? []) as Match[];

  const { data: predsData } = await supabase
    .from("predictions")
    .select("*")
    .eq("user_id", user.id);
  const myPreds = new Map<number, Prediction>(
    (predsData ?? []).map((p) => [p.match_id, p as Prediction])
  );

  const { data: groupPredsData } = await supabase
    .from("group_predictions")
    .select("*")
    .eq("user_id", user.id);
  const { data: standingsData } = await supabase
    .from("standings")
    .select("*")
    .order("position", { ascending: true });
  const standingsByGroup = new Map<string, Standing[]>();
  for (const s of (standingsData ?? []) as Standing[]) {
    const arr = standingsByGroup.get(s.group_code) ?? [];
    arr.push(s);
    standingsByGroup.set(s.group_code, arr);
  }

  const myGroupPreds = new Map<string, GroupPrediction>(
    (groupPredsData ?? []).map((g) => [g.group_code, g as GroupPrediction])
  );

  // Regroupe les matchs de poule par groupe (avec drapeaux).
  const groupsMap = new Map<string, GroupBucket>();
  for (const m of matches) {
    if (!m.group_code) continue;
    const bucket =
      groupsMap.get(m.group_code) ??
      ({ code: m.group_code, teams: [], matches: [] } as GroupBucket);
    bucket.matches.push(m);
    for (const [name, flag] of [
      [m.home_team, m.home_flag],
      [m.away_team, m.away_flag],
    ] as const) {
      if (!bucket.teams.some((t) => t.name === name)) {
        bucket.teams.push({ name, flag });
      }
    }
    groupsMap.set(m.group_code, bucket);
  }
  const groups = [...groupsMap.values()].sort((a, b) =>
    a.code.localeCompare(b.code)
  );
  for (const g of groups) g.teams.sort((a, b) => a.name.localeCompare(b.name));

  const knockout = matches.filter((m) => !m.group_code);
  const koUpcoming = knockout.filter((m) => !hasKickedOff(m));
  const koStarted = knockout.filter((m) => hasKickedOff(m)).reverse();

  return (
    <>
      <Nav active="matchs" displayName={profile.display_name} />
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        {matches.length === 0 && (
          <p className="card p-6 text-center text-sm text-muted">
            Aucun match chargé pour l’instant.
          </p>
        )}

        {/* ===== Phase de groupes ===== */}
        {groups.length > 0 && (
          <section className="mb-12">
            <SectionTitle kicker="Phase de groupes" title="Tes qualifiés" />
            <p className="mb-2 text-sm text-muted">
              Choisis les équipes qui finissent{" "}
              <span className="text-gold">1er</span> et{" "}
              <span className="text-silver">2e</span> de chaque groupe. Verrouillé
              au coup d’envoi du premier match du groupe.
            </p>
            <p className="mb-4 text-xs text-muted">
              Barème : bonne équipe à la bonne place ={" "}
              <strong className="text-foreground">3 pts</strong> · bonne équipe
              mais place inversée ={" "}
              <strong className="text-foreground">1 pt</strong> (max 6 / groupe).
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {groups.map((g, i) => {
                const started = g.matches.some((m) => hasKickedOff(m));
                const finished = g.matches.every((m) => isFinished(m.status));
                const pred = myGroupPreds.get(g.code);
                const standings = standingsByGroup.get(g.code) ?? [];
                return (
                  <article
                    key={g.code}
                    className="card animate-fade-up p-4"
                    style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-display text-2xl leading-none">
                        Groupe {g.code}
                      </h3>
                      {started && (
                        <span className="chip bg-surface-2 text-muted">
                          🔒 {finished ? "terminé" : "en cours"}
                        </span>
                      )}
                    </div>
                    {!started ? (
                      <GroupPredictionForm
                        groupCode={g.code}
                        teams={g.teams}
                        prediction={pred}
                      />
                    ) : (
                      <LockedGroup pred={pred} finished={finished} />
                    )}
                    {standings.length > 0 && (
                      <CollapsibleStandings rows={standings} />
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* ===== Élimination directe — à pronostiquer ===== */}
        {koUpcoming.length > 0 && (
          <section className="mb-12">
            <SectionTitle
              kicker="Élimination directe"
              title="À pronostiquer"
            />
            <div className="mt-1 flex flex-col gap-3">
              {koUpcoming.map((m) => (
                <MatchRow
                  key={m.id}
                  match={m}
                  footer={
                    <KnockoutPredictionForm
                      match={m}
                      prediction={myPreds.get(m.id)}
                    />
                  }
                />
              ))}
            </div>
          </section>
        )}

        {/* ===== Élimination directe — joués / en cours ===== */}
        {koStarted.length > 0 && (
          <section>
            <SectionTitle kicker="Élimination directe" title="Résultats" />
            <div className="mt-1 flex flex-col gap-3">
              {koStarted.map((m) => {
                const pred = myPreds.get(m.id);
                const myTeam = pred
                  ? pred.pick === "HOME"
                    ? m.home_team
                    : m.away_team
                  : null;
                const qualifier =
                  m.winner === "HOME"
                    ? m.home_team
                    : m.winner === "AWAY"
                      ? m.away_team
                      : null;
                return (
                  <MatchRow
                    key={m.id}
                    match={m}
                    highlightWinner
                    footer={
                      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
                        {qualifier && (
                          <span className="text-muted">
                            ✅ {frTeam(qualifier)} se qualifie
                          </span>
                        )}
                        {myTeam ? (
                          <span className="text-muted">
                            Ton choix : {frTeam(myTeam)}
                          </span>
                        ) : (
                          <span className="text-muted/60">Pas de prono</span>
                        )}
                        {pred && isFinished(m.status) && (
                          <PointsBadge points={pred.points} />
                        )}
                      </div>
                    }
                  />
                );
              })}
            </div>
          </section>
        )}
      </main>
    </>
  );
}

// Kaio n'a ni accents ni apostrophe : on rend le titre sans diacritiques,
// en capitales (la police d'affichage du projet).
function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
        {kicker}
      </p>
      <h2 className="font-display text-3xl uppercase leading-none">
        {stripAccents(title)}
      </h2>
    </div>
  );
}

function LockedGroup({
  pred,
  finished,
}: {
  pred?: GroupPrediction;
  finished: boolean;
}) {
  if (!pred) {
    return <p className="py-2 text-sm text-muted/60">Pas de prono 🔒</p>;
  }
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="flex items-center gap-2">
        <span className="chip bg-gold/15 text-gold">1er</span>
        {frTeam(pred.first_team)}
      </span>
      <span className="flex items-center gap-2">
        <span className="chip bg-silver/15 text-silver">2e</span>
        {frTeam(pred.second_team)}
      </span>
      <div className="mt-1">
        {finished ? (
          <PointsBadge points={pred.points} />
        ) : (
          <span className="text-xs text-muted">⏳ en attente du classement</span>
        )}
      </div>
    </div>
  );
}
