import Link from "next/link";
import { redirect } from "next/navigation";
import { format, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import {
  hasKickedOff,
  isFinished,
  type GroupPrediction,
  type LeaderboardRow,
  type Match,
  type Prediction,
} from "@/lib/types";
import Nav from "./components/Nav";
import { MatchRow } from "./components/MatchRow";
import { TeamLabel } from "./components/TeamLabel";
import { LiveRefresher } from "./components/LiveRefresher";
import {
  GroupPredictionForm,
  type GroupTeam,
} from "./matchs/GroupPredictionForm";
import { KnockoutPredictionForm } from "./matchs/KnockoutPredictionForm";

export const dynamic = "force-dynamic";

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function HomePage() {
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

  const [{ data: matchesData }, { data: predsData }, { data: groupPredsData }, { data: lbData }] =
    await Promise.all([
      supabase.from("matches").select("*").order("kickoff_at", { ascending: true }),
      supabase.from("predictions").select("*").eq("user_id", user.id),
      supabase.from("group_predictions").select("*").eq("user_id", user.id),
      supabase.rpc("get_leaderboard"),
    ]);

  const matches = (matchesData ?? []) as Match[];
  const myPreds = new Map<number, Prediction>(
    (predsData ?? []).map((p) => [p.match_id, p as Prediction])
  );
  const myGroupPreds = new Map<string, GroupPrediction>(
    (groupPredsData ?? []).map((g) => [g.group_code, g as GroupPrediction])
  );
  const leaderboard = (lbData ?? []) as LeaderboardRow[];

  // --- Groupes : 1er coup d'envoi + équipes (pour les pronos à poser) ---
  type Bucket = { code: string; teams: GroupTeam[]; firstKick: string };
  const buckets = new Map<string, Bucket>();
  for (const m of matches) {
    if (!m.group_code) continue;
    const b =
      buckets.get(m.group_code) ??
      ({ code: m.group_code, teams: [], firstKick: m.kickoff_at } as Bucket);
    if (m.kickoff_at < b.firstKick) b.firstKick = m.kickoff_at;
    for (const [name, flag] of [
      [m.home_team, m.home_flag],
      [m.away_team, m.away_flag],
    ] as const) {
      if (!b.teams.some((t) => t.name === name)) b.teams.push({ name, flag });
    }
    buckets.set(m.group_code, b);
  }
  for (const b of buckets.values())
    b.teams.sort((a, z) => a.name.localeCompare(z.name));

  // Groupes à poser : se verrouillent aujourd'hui et pas encore pronostiqués.
  const pendingGroups = [...buckets.values()]
    .filter(
      (b) =>
        isToday(new Date(b.firstKick)) &&
        !hasKickedOff({ kickoff_at: b.firstKick }) &&
        !myGroupPreds.has(b.code)
    )
    .sort((a, z) => a.firstKick.localeCompare(z.firstKick));

  // Matchs du jour + pronos d'élimination à poser aujourd'hui.
  const todayMatches = matches.filter((m) => isToday(new Date(m.kickoff_at)));
  const pendingKnockout = todayMatches.filter(
    (m) => !m.group_code && !hasKickedOff(m) && !myPreds.has(m.id)
  );
  const upcomingNext = matches.filter((m) => !hasKickedOff(m)).slice(0, 4);

  const hasTodo = pendingGroups.length > 0 || pendingKnockout.length > 0;
  const pendingCount = pendingGroups.length + pendingKnockout.length;
  const liveMatches = todayMatches.filter(
    (m) => hasKickedOff(m) && !isFinished(m.status)
  );
  const hasLive = liveMatches.length > 0;
  const restToday = todayMatches.filter((m) => !liveMatches.includes(m));
  const medals = ["🥇", "🥈", "🥉"];
  const myRow = leaderboard.find((r) => r.user_id === user.id);
  const myRank = myRow ? leaderboard.indexOf(myRow) + 1 : null;

  return (
    <>
      <Nav active="today" displayName={profile.display_name} />
      {hasLive && <LiveRefresher />}
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        {/* ===== EN DIRECT (score live en avant) ===== */}
        {hasLive && (
          <section className="animate-fade-up mb-8">
            <div className="mb-2 flex items-center gap-2">
              <span className="live-dot inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="font-display text-2xl uppercase leading-none">
                En direct
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {liveMatches.map((m) => (
                <article key={m.id} className="card border-accent/40 p-5">
                  <p className="mb-3 text-center text-[11px] uppercase tracking-widest text-muted">
                    {m.round}
                  </p>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <TeamLabel
                      name={m.home_team}
                      flag={m.home_flag}
                      align="right"
                    />
                    <div className="flex items-baseline gap-2 font-display text-5xl tabular-nums">
                      <span className={m.winner === "HOME" ? "text-accent" : ""}>
                        {m.home_goals ?? 0}
                      </span>
                      <span className="text-muted">:</span>
                      <span className={m.winner === "AWAY" ? "text-accent" : ""}>
                        {m.away_goals ?? 0}
                      </span>
                    </div>
                    <TeamLabel name={m.away_team} flag={m.away_flag} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ===== Héros + CTA ===== */}
        <header className="animate-fade-up mb-9">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
            {cap(format(new Date(), "EEEE d MMMM", { locale: fr }))} · CDM 2026
          </p>
          {hasTodo ? (
            <>
              <h1 className="font-display text-6xl uppercase leading-[0.82]">
                À toi
                <br />
                de jouer
              </h1>
              <p className="mt-2 text-sm text-muted">
                {pendingCount} prono{pendingCount > 1 ? "s" : ""} à poser avant
                le coup d’envoi.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-6xl uppercase leading-[0.82]">
                {cap(format(new Date(), "d MMMM", { locale: fr }))}
              </h1>
              <p className="mt-2 text-sm text-muted">
                {hasLive
                  ? "Ça joue en ce moment ⚽"
                  : todayMatches.length > 0
                    ? `${todayMatches.length} match${todayMatches.length > 1 ? "s" : ""} aujourd’hui`
                    : "Pas de match aujourd’hui — repos pour les pronostiqueurs."}
              </p>
            </>
          )}
        </header>

        {/* ===== À poser maintenant ===== */}
        {hasTodo && (
          <section className="animate-fade-up mb-10" style={{ animationDelay: "60ms" }}>
            <div className="mb-3 flex items-center gap-2">
              <span className="chip bg-accent/15 text-accent">À poser</span>
              <h2 className="text-2xl font-extrabold tracking-tight">
                Avant que ça verrouille
              </h2>
            </div>

            <div className="flex flex-col gap-3">
              {pendingGroups.map((b) => (
                <article key={b.code} className="card p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-display text-2xl leading-none">
                      Groupe {b.code}
                    </h3>
                    <span className="chip bg-surface-2 text-muted">
                      🔒 {format(new Date(b.firstKick), "HH:mm", { locale: fr })}
                    </span>
                  </div>
                  <GroupPredictionForm groupCode={b.code} teams={b.teams} />
                </article>
              ))}

              {pendingKnockout.map((m) => (
                <MatchRow
                  key={m.id}
                  match={m}
                  footer={<KnockoutPredictionForm match={m} />}
                />
              ))}
            </div>
          </section>
        )}

        {/* ===== Matchs du jour (hors live) / prochains ===== */}
        {(todayMatches.length > 0 ? restToday : upcomingNext).length > 0 && (
          <section
            className="animate-fade-up mb-10"
            style={{ animationDelay: "120ms" }}
          >
            <h2 className="mb-3 text-2xl font-extrabold tracking-tight">
              {todayMatches.length > 0 ? "Les matchs du jour" : "Prochains matchs"}
            </h2>
            <div className="flex flex-col gap-3">
              {(todayMatches.length > 0 ? restToday : upcomingNext).map((m) => (
                <MatchRow key={m.id} match={m} highlightWinner />
              ))}
            </div>
          </section>
        )}

        {/* ===== Aperçu classement ===== */}
        {leaderboard.length > 0 && (
          <section className="animate-fade-up" style={{ animationDelay: "180ms" }}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-2xl font-extrabold tracking-tight">Classement</h2>
              <Link
                href="/classement"
                className="text-sm font-semibold text-accent hover:underline"
              >
                Tout voir →
              </Link>
            </div>
            <div className="card divide-y divide-border">
              {leaderboard.slice(0, 3).map((row, i) => (
                <div
                  key={row.user_id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    row.user_id === user.id ? "bg-accent/5" : ""
                  }`}
                >
                  <span className="w-6 text-center text-lg">{medals[i]}</span>
                  <span className="flex-1 truncate font-medium">
                    {row.display_name}
                    {row.user_id === user.id && (
                      <span className="ml-1 text-xs text-muted">(toi)</span>
                    )}
                  </span>
                  <span className="font-display text-xl tabular-nums">
                    {row.total_points}
                  </span>
                </div>
              ))}
            </div>
            {myRank && myRank > 3 && (
              <p className="mt-2 text-center text-xs text-muted">
                Toi : {myRank}
                <sup>e</sup> · {myRow?.total_points} pts
              </p>
            )}
          </section>
        )}
      </main>
    </>
  );
}
