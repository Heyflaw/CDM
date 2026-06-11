import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type LeaderboardRow } from "@/lib/types";
import Nav from "../components/Nav";

export const dynamic = "force-dynamic";

export default async function ClassementPage() {
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

  const { data: lbData } = await supabase.rpc("get_leaderboard");
  const leaderboard = (lbData ?? []) as LeaderboardRow[];

  const podium = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const medals = ["🥇", "🥈", "🥉"];
  // Ordre visuel du podium : 2e · 1er · 3e
  const podiumOrder = [podium[1], podium[0], podium[2]];
  const heights = ["h-20", "h-28", "h-16"];

  return (
    <>
      <Nav active="classement" displayName={profile.display_name} />
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <header className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
            Pronos CDM 2026
          </p>
          <h1 className="font-display text-4xl uppercase leading-none">
            Classement
          </h1>
        </header>

        {leaderboard.length === 0 ? (
          <p className="card p-6 text-center text-sm text-muted">
            Pas encore de joueurs. Invite tes amis à se connecter !
          </p>
        ) : (
          <>
            {/* ===== Podium ===== */}
            {podium.length > 0 && (
              <div className="animate-fade-up mb-6 grid grid-cols-3 items-end gap-2">
                {podiumOrder.map((row, i) =>
                  row ? (
                    <div key={row.user_id} className="flex flex-col items-center">
                      <span className="mb-1 text-2xl">{medals[i === 0 ? 1 : i === 1 ? 0 : 2]}</span>
                      <span className="mb-1 max-w-full truncate text-center text-sm font-semibold">
                        {row.display_name}
                        {row.user_id === user.id && (
                          <span className="ml-1 text-xs text-muted">(toi)</span>
                        )}
                      </span>
                      <div
                        className={`flex w-full ${heights[i]} flex-col items-center justify-center rounded-t-xl border border-b-0 border-border ${
                          i === 1
                            ? "bg-gradient-to-b from-accent/25 to-surface"
                            : "bg-surface"
                        }`}
                      >
                        <span className="font-display text-2xl tabular-nums">
                          {row.total_points}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide text-muted">
                          pts
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div key={i} />
                  )
                )}
              </div>
            )}

            {/* ===== Tableau complet ===== */}
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-[11px] uppercase tracking-widest text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">#</th>
                    <th className="px-2 py-2.5 font-semibold">Joueur</th>
                    <th className="px-2 py-2.5 text-center font-semibold">Bons</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, i) => (
                    <tr
                      key={row.user_id}
                      className={`border-t border-border/60 ${
                        row.user_id === user.id ? "bg-accent/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3 tabular-nums text-muted">
                        {medals[i] ?? i + 1}
                      </td>
                      <td className="px-2 py-3 font-medium">
                        {row.display_name}
                        {row.user_id === user.id && (
                          <span className="ml-1 text-xs text-muted">(toi)</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-center tabular-nums text-muted">
                        {row.correct_count}
                      </td>
                      <td className="px-4 py-3 text-right font-display text-lg tabular-nums">
                        {row.total_points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rest.length === 0 && podium.length > 0 && (
              <p className="mt-4 text-center text-xs text-muted">
                Le barème : groupe 1er/2e (3 / 1 pt) · qualifié en élimination
                (1 → 8 pts selon le tour).
              </p>
            )}
          </>
        )}
      </main>
    </>
  );
}
