import Link from "next/link";
import { signOut } from "@/app/actions/auth";

export default function Nav({
  active,
  displayName,
}: {
  active: "leaderboard" | "matchs";
  displayName?: string;
}) {
  const linkCls = (key: string) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium ${
      active === key
        ? "bg-foreground text-background"
        : "opacity-70 hover:opacity-100"
    }`;

  return (
    <header className="sticky top-0 z-10 border-b border-black/10 bg-background/80 backdrop-blur dark:border-white/10">
      <nav className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-3">
        <Link href="/" className="font-bold whitespace-nowrap">
          ⚽ Pronos 2026
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/" className={linkCls("leaderboard")}>
            Classement
          </Link>
          <Link href="/matchs" className={linkCls("matchs")}>
            Matchs
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="px-3 py-1.5 text-sm opacity-50 hover:opacity-100"
              title={displayName ? `Connecté : ${displayName}` : "Déconnexion"}
            >
              Quitter
            </button>
          </form>
        </div>
      </nav>
    </header>
  );
}
