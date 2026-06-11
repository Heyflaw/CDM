import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";

// Tous les joueurs sont en France ; le serveur (Vercel) tourne en UTC.
// Toujours formater/grouper les dates dans ce fuseau, jamais celui du runtime.
export const APP_TZ = "Europe/Paris";

export function fmtParis(date: Date | string, pattern: string) {
  return formatInTimeZone(new Date(date), APP_TZ, pattern, { locale: fr });
}

export function isTodayParis(date: Date | string) {
  return fmtParis(date, "yyyy-MM-dd") === fmtParis(new Date(), "yyyy-MM-dd");
}
