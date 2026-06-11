import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { hasKickedOff, isFinished, type Match } from "@/lib/types";
import { TeamLabel } from "./TeamLabel";

// Carte de match réutilisable (home, pronos, etc.).
export function MatchRow({
  match,
  footer,
  highlightWinner = false,
}: {
  match: Match;
  footer?: React.ReactNode;
  highlightWinner?: boolean;
}) {
  const started = hasKickedOff(match);
  const done = isFinished(match.status);
  const live = started && !done;

  return (
    <article className="card p-4">
      <div className="mb-2.5 flex items-center justify-center gap-2 text-[11px] uppercase tracking-widest text-muted">
        <span>{match.round}</span>
        <span aria-hidden>·</span>
        <span>
          {format(new Date(match.kickoff_at), "EEE d MMM · HH:mm", {
            locale: fr,
          })}
        </span>
        {live && (
          <span className="chip ml-1 bg-red-500/15 text-red-400">
            <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
            Live
          </span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamLabel name={match.home_team} flag={match.home_flag} align="right" />
        {started ? (
          <div className="flex items-baseline gap-1.5 font-display text-2xl tabular-nums">
            <span className={highlightWinner && match.winner === "HOME" ? "text-accent" : ""}>
              {match.home_goals ?? 0}
            </span>
            <span className="text-muted">:</span>
            <span className={highlightWinner && match.winner === "AWAY" ? "text-accent" : ""}>
              {match.away_goals ?? 0}
            </span>
          </div>
        ) : (
          <span className="font-display text-sm text-muted">VS</span>
        )}
        <TeamLabel name={match.away_team} flag={match.away_flag} />
      </div>

      {footer && <div className="mt-3">{footer}</div>}
    </article>
  );
}
