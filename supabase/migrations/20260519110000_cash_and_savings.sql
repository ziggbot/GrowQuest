-- Cash payouts + savings goals.
--
-- 1. Extend redemptions.kind to accept 'cash_payout' alongside 'screen_time_minutes'.
-- 2. Extend coin_ledger.reason to accept 'savings_deposit' / 'savings_withdraw'.
-- 3. Create savings_goals table (parent creates, child deposits toward).
-- 4. FK from coin_ledger to savings_goals.
-- 5. RPCs: redeem_cash (child requests, pending), deposit_to_savings, withdraw_from_savings.

-- ─── 1. Extend redemptions.kind ──────────────────────────────────────────
alter table public.redemptions drop constraint if exists redemptions_kind_check;
alter table public.redemptions add constraint redemptions_kind_check
  check (kind in ('screen_time_minutes', 'cash_payout'));

-- ─── 2. Extend coin_ledger.reason ───────────────────────────────────────
alter table public.coin_ledger drop constraint if exists coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check
  check (reason in (
    'mission_approved', 'redemption', 'adjustment', 'refund',
    'savings_deposit', 'savings_withdraw'
  ));

-- ─── 3. savings_goals ───────────────────────────────────────────────────
create table if not exists public.savings_goals (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families(id) on delete cascade,
  child_id    uuid not null references public.child_profiles(id) on delete cascade,
  title       text not null check (length(title) between 1 and 100),
  target_mynt int  not null check (target_mynt > 0),
  emoji       text not null default '🎯',
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.savings_goals enable row level security;
alter table public.savings_goals force  row level security;

create policy "members read goals"
  on public.savings_goals for select
  using (public.is_family_member(family_id));

create policy "members write goals"
  on public.savings_goals for all
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

-- ─── 4. FK from coin_ledger ─────────────────────────────────────────────
alter table public.coin_ledger
  add column if not exists ref_savings_goal uuid
    references public.savings_goals(id) on delete set null;

-- ─── 5. redeem_cash RPC ─────────────────────────────────────────────────
create or replace function public.redeem_cash(
  p_child_id    uuid,
  p_mynt_amount int
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_family_id     uuid;
  v_balance       bigint;
  v_redemption_id uuid;
begin
  if p_mynt_amount < 1 then
    raise exception 'invalid amount' using errcode = '22023';
  end if;

  select c.family_id into v_family_id
  from public.child_profiles c
  where c.id = p_child_id for update;
  if not found then
    raise exception 'child not found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.family_members
    where family_id = v_family_id and user_id = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(sum(amount_mynt), 0) into v_balance
  from public.coin_ledger where child_id = p_child_id;
  if v_balance < p_mynt_amount then
    raise exception 'insufficient mynt (have %, need %)', v_balance, p_mynt_amount
      using errcode = '23514';
  end if;

  insert into public.redemptions
    (family_id, child_id, kind, minutes, mynt_cost, started_at, ends_at,
     status, created_by)
  values
    (v_family_id, p_child_id, 'cash_payout', 0, p_mynt_amount,
     now(), now(), 'pending', auth.uid())
  returning id into v_redemption_id;

  insert into public.coin_ledger
    (family_id, child_id, amount_mynt, reason, ref_redemption, created_by)
  values
    (v_family_id, p_child_id, -p_mynt_amount, 'redemption',
     v_redemption_id, auth.uid());

  return jsonb_build_object(
    'redemption_id', v_redemption_id,
    'mynt_amount',   p_mynt_amount,
    'status',        'pending'
  );
end;
$$;

revoke all on function public.redeem_cash(uuid, int) from public;
grant  execute on function public.redeem_cash(uuid, int) to authenticated;

-- ─── 6. deposit_to_savings RPC ──────────────────────────────────────────
create or replace function public.deposit_to_savings(
  p_goal_id uuid,
  p_amount  int
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_family_id uuid;
  v_child_id  uuid;
  v_balance   bigint;
begin
  if p_amount < 1 then
    raise exception 'invalid amount' using errcode = '22023';
  end if;

  select family_id, child_id into v_family_id, v_child_id
  from public.savings_goals
  where id = p_goal_id for update;
  if not found then
    raise exception 'goal not found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.family_members
    where family_id = v_family_id and user_id = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(sum(amount_mynt), 0) into v_balance
  from public.coin_ledger where child_id = v_child_id;
  if v_balance < p_amount then
    raise exception 'insufficient mynt (have %, need %)', v_balance, p_amount
      using errcode = '23514';
  end if;

  insert into public.coin_ledger
    (family_id, child_id, amount_mynt, reason, ref_savings_goal, created_by)
  values
    (v_family_id, v_child_id, -p_amount, 'savings_deposit', p_goal_id, auth.uid());

  return jsonb_build_object(
    'goal_id', p_goal_id,
    'deposited', p_amount
  );
end;
$$;

revoke all on function public.deposit_to_savings(uuid, int) from public;
grant  execute on function public.deposit_to_savings(uuid, int) to authenticated;

-- ─── 7. withdraw_from_savings RPC ───────────────────────────────────────
create or replace function public.withdraw_from_savings(
  p_goal_id uuid,
  p_amount  int
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_family_id uuid;
  v_child_id  uuid;
  v_saved     bigint;
begin
  if p_amount < 1 then
    raise exception 'invalid amount' using errcode = '22023';
  end if;

  select family_id, child_id into v_family_id, v_child_id
  from public.savings_goals
  where id = p_goal_id for update;
  if not found then
    raise exception 'goal not found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.family_members
    where family_id = v_family_id and user_id = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(sum(-amount_mynt), 0) into v_saved
  from public.coin_ledger
  where ref_savings_goal = p_goal_id and reason = 'savings_deposit';

  if v_saved < p_amount then
    raise exception 'only % mynt saved in this goal', v_saved
      using errcode = '23514';
  end if;

  insert into public.coin_ledger
    (family_id, child_id, amount_mynt, reason, ref_savings_goal, created_by)
  values
    (v_family_id, v_child_id, p_amount, 'savings_withdraw', p_goal_id, auth.uid());

  return jsonb_build_object(
    'goal_id', p_goal_id,
    'withdrawn', p_amount
  );
end;
$$;

revoke all on function public.withdraw_from_savings(uuid, int) from public;
grant  execute on function public.withdraw_from_savings(uuid, int) to authenticated;

notify pgrst, 'reload schema';
