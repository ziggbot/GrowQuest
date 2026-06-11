-- 1) GDPR child deletion: delete_child_completely(child_id) removes a
--    child profile and ALL traces — ledger, submissions, redemptions,
--    savings goals, invites, and the linked auth account's family
--    membership if they had their own login. Parent-only. The ledgers
--    are append-only by policy for normal operation; a GDPR erasure is
--    the sanctioned exception and runs inside this SECURITY DEFINER
--    function, not through table policies.
--
-- 2) Savings goals lifecycle:
--    - status: child-proposed goals start 'pending'; parent-created
--      goals are auto-approved. Kids can edit/delete their own goals;
--      edits by the child reset status to 'pending' for re-approval.
--    - review_savings_goal RPC for the parent (approve / reject).
--
-- 3) redeem_cash gains an optional p_goal_id: "växla till pengar" can
--    target one of the child's approved savings goals, which routes
--    the value to that goal's progress instead of a plain payout.

-- ─── savings_goals: status + created_by_child ────────────────────
alter table public.savings_goals
  add column if not exists status text not null default 'approved'
    check (status in ('pending', 'approved', 'rejected')),
  add column if not exists proposed_by_child boolean not null default false;

-- ─── review_savings_goal (parent approves / rejects) ─────────────
create or replace function public.review_savings_goal(
  p_goal_id uuid,
  p_action  text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_family_id uuid;
  v_status    text;
begin
  if p_action not in ('approve', 'reject') then
    raise exception 'invalid action' using errcode = '22023';
  end if;

  select family_id, status into v_family_id, v_status
  from public.savings_goals
  where id = p_goal_id
  for update;
  if not found then
    raise exception 'goal not found' using errcode = 'P0002';
  end if;
  if not public.is_family_parent(v_family_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_status <> 'pending' then
    raise exception 'goal already reviewed' using errcode = '23514';
  end if;

  update public.savings_goals
     set status = case when p_action = 'approve' then 'approved' else 'rejected' end
   where id = p_goal_id;

  return jsonb_build_object('goal_id', p_goal_id, 'status',
    case when p_action = 'approve' then 'approved' else 'rejected' end);
end;
$$;

revoke all on function public.review_savings_goal(uuid, text) from public;
grant  execute on function public.review_savings_goal(uuid, text) to authenticated;

-- deposit_to_savings must refuse goals that aren't approved.
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

  return jsonb_build_object('goal_id', p_goal_id, 'deposited', p_amount);
end;
$$;

-- ─── redeem_cash with optional goal target ───────────────────────
drop function if exists public.redeem_cash(uuid, int);
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

  -- Goal-targeted: deposit straight into the savings goal instead of
  -- creating a parent-review payout. No approval needed — it's the
  -- kid moving their own money into a parent-approved goal.
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

revoke all on function public.redeem_cash(uuid, int, uuid) from public;
grant  execute on function public.redeem_cash(uuid, int, uuid) to authenticated;

-- ─── GDPR: delete_child_completely ───────────────────────────────
create or replace function public.delete_child_completely(p_child_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_family_id    uuid;
  v_auth_user_id uuid;
begin
  select family_id, auth_user_id into v_family_id, v_auth_user_id
  from public.child_profiles
  where id = p_child_id
  for update;
  if not found then
    raise exception 'child not found' using errcode = 'P0002';
  end if;

  if not public.is_family_parent(v_family_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Erase in dependency order. The ledgers are append-only for app
  -- traffic; GDPR erasure is the sanctioned bypass and lives only in
  -- this parent-gated SECURITY DEFINER function.
  delete from public.coin_ledger          where child_id = p_child_id;
  delete from public.redemptions          where child_id = p_child_id;
  delete from public.mission_submissions  where child_id = p_child_id;
  delete from public.savings_goals        where child_id = p_child_id;
  delete from public.child_invites        where child_id = p_child_id;
  -- Missions assigned solely to this child are deactivated, not
  -- deleted (they're the parent's content, may be reused).
  update public.missions
     set active = false, assigned_child_id = null
   where assigned_child_id = p_child_id;

  -- Remove the child's own login from the family, if they had one.
  if v_auth_user_id is not null then
    delete from public.family_members
     where user_id = v_auth_user_id and family_id = v_family_id;
  end if;

  delete from public.child_profiles where id = p_child_id;

  -- NOTE: the auth.users row itself (if the child had their own email
  -- login) must be deleted via the Supabase dashboard or the Admin
  -- API with the service-role key — SECURITY DEFINER functions run as
  -- the postgres role which deliberately can't touch auth.users.
  return jsonb_build_object(
    'deleted', true,
    'child_id', p_child_id,
    'auth_user_id', v_auth_user_id
  );
end;
$$;

revoke all on function public.delete_child_completely(uuid) from public;
grant  execute on function public.delete_child_completely(uuid) to authenticated;

notify pgrst, 'reload schema';
