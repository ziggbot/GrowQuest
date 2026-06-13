# Pre-launch / beta checklist

Things only you can do (they live in dashboards, not the repo), plus
what the code already handles.

## 1. Enable email confirmation (Supabase) — recommended before beta

Stops random sign-ups with someone else's address.

1. Supabase Dashboard → **Authentication → Providers → Email** → tick
   **Confirm email** → Save.
2. **Authentication → URL Configuration**:
   - **Site URL**: your Vercel URL, e.g. `https://grow-quest-lime.vercel.app`
   - **Redirect URLs**: add the same origin (and the `/join` and `/`
     paths are covered by the origin wildcard). This is what makes the
     confirmation + password-reset links land back in the app.
3. **Authentication → Email Templates**: optionally translate the
   confirmation + reset mails to Swedish.

The app already handles confirmation being on:
- Parent sign-up shows "Vi har skickat en bekräftelse till …".
- Child invite (`/join`) shows "Bekräfta din e-post" and finishes
  claiming the profile automatically when the child returns via the
  email link.
- Sign-in shows a friendly "Bekräfta din e-post först" if unconfirmed.

### Keep CI green after enabling it

`cloud-smoke.yml` signs up a throwaway user every run; with
confirmation on, open sign-up no longer returns a session. Add one
secret so the smoke test creates a pre-confirmed user via the admin
API instead:

- Repo → Settings → Secrets and variables → Actions → New secret
- Name: `SUPABASE_SERVICE_ROLE_KEY`
- Value: Supabase Dashboard → Settings → API → **service_role** key

(The service-role key is a server-only secret. It lives only in GitHub
Actions secrets — never in the app or the repo.)

## 2. Don't let the project sleep

Supabase free tier pauses a project after ~7 days without traffic — a
returning tester would hit a dead app. Upgrade to **Pro ($25/mo)**
before sharing beyond one or two people.

## 3. Legal pages

Live at `/legal/privacy` and `/legal/terms`, linked from the login
screen and Settings → Om. Update the contact email / company details
in `web/src/screens/LegalScreen.tsx` if they change.

## 4. Resetting a tester

Paste `scripts/reset-tester.sql` into the Supabase SQL editor, set the
email at the top, Run. Wipes their entire family + auth account.

## 5. Bug reports

Settings → "Skicka feedback" opens a pre-filled mail with the app
version, build time, account and device — so you know what they ran.
Bump `APP_VERSION` in `web/src/lib/version.ts` on each release.
