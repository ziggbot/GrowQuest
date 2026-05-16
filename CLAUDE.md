# Claude working agreement — GrowQuest

## What this repo is

A family chore/screen-time gamification app. Two clients share one Supabase backend:

- **`web/`** — React + Vite PWA. **Active development.** This is what users touch today.
- **`ios/`** — SwiftUI app. **Parked.** Has feature parity up through commit 8fcd9cf but no active iteration. Pick it back up when the web MVP is validated or when an iOS-only need appears (push notifications, Family Controls, App Store).
- **`design/mockup.jsx`** — original UX prototype. Historical; the live web app under `web/` has diverged and is the real source of UX truth now.

When adding features: **ship the web change first**. Mirror to iOS only when explicitly asked.

## Build targets

- **Primary**: web PWA under `web/` (Vite + React + TypeScript, deployed via Vercel).
- **Backend**: Supabase (auth + Postgres + RLS + storage). Migrations in `supabase/migrations/` — shared by both clients.
- **Secondary**: iOS 17+ SwiftUI app under `ios/`. Keep it building if you touch shared schema, but don't add features unless asked.
- **Future**: Stripe Connect for mynt→kr payouts. Designed for but **not implemented** yet.

## Non-negotiables

- Every multi-tenant table has `family_id` and enforces it via RLS.
- Append-only ledgers (`coin_ledger`, `payout_ledger`) — no updates/deletes.
- Money in integers (`kr_amount_ore` = öre). Never floats for money.
- Auth tokens via Supabase SDK defaults on web; Keychain on iOS. Never UserDefaults on iOS.
- Service-role Supabase key never in the app or repo.
- UTC timestamps (`timestamptz`), `created_at` + `updated_at` on every table that can mutate.

## Conventions

- TypeScript file naming: `PascalCase.tsx` for components, `camelCase.ts` for utilities.
- Swift file naming: `PascalCase.swift`, one top-level type per file unless tightly coupled.
- Swedish in user-facing strings. English in code/comments/docs.
- ADRs in `docs/decisions/NNNN-title.md` — one per significant architectural decision.
- Commits: conventional-ish, imperative mood. Scope the prefix: `feat(web)`, `fix(web)`, `feat(ios)`, `chore(supabase)`. Small PRs.

## Tooling

- Web: `cd web && npm run dev` for local; `npm run build` runs `tsc -b && vite build` (always run before committing TS changes).
- iOS: XcodeGen generates `ios/Growquest.xcodeproj` from `ios/project.yml` (the project file itself is gitignored).
- Supabase CLI: `supabase start` for local dev, `supabase db reset` after migration edits. Migrations apply to both clients.

## Applying migrations to cloud Supabase

The repo has a GitHub Actions workflow `.github/workflows/cloud-smoke.yml` that pushes pending migrations to the linked cloud Supabase project and then runs smoke tests. Required secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`) live in repo Settings → Secrets → Actions.

Triggers:
- **Auto on `main`**: push to `main` with changes under `supabase/**`
- **Auto on `claude/**`**: push to any `claude/...` branch with changes under `supabase/**` — this is how Claude self-applies migrations without needing a human click
- **Manual**: Actions tab → "Cloud Supabase smoke" → "Run workflow"

**The flow when shipping a migration from a Claude session:**
1. Add the migration file under `supabase/migrations/`
2. Commit and push to the current `claude/...` branch
3. The workflow auto-runs (~2 min); migration applies and PostgREST cache reloads
4. Verify the feature works end-to-end

If the user gets a `Could not find the 'X' column ... in the schema cache` error right after a migration ships, the workflow hasn't finished yet (or failed) — check Actions tab. It's never a code-cache bug on the client.

## Where to start if a task is unclear

1. Check `docs/architecture.md` for the high-level model.
2. Check `docs/roadmap.md` for phase scope.
3. Check open GitHub issues labeled `mvp-now`.
4. Default to building in `web/` unless the task explicitly says iOS.
