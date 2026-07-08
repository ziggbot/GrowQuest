# Rise web (PWA)

React + Vite + Supabase. Develop on a PC, install on iPhone via Safari → **Add to Home Screen**. No Xcode, no Mac.

## Local dev

```bash
cd web
npm install
cp .env.example .env.local
# fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (publishable key)
npm run dev
```

Open <http://localhost:5173>. To test on your phone over the same Wi-Fi, find your PC's LAN IP and open `http://<lan-ip>:5173` on the phone.

## Deploying to Render (recommended)

The repo ships a `render.yaml` blueprint at the root, so setup is one click:

1. Go to <https://dashboard.render.com> → **New** → **Blueprint** → connect this GitHub repo.
2. Render reads `render.yaml` and proposes a **Static Site** (`rise-web`). Confirm.
3. On the first deploy it prompts for the two env vars:
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = publishable key (`sb_publishable_…`)
4. Deploy. Render gives you an `*.onrender.com` URL (add a custom domain later under Settings → Custom Domains).

The blueprint already sets root dir `web`, build `npm install && npm run build`, publish dir `dist`, the SPA rewrite (`/* → /index.html`), and a no-cache header on `sw.js`. Every push to the connected branch redeploys automatically.

To deploy **without** the blueprint (manual static site): Root Directory `web`, Build Command `npm install && npm run build`, Publish Directory `dist`, and add a Rewrite rule `/*` → `/index.html`.

## Deploying to Vercel (alternative)

`vercel.json` is still here if you prefer Vercel:

1. Go to <https://vercel.com> → **New Project** → import this GitHub repo.
2. **Root Directory**: `web` (very important — the app isn't at repo root).
3. Vercel auto-detects Vite. Build command, output dir, install command are all in `vercel.json`.
4. **Environment Variables** (Settings → Environment Variables):
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = publishable key (`sb_publishable_…`)
5. Deploy. Vercel gives you a `*.vercel.app` URL.

Every push to `main` redeploys automatically. Pick one host — running both just means two URLs against the same Supabase backend.

## Installing on your iPhone

1. Open the deployed URL in **Safari** (Chrome on iOS doesn't support "Add to Home Screen" properly).
2. Tap the **Share** button → **Add to Home Screen** → confirm.
3. The Rise icon appears on your home screen. Tap to launch — runs full-screen, no browser chrome.

## Tech notes

- `vite-plugin-pwa` generates the service worker + manifest at build time.
- Auth + data via `@supabase/supabase-js`. Same migrations as the iOS app.
- All routes are SPA — `vercel.json` rewrites `/*` to `index.html`.
- Tokens persist in `localStorage` (Supabase default). For more security we could move to httpOnly cookies later.

## What's NOT here

- No native iOS-only APIs (Family Controls, App Store payments). If you eventually want those, wrap this same React code in Capacitor and ship to App Store — the Supabase backend doesn't change.
