# ADR 0001 — iOS-first MVP on Supabase

- Status: **Accepted**
- Date: 2026-04-24
- Deciders: solo founder + Claude (advisory)

## Context

We need to validate a family chore / screen-time gamification concept on real users in Sweden, fast, with near-zero infrastructure cost. The product needs:

- Mobile-first UX (kids are not on desktops)
- Tight per-family data isolation (children's data; GDPR + future GDPR-K)
- A path to real-money payouts (parent → child) without rebuilding the foundation
- A solo dev workload that fits evenings and weekends

## Decision

1. **iOS-only MVP, SwiftUI on iOS 17+.**
2. **Supabase free tier** as the entire backend (Auth + Postgres + RLS + Storage + Edge Functions).
3. **XcodeGen** as the source of truth for the Xcode project; `.xcodeproj` is gitignored.
4. **Symbolic screen-time only** in MVP — no Family Controls entitlement.
5. **Stripe-ready, Stripe-deferred**: a `PayoutProvider` protocol and an empty `payout_ledger` table exist; no Stripe code is written.
6. **Children are not auth users.** They are `child_profiles` rows under a parent's session.

## Alternatives considered

| Option                    | Why rejected                                                                 |
| ------------------------- | ---------------------------------------------------------------------------- |
| React Native / Expo       | The mockup is React, but iOS-native gives us SwiftData + Family Controls + smoother SwiftUI animations the design depends on. Cross-platform can come later. |
| Flutter                   | Same reason; also farther from idiomatic iOS for a Swedish App Store launch. |
| Firebase                  | Easier auth, harder data ownership and EU residency. RLS in Postgres is more transparent than Firestore rules. |
| Custom backend (Node/Go)  | Multiplies operational surface for one founder. Supabase Postgres + edge functions covers everything we need until ≫ 10k users. |
| Web-first                 | Children + screen-time mechanic only really works inside a managed app context on iOS. |

## Consequences

**Good**

- Single platform, single deployment target, fastest path to feedback.
- Postgres + RLS keeps tenant isolation testable and provable.
- Free hosting until real growth.

**Bad / accepted trade-offs**

- iOS-only excludes Android households (we accept this for MVP).
- Symbolic screen-time means kids could ignore the unlock; we are testing the *gameplay loop*, not enforcement, in MVP.
- Supabase vendor lock-in is real, but Postgres is portable and migrations are SQL — escape hatch exists.

## Follow-ups

- ADR 0002 (TBD) — Stripe Connect topology when payments come online.
- ADR 0003 (TBD) — Family Controls integration design once entitlement is granted.
