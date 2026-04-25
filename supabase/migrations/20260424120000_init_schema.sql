-- 20260424120000_init_schema.sql
-- Phase 0 / Phase 1 foundational schema for GrowQuest.
--
-- Invariants enforced here (also documented in CLAUDE.md):
--   * Every multi-tenant table carries family_id (uuid not null).
--   * RLS is ENABLED and FORCED on every multi-tenant table.
--   * Every mutable table has created_at + updated_at (trigger-maintained).
--   * Money is integer öre (kr_amount_ore int). Never floats.
--   * Ledgers are append-only — no UPDATE/DELETE policy is granted to anon/authenticated roles.

-- ─── Extensions ─────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── updated_at trigger helper ──────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Tenant membership helper (single source of truth for RLS) ──────────────
-- A SECURITY DEFINER function lets policies stay simple and consistent.
-- Returns true if the calling user is a member of the given family.
create or replace function public.is_family_member(fid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = fid
      and fm.user_id   = auth.uid()
  );
$$;

revoke all on function public.is_family_member(uuid) from public;
grant  execute on function public.is_family_member(uuid) to authenticated;

-- ─── families ──────────────────────────────────────────────────────────────
create table public.families (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(name) between 1 and 80),
  created_by   uuid not null references auth.users(id) on delete restrict,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.families enable row level security;
alter table public.families force  row level security;

create trigger families_set_updated_at
  before update on public.families
  for each row execute function public.set_updated_at();

create policy "members read family"
  on public.families for select
  using (public.is_family_member(id));

create policy "creator inserts family"
  on public.families for insert
  with check (created_by = auth.uid());

create policy "members update family"
  on public.families for update
  using (public.is_family_member(id))
  with check (public.is_family_member(id));

-- ─── family_members ────────────────────────────────────────────────────────
-- One row per (family, parent-user). Children are NOT here — they are profiles.
create table public.family_members (
  family_id    uuid not null references public.families(id) on delete cascade,
  user_id      uuid not null references auth.users(id)       on delete cascade,
  role         text not null default 'parent' check (role in ('parent','co_parent')),
  created_at   timestamptz not null default now(),
  primary key (family_id, user_id)
);

alter table public.family_members enable row level security;
alter table public.family_members force  row level security;

create policy "members read membership"
  on public.family_members for select
  using (public.is_family_member(family_id));

create policy "members insert membership for self"
  on public.family_members for insert
  with check (user_id = auth.uid());

-- ─── child_profiles ────────────────────────────────────────────────────────
create table public.child_profiles (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.families(id) on delete cascade,
  nickname      text not null check (length(nickname) between 1 and 30),
  avatar_emoji  text not null default '🦸' check (length(avatar_emoji) <= 8),
  age_band      text check (age_band in ('4-6','7-9','10-12','13+')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index child_profiles_family_idx on public.child_profiles(family_id);

alter table public.child_profiles enable row level security;
alter table public.child_profiles force  row level security;

create trigger child_profiles_set_updated_at
  before update on public.child_profiles
  for each row execute function public.set_updated_at();

create policy "members read children"
  on public.child_profiles for select
  using (public.is_family_member(family_id));

create policy "members write children"
  on public.child_profiles for all
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

-- ─── profile_configs ───────────────────────────────────────────────────────
-- The "Skärmfri / Balanserad / Liberal" choice from the mockup.
create table public.profile_configs (
  family_id              uuid primary key references public.families(id) on delete cascade,
  profile_id             text not null check (profile_id in ('stram','balans','fri')),
  uppdrag_multiplier     numeric(4,2) not null,
  screen_time_multiplier numeric(4,2) not null,
  daily_limit_minutes    int not null check (daily_limit_minutes between 0 and 1440),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table public.profile_configs enable row level security;
alter table public.profile_configs force  row level security;

create trigger profile_configs_set_updated_at
  before update on public.profile_configs
  for each row execute function public.set_updated_at();

create policy "members read profile config"
  on public.profile_configs for select
  using (public.is_family_member(family_id));

create policy "members write profile config"
  on public.profile_configs for all
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

-- ─── missions ──────────────────────────────────────────────────────────────
create table public.missions (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references public.families(id) on delete cascade,
  title           text not null check (length(title) between 1 and 80),
  description     text check (length(description) <= 500),
  reward_mynt     int  not null check (reward_mynt between 0 and 10000),
  recurrence      text not null default 'once' check (recurrence in ('once','daily','weekly')),
  active          boolean not null default true,
  created_by      uuid not null references auth.users(id) on delete restrict,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index missions_family_idx on public.missions(family_id) where active;

alter table public.missions enable row level security;
alter table public.missions force  row level security;

create trigger missions_set_updated_at
  before update on public.missions
  for each row execute function public.set_updated_at();

create policy "members read missions"
  on public.missions for select
  using (public.is_family_member(family_id));

create policy "members write missions"
  on public.missions for all
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

-- ─── mission_submissions ───────────────────────────────────────────────────
-- A child marks a mission as done. Parent reviews → approved/rejected.
-- On approval, an edge function inserts into coin_ledger (single transaction).
create table public.mission_submissions (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.families(id) on delete cascade,
  mission_id    uuid not null references public.missions(id) on delete cascade,
  child_id      uuid not null references public.child_profiles(id) on delete cascade,
  submitted_at  timestamptz not null default now(),
  status        text not null default 'pending'
                  check (status in ('pending','approved','rejected')),
  reviewed_by   uuid references auth.users(id) on delete set null,
  reviewed_at   timestamptz,
  note          text check (length(note) <= 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index mission_submissions_family_idx on public.mission_submissions(family_id, status);

alter table public.mission_submissions enable row level security;
alter table public.mission_submissions force  row level security;

create trigger mission_submissions_set_updated_at
  before update on public.mission_submissions
  for each row execute function public.set_updated_at();

create policy "members read submissions"
  on public.mission_submissions for select
  using (public.is_family_member(family_id));

create policy "members write submissions"
  on public.mission_submissions for all
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

-- ─── coin_ledger (append-only) ─────────────────────────────────────────────
-- Balances are sum(amount_mynt) per child. Refunds = negative-amount inserts.
create table public.coin_ledger (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references public.families(id) on delete cascade,
  child_id       uuid not null references public.child_profiles(id) on delete cascade,
  amount_mynt    int  not null,
  reason         text not null check (reason in ('mission_approved','redemption','adjustment','refund')),
  ref_submission uuid references public.mission_submissions(id) on delete set null,
  ref_redemption uuid,  -- redemptions table arrives in Phase 3
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index coin_ledger_child_idx on public.coin_ledger(child_id, created_at desc);

alter table public.coin_ledger enable row level security;
alter table public.coin_ledger force  row level security;

-- READ for family members; WRITE only via service-role (edge function).
create policy "members read coin ledger"
  on public.coin_ledger for select
  using (public.is_family_member(family_id));
-- No insert/update/delete policy → anon + authenticated cannot mutate.
-- Edge functions use the service-role key, which bypasses RLS.

-- ─── payout_ledger (append-only, reserved for Stripe) ──────────────────────
-- Empty in MVP. Existing now so first real payout doesn't require a schema change.
create table public.payout_ledger (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references public.families(id) on delete cascade,
  child_id       uuid not null references public.child_profiles(id) on delete cascade,
  kr_amount_ore  int  not null check (kr_amount_ore <> 0), -- positive = payout, negative = clawback
  provider       text not null default 'symbolic' check (provider in ('symbolic','stripe_connect')),
  provider_ref   text,    -- e.g. Stripe transfer id
  status         text not null default 'recorded'
                   check (status in ('recorded','pending','succeeded','failed','reversed')),
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index payout_ledger_family_idx on public.payout_ledger(family_id, created_at desc);

alter table public.payout_ledger enable row level security;
alter table public.payout_ledger force  row level security;

create policy "members read payout ledger"
  on public.payout_ledger for select
  using (public.is_family_member(family_id));
-- No insert/update/delete for non-service roles. Stripe webhook handler uses service role.
