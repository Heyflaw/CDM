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
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Bienvenue 👋</h1>
        <p className="mt-2 text-sm opacity-70">
          Choisis le pseudo qui apparaîtra dans le classement.
        </p>
      </div>
      <form action={saveDisplayName} className="flex flex-col gap-3">
        <input
          name="display_name"
          required
          maxLength={40}
          placeholder="Ton pseudo"
          className="rounded-lg border border-black/15 bg-transparent px-4 py-3 outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
        />
        <button
          type="submit"
          className="rounded-lg bg-foreground px-4 py-3 font-medium text-background"
        >
          C'est parti
        </button>
      </form>
    </main>
  );
}
