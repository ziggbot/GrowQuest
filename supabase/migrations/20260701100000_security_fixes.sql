-- Security fixes from the 2026-06-30 audit.
--
-- 1. can_act_for_child() helper: parent/co-parent of the family OR the
--    child's own linked auth user. Economy RPCs previously accepted any
--    family member — since children ARE family members (role='child'),
--    sibling A could spend sibling B's wallet.
-- 2. withdraw_from_savings: the "saved" check summed deposits only and
--    ignored prior withdrawals, so the same saved mynt could be
--    withdrawn repeatedly — minting coins. Now nets deposits against
--    withdrawals, locks the child row (consistent with the redeem RPCs,
--    closing a cross-RPC balance race), and requires can_act_for_child.
-- 3. Write policies split by role. The v1 "for all using
--    is_family_member" policies predate child logins; a child-role user
--    could raise their own screen-time cap, disable the daily-mission
--    gate, edit siblings' profiles/missions, or flip their own
--    submission to 'approved'. Writes are now parent-only except the
--    child-facing flows (submitting missions, proposing/editing/
--    deleting their own savings goals).
-- 4. photo/avatar columns get a data:image/ CHECK so a crafted
--    javascript: URI can never be stored (client also guards render).
-- 5. Streak bonus gets its own ledger reason ('streak_bonus') — the old
--    idempotency check matched ANY adjustment of exactly +50, so a
--    manual parent "+50" correction silently swallowed the earned bonus.
-- 6. adjust_balance bounded to ±10000 like reward_mynt.

-- ─── 1. can_act_for_child ────────────────────────────────────────────
create or replace function public.can_act_for_child(p_child_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.child_profiles c
    where c.id = p_child_id
      and (public.is_family_parent(c.family_id)
           or c.auth_user_id = auth.uid())
  );
$$;

revoke all on function public.can_act_for_child(uuid) from public;
grant  execute on function public.can_act_for_child(uuid) to authenticated;

-- ─── 5a. ledger reason: streak_bonus ─────────────────────────────────
alter table public.coin_ledger drop constraint if exists coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check
  check (reason in (
    'mission_approved', 'redemption', 'adjustment', 'refund',
    'savings_deposit', 'savings_withdraw', 'expiry', 'streak_bonus'
  ));

-- ─── 4. stored photos must be images ─────────────────────────────────
-- Null out any legacy value that isn't an image data URL, then constrain.
update public.mission_submissions
   set photo_data = null
 where photo_data is not null and photo_data not like 'data:image/%';
update public.child_profiles
   set avatar_photo = null
 where avatar_photo is not null and avatar_photo not like 'data:image/%';

alter table public.mission_submissions
  drop constraint if exists mission_submissions_photo_data_is_image;
alter table public.mission_submissions
  add constraint mission_submissions_photo_data_is_image
  check (photo_data is null or photo_data like 'data:image/%');

alter table public.child_profiles
  drop constraint if exists child_profiles_avatar_photo_is_image;
alter table public.child_profiles
  add constraint child_profiles_avatar_photo_is_image
  check (avatar_photo is null or avatar_photo like 'data:image/%');

-- ─── 3. role-aware write policies ────────────────────────────────────
-- child_profiles: reads for members, writes for parents only. Children
-- never write their own profile row from the app (the invite-claim RPC
-- is SECURITY DEFINER and bypasses RLS).
drop policy if exists "members write children" on public.child_profiles;
create policy "parents insert children"
  on public.child_profiles for insert
  with check (public.is_family_parent(family_id));
create policy "parents update children"
  on public.child_profiles for update
  using (public.is_family_parent(family_id))
  with check (public.is_family_parent(family_id));
create policy "parents delete children"
  on public.child_profiles for delete
  using (public.is_family_parent(family_id));

-- profile_configs: parent-only writes.
drop policy if exists "members write profile config" on public.profile_configs;
create policy "parents insert profile config"
  on public.profile_configs for insert
  with check (public.is_family_parent(family_id));
create policy "parents update profile config"
  on public.profile_configs for update
  using (public.is_family_parent(family_id))
  with check (public.is_family_parent(family_id));
create policy "parents delete profile config"
  on public.profile_configs for delete
  using (public.is_family_parent(family_id));

-- missions: parent-only writes.
drop policy if exists "members write missions" on public.missions;
create policy "parents insert missions"
  on public.missions for insert
  with check (public.is_family_parent(family_id));
create policy "parents update missions"
  on public.missions for update
  using (public.is_family_parent(family_id))
  with check (public.is_family_parent(family_id));
create policy "parents delete missions"
  on public.missions for delete
  using (public.is_family_parent(family_id));

-- mission_submissions: any member may INSERT but only as 'pending'
-- (children submit their own missions); review transitions happen via
-- the parent-gated RPCs, so direct UPDATE/DELETE is parent-only.
drop policy if exists "members write submissions" on public.mission_submissions;
create policy "members insert pending submissions"
  on public.mission_submissions for insert
  with check (
    public.is_family_member(family_id)
    and (status = 'pending' or public.is_family_parent(family_id))
  );
create policy "parents update submissions"
  on public.mission_submissions for update
  using (public.is_family_parent(family_id))
  with check (public.is_family_parent(family_id));
create policy "parents delete submissions"
  on public.mission_submissions for delete
  using (public.is_family_parent(family_id));

-- savings_goals: children may propose goals (status forced to
-- 'pending'), and edit/delete only their OWN goals; parents may do
-- anything within the family.
drop policy if exists "members write goals" on public.savings_goals;
create policy "goals insert"
  on public.savings_goals for insert
  with check (
    public.is_family_parent(family_id)
    or (public.is_family_member(family_id) and status = 'pending')
  );
create policy "goals update"
  on public.savings_goals for update
  using (
    public.is_family_parent(family_id)
    or exists (
      select 1 from public.child_profiles c
      where c.id = child_id and c.auth_user_id = auth.uid()
    )
  )
  with check (
    public.is_family_parent(family_id)
    or status = 'pending'
  );
create policy "goals delete"
  on public.savings_goals for delete
  using (
    public.is_family_parent(family_id)
    or exists (
      select 1 from public.child_profiles c
      where c.id = child_id and c.auth_user_id = auth.uid()
    )
  );

-- ─── 2. withdraw_from_savings: net check + gating + child lock ───────
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

  if not public.can_act_for_child(v_child_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Serialize with the redeem/deposit RPCs, which lock the child row.
  perform 1 from public.child_profiles where id = v_child_id for update;

  -- Net saved = deposits (negative ledger rows) minus prior withdrawals
  -- (positive rows). The old check counted deposits only, so the same
  -- saved mynt could be withdrawn repeatedly.
  select coalesce(sum(-amount_mynt), 0) into v_saved
  from public.coin_ledger
  where ref_savings_goal = p_goal_id
    and reason in ('savings_deposit', 'savings_withdraw');

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

-- ─── 1b. deposit_to_savings: gating + child lock ─────────────────────
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
  v_status    text;
  v_balance   bigint;
begin
  if p_amount < 1 then
    raise exception 'invalid amount' using errcode = '22023';
  end if;

  select family_id, child_id, status into v_family_id, v_child_id, v_status
  from public.savings_goals
  where id = p_goal_id for update;
  if not found then
    raise exception 'goal not found' using errcode = 'P0002';
  end if;
  if v_status <> 'approved' then
    raise exception 'Sparmålet väntar på förälderns godkännande.' using errcode = '23514';
  end if;

  if not public.can_act_for_child(v_child_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  perform 1 from public.child_profiles where id = v_child_id for update;

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

  return jsonb_build_object('goal_id', p_goal_id, 'deposited', p_amount);
end;
$$;

-- ─── 1c. redeem_cash: gating (child lock already present) ────────────
create or replace function public.redeem_cash(
  p_child_id    uuid,
  p_mynt_amount int,
  p_goal_id     uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_family_id     uuid;
  v_balance       bigint;
  v_goal_status   text;
  v_goal_child    uuid;
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

  if not public.can_act_for_child(p_child_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  perform public.expire_mynt(p_child_id);

  select coalesce(sum(amount_mynt), 0) into v_balance
  from public.coin_ledger where child_id = p_child_id;
  if v_balance < p_mynt_amount then
    raise exception 'insufficient mynt (have %, need %)', v_balance, p_mynt_amount
      using errcode = '23514';
  end if;

  if p_goal_id is not null then
    select status, child_id into v_goal_status, v_goal_child
    from public.savings_goals where id = p_goal_id;
    if not found then
      raise exception 'goal not found' using errcode = 'P0002';
    end if;
    if v_goal_child <> p_child_id then
      raise exception 'goal belongs to another child' using errcode = '42501';
    end if;
    if v_goal_status <> 'approved' then
      raise exception 'Sparmålet väntar på förälderns godkännande.' using errcode = '23514';
    end if;

    insert into public.coin_ledger
      (family_id, child_id, amount_mynt, reason, ref_savings_goal, created_by)
    values
      (v_family_id, p_child_id, -p_mynt_amount, 'savings_deposit', p_goal_id, auth.uid());

    return jsonb_build_object(
      'goal_id', p_goal_id,
      'mynt_amount', p_mynt_amount,
      'status', 'deposited'
    );
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

-- ─── 1d. redeem_screen_time: gating (otherwise as 20260622120000) ────
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

  select c.family_id, c.daily_limit_minutes_override, c.require_daily_mission
    into v_family_id, v_child_override, v_require_today
  from public.child_profiles c
  where c.id = p_child_id
  for update;
  if not found then
    raise exception 'child not found' using errcode = 'P0002';
  end if;

  if not public.can_act_for_child(p_child_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select screen_time_multiplier
    into v_multiplier
  from public.profile_configs
  where family_id = v_family_id;
  if not found then
    raise exception 'profile config missing — finish onboarding first'
      using errcode = '23502';
  end if;

  v_daily_limit := coalesce(v_child_override, 60);

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

-- ─── 5b. claim_streak_bonus: own reason + gating ─────────────────────
create or replace function public.claim_streak_bonus(
  p_child_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_family_id   uuid;
  v_active_days int;
  v_already     int;
  v_week_start  timestamptz;
begin
  select c.family_id into v_family_id
  from public.child_profiles c
  where c.id = p_child_id;
  if not found then
    raise exception 'child not found' using errcode = 'P0002';
  end if;
  if not public.can_act_for_child(p_child_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_week_start := date_trunc('week', (now() at time zone 'UTC'));

  -- Dedicated reason: a manual parent "+50" adjustment no longer
  -- counts as "bonus already paid this week".
  select count(*) into v_already
  from public.coin_ledger
  where child_id = p_child_id
    and reason = 'streak_bonus'
    and created_at >= v_week_start;
  if v_already > 0 then
    return jsonb_build_object('claimed', false, 'reason', 'already_this_week');
  end if;

  select count(distinct (created_at at time zone 'UTC')::date)
  into v_active_days
  from public.coin_ledger
  where child_id = p_child_id
    and reason = 'mission_approved'
    and created_at >= (now() at time zone 'UTC')::date - interval '6 days';
  if v_active_days < 7 then
    return jsonb_build_object('claimed', false, 'reason', 'streak_too_short',
                              'active_days', v_active_days);
  end if;

  insert into public.coin_ledger
    (family_id, child_id, amount_mynt, reason, created_by)
  values
    (v_family_id, p_child_id, 50, 'streak_bonus', auth.uid());

  return jsonb_build_object('claimed', true, 'amount', 50);
end;
$$;

-- ─── 1e. expire_mynt: gating aligned with callers ────────────────────
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
  v_consumed            bigint;
  v_remaining           int;
  v_total_expired       int := 0;
  pos                   record;
begin
  select c.family_id, c.mynt_expiry_days
    into v_family_id, v_expiry_days
  from public.child_profiles c
  where c.id = p_child_id;
  if not found then return 0; end if;

  if not public.can_act_for_child(p_child_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_expiry_days is null then return 0; end if;

  v_cutoff := now() - (v_expiry_days || ' days')::interval;

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
      if not exists (
        select 1 from public.coin_ledger ex
        where ex.ref_expired_entry = pos.id and ex.reason = 'expiry'
      ) then
        v_consumed := v_total_spent_running - v_cum_pos_before;
        if v_consumed < 0 then
          v_consumed := 0;
        end if;
        if v_consumed > pos.amount_mynt then
          v_consumed := pos.amount_mynt;
        end if;
        v_remaining := pos.amount_mynt - v_consumed::int;
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

-- ─── 6. adjust_balance: bounded ──────────────────────────────────────
create or replace function public.adjust_balance(
  p_child_id uuid,
  p_amount   int
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_family_id uuid;
begin
  if p_amount = 0 then
    raise exception 'amount cannot be zero' using errcode = '22023';
  end if;
  if abs(p_amount) > 10000 then
    raise exception 'amount out of range (max 10000)' using errcode = '22023';
  end if;

  select c.family_id into v_family_id
  from public.child_profiles c
  where c.id = p_child_id
  for update;
  if not found then
    raise exception 'child not found' using errcode = 'P0002';
  end if;

  if not public.is_family_parent(v_family_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.coin_ledger
    (family_id, child_id, amount_mynt, reason, created_by)
  values
    (v_family_id, p_child_id, p_amount, 'adjustment', auth.uid());

  return jsonb_build_object('amount', p_amount);
end;
$$;

notify pgrst, 'reload schema';
