"use client";

/* eslint-disable @next/next/no-img-element */

import { useActionState, useState } from "react";
import { saveGroupPrediction, type SaveResult } from "./actions";
import type { GroupPrediction } from "@/lib/types";
import { frTeam } from "@/lib/teams";

const initial: SaveResult = { ok: false };

export type GroupTeam = { name: string; flag: string | null };

export function GroupPredictionForm({
  groupCode,
  teams,
  prediction,
}: {
  groupCode: string;
  teams: GroupTeam[];
  prediction?: GroupPrediction;
}) {
  const [state, formAction, pending] = useActionState(
    saveGroupPrediction,
    initial
  );
  const [first, setFirst] = useState(prediction?.first_team ?? "");
  const [second, setSecond] = useState(prediction?.second_team ?? "");

  // Tap : 1er coup = 🥇, 2e coup = 🥈, retap = on désélectionne,
  // si les deux sont pris on remplace le 2e.
  function tap(name: string) {
    if (name === first) return setFirst("");
    if (name === second) return setSecond("");
    if (!first) return setFirst(name);
    if (!second) return setSecond(name);
    setSecond(name);
  }

  function rankOf(name: string): 1 | 2 | null {
    if (name === first) return 1;
    if (name === second) return 2;
    return null;
  }

  const ready = Boolean(first && second);
  const savedMatches =
    state.ok &&
    first === (prediction?.first_team ?? "") &&
    second === (prediction?.second_team ?? "");
  const hint = !first
    ? "Choisis le 1er"
    : !second
      ? "Choisis le 2e"
      : "Bien vu 👌";

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="group_code" value={groupCode} />
      <input type="hidden" name="first_team" value={first} />
      <input type="hidden" name="second_team" value={second} />

      <div className="grid grid-cols-2 gap-2">
        {teams.map((t) => {
          const r = rankOf(t.name);
          return (
            <button
              key={t.name}
              type="button"
              onClick={() => tap(t.name)}
              aria-pressed={r !== null}
              className={`relative flex items-center gap-2 overflow-hidden rounded-xl border px-3 py-3 text-left transition active:scale-[0.97] ${
                r === 1
                  ? "border-gold bg-gold/10"
                  : r === 2
                    ? "border-silver bg-silver/10"
                    : "border-border bg-surface-2 hover:border-accent/40"
              }`}
            >
              {t.flag ? (
                <img
                  src={t.flag}
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6 shrink-0 object-contain"
                />
              ) : (
                <span className="h-6 w-6 shrink-0" />
              )}
              <span className="truncate text-sm font-semibold">
                {frTeam(t.name)}
              </span>
              {r && (
                <span
                  className={`animate-pop chip absolute right-1.5 top-1.5 ${
                    r === 1
                      ? "bg-gold text-black"
                      : "bg-silver text-black"
                  }`}
                >
                  {r === 1 ? "1er" : "2e"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">{hint}</p>
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
            disabled={!ready || pending}
            className="btn btn-primary disabled:opacity-40"
          >
            {pending ? "…" : prediction ? "Modifier" : "Valider"}
          </button>
        </div>
      </div>
    </form>
  );
}
