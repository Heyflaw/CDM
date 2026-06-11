"use client";

import { useActionState, useState } from "react";
import { updateDisplayName, deleteAccount, type SaveResult } from "./actions";

const initial: SaveResult = { ok: false };

export function PseudoForm({ current }: { current: string }) {
  const [state, formAction, pending] = useActionState(
    updateDisplayName,
    initial
  );
  const [value, setValue] = useState(current);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        name="display_name"
        required
        maxLength={40}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="rounded-xl border border-border px-4 py-3 outline-none transition focus:border-accent"
      />
      <div className="flex items-center justify-end gap-3">
        {state.ok && (
          <span className="text-xs font-semibold text-accent">Enregistré ✓</span>
        )}
        {state.error && (
          <span className="text-xs text-red-400">{state.error}</span>
        )}
        <button
          type="submit"
          disabled={pending || !value.trim() || value === current}
          className="btn btn-primary disabled:opacity-40"
        >
          {pending ? "…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

export function DeleteAccount() {
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {!armed ? (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="btn btn-ghost self-start border-red-500/40 text-red-400"
        >
          Supprimer mon compte
        </button>
      ) : (
        <form
          action={deleteAccount}
          onSubmit={() => setPending(true)}
          className="flex flex-col gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4"
        >
          <p className="text-sm">
            Action <strong>définitive</strong> : ton profil, tes pronos et tes
            points seront supprimés. Aucun retour possible.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className="btn bg-red-500 text-white disabled:opacity-50"
            >
              {pending ? "Suppression…" : "Oui, supprimer définitivement"}
            </button>
            <button
              type="button"
              onClick={() => setArmed(false)}
              className="btn btn-ghost"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
