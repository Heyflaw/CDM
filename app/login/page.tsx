"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">⚽ Pronos CDM 2026</h1>
        <p className="mt-2 text-sm opacity-70">
          Connecte-toi pour pronostiquer avec tes amis.
        </p>
      </div>

      {sent ? (
        <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-4 text-center text-sm">
          📬 Lien de connexion envoyé à <strong>{email}</strong>.<br />
          Ouvre-le sur cet appareil pour te connecter.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ton@email.com"
            className="rounded-lg border border-black/15 bg-transparent px-4 py-3 outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-foreground px-4 py-3 font-medium text-background disabled:opacity-50"
          >
            {loading ? "Envoi…" : "Recevoir le lien magique"}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>
      )}
    </main>
  );
}
