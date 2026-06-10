import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { hasKickedOff, type LeaderboardRow, type Match } from "@/lib/types";
import Nav from "./components/Nav";
import { TeamLabel } from "./components/TeamLabel";

export const dynamic = "force-dynamic";

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

  const { data: lbData } = await supabase.rpc("get_leaderboard");
  const leaderboard = (lbData ?? []) as LeaderboardRow[];

  const { data: matchesData } = await supabase
    .from("matches")
    .select("*")
    .order("kickoff_at", { ascending: true });
  const nextMatches = ((matchesData ?? []) as Match[])
    .filter((m) => !hasKickedOff(m))
    .slice(0, 5);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <>
      <Nav active="leaderboard" displayName={profile.display_name} />
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <h2 className="mb-3 text-lg font-bold">Classement</h2>

        {leaderboard.length === 0 ? (
          <p className="rounded-lg border border-black/10 p-6 text-center text-sm opacity-70 dark:border-white/10">
            Pas encore de joueurs. Invite tes amis à se connecter !
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-black/5 text-left text-xs uppercase tracking-wide opacity-60 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Joueur</th>
                  <th className="px-2 py-2 text-center font-medium">Exacts</th>
                  <th className="px-4 py-2 text-right font-medium">Points</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, i) => (
                  <tr
                    key={row.user_id}
                    className={`border-t border-black/5 dark:border-white/5 ${
                      row.user_id === user.id ? "bg-foreground/5 font-medium" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5">{medals[i] ?? i + 1}</td>
                    <td className="px-4 py-2.5">
                      {row.display_name}
                      {row.user_id === user.id && (
                        <span className="ml-1 text-xs opacity-50">(toi)</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-center tabular-nums opacity-70">
                      {row.exact_count}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums">
                      {row.total_points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-lg font-bold">Prochains matchs</h2>
          <Link href="/matchs" className="text-sm underline opacity-70">
            Tout voir
          </Link>
        </div>
        {nextMatches.length === 0 ? (
          <p className="mt-3 text-sm opacity-60">Aucun match à venir.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {nextMatches.map((m) => (
              <Link
                key={m.id}
                href="/matchs"
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg border border-black/10 px-4 py-3 hover:bg-foreground/5 dark:border-white/10"
              >
                <TeamLabel name={m.home_team} flag={m.home_flag} align="right" />
                <span className="text-center text-xs opacity-50">
                  {format(new Date(m.kickoff_at), "d MMM HH:mm", { locale: fr })}
                </span>
                <TeamLabel name={m.away_team} flag={m.away_flag} />
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
