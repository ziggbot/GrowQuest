# GrowQuest — Architecture

> Status: **MVP scaffold (Phase 0).** This document describes what we are building, what we are deliberately deferring, and the constraints every contribution must respect. Update it as decisions land — out-of-date docs are worse than none.

---

## 1. MVP-first architecture

### 1.1 Build now (MVP scope)

Goal: a parent and a child on one device (or two) can run the full loop — child sees missions, marks them done, parent approves, coins land in the ledger, child redeems coins for symbolic screen-time.

| Capability                       | MVP                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| Auth                             | Supabase email + password; Sign in with Apple wired but optional                     |
| Family model                     | One `families` row per parent account; one or more `child_profiles` per family       |
| Missions                         | Parent creates from a template list; one-off and recurring (daily) only              |
| Approval                         | Child marks done → parent approves → coins credited in `coin_ledger`                 |
| Wallet                           | Balance = sum of `coin_ledger` for that child (server-side view)                     |
| Screen-time unlock               | **Symbolic only.** Child redeems N mynt for M minutes; we record it; we do not gate the OS |
| Persistence                      | Supabase Postgres + RLS; SwiftData as offline cache only                             |
| Localisation                     | Swedish strings via `Localizable.xcstrings`                                          |
| Telemetry                        | TelemetryDeck (free, EU-hosted, privacy-friendly) — minimal screen events only       |
| Crash reporting                  | Sentry free tier                                                                     |

### 1.2 Postpone (explicitly, with reason)

| Capability                  | Why deferred                                                                       | Re-enabled in    |
| --------------------------- | ---------------------------------------------------------------------------------- | ---------------- |
| Family Controls / Screen Time API | Requires Apple entitlement, slow to obtain, distracts from core loop. Symbolic unlock proves the gameplay first. | Phase 5+         |
| Stripe Connect payouts      | Real-money flow demands full KYC, terms, age verification. Architectural seams in place; no money moves yet. | Post-MVP         |
| Multi-parent / co-parent invites | Makes RLS and invite flow much heavier. One parent per family in MVP.         | Phase 4          |
| Push notifications          | APNs + Supabase function plumbing is non-trivial; in-app reminders suffice for MVP. | Phase 3          |
| Web/Android clients         | iOS first, iOS only.                                                               | After App Store  |
| Photo proof uploads         | Storage + image moderation; defer to keep storage free-tier and avoid CSAM risk.   | Phase 4          |

### 1.3 Decisions that must already be production-correct

These are the things we cannot retrofit cheaply. They are non-negotiable from day 1 (also in `CLAUDE.md`):

1. **Tenant isolation via RLS.** Every multi-tenant table carries `family_id` and is gated by a `is_family_member(fid)` SECURITY DEFINER helper. No app-side filtering as a security control — RLS is the boundary.
2. **Append-only ledgers.** `coin_ledger` and (future) `payout_ledger` accept inserts only. Balances are derived. Refunds are negative-amount inserts referencing the original row. This makes audits, payouts, and KYC tractable later.
3. **Money in integer öre.** SEK amounts are stored as `kr_amount_ore int`. Floats are forbidden for money. Coins are also integers (`mynt int`).
4. **UTC timestamps.** All time columns are `timestamptz`. Every mutable table has `created_at` and `updated_at` (trigger-maintained).
5. **Secrets management.** Auth tokens live in the iOS Keychain, never `UserDefaults`. The Supabase service-role key never ships in the app and never enters the repo — it is a GitHub Actions secret only.
6. **Privacy manifest from day 1.** `PrivacyInfo.xcprivacy` is committed and accurate. Children's data minimised: no last name, no email for `child_profiles`, no precise location, ever.
7. **Versioned schema.** Every change is a numbered SQL migration in `supabase/migrations/`. CI runs them clean against an empty DB on every PR.

---

## 2. Technology stack

| Layer         | Choice                                            | Rationale                                                                                  |
| ------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Client        | SwiftUI, iOS 17+                                  | `@Observable`, `NavigationStack`, `Observation` framework — modern, less ceremony than UIKit. |
| State         | `@Observable` view models, light MVVM             | No third-party state lib. Keeps surface small.                                             |
| Persistence (local) | SwiftData                                   | First-party, easy cache; we treat Supabase as source of truth.                             |
| Networking    | [`supabase-swift`](https://github.com/supabase/supabase-swift) | Official SDK; covers auth, Postgres, Storage, Realtime.                          |
| Auth          | Supabase Auth (email+password + Sign in with Apple) | Free tier; SIWA is required for App Store if any third-party auth is offered.            |
| Backend DB    | Supabase Postgres + RLS                           | Hosted Postgres + first-class RLS. Free tier covers MVP comfortably.                       |
| Edge logic    | Supabase Edge Functions (Deno) — only when needed | Used for actions that must run with elevated privileges (e.g. `approve_mission`).          |
| Storage       | Supabase Storage (deferred)                       | Only when proof photos land.                                                               |
| Build         | XcodeGen (`ios/project.yml` is source of truth)   | Avoids `.xcodeproj` merge hell; project is regenerated on each clone.                      |
| Lint          | SwiftLint                                         | One config at `ios/.swiftlint.yml`. Runs in CI and pre-commit (later).                     |
| CI            | GitHub Actions                                    | Free for public/private repos within minute caps.                                          |
| Distribution  | Fastlane `pilot` → TestFlight                     | Phase 4. Manual `xcodebuild` until then.                                                   |
| Crash         | Sentry                                            | Free tier covers MVP.                                                                      |
| Analytics     | TelemetryDeck                                     | EU-hosted, no IDFA, GDPR-clean.                                                            |
| Future payouts| Stripe Connect (Express)                          | Sketched in `docs/decisions/0001-…`. Code seams ready; no Stripe code yet.                 |

**What we deliberately don't use:** Firebase (vendor lock-in + Google data flow), CocoaPods (SwiftPM is enough), Realm (SwiftData covers it), Tuist (XcodeGen is simpler for one app), GraphQL (over-engineering for the API surface).

---

## 3. Repo structure

```
ios/                       SwiftUI app
  project.yml              XcodeGen spec — source of truth
  .swiftlint.yml
  README.md                bootstrap & contributor notes
  Growquest/
    App/                   App entry, root navigation, environment wiring
    Core/                  Supabase client, Session, Keychain, errors
    DesignSystem/          Palette, Components (Kort, Knapp, Pill, …)
    Features/              One folder per feature (Home, Missions, Wallet, …)
    Models/                Codable DTOs + domain types
    Resources/             Info.plist, PrivacyInfo, Localizable.xcstrings, assets

supabase/
  config.toml              local CLI config (project_id, ports)
  migrations/              numbered SQL migrations — append only
  seed.sql                 dev-only seed data
  functions/               edge functions (Deno)
  README.md                local dev instructions

design/
  mockup.jsx               React UX spec — does NOT ship; ports to Swift screen by screen

docs/
  architecture.md          this file
  roadmap.md
  privacy.md
  decisions/NNNN-title.md  ADRs

scripts/
  bootstrap.sh             one-shot local setup

.github/workflows/
  ios-ci.yml               SwiftLint + xcodebuild
  supabase-lint.yml        psql migrate-on-empty smoke test
```

Inside `ios/Growquest/Features/`, each feature owns its views, view models, and feature-local models. Cross-feature DTOs go in `Models/`.

---

## 4. Roadmap

See [`docs/roadmap.md`](roadmap.md). Six phases (0 → 5) plus an ongoing "production hardening" track.

---

## 5. Automation strategy

We add automation **only where it pays back during the MVP**. Anything else waits.

| Now (Phase 0–2)                                         | Later (Phase 3+)                                     |
| ------------------------------------------------------- | ---------------------------------------------------- |
| GitHub Actions: SwiftLint on every PR                   | Fastlane `pilot` → TestFlight on tag                 |
| GitHub Actions: `xcodebuild build` on every PR          | XCTest unit + UI tests in CI                         |
| GitHub Actions: `supabase db reset` smoke against PR    | RLS contract tests via `pgtap`                       |
| Renovate or Dependabot for SwiftPM + Actions            | Sentry release-tracking on TestFlight uploads        |
| Conventional-ish commit messages, small PRs             | Auto-generated release notes from PR titles          |
| `.env.example` committed; real `.env` gitignored        | Edge-function deploys gated on tests                 |

Pre-commit hooks: deferred. They tend to break new contributors' first run; CI catches the same issues.

---

## 6. Security baseline

### 6.1 Identity & sessions

- Supabase Auth issues short-lived JWT access tokens + refresh tokens.
- iOS app stores tokens in **Keychain** (`kSecClassGenericPassword`, accessible after first unlock, not synced).
- `Session` actor refreshes proactively; on refresh failure we sign out cleanly, scrub Keychain, and route to login.
- Sign in with Apple is offered alongside email/password (App Store requirement once any third-party auth is offered).

### 6.2 Database

- Every multi-tenant table has `family_id uuid not null`.
- RLS is **enabled and forced** (`force row level security`) on every such table — service role bypass only.
- A SECURITY DEFINER helper `public.is_family_member(fid uuid) returns boolean` is the single point of truth. RLS policies call it; we never inline `auth.uid()` checks across many policies.
- The service-role key lives only in CI secrets and edge functions, never in the iOS app, never in the repo.

### 6.3 Children

- Children are `child_profiles` rows owned by a parent, **not `auth.users`**. They do not log in in MVP. This avoids COPPA/GDPR-K complications until we explicitly design for them.
- Minimum data: a chosen first name (or nickname) + emoji avatar. No email, no birthdate stored beyond age band.
- All child-visible features run inside the parent's authenticated session.

### 6.4 Transport & client

- HTTPS only (Supabase enforces). No TLS pinning in MVP — we accept system trust store.
- App Transport Security defaults; no exceptions in `Info.plist`.
- No third-party SDK has access to PII beyond what the user explicitly opts into (TelemetryDeck takes no identifiers; Sentry scrubs PII).

### 6.5 Build & supply chain

- XcodeGen + SwiftPM only — fewer moving parts than CocoaPods.
- SwiftPM dependencies pinned in `Package.resolved` (committed once we have a generated project).
- Renovate/Dependabot watches dependencies; security updates auto-PR'd.

### 6.6 Privacy

- Privacy manifest (`PrivacyInfo.xcprivacy`) declares every API category we touch.
- See [`docs/privacy.md`](privacy.md) for the data inventory and lawful basis under GDPR.

---

## 7. Stripe readiness (no Stripe code yet)

We will likely use **Stripe Connect (Express accounts)** so each parent is a connected account that can receive payouts and pay out to a child's bank/Swish indirectly via the parent. This requires Stripe Identity (KYC) on the parent — handled inside Stripe's hosted onboarding.

What we do **now** to keep that path open:

1. **Money is integer öre everywhere.** `kr_amount_ore int` is already the column type in the future `payout_ledger`.
2. **A `PayoutProvider` protocol** exists on the Swift side. Initial implementation is `SymbolicPayoutProvider` (writes a row, no money). When Stripe is added we add `StripeConnectPayoutProvider` and swap the binding — call sites don't change.
3. **An append-only `payout_ledger` table** is reserved (kept empty in MVP) so first real payout doesn't require a schema change.
4. **A clear taxonomy of redemption types** — `screen_time_minutes`, `cash_payout_ore`, `gift` — so we can differentiate symbolic vs. real value when the time comes.
5. **No PII required by Stripe is collected by us.** Stripe Hosted Onboarding will collect KYC directly when we add the integration; we just need to redirect to it.
6. **Swedish VAT, terms, and child consent** are out of scope for MVP, but we will not add real-money flows until they are addressed.

Open decisions deferred until Stripe goes live: payout cadence (instant vs. weekly), minimum payout amount, who pays Stripe fees, refund policy when a parent reverses approval.
