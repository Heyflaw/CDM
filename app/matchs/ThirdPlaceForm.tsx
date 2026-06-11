"use client";

/* eslint-disable @next/next/no-img-element */

import { useActionState, useState } from "react";
import { saveThirdPicks, type SaveResult } from "./actions";
import { frTeam } from "@/lib/teams";
import type { GroupTeam } from "./GroupPredictionForm";

const initial: SaveResult = { ok: false };
const MAX = 8;

export function ThirdPlaceForm({
  groups,
  picks,
}: {
  groups: { code: string; teams: GroupTeam[] }[];
  picks: string[];
}) {
  const [state, formAction, pending] = useActionState(saveThirdPicks, initial);
  const [selected, setSelected] = useState<string[]>(picks);

  function tap(name: string) {
    setSelected((cur) =>
      cur.includes(name)
        ? cur.filter((t) => t !== name)
        : cur.length < MAX
          ? [...cur, name]
          : cur
    );
  }

  const full = selected.length === MAX;
  const savedMatches =
    state.ok &&
    selected.length === picks.length &&
    selected.every((t) => picks.includes(t));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {selected.map((t) => (
        <input key={t} type="hidden" name="teams" value={t} />
      ))}

      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g.code}>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted">
              Groupe {g.code}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {g.teams.map((t) => {
                const on = selected.includes(t.name);
                return (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => tap(t.name)}
                    aria-pressed={on}
                    disabled={!on && full}
                    className={`flex items-center gap-1.5 rounded-lg border px-2 py-2 text-left transition active:scale-[0.97] disabled:opacity-40 ${
                      on
                        ? "border-accent bg-accent/15"
                        : "border-border bg-surface-2 hover:border-accent/40"
                    }`}
                  >
                    {t.flag ? (
                      <img
                        src={t.flag}
                        alt=""
                        width={20}
                        height={20}
                        className="h-5 w-5 shrink-0 object-contain"
                      />
                    ) : (
                      <span className="h-5 w-5 shrink-0" />
                    )}
                    <span className="truncate text-xs font-semibold">
                      {frTeam(t.name)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2">
        <p className="text-sm text-muted">
          <strong
            className={full ? "text-accent" : "text-foreground"}
          >
            {selected.length}/{MAX}
          </strong>{" "}
          équipes choisies
        </p>
        <div className="flex items-center gap-2">
          {savedMatches && (
            <span className="text-xs font-semibold text-accent">
              Enregistré ✓
            </span>
          )}
          {state.error && (
            <span className="text-xs text-red-400">{state.error}</span>
          )}
          <button
            type="submit"
            disabled={!full || pending}
            className="btn btn-primary disabled:opacity-40"
          >
            {pending ? "…" : picks.length > 0 ? "Modifier" : "Valider"}
          </button>
        </div>
      </div>
    </form>
  );
}
