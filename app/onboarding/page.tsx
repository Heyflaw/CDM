import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { saveDisplayName } from "./actions";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (profile) redirect("/");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-7 px-6">
      <div className="animate-fade-up text-center">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
          Bienvenue 👋
        </p>
        <h1 className="font-display text-5xl uppercase leading-none">
          Ton pseudo
        </h1>
        <p className="mt-3 text-sm text-muted">
          Le nom qui apparaîtra dans le classement.
        </p>
      </div>
      <form
        action={saveDisplayName}
        className="animate-fade-up flex flex-col gap-3"
        style={{ animationDelay: "80ms" }}
      >
        <input
          name="display_name"
          required
          maxLength={40}
          placeholder="Ton pseudo"
          className="rounded-xl border border-border px-4 py-3 outline-none transition focus:border-accent"
        />
        <button type="submit" className="btn btn-primary w-full py-3">
          C&apos;est parti
        </button>
      </form>
    </main>
  );
}
