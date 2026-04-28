# GrowQuest

Family chore & screen-time gamification app. Kids complete parent-approved missions, earn coins, redeem coins for (symbolic) screen time or real money. Swedish-first. **iOS MVP.**

## Status

**Phase 1 + Phase 2 core landed — testable v0.** Sign up → pick profile → add child → create mission → child marks done → parent approves → coins land in the wallet, all RLS-isolated per family. See `ios/README.md` for the on-phone test path. Xcode project not committed (generated via [XcodeGen](https://github.com/yonki/XcodeGen) from `ios/project.yml`).

## Quickstart (macOS)

```bash
brew install xcodegen swiftlint supabase/tap/supabase
cd ios && xcodegen && open Growquest.xcodeproj
# In another terminal, from repo root:
supabase start
```

Copy `.env.example` → `.env` and fill `SUPABASE_URL` / `SUPABASE_ANON_KEY` (anon only; never commit the service-role key).

After `supabase start` (or after pointing `.env` at a cloud project), verify the schema and RPCs end-to-end without launching the app:

```bash
./scripts/smoke-cloud.sh
```

## Quickstart (Windows / Linux PC, no Mac required)

The iOS app needs Xcode (macOS-only) — but the **backend, schema, and the React UX prototype** all run fine on a PC.

```bash
# Backend: needs Docker Desktop + supabase CLI
supabase start
./scripts/smoke-cloud.sh                # asserts the full mission loop over HTTP

# UX prototype in your browser (Vite + React; needs Node 18+)
./scripts/run-mockup.sh                 # opens http://localhost:5173
```

Pure-Windows users without WSL: see [`design/web/README.md`](design/web/README.md) — three lines of `cd` / `npm install` / `npm run dev`.

For shipping iOS builds without owning a Mac, see [`ios/README.md`](ios/README.md) — recommended path is renting a cloud Mac or using Fastlane → TestFlight from CI.

## Repo map

```
ios/          SwiftUI app (XcodeGen-managed)
supabase/     Schema migrations, RLS policies, edge functions
design/       React prototype (mockup.jsx) — living UX spec, does NOT ship
docs/         Architecture, roadmap, ADRs, privacy
scripts/      Local dev helpers
.github/      CI workflows
```

## Docs

- [Architecture](docs/architecture.md) — stack, data model, security, Stripe readiness
- [Roadmap](docs/roadmap.md) — phase plan from prototype → App Store
- [ADR 0001 — iOS + Supabase MVP](docs/decisions/0001-ios-supabase-mvp.md)
- [ADR 0002 — Postgres-native authorization layer](docs/decisions/0002-postgres-native-authorization-layer.md)
- [Privacy baseline](docs/privacy.md)

## Design reference

Full UX, copy, and visual system lives in `design/mockup.jsx` (React). That file is the source of truth for interaction and component behaviour — the iOS app ports it screen-by-screen.
