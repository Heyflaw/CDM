import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Nav from "../components/Nav";
import { PseudoForm, DeleteAccount } from "./CompteForms";

export const dynamic = "force-dynamic";

export default async function ComptePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/onboarding");

  return (
    <>
      <Nav active="compte" displayName={profile.display_name} />
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <header className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
            Ton espace
          </p>
          <h1 className="font-display text-4xl uppercase leading-none">Compte</h1>
        </header>

        <section className="card mb-6 p-5">
          <h2 className="mb-1 text-lg font-bold">Pseudo</h2>
          <p className="mb-3 text-sm text-muted">
            Le nom affiché dans le classement. Tu peux le changer quand tu veux.
          </p>
          <PseudoForm current={profile.display_name} />
        </section>

        <section className="card border-red-500/30 p-5">
          <h2 className="mb-1 text-lg font-bold">Zone sensible</h2>
          <p className="mb-3 text-sm text-muted">
            La connexion se fait par lien magique : pas de mot de passe à gérer.
          </p>
          <DeleteAccount />
        </section>

        <p className="mt-4 text-center text-xs text-muted">
          Connecté en tant que {user.email}
        </p>
      </main>
    </>
  );
}
