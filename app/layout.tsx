import type { Metadata } from "next";
import { Jaro, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

// Jaro : police d'affichage (titres, chiffres, logo). Google font variable
// avec accents complets → utilisable partout, y compris le texte accentué.
const display = Jaro({
  variable: "--font-display",
  subsets: ["latin"],
});

// Hanken Grotesk : toute l'UI / le corps de texte.
const body = Hanken_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "POSE TON PRONO",
  description: "Pronostics de la Coupe du Monde 2026 entre amis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`dark ${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
