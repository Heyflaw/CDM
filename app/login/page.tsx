"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PlayerIllustration from "../components/PlayerIllustration";

export default function LoginPage() {
  const [pseudo, setPseudo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    // Réutilise la session existante s'il y en a une, sinon crée un compte anonyme
    let {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        setError(
          error.code === "anonymous_provider_disabled"
            ? "Connexion anonyme désactivée côté Supabase — active « Allow anonymous sign-ins » dans le dashboard."
            : error.message
        );
        setLoading(false);
        return;
      }
      user = data.user;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: user!.id, display_name: pseudo.trim().slice(0, 40) });
    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    // Rechargement complet pour que le serveur voie les cookies de session
    window.location.href = "/";
  }

  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-[#00663A] text-white">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-10 pt-[14dvh]">
        <PlayerIllustration
          style={{
            position: "absolute",
            left: -121,
            top: "19dvh",
            pointerEvents: "none",
          }}
        />

        <header className="relative text-right">
          <p className="text-[13px] font-bold uppercase tracking-wide">
            Coupe du monde 2026
          </p>
          <h1 className="ml-auto mt-2 max-w-[311px] font-jaro text-[clamp(88px,27vw,108px)] leading-[0.77] text-[#FFFBFB]">
            POSE TON <span className="text-[#FFCCFD]">PRONO</span>
          </h1>
        </header>

        <div className="relative z-10 mt-14">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-center text-white/80">
              Choisis ton pseudo pour défier tes potes.
            </p>
            <input
              type="text"
              required
              maxLength={40}
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="Ton pseudo"
              className="rounded-xl border border-white/20 bg-[#1A754E] px-4 py-3.5 text-white placeholder:text-white/50 outline-none focus:border-white/50"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#FFCCFD] px-4 py-3.5 font-bold text-[#1a1a1a] disabled:opacity-50"
            >
              {loading ? "Connexion…" : "C'est parti"}
            </button>
            {error && (
              <p className="text-center text-sm text-red-300">{error}</p>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
