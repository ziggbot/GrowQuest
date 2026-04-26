-- 20260425110000_redemption_schema_and_rpc.sql
-- Issue #10 — symbolic screen-time redemption.
--
-- Adds the redemptions table (one row per child unlock) and the
-- public.redeem_screen_time(child_id, minutes) RPC. The RPC enforces:
--   * caller is a family_member of the child's family
--   * profile_configs row exists for the family (onboarding completed)
--   * minutes within bounds + within today's daily_limit_minutes
--   * child has enough mynt to cover the cost
-- Cost = round((minutes / 30.0) * 80.0 * screen_time_multiplier / 5.0) * 5
-- (matches design/mockup.jsx tillämpaProfilPåSkärmtid: round-to-5).
--
-- All side effects happen in one transaction: insert redemption row +
-- insert negative coin_ledger entry referencing it.
--
-- "Symbolic" means we record the unlock and start a countdown but do NOT
-- actually gate the OS — that needs Family Controls (issue #19, prod-hardening).

-- ─── redemptions table ─────────────────────────────────────────────────────
create table public.redemptions (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.families(id) on delete cascade,
  child_id      uuid not null references public.child_profiles(id) on delete cascade,
  kind          text not null default 'screen_time_minutes'
                  check (kind in ('screen_time_minutes')),
  minutes       int  not null check (minutes between 1 and 600),
  mynt_cost     int  not null check (mynt_cost >= 0),
  started_at    timestamptz not null default now(),
  ends_at       timestamptz not null,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index redemptions_child_started_idx
  on public.redemptions(child_id, started_at desc);

alter table public.redemptions enable row level security;
alter table public.redemptions force  row level security;

create policy "members read redemptions"
  on public.redemptions for select
  using (public.is_family_member(family_id));
-- No insert/update/delete policy → only the SECURITY DEFINER RPC writes.

-- Hook coin_ledger.ref_redemption to redemptions.id now that the table exists.
alter table public.coin_ledger
  add constraint coin_ledger_ref_redemption_fkey
    foreign key (ref_redemption) references public.redemptions(id)
    on delete set null;

-- ─── redeem_screen_time RPC ───────────────────────────────────────────────
create or replace function public.redeem_screen_time(
  p_child_id uuid,
  p_minutes  int
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_family_id      uuid;
  v_multiplier     numeric(4,2);
  v_daily_limit    int;
  v_used_today     int;
  v_balance        bigint;
  v_cost           int;
  v_redemption_id  uuid;
  v_ends_at        timestamptz;
begin
  if p_minutes < 1 or p_minutes > 600 then
    raise exception 'invalid minutes: %', p_minutes using errcode = '22023';
  end if;

  select c.family_id into v_family_id
  from public.child_profiles c
  where c.id = p_child_id
  for update;
  if not found then
    raise exception 'child not found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.family_members
    where family_id = v_family_id
      and user_id   = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select screen_time_multiplier, daily_limit_minutes
    into v_multiplier, v_daily_limit
  from public.profile_configs
  where family_id = v_family_id;
  if not found then
    raise exception 'profile config missing — finish onboarding first'
      using errcode = '23502';
  end if;

  select coalesce(sum(minutes), 0) into v_used_today
  from public.redemptions
  where child_id = p_child_id
    and started_at >= date_trunc('day', (now() at time zone 'UTC'));
  if v_used_today + p_minutes > v_daily_limit then
    raise exception 'daily limit exceeded (%/% min)',
      v_used_today + p_minutes, v_daily_limit
      using errcode = '23514';
  end if;

  v_cost := (round((p_minutes / 30.0) * 80.0 * v_multiplier / 5.0) * 5)::int;

  select coalesce(sum(amount_mynt), 0) into v_balance
  from public.coin_ledger
  where child_id = p_child_id;
  if v_balance < v_cost then
    raise exception 'insufficient mynt (have %, need %)', v_balance, v_cost
      using errcode = '23514';
  end if;

  v_ends_at := now() + (p_minutes || ' minutes')::interval;

  insert into public.redemptions
    (family_id, child_id, kind, minutes, mynt_cost, started_at, ends_at, created_by)
  values
    (v_family_id, p_child_id, 'screen_time_minutes',
     p_minutes, v_cost, now(), v_ends_at, auth.uid())
  returning id into v_redemption_id;

  insert into public.coin_ledger
    (family_id, child_id, amount_mynt, reason, ref_redemption, created_by)
  values
    (v_family_id, p_child_id, -v_cost, 'redemption', v_redemption_id, auth.uid());

  return jsonb_build_object(
    'redemption_id', v_redemption_id,
    'minutes',       p_minutes,
    'mynt_cost',     v_cost,
    'ends_at',       v_ends_at
  );
end;
$$;

revoke all on function public.redeem_screen_time(uuid, int) from public;
grant  execute on function public.redeem_screen_time(uuid, int) to authenticated;
