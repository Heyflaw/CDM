"use client";

import { useActionState } from "react";
import { savePrediction, type SaveResult } from "./actions";
import type { Match, Prediction } from "@/lib/types";
import { TeamLabel } from "../components/TeamLabel";

const initial: SaveResult = { ok: false };

export function PredictionForm({
  match,
  prediction,
}: {
  match: Match;
  prediction?: Prediction;
}) {
  const [state, formAction, pending] = useActionState(savePrediction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="match_id" value={match.id} />
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamLabel name={match.home_team} flag={match.home_flag} align="right" />
        <div className="flex items-center gap-1">
          <input
            name="home_pred"
            type="number"
            min={0}
            max={99}
            required
            defaultValue={prediction?.home_pred ?? ""}
            className="w-12 rounded-md border border-black/15 bg-transparent py-1.5 text-center outline-none focus:border-black/40 dark:border-white/20"
          />
          <span className="opacity-40">-</span>
          <input
            name="away_pred"
            type="number"
            min={0}
            max={99}
            required
            defaultValue={prediction?.away_pred ?? ""}
            className="w-12 rounded-md border border-black/15 bg-transparent py-1.5 text-center outline-none focus:border-black/40 dark:border-white/20"
          />
        </div>
        <TeamLabel name={match.away_team} flag={match.away_flag} align="left" />
      </div>
      <div className="flex items-center justify-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50"
        >
          {pending ? "…" : prediction ? "Modifier" : "Valider"}
        </button>
        {state.ok && <span className="text-xs text-green-500">Enregistré ✓</span>}
        {state.error && (
          <span className="text-xs text-red-500">{state.error}</span>
        )}
      </div>
    </form>
  );
}
