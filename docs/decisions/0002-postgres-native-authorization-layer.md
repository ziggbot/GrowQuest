# ADR 0002 — Postgres-native authorization layer (triggers + RPCs over edge functions)

- Status: **Accepted**
- Date: 2026-04-25
- Supersedes: nothing
- Related: [ADR 0001](0001-ios-supabase-mvp.md)

## Context

Two early-MVP needs exposed the same architectural choice:

1. **Family bootstrap on sign-up** (issue #4) — when a new `auth.users` row appears, we need to create a `families` row and a `family_members(role='parent')` row in the same transaction, otherwise the iOS app sees a "signed in but no family" limbo.
2. **Mission approval** (issue #8) — when a parent approves a child's submission, we must atomically:
   - flip `mission_submissions.status` from `pending` to `approved`
   - insert the corresponding `coin_ledger` credit (which has no INSERT policy for `authenticated` because the ledger is append-only)
   
   Doing these as two round-trips would risk leaving the system inconsistent (status flipped but ledger entry missing, or worse, double-credited under concurrent approvals).

We had two implementation paths.

| Option                                | Description                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| **A. Postgres SECURITY DEFINER**      | DB triggers + RPCs (`handle_new_user`, `approve_mission`) called via PostgREST. |
| **B. Supabase edge functions (Deno)** | TypeScript handlers using the service-role client.                              |

## Decision

**Use Postgres SECURITY DEFINER triggers + RPCs as the default for any write operation that must be atomic, must escape RLS, or must run automatically on a DB event. Reach for edge functions only when the operation needs to call out to an external HTTP API or run untrusted code.**

Concretely, in MVP:

- `public.handle_new_user()` — trigger on `auth.users` insert.
- `public.approve_mission(submission_id, action, note?)` — RPC.
- `public.is_family_member(family_id)` — SECURITY DEFINER helper used by every RLS policy.
- Future: `public.redeem_screen_time(...)`, `public.delete_account()` — same pattern.

Edge functions stay reserved for:
- APNs push delivery (issue #17 — needs HTTP to Apple).
- Stripe webhook handling and `Transfers.create` calls (issue #18 — needs HTTP to Stripe).
- Anything that must process a webhook payload from a third party.

## Authorization model inside SECURITY DEFINER

The function runs with the function owner's privileges (typically `postgres` superuser) so it bypasses RLS. We restore caller-aware authorization explicitly inside the function:

```sql
if not exists (
  select 1 from public.family_members
  where family_id = v_submission.family_id
    and user_id   = auth.uid()
) then
  raise exception 'forbidden' using errcode = '42501';
end if;
```

`auth.uid()` returns the JWT subject of the calling user. PostgREST extracts it from the Bearer token before the function runs. SECURITY DEFINER does not change this — only the privileges change.

Every SECURITY DEFINER function we ship must:

1. `SET search_path = public, auth` on the function definition (prevents search-path injection).
2. `REVOKE ALL ... FROM public; GRANT EXECUTE ... TO authenticated;`
3. Verify the caller's authorization explicitly (no implicit "RLS will protect us" — RLS is bypassed).
4. Use `SELECT ... FOR UPDATE` when the operation depends on row state (prevents lost updates under concurrent calls).

## Alternatives considered

### B. Edge functions (Deno) — rejected for MVP write operations

Pros we gave up:
- TypeScript is more familiar than PL/pgSQL.
- Easier to call external APIs.
- Easier to write traditional unit tests.

Cons that drove the rejection:
- **Not atomic by default.** Wrapping `update + insert` in a transaction means opening a transaction over PostgREST or using a raw pg client — same complexity as just writing PL/pgSQL.
- **Cold starts.** Deno isolates wake from cold add ~200ms to the first call after idle. The mission-approve flow is interactive; a noticeable delay degrades the loop.
- **Two deploy surfaces.** Edge functions need their own deploy pipeline (`supabase functions deploy`), separate from migrations. More CI to maintain, more things to forget.
- **Cost.** Free tier limits edge function invocations. RPC calls are just regular SQL; they count against DB compute, which the free tier already includes.

### Hybrid (trigger for bootstrap, edge function for approve) — rejected

Possible but awkward — two different patterns for the same kind of "elevated write." Easier to reason about a codebase where every elevated write goes through `public.X(...)` RPCs.

## Consequences

**Good**

- One mental model: every elevated write is a SECURITY DEFINER function in a numbered SQL migration, callable via `supabase.rpc(...)` from the iOS app.
- True atomicity for free — the function body is a single transaction.
- RLS, RPCs, and triggers all use the same `auth.uid()` and `is_family_member(...)` plumbing.
- No additional deploy surface; CI's `supabase db reset` and `supabase db push` handle everything.

**Bad / accepted trade-offs**

- PL/pgSQL stack traces are less friendly than TypeScript stack traces. Mitigation: keep functions short, raise with explicit `errcode` + message.
- We can't call external HTTP APIs from PL/pgSQL without the `http` or `pg_net` extensions, which we are deliberately not enabling. Anything that needs an external call gets an edge function.
- Schema changes that touch a SECURITY DEFINER function require redefining the function in a migration (which we'd do anyway).
- Vendor lock-in to Postgres. Acceptable: we already chose Postgres in ADR 0001 and would have to rewrite a lot more than the RPC layer to leave.

## Test strategy

`supabase-lint.yml` smoke-tests the family-bootstrap trigger and the `approve_mission` RPC against vanilla Postgres + `.github/auth-stub.sql`. Issue #16 (pgtap RLS contract tests) extends this to per-family isolation. The end-to-end `scripts/smoke-cloud.sh` exercises the same flow against a real Supabase project (local or cloud) over the wire.
