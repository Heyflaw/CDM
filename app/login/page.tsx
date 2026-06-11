"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import player from "../assets/joueur.png";

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
    <main className="relative flex min-h-screen w-full flex-col overflow-hidden px-6 pb-10 pt-12">
      {/* Illustration en fond */}
      <img
        src={player.src}
        alt=""
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/2 h-[62vh] w-auto max-w-none -translate-x-1/2 select-none"
      />

      {/* Titre, 3 lignes, calé à droite */}
      <div className="animate-fade-up relative z-10 text-right">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
          Coupe du Monde 2026
        </p>
        <h1 className="font-display text-7xl uppercase leading-[0.82]">
          Pose
          <br />
          ton
          <br />
          <span className="text-accent">prono</span>
        </h1>
      </div>

      {/* Card de connexion par-dessus */}
      <div className="animate-fade-up relative z-10 mx-auto mt-auto w-full max-w-md">
        <div className="card border-border bg-background/70 p-5 backdrop-blur-md">
          <p className="mb-3 text-center text-sm text-muted">
            Choisis ton pseudo pour défier tes potes.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              required
              maxLength={40}
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="Ton pseudo"
              className="rounded-xl border border-border px-4 py-3 outline-none transition focus:border-accent"
            />
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-3 disabled:opacity-50"
            >
              {loading ? "Connexion…" : "C'est parti"}
            </button>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </form>
        </div>
      </div>
    </main>
  );
}
