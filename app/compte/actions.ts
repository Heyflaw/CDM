"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type SaveResult = { ok: boolean; error?: string };

// Changer son pseudo (RLS : chacun ne modifie que le sien).
export async function updateDisplayName(
  _prev: SaveResult,
  formData: FormData
): Promise<SaveResult> {
  const name = String(formData.get("display_name") ?? "").trim();
  if (!name) return { ok: false, error: "Pseudo vide" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non connecté" };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name.slice(0, 40) })
    .eq("id", user.id);
  if (error) return { ok: false, error: "Échec de la mise à jour" };

  revalidatePath("/");
  revalidatePath("/classement");
  revalidatePath("/compte");
  return { ok: true };
}

// Supprimer définitivement son compte (auth + données en cascade).
export async function deleteAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Service role : seul moyen de supprimer l'utilisateur auth. On ne supprime
  // que SON propre compte (id issu de la session, jamais d'un paramètre client).
  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(user.id);

  await supabase.auth.signOut();
  redirect("/login");
}
