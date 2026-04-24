# Claude working agreement — GrowQuest

## What this repo is

iOS MVP (SwiftUI + Supabase) for a family chore/screen-time gamification app. The React code at `design/mockup.jsx` is the **UX spec**, not shipping code. Port it to Swift incrementally; don't ship the web app.

## Build targets

- **Primary**: iOS 17+ SwiftUI app under `ios/`.
- **Backend**: Supabase (auth + Postgres + RLS + storage). Migrations in `supabase/migrations/`.
- **Future**: Stripe Connect for mynt→kr payouts. Designed for but **not implemented** yet.

## Non-negotiables

- Every multi-tenant table has `family_id` and enforces it via RLS.
- Append-only ledgers (`coin_ledger`, `payout_ledger`) — no updates/deletes.
- Money in integers (`kr_amount_ore` = öre). Never floats for money.
- Auth tokens in Keychain, never UserDefaults.
- Service-role Supabase key never in the app or repo.
- UTC timestamps (`timestamptz`), `created_at` + `updated_at` on every table that can mutate.

## Conventions

- Swift file naming: `PascalCase.swift`, one top-level type per file unless tightly coupled.
- Swedish in user-facing strings (Localizable.xcstrings). English in code/docs.
- ADRs in `docs/decisions/NNNN-title.md` — one per significant architectural decision.
- Commits: conventional-ish, imperative mood. Small PRs.

## Tooling

- XcodeGen: `ios/Growquest.xcodeproj` is **generated**, not committed. Source of truth is `ios/project.yml`.
- SwiftLint: `ios/.swiftlint.yml`.
- Supabase CLI: `supabase start` for local dev, `supabase db reset` after migration edits.

## Where to start if a task is unclear

1. Check `docs/architecture.md` for the high-level model.
2. Check `docs/roadmap.md` for phase scope.
3. Check open GitHub issues labeled `mvp-now`.
4. Check `design/mockup.jsx` for the intended interaction.
