# ⚽ Pronos CDM 2026

Web app de pronostics de la Coupe du Monde 2026 entre amis. Chacun prédit le score
des matchs, les résultats réels arrivent automatiquement depuis **API-Football**, et
un classement compare tout le monde.

- **Next.js** (App Router) + **Tailwind CSS**
- **Supabase** (Postgres + auth magic link)
- **football-data.org** comme source des matchs/résultats
- **Vercel Cron** pour synchroniser les scores

## Barème

| Pronostic | Points |
|-----------|--------|
| Score exact | **3** |
| Bon résultat (1/N/2), mauvais score | **1** |
| Faux | 0 |

Les pronos se verrouillent au coup d'envoi de chaque match.

## Mise en route

### 1. Supabase
1. Crée un projet sur [supabase.com](https://supabase.com).
2. SQL Editor → colle et exécute [`supabase/schema.sql`](supabase/schema.sql).
3. Authentication → Providers → active **Email** (magic link). En local, les liens
   apparaissent dans Authentication → Logs (ou configure un SMTP).
4. Récupère l'URL et les clés dans Project Settings → API.

### 2. football-data.org
Crée un token gratuit sur [football-data.org/client/register](https://www.football-data.org/client/register)
(free tier : 10 req/min, inclut la Coupe du Monde — code compétition `WC`).

### 3. Variables d'environnement
Copie `.env.example` en `.env.local` et renseigne les valeurs :

```bash
cp .env.example .env.local
```

### 4. Lancer en local
```bash
npm install
npm run dev
```
Ouvre http://localhost:3000, connecte-toi par email, choisis ton pseudo.

### 5. Charger les matchs
La route `/api/sync` récupère le calendrier et les résultats. Lance-la une fois
manuellement (puis le cron prend le relais en prod) :

```bash
curl "http://localhost:3000/api/sync?secret=$CRON_SECRET"
```

## Déploiement (Vercel)
1. Pousse le repo sur GitHub, importe-le sur [Vercel](https://vercel.com).
2. Ajoute les mêmes variables d'env (dont `CRON_SECRET`).
3. Dans Supabase → Authentication → URL Configuration, ajoute l'URL de prod
   (`https://ton-app.vercel.app`) dans **Site URL** et **Redirect URLs**.
4. Le cron de [`vercel.json`](vercel.json) appelle `/api/sync`. Sur le plan
   **Hobby (gratuit)**, Vercel limite les crons à **1 fois par jour** (ici 06:00 UTC) :
   la synchro est donc quotidienne. Vercel ajoute automatiquement l'en-tête
   `Authorization: Bearer <CRON_SECRET>`.

### Rafraîchir plus souvent (optionnel, gratuit)
Pour des scores quasi temps réel pendant les matchs sans passer en Vercel Pro,
utilise un cron externe gratuit qui appelle l'endpoint toutes les 15 min :
[cron-job.org](https://cron-job.org) → nouvelle tâche → URL
`https://<ton-app>.vercel.app/api/sync?secret=<CRON_SECRET>`, intervalle 15 min.

Partage le lien Vercel à tes amis : ils se connectent et c'est parti 🎉

## Structure
```
app/
  page.tsx            # Classement + prochains matchs
  matchs/             # Liste des matchs + saisie des pronos
  login/              # Connexion magic link
  onboarding/         # Choix du pseudo
  auth/callback/      # Échange du lien magic → session
  api/sync/           # Synchro football-data.org (cron)
lib/
  supabase/           # Clients (browser / server / admin)
  scoring.ts          # Barème des points
  types.ts            # Types partagés
supabase/schema.sql   # Tables + RLS + RPC classement
```
