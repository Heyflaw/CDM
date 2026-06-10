"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function saveDisplayName(formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!displayName) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("profiles")
    .upsert({ id: user.id, display_name: displayName.slice(0, 40) });

  redirect("/");
}
