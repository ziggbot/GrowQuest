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

## Where to start if a task is unclear

1. Check `docs/architecture.md` for the high-level model.
2. Check `docs/roadmap.md` for phase scope.
3. Check open GitHub issues labeled `mvp-now`.
4. Default to building in `web/` unless the task explicitly says iOS.
