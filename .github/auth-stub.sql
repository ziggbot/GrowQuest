-- .github/auth-stub.sql
-- Minimal Supabase `auth` schema stub for CI. Real Supabase ships a much richer
-- schema (sessions, identities, refresh tokens, MFA, …) but our migrations only
-- reference auth.users(id) and auth.uid(). Stubbing those keeps `psql -f` fast
-- and dependency-free in CI without spinning up the full Supabase stack.

create schema if not exists auth;

create table if not exists auth.users (
  id          uuid primary key default gen_random_uuid(),
  email       text unique,
  created_at  timestamptz not null default now()
);

-- auth.uid() is normally set per-request by Supabase from the JWT.
-- In CI it returns null; RLS contract tests (issue #16) will set this
-- explicitly per-test using `set_config('request.jwt.claim.sub', ..., true)`.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
