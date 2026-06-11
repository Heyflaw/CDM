"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Rafraîchit les données serveur à intervalle régulier tant qu'un match est
// en cours, pour afficher les scores quasi en direct sans recharger la page.
// (Dépend de la fréquence du sync : voir le cron externe.)
export function LiveRefresher({ intervalMs = 45000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
