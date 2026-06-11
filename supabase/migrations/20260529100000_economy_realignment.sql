-- Economy realignment.
--
-- 1) 1 mynt = 1 minute (times the family's screen_time_multiplier).
--    Old formula was minutes/30 × 80 × mult; switching to a plain 1:1
--    matches the new positioning where mynt are an activity currency,
--    not an abstract token.
-- 2) profile_configs.require_daily_mission: if on, the kid must have
--    at least one approved mission *today* before redeem_screen_time
--    will let them spend. Stops the "stockpile and coast" loop.
-- 3) profile_configs.mynt_expiry_days: lazy FIFO expiry. New
--    expire_mynt(child_id) RPC walks the child's ledger oldest-first
--    and emits negative 'expiry' entries for the remaining un-spent
--    balance of positives older than the window. Spending RPCs call
--    expire_mynt() before they check balance, so freshly expired
--    coins can't fund a redemption.
-- 4) Default daily_limit_minutes lowered to 60 (1 hour).

-- ─── columns ─────────────────────────────────────────────────────
alter table public.profile_configs
  add column if not exists require_daily_mission boolean not null default false,
  add column if not exists mynt_expiry_days int
    check (mynt_expiry_days is null or mynt_expiry_days between 1 and 365);

alter table public.profile_configs
  alter column daily_limit_minutes set default 60;

-- ─── coin_ledger: ref + reason ───────────────────────────────────
alter table public.coin_ledger
  add column if not exists ref_expired_entry uuid
    references public.coin_ledger(id) on delete set null;

alter table public.coin_ledger drop constraint if exists coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check
  check (reason in (
    'mission_approved', 'redemption', 'adjustment', 'refund',
    'savings_deposit', 'savings_withdraw', 'expiry'
  ));

create index if not exists coin_ledger_expiry_ref_idx
  on public.coin_ledger(ref_expired_entry)
  where ref_expired_entry is not null;

-- ─── expire_mynt RPC (lazy FIFO) ─────────────────────────────────
create or replace function public.expire_mynt(p_child_id uuid)
returns int
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_family_id           uuid;
  v_expiry_days         int;
  v_cutoff              timestamptz;
  v_total_spent_running bigint;
  v_cum_pos_before      bigint := 0;
  v_remaining           int;
  v_total_expired       int := 0;
  pos                   record;
begin
  select c.family_id into v_family_id
  from public.child_profiles c
  where c.id = p_child_id;
  if not found then return 0; end if;

  if not public.is_family_member(v_family_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select mynt_expiry_days into v_expiry_days
  from public.profile_configs
  where family_id = v_family_id;
  if v_expiry_days is null then return 0; end if;

  v_cutoff := now() - (v_expiry_days || ' days')::interval;

  -- Sum of all spends (negative entries) including any expiries we
  -- already wrote in previous calls. Each new expiry below adds to
  -- this running total so FIFO accounting stays consistent.
  select coalesce(sum(-amount_mynt), 0) into v_total_spent_running
  from public.coin_ledger
  where child_id = p_child_id and amount_mynt < 0;

  for pos in
    select e.id, e.amount_mynt, e.created_at
    from public.coin_ledger e
    where e.child_id   = p_child_id
      and e.amount_mynt > 0
      and e.reason     <> 'expiry'
    order by e.created_at asc, e.id asc
  loop
    if pos.created_at < v_cutoff then
      -- Idempotency: skip if we've already emitted an expiry for it.
      if not exists (
        select 1 from public.coin_ledger ex
        where ex.ref_expired_entry = pos.id and ex.reason = 'expiry'
      ) then
        -- FIFO: how much of THIS positive remains?
        --   consumed = max(0, min(amount, spent_so_far - cum_pos_before))
        --   remaining = amount - consumed
        v_remaining := pos.amount_mynt
          - greatest(0,
              least(pos.amount_mynt::bigint,
                    v_total_spent_running - v_cum_pos_before)
            )::int;
        if v_remaining > 0 then
          insert into public.coin_ledger
            (family_id, child_id, amount_mynt, reason,
             ref_expired_entry, created_by)
          values
            (v_family_id, p_child_id, -v_remaining, 'expiry',
             pos.id, auth.uid());
          v_total_expired       := v_total_expired + v_remaining;
          v_total_spent_running := v_total_spent_running + v_remaining;
        end if;
      end if;
    end if;
    v_cum_pos_before := v_cum_pos_before + pos.amount_mynt;
  end loop;

  return v_total_expired;
end;
$$;

revoke all on function public.expire_mynt(uuid) from public;
grant  execute on function public.expire_mynt(uuid) to authenticated;

-- ─── redeem_screen_time: 1:1 cost, daily-mission gate, lazy expiry ─
create or replace function public.redeem_screen_time(
  p_child_id        uuid,
  p_minutes         int,
  p_requested_apps  text[] default null,
  p_other_app       text   default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_family_id      uuid;
  v_multiplier     numeric(4,2);
  v_family_limit   int;
  v_child_override int;
  v_daily_limit    int;
  v_require_today  boolean;
  v_done_today     int;
  v_used_today     int;
  v_balance        bigint;
  v_cost           int;
  v_redemption_id  uuid;
  v_ends_at        timestamptz;
begin
  if p_minutes < 1 or p_minutes > 600 then
    raise exception 'invalid minutes: %', p_minutes using errcode = '22023';
  end if;

  if p_other_app is not null and length(p_other_app) > 100 then
    raise exception 'other_app too long' using errcode = '22023';
  end if;

  select c.family_id, c.daily_limit_minutes_override
    into v_family_id, v_child_override
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

  select screen_time_multiplier, daily_limit_minutes, require_daily_mission
    into v_multiplier, v_family_limit, v_require_today
  from public.profile_configs
  where family_id = v_family_id;
  if not found then
    raise exception 'profile config missing — finish onboarding first'
      using errcode = '23502';
  end if;

  v_daily_limit := coalesce(v_child_override, v_family_limit);

  -- New gate: at least one approved mission today.
  if v_require_today then
    select count(*) into v_done_today
    from public.coin_ledger
    where child_id = p_child_id
      and reason   = 'mission_approved'
      and created_at >= date_trunc('day', (now() at time zone 'UTC'));
    if v_done_today = 0 then
      raise exception 'Du behöver klara minst ett uppdrag idag innan du växlar till skärmtid.'
        using errcode = '23514';
    end if;
  end if;

  -- Lazy expiry — bring the ledger up to date before checking balance.
  perform public.expire_mynt(p_child_id);

  select coalesce(sum(minutes), 0) into v_used_today
  from public.redemptions
  where child_id = p_child_id
    and started_at >= date_trunc('day', (now() at time zone 'UTC'))
    and status in ('pending', 'approved');

  if v_used_today + p_minutes > v_daily_limit then
    raise exception 'Dagens skärmtidsgräns är nådd (% / % min). Begäran avslås.',
      v_used_today, v_daily_limit
      using errcode = '23514';
  end if;

  -- 1 mynt = 1 minute, scaled by the family multiplier.
  v_cost := greatest(1, round(p_minutes * v_multiplier))::int;

  select coalesce(sum(amount_mynt), 0) into v_balance
  from public.coin_ledger
  where child_id = p_child_id;
  if v_balance < v_cost then
    raise exception 'insufficient mynt (have %, need %)', v_balance, v_cost
      using errcode = '23514';
  end if;

  v_ends_at := now() + (p_minutes || ' minutes')::interval;

  insert into public.redemptions
    (family_id, child_id, kind, minutes, mynt_cost, started_at, ends_at,
     created_by, status, requested_apps, other_app)
  values
    (v_family_id, p_child_id, 'screen_time_minutes',
     p_minutes, v_cost, now(), v_ends_at, auth.uid(),
     'pending', p_requested_apps, p_other_app)
  returning id into v_redemption_id;

  insert into public.coin_ledger
    (family_id, child_id, amount_mynt, reason, ref_redemption, created_by)
  values
    (v_family_id, p_child_id, -v_cost, 'redemption', v_redemption_id, auth.uid());

  return jsonb_build_object(
    'redemption_id', v_redemption_id,
    'minutes',       p_minutes,
    'mynt_cost',     v_cost,
    'ends_at',       v_ends_at,
    'status',        'pending'
  );
end;
$$;

-- redeem_cash + deposit_to_savings: also lazy-expire before checking
-- balance so the kid can't spend coins that have aged out.
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

  perform public.expire_mynt(p_child_id);

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

  perform public.expire_mynt(v_child_id);

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

notify pgrst, 'reload schema';
