"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SaveResult = { ok: boolean; error?: string };

export async function savePrediction(
  _prev: SaveResult,
  formData: FormData
): Promise<SaveResult> {
  const matchId = Number(formData.get("match_id"));
  const home = Number(formData.get("home_pred"));
  const away = Number(formData.get("away_pred"));

  if (!Number.isInteger(matchId)) return { ok: false, error: "Match invalide" };
  if (
    !Number.isInteger(home) ||
    !Number.isInteger(away) ||
    home < 0 ||
    away < 0 ||
    home > 99 ||
    away > 99
  ) {
    return { ok: false, error: "Score invalide" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non connecté" };

  // Le RLS bloque déjà l'écriture après le coup d'envoi ; on remonte l'erreur.
  const { error } = await supabase.from("predictions").upsert(
    {
      user_id: user.id,
      match_id: matchId,
      home_pred: home,
      away_pred: away,
    },
    { onConflict: "user_id,match_id" }
  );

  if (error) {
    return { ok: false, error: "Pronostic verrouillé (match commencé)" };
  }

  revalidatePath("/matchs");
  revalidatePath("/");
  return { ok: true };
}
