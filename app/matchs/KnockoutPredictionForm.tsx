"use client";

/* eslint-disable @next/next/no-img-element */

import { useActionState } from "react";
import { saveKnockoutPick, type SaveResult } from "./actions";
import type { KnockoutPick, Match, Prediction } from "@/lib/types";
import { frTeam } from "@/lib/teams";

const initial: SaveResult = { ok: false };

function TeamButton({
  side,
  name,
  flag,
  selected,
  disabled,
}: {
  side: KnockoutPick;
  name: string;
  flag: string | null;
  selected: boolean;
  disabled: boolean;
}) {
  return (
    <button
      type="submit"
      name="pick"
      value={side}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3.5 text-sm font-semibold transition active:scale-[0.97] disabled:opacity-50 ${
        selected
          ? "border-accent bg-accent text-accent-ink"
          : "border-border bg-surface-2 hover:border-accent/50"
      }`}
    >
      {flag ? (
        <img
          src={flag}
          alt=""
          width={22}
          height={22}
          className="h-[22px] w-[22px] shrink-0 object-contain"
        />
      ) : null}
      <span className="truncate">{frTeam(name)}</span>
      {selected && <span aria-hidden>→</span>}
    </button>
  );
}

export function KnockoutPredictionForm({
  match,
  prediction,
}: {
  match: Match;
  prediction?: Prediction;
}) {
  const [state, formAction, pending] = useActionState(
    saveKnockoutPick,
    initial
  );
  const current = prediction?.pick;

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="match_id" value={match.id} />
      <p className="text-center text-[11px] uppercase tracking-widest text-muted">
        Qui se qualifie ?
      </p>
      <div className="grid grid-cols-2 gap-2">
        <TeamButton
          side="HOME"
          name={match.home_team}
          flag={match.home_flag}
          selected={current === "HOME"}
          disabled={pending}
        />
        <TeamButton
          side="AWAY"
          name={match.away_team}
          flag={match.away_flag}
          selected={current === "AWAY"}
          disabled={pending}
        />
      </div>
      <div className="flex h-4 items-center justify-center text-xs">
        {state.ok && (
          <span className="font-semibold text-accent">Enregistré ✓</span>
        )}
        {state.error && <span className="text-red-400">{state.error}</span>}
        {!state.ok && !state.error && current && (
          <span className="text-muted">
            Ton choix : {current === "HOME" ? match.home_team : match.away_team}
          </span>
        )}
      </div>
    </form>
  );
}
