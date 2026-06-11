"use client";

import { useState } from "react";
import { StandingsTable } from "./StandingsTable";
import type { Standing } from "@/lib/types";

// Classement replié par défaut, dépliable d'un tap.
export function CollapsibleStandings({ rows }: { rows: Standing[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 border-t border-border/60 pt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-1 text-xs font-semibold text-muted transition hover:text-foreground"
      >
        <span>Classement du groupe</span>
        <span>{open ? "Masquer ▴" : "Voir ▾"}</span>
      </button>
      {open && (
        <div className="mt-1">
          <StandingsTable rows={rows} />
        </div>
      )}
    </div>
  );
}
