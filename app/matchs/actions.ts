"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SaveResult = { ok: boolean; error?: string };

// --- Prono d'élimination directe : « qui passe » ---
export async function saveKnockoutPick(
  _prev: SaveResult,
  formData: FormData
): Promise<SaveResult> {
  const matchId = Number(formData.get("match_id"));
  const pick = String(formData.get("pick"));

  if (!Number.isInteger(matchId)) return { ok: false, error: "Match invalide" };
  if (pick !== "HOME" && pick !== "AWAY") {
    return { ok: false, error: "Choix invalide" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non connecté" };

  // Le RLS bloque l'écriture après le coup d'envoi ; on remonte l'erreur.
  const { error } = await supabase.from("predictions").upsert(
    { user_id: user.id, match_id: matchId, pick },
    { onConflict: "user_id,match_id" }
  );
  if (error) {
    return { ok: false, error: "Prono verrouillé (match commencé)" };
  }

  revalidatePath("/matchs");
  revalidatePath("/");
  return { ok: true };
}

// --- Prono de groupe : 1er / 2e ---
export async function saveGroupPrediction(
  _prev: SaveResult,
  formData: FormData
): Promise<SaveResult> {
  const groupCode = String(formData.get("group_code") ?? "").trim();
  const first = String(formData.get("first_team") ?? "").trim();
  const second = String(formData.get("second_team") ?? "").trim();

  if (!groupCode) return { ok: false, error: "Groupe invalide" };
  if (!first || !second) return { ok: false, error: "Choisis un 1er et un 2e" };
  if (first === second) {
    return { ok: false, error: "Deux équipes différentes" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non connecté" };

  // Le RLS bloque l'écriture une fois le groupe commencé.
  const { error } = await supabase.from("group_predictions").upsert(
    { user_id: user.id, group_code: groupCode, first_team: first, second_team: second },
    { onConflict: "user_id,group_code" }
  );
  if (error) {
    return { ok: false, error: "Prono verrouillé (groupe commencé)" };
  }

  revalidatePath("/matchs");
  revalidatePath("/");
  return { ok: true };
}

// --- Prono bonus : les 8 meilleurs troisièmes ---
export async function saveThirdPicks(
  _prev: SaveResult,
  formData: FormData
): Promise<SaveResult> {
  const teams = formData
    .getAll("teams")
    .map((t) => String(t).trim())
    .filter(Boolean);

  if (new Set(teams).size !== 8) {
    return { ok: false, error: "Choisis exactement 8 équipes" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non connecté" };

  // Le RLS bloque l'écriture dès le coup d'envoi de la 3e journée.
  const { error } = await supabase
    .from("third_place_predictions")
    .upsert({ user_id: user.id, teams, updated_at: new Date().toISOString() });
  if (error) {
    return { ok: false, error: "Prono verrouillé (3e journée commencée)" };
  }

  revalidatePath("/matchs");
  revalidatePath("/");
  return { ok: true };
}
