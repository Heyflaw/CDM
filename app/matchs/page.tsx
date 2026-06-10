import { redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { hasKickedOff, type Match, type Prediction } from "@/lib/types";
import Nav from "../components/Nav";
import { TeamLabel } from "../components/TeamLabel";
import { PredictionForm } from "./PredictionForm";

export const dynamic = "force-dynamic";

function kickoffLabel(iso: string) {
  return format(new Date(iso), "EEE d MMM · HH:mm", { locale: fr });
}

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

  const upcoming = matches.filter((m) => !hasKickedOff(m));
  const started = matches.filter((m) => hasKickedOff(m)).reverse();

  return (
    <>
      <Nav active="matchs" displayName={profile.display_name} />
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        {matches.length === 0 && (
          <p className="rounded-lg border border-black/10 p-6 text-center text-sm opacity-70 dark:border-white/10">
            Aucun match chargé pour l’instant. Lance une synchro
            (<code>/api/sync</code>) pour récupérer le calendrier.
          </p>
        )}

        {upcoming.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-bold">À pronostiquer</h2>
            <div className="flex flex-col gap-3">
              {upcoming.map((m) => (
                <article
                  key={m.id}
                  className="rounded-xl border border-black/10 p-4 dark:border-white/10"
                >
                  <p className="mb-2 text-center text-xs uppercase tracking-wide opacity-50">
                    {m.round} · {kickoffLabel(m.kickoff_at)}
                  </p>
                  <PredictionForm match={m} prediction={myPreds.get(m.id)} />
                </article>
              ))}
            </div>
          </section>
        )}

        {started.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-bold">Matchs joués / en cours</h2>
            <div className="flex flex-col gap-3">
              {started.map((m) => {
                const pred = myPreds.get(m.id);
                return (
                  <article
                    key={m.id}
                    className="rounded-xl border border-black/10 p-4 dark:border-white/10"
                  >
                    <p className="mb-2 text-center text-xs uppercase tracking-wide opacity-50">
                      {m.round} · {kickoffLabel(m.kickoff_at)}
                    </p>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <TeamLabel
                        name={m.home_team}
                        flag={m.home_flag}
                        align="right"
                      />
                      <div className="text-center text-lg font-bold tabular-nums">
                        {m.home_goals ?? "-"} : {m.away_goals ?? "-"}
                      </div>
                      <TeamLabel name={m.away_team} flag={m.away_flag} />
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-3 text-xs">
                      {pred ? (
                        <span className="opacity-60">
                          Ton prono : {pred.home_pred}-{pred.away_pred}
                        </span>
                      ) : (
                        <span className="opacity-40">Pas de prono</span>
                      )}
                      {pred && <PointsBadge points={pred.points} />}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </>
  );
}

function PointsBadge({ points }: { points: number }) {
  const cls =
    points === 3
      ? "bg-green-500/15 text-green-600 dark:text-green-400"
      : points === 1
        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
        : "bg-black/5 opacity-60 dark:bg-white/10";
  return (
    <span className={`rounded-full px-2 py-0.5 font-semibold ${cls}`}>
      +{points} pt{points > 1 ? "s" : ""}
    </span>
  );
}
