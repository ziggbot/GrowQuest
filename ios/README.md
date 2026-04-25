# Growquest — iOS

SwiftUI app for iOS 17+. The Xcode project is **generated** by [XcodeGen](https://github.com/yonki/XcodeGen) from `project.yml` and is **not** committed.

## First-run

```bash
brew install xcodegen swiftlint
cd ios
xcodegen generate
open Growquest.xcodeproj
```

Then in Xcode:

1. Select the `Growquest` target → Signing & Capabilities → set your own team.
2. Run on the iOS 17 simulator.

## Configuring Supabase locally

The app reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` from Info.plist, populated from xcconfig. To inject local values:

1. Copy the repo-root `.env.example` to `.env`.
2. Fill in `SUPABASE_URL` and `SUPABASE_ANON_KEY` from `supabase status` output.
3. Generate `Config.xcconfig` (gitignored):

   ```bash
   ../scripts/bootstrap.sh
   ```

   The bootstrap script writes `ios/Config.xcconfig` from your `.env`. XcodeGen wires it into the build.

## Running the v0 on your phone

The Mac sequence end-to-end:

```bash
# from repo root
brew install xcodegen swiftlint supabase/tap/supabase
supabase start                       # boots local Postgres + Auth + Studio
supabase db reset                    # apply all migrations + seed
cp .env.example .env                 # then paste the anon key from `supabase status`
./scripts/bootstrap.sh               # generates ios/Config.xcconfig + Xcode project
open ios/Growquest.xcodeproj
```

Local Supabase runs on `127.0.0.1:54321`, which a phone on the same Wi‑Fi can't reach over loopback. **Two options for on-device testing:**

### Option A — point at your Mac's LAN IP (fastest)

1. Find your Mac's IP: `ipconfig getifaddr en0`
2. In `.env`, change `SUPABASE_URL` from `http://127.0.0.1:54321` to `http://<mac-ip>:54321`
3. Re-run `./scripts/bootstrap.sh` so xcconfig picks up the new URL
4. Make sure your phone is on the same Wi‑Fi
5. Note: Supabase auth emails (sign-up confirmation) are caught by Inbucket at `http://127.0.0.1:54324` on your Mac — sign up flows still work because you read the link there.

ATS will block plain HTTP. We currently allow HTTPS only (`NSAllowsArbitraryLoads = false`). For LAN testing, temporarily add a per-domain ATS exception in `Info.plist` for your Mac's IP, **and remove it before pushing to TestFlight**.

### Option B — point at a free Supabase cloud project

1. Create a free project at supabase.com (region: Stockholm or Frankfurt)
2. `supabase link --project-ref <ref>`
3. `supabase db push` — applies all migrations to the cloud DB
4. Copy the project's anon key + URL into `.env`
5. `./scripts/bootstrap.sh`
6. Phone hits the public HTTPS endpoint — no ATS exception needed

This is the recommended path once you're past initial dev: cloud HTTPS, real Apple Sign-in callback URLs, real email delivery.

### Sign in with Apple on a real device

SIWA needs a paid Apple Developer account for the entitlement to actually grant identity tokens. With a free account you can build & install via Xcode but the SIWA button will fail. Email + password works on a free account.

### Build & install via Xcode

1. Plug phone in, trust the computer
2. Xcode → Select your phone as run destination → ⌘R
3. First run on a new device: on the phone, Settings → General → VPN & Device Management → trust your developer profile

## Layout

```
Growquest/
  App/            App entry, root view, environment wiring
  Core/           SupabaseClient, Session, Keychain, error model
  DesignSystem/   Palette, reusable components (Kort, Knapp, Pill)
  Features/       Per-feature folders
    Auth/         Sign in / sign up / SIWA
    Onboarding/   Profile picker + add-child sheet
    Home/         Top-level dashboard with parent + per-child tabs
    Missions/     Create mission + child mission list
    Approvals/    Pending submissions queue
    Wallet/       Per-child balance + recent ledger
  Models/         Codable DTOs + domain types
  Resources/      Info.plist, Growquest.entitlements, PrivacyInfo.xcprivacy
```

## Conventions

- `PascalCase.swift`, one top-level type per file unless tightly coupled.
- User-facing strings: Swedish (Phase 1 hard-codes them in views; Phase 2 issue #13 moves to `Localizable.xcstrings`).
- Avoid singletons; pass dependencies via `@Environment`.
- View models are `@Observable @MainActor`. No Combine unless we have to.

## Testing

XCTest target is added in Phase 2. Until then, `xcodebuild build` in CI is the only safety net.
