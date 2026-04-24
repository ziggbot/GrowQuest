# GrowQuest

Family chore & screen-time gamification app. Kids complete parent-approved missions, earn coins, redeem coins for (symbolic) screen time or real money. Swedish-first. **iOS MVP.**

## Status

**Phase 0 — repo scaffold.** Xcode project not committed (generated via [XcodeGen](https://github.com/yonki/XcodeGen) from `ios/project.yml`). See `ios/README.md` to bootstrap locally.

## Quickstart (macOS)

```bash
brew install xcodegen swiftlint supabase/tap/supabase
cd ios && xcodegen && open Growquest.xcodeproj
# In another terminal, from repo root:
supabase start
```

Copy `.env.example` → `.env` and fill `SUPABASE_URL` / `SUPABASE_ANON_KEY` (anon only; never commit the service-role key).

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
- [Privacy baseline](docs/privacy.md)

## Design reference

Full UX, copy, and visual system lives in `design/mockup.jsx` (React). That file is the source of truth for interaction and component behaviour — the iOS app ports it screen-by-screen.
