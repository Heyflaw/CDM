/* eslint-disable @next/next/no-img-element */

import type { Standing } from "@/lib/types";
import { frTeam } from "@/lib/teams";

// Classement live d'un groupe. Les 2 premiers (qualifiés) sont mis en avant ;
// le 3e (repêchage possible) est légèrement souligné.
export function StandingsTable({ rows }: { rows: Standing[] }) {
  return (
    <table className="w-full text-xs tabular-nums">
      <thead className="text-[10px] uppercase tracking-wide text-muted">
        <tr>
          <th className="w-4 py-1 text-left font-medium">#</th>
          <th className="py-1 text-left font-medium">Équipe</th>
          <th className="px-1 py-1 text-center font-medium">J</th>
          <th className="px-1 py-1 text-center font-medium">Diff</th>
          <th className="py-1 text-right font-medium">Pts</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const qualified = r.position <= 2;
          const third = r.position === 3;
          return (
            <tr
              key={r.position}
              className={`border-t border-border/50 ${
                qualified ? "" : "text-muted"
              }`}
            >
              <td className="py-1.5">
                <span
                  className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                    qualified
                      ? "bg-accent text-accent-ink"
                      : third
                        ? "bg-gold/20 text-gold"
                        : "text-muted"
                  }`}
                >
                  {r.position}
                </span>
              </td>
              <td className="py-1.5">
                <span className="flex items-center gap-1.5">
                  {r.team_flag ? (
                    <img
                      src={r.team_flag}
                      alt=""
                      width={16}
                      height={16}
                      className="h-4 w-4 shrink-0 object-contain"
                    />
                  ) : null}
                  <span className="truncate font-medium">{frTeam(r.team)}</span>
                </span>
              </td>
              <td className="px-1 py-1.5 text-center">{r.played}</td>
              <td className="px-1 py-1.5 text-center">
                {r.goal_diff > 0 ? `+${r.goal_diff}` : r.goal_diff}
              </td>
              <td className="py-1.5 text-right font-bold text-foreground">
                {r.points}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
