# GrowQuest — Roadmap

Six phases from empty repo to App Store, plus an ongoing "production hardening" track that earns its keep only after we have a working MVP. Each phase has an exit gate — we don't move on until the gate is met.

---

## Phase 0 — Repo scaffold *(current)*

**Goal:** anyone can clone the repo, generate the Xcode project, run the app (placeholder UI), and start a local Supabase stack.

- Repo files: `README`, `CLAUDE.md`, `.gitignore`, `.env.example`, `LICENSE` *(deferred until we pick one)*
- `docs/architecture.md`, `docs/roadmap.md`, `docs/privacy.md`, ADR `0001-ios-supabase-mvp`
- `design/mockup.jsx` preserved verbatim as UX spec
- `ios/project.yml` (XcodeGen) + minimal Swift skeleton (`GrowquestApp`, `ContentView`, `Palette`, `Components`)
- `ios/.swiftlint.yml`
- `supabase/config.toml`, empty `migrations/`, `README`
- GitHub Actions: `ios-ci.yml` (SwiftLint + `xcodebuild build`), `supabase-lint.yml` (`supabase db reset`)
- `scripts/bootstrap.sh`
- 15–20 GitHub issues opened, labeled `mvp-now` / `prod-hardening`

**Exit gate:** clean clone → `scripts/bootstrap.sh` → app builds in Xcode, `supabase start` runs.

---

## Phase 1 — Auth + family bootstrap

**Goal:** a real human can sign up, create a family, see an empty dashboard.

- Supabase migration `0001_init_schema.sql`: `families`, `family_members`, `child_profiles`, `profile_configs` + RLS helpers
- Sign-up / sign-in screens (email + password)
- Sign in with Apple
- Onboarding flow ports `mockup.jsx` profile-picker (Skärmfri / Balanserad / Liberal)
- `Session` actor with token refresh + Keychain
- Empty home screen with parent's family name, list of (zero) child profiles
- Add-child sheet (name + avatar emoji)

**Exit gate:** two test users have isolated data. Switching `auth.uid()` in psql proves RLS holds.

---

## Phase 2 — Mission loop end-to-end

**Goal:** the core gameplay works for one child.

- Migration: `missions`, `mission_submissions`, `coin_ledger`
- Parent: create mission from template (title, reward in mynt, recurrence)
- Child view: list of today's missions; tap to mark done
- Parent: review queue → approve → coins land in `coin_ledger` (single transaction via edge function `approve_mission`)
- Wallet view: balance = `sum(coin_ledger)`; recent transactions
- Onboarding "test mission" so first run isn't empty
- Localized Swedish copy via `Localizable.xcstrings`

**Exit gate:** parent + child can run a full mission → approval → coin credit on a TestFlight-style device pair.

---

## Phase 3 — Redemption + light polish

**Goal:** coins are spent, the loop closes, the app feels alive.

- Symbolic screen-time redemption (cost = `mynt × profil.skärmtidMultiplikator`)
- `redemptions` table + edge function `redeem_screen_time` (atomic deduct + record)
- Active-session UI on home screen (countdown, no OS enforcement)
- Topplista / leaderboard within family
- Karaktär-stadier visual evolution (port `KARAKTÄR_STADIER`)
- Daily mission reset job (Supabase scheduled function)
- In-app notification surface (no APNs yet)
- Empty / error / offline states

**Exit gate:** dogfood with one real family for a week; loop is fun, not just functional.

---

## Phase 4 — TestFlight beta

**Goal:** ship to ~10 external families.

- Apple Developer Program enrollment + App Store Connect record
- Fastlane `pilot` lane → TestFlight on tag
- Push notifications (APNs + Supabase function for "your mission was approved")
- Crash reporting (Sentry) + minimal analytics (TelemetryDeck)
- Photo proof uploads → Supabase Storage (with size limits, no public URLs)
- Multi-parent invites (token + accept screen)
- Privacy policy page in-app, link from settings
- App Store metadata (screenshots, description) — Swedish + English
- Beta feedback in-app form

**Exit gate:** 10 families using it for 2+ weeks, no P0 bugs, qualitative feedback positive.

---

## Phase 5 — App Store launch

**Goal:** approved and live on the Swedish App Store.

- App Store review submission + iteration
- Real Family Controls / Screen Time entitlement applied for; symbolic unlock + (when granted) actual unlock toggleable per family
- Subscription model decided (free? freemium? premium parent features?) — separate ADR
- StoreKit 2 IAP if subscription chosen
- Account deletion in-app (App Store requirement)
- Final security review (RLS audit, secret scan, dependency audit)

**Exit gate:** approved by Apple, available in SE App Store.

---

## Phase 6 — Production hardening *(ongoing, in parallel from Phase 4)*

This is **not a sequential phase** — items get pulled in as soon as MVP scope allows.

- pgtap RLS contract tests
- XCTest UI tests for critical flows
- SLO + uptime monitoring (Better Stack / UptimeRobot free tier)
- DB backups automated + restore drill documented
- Disaster recovery runbook
- GDPR data export + deletion endpoints
- Rate limiting on edge functions
- WebAuthn / passkeys for parent login
- Stripe Connect integration (kicks off real-money payouts)
- Localization to additional languages (English first, then Norwegian/Danish)
- Android port (post-iOS-success only — separate roadmap)
