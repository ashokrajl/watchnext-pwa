# WatchNext Expo

WatchNext is an Expo app that can run in Expo Go locally and as a hosted web app on Vercel.

## Setup

1. Install dependencies:
   - `npm install`
2. Create your env file from `.env.example`:
   - `TMDB_BEARER=your_tmdb_bearer_token`
   - `EXPO_PUBLIC_API_BASE=https://your-vercel-app.vercel.app/api/tmdb` only when testing Expo Go/native against a hosted API
3. Start Expo:
   - `npm run start`
4. Scan the QR in Expo Go.

## Deploy to Vercel

This is the easiest way to make the app available when your laptop is off.

1. Push this repo to GitHub.
2. In Vercel, create a new project from the repo.
3. Add an environment variable:
   - `TMDB_BEARER=your_tmdb_bearer_token`
4. Use the included Vercel settings:
   - Build command: `npm run build`
   - Output directory: `dist`
5. Deploy.

The hosted web app uses `/api/tmdb` automatically, so you do not need to set `EXPO_PUBLIC_API_BASE` for the Vercel web deployment.

## API base URL notes

- The app expects:
  - `GET {EXPO_PUBLIC_API_BASE}/genres`
  - `GET {EXPO_PUBLIC_API_BASE}/discover?...`
  - `GET {EXPO_PUBLIC_API_BASE}?mode=detail&id={tmdbId}` — full details with trailers, cast, and watch providers in one call
- If you use local `server.js` and test on a physical phone, do not use `localhost`.
  Use your machine LAN IP, for example:
  - `EXPO_PUBLIC_API_BASE=http://192.168.1.45:3000/api/tmdb`

## TMDB proxy

- `api/tmdb.js` is still used for Vercel deployments.
- `server.js` is still available for local proxy development.
- Keep `TMDB_BEARER` server-side only (never in Expo public env vars).

## Cloud sync (Supabase)

Your seen / rejected / to-watch lists are stored on-device first and synced to
Supabase in the background, so they follow you across devices. The header shows
the sync status (Syncing… / Synced / Offline / Sync failed).

Setup (one time):

1. Create a Supabase project.
2. In the Supabase dashboard, open the SQL editor and run, in order:
   - `supabase/migrations/20260512_create_movie_lists.sql` (initial schema)
   - `supabase/migrations/20260919_secure_movie_lists.sql` (locks the table down:
     each row gets an unguessable secret and all access goes through secure
     database functions — until you run it, the app falls back to the legacy
     permissive setup)
3. Add to your Vercel project's environment variables:
   - `VITE_SUPABASE_URL=https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=sb_publishable_...` (from Settings > API Keys)

How it behaves:

- Offline changes are never lost: on load, the local and cloud copies are
  merged (union of ids; "seen" wins a seen-vs-rejected conflict).
- Cloud writes are serialized, so rapid taps can't reorder them.
- Rows created before the secure migration get new random secrets and are
  re-created from each device's local copy on the next save — no on-device
  data is lost.

## Legacy web app

The previous static PWA files were archived under `_archive/pwa/`.
