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

## Layout

```
Growquest/
  App/            App entry, root view, environment wiring
  Core/           SupabaseClient, Session, Keychain, error model
  DesignSystem/   Palette, reusable components (Kort, Knapp, Pill)
  Features/       Per-feature folders (Onboarding, Home, Missions, Wallet, …)
  Models/         Codable DTOs + domain types
  Resources/      Info.plist, PrivacyInfo.xcprivacy, Localizable.xcstrings, Assets.xcassets
```

## Conventions

- `PascalCase.swift`, one top-level type per file unless tightly coupled.
- User-facing strings: Swedish, via `Localizable.xcstrings`. Code & comments: English.
- Avoid singletons; pass dependencies via `@Environment`.
- View models are `@Observable`. No Combine unless we have to.

## Testing

XCTest target is added in Phase 2. Until then, `xcodebuild build` in CI is the only safety net.
