# Supabase

Local-first Postgres + Auth + Storage stack for GrowQuest. Cloud project settings live in the Supabase dashboard; this directory is the source of truth for everything that should be reproducible from a clean clone.

## Local dev

```bash
brew install supabase/tap/supabase   # one-time
supabase start                       # boots Postgres + Auth + Studio + Inbucket
supabase status                      # prints SUPABASE_URL + anon key for .env
```

Studio: http://127.0.0.1:54323 · Inbucket (mail catcher): http://127.0.0.1:54324

## After editing migrations

```bash
supabase db reset    # drops & rebuilds local DB, replays all migrations + seed.sql
```

## Naming

`supabase/migrations/YYYYMMDDHHMMSS_short_description.sql`. Created by:

```bash
supabase migration new short_description
```

## Non-negotiables (mirrors `CLAUDE.md`)

- Every multi-tenant table has `family_id uuid not null` and RLS **enabled + forced**.
- Use the `public.is_family_member(fid)` helper in policies — don't inline `auth.uid()` checks.
- Ledgers (`coin_ledger`, `payout_ledger`) are append-only: grant SELECT to authenticated, never INSERT/UPDATE/DELETE. Mutations go through edge functions running with the service-role key.
- Money in integer öre. Floats are forbidden for money.
- Every mutable table has `created_at` + `updated_at`; the latter is maintained by the `public.set_updated_at()` trigger.

## Cloud deploy

```bash
supabase link --project-ref <your-cloud-ref>
supabase db push                     # pushes new migrations to the linked project
```

Service-role key: stored as `SUPABASE_SERVICE_ROLE_KEY` GitHub Action secret. Never committed. Never embedded in the iOS app.
