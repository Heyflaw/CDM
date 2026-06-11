import Link from "next/link";
import { signOut } from "@/app/actions/auth";

type TabKey = "today" | "matchs" | "classement" | "compte";

const TABS: { key: TabKey; href: string; label: string }[] = [
  { key: "today", href: "/", label: "Aujourd’hui" },
  { key: "matchs", href: "/matchs", label: "Pronos" },
  { key: "classement", href: "/classement", label: "Classement" },
];

export default function Nav({
  active,
  displayName,
}: {
  active: TabKey;
  displayName?: string;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-3 py-2.5">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1.5 font-display text-lg tracking-wide"
        >
          <span aria-hidden>⚽</span>
          <span className="hidden whitespace-nowrap uppercase sm:inline">
            Pose ton <span className="text-accent">prono</span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-full border border-border bg-surface p-1">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={t.href}
                className={`rounded-full px-2.5 py-1.5 text-xs font-semibold transition ${
                  active === t.key
                    ? "bg-accent text-accent-ink"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>

          <Link
            href="/compte"
            title={displayName ? `Compte : ${displayName}` : "Mon compte"}
            aria-label="Mon compte"
            className={`rounded-full p-2 transition ${
              active === "compte"
                ? "text-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
            </svg>
          </Link>

          <form action={signOut}>
            <button
              type="submit"
              title={
                displayName ? `Connecté : ${displayName}` : "Déconnexion"
              }
              className="rounded-full p-2 text-muted transition hover:text-foreground"
              aria-label="Se déconnecter"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </form>
        </div>
      </nav>
    </header>
  );
}
