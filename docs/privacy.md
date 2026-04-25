# GrowQuest — Privacy baseline

> Working document. The user-facing privacy policy will derive from this. Update whenever a new data category is collected, a new processor is added, or a retention rule changes.

## Principles

- Collect the minimum that makes the product work. Especially for children's data.
- Children do not log in. They are profiles owned by a parent. No emails, last names, or birthdates for children — only nickname, avatar emoji, and an age band.
- EU data residency. Supabase region: `eu-north-1` (Stockholm) or `eu-central-1`.
- No advertising SDKs. Ever.
- No third-party analytics that fingerprint or use IDFA.

## Data inventory (MVP)

| Category                | Subject  | Examples                                    | Lawful basis            | Retention                                 |
| ----------------------- | -------- | ------------------------------------------- | ----------------------- | ----------------------------------------- |
| Account identifiers     | Parent   | email, hashed password (Supabase Auth), Apple user ID | Contract                | Until account deletion                    |
| Family configuration    | Parent   | family name, profile choice, mission templates       | Contract                | Until account deletion                    |
| Child profile           | Child    | nickname, avatar emoji, age band                     | Parent consent          | Until parent deletes profile or account   |
| Mission activity        | Child    | which missions, when completed, when approved        | Contract                | Until account deletion                    |
| Coin ledger             | Child    | append-only credits/debits                           | Contract                | Until account deletion (audit log)        |
| Crash diagnostics       | Parent   | crash stack, OS version (no PII; Sentry scrubs)      | Legitimate interest     | 90 days (Sentry default)                  |
| Product analytics       | Parent   | screen names, anonymous app version (TelemetryDeck)  | Legitimate interest     | 90 days                                   |

**Not collected:** location, contacts, photos (until Phase 4 proof uploads), microphone, advertising ID, third-party cookies.

## User rights (GDPR)

- **Access**: in Phase 4 we expose "Export my data" in Settings (JSON of all rows tagged with the parent's `family_id`).
- **Erasure**: account deletion in Settings cascades to all `family_id` rows. Append-only ledgers are wiped on account deletion (we keep no shadow copies). Required by Apple before App Store launch.
- **Rectification**: every editable field is editable in-app.
- **Portability**: covered by export (JSON).
- **Objection**: opt-out of TelemetryDeck/Sentry in Settings.

## Sub-processors

| Processor       | Purpose             | Region            | DPA in place?           |
| --------------- | ------------------- | ----------------- | ----------------------- |
| Supabase, Inc.  | Backend hosting     | EU (Stockholm)    | Standard SCC + their DPA |
| Apple           | App distribution, SIWA | EU/Global       | Apple Developer Agreement |
| Sentry          | Crash reporting     | EU                | Standard DPA            |
| TelemetryDeck   | Analytics           | EU                | Standard DPA            |
| Stripe (future) | Payment processing  | EU                | Stripe DPA              |

## Apple privacy manifest

Committed at `ios/Growquest/Resources/PrivacyInfo.xcprivacy`. Reviewed every release for accuracy. Tracks:

- Required reasons API usage (e.g. `UserDefaults` access reason)
- Data types collected and purposes
- Tracking domains (none)

## Children & Apple App Store age rating

- Target age rating: **4+** (no objectionable content).
- Family-safe content guidelines apply: no third-party links out, no chat, no UGC visible to non-family members.
- Future Family Controls usage will require the corresponding entitlement disclosure.
