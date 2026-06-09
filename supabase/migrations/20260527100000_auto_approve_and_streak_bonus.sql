-- Foundation for: auto-approve, streak bonuses.
--
-- 1. missions.auto_approve + auto_approve_hours: parent can mark a
--    mission so submissions don't sit forever in pending.
-- 2. auto_approve_stale RPC: called from the parent dashboard reload;
--    approves any pending submissions whose mission has auto_approve
--    and whose submitted_at is older than auto_approve_hours. Mints
--    coins exactly like approve_mission.
-- 3. claim_streak_bonus RPC: gives +50 mynt to a child who has a
--    7-day approval streak ending today, max once every 7 days, via
--    a coin_ledger row with reason='adjustment'. Idempotent per week.

alter table public.missions
  add column if not exists auto_approve       boolean not null default false,
  add column if not exists auto_approve_hours int     not null default 24
    check (auto_approve_hours between 1 and 168);

-- ─── auto_approve_stale ─────────────────────────────────────────
create or replace function public.auto_approve_stale(
  p_family_id uuid
)
returns int
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_count int := 0;
  v_row   record;
begin
  if not public.is_family_parent(p_family_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  for v_row in
    select s.id, s.child_id, m.reward_mynt
    from public.mission_submissions s
    join public.missions m on m.id = s.mission_id
    where s.family_id = p_family_id
      and s.status = 'pending'
      and m.auto_approve = true
      and s.submitted_at + (m.auto_approve_hours || ' hours')::interval <= now()
  loop
    update public.mission_submissions
       set status      = 'approved',
           reviewed_at = now(),
           note        = 'Auto-godkänd (parent timer)'
     where id = v_row.id;

    if v_row.reward_mynt > 0 then
      insert into public.coin_ledger
        (family_id, child_id, amount_mynt, reason, ref_submission, created_by)
      values
        (p_family_id, v_row.child_id, v_row.reward_mynt,
         'mission_approved', v_row.id, auth.uid());
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.auto_approve_stale(uuid) from public;
grant  execute on function public.auto_approve_stale(uuid) to authenticated;

-- ─── claim_streak_bonus ─────────────────────────────────────────
-- A streak day = ≥1 mission_approved coin_ledger entry on that day.
-- Bonus = +50 mynt, max once per ISO week, only if the child has
-- approvals on each of the last 7 calendar days (UTC).
create or replace function public.claim_streak_bonus(
  p_child_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_family_id  uuid;
  v_active_days int;
  v_already    int;
  v_week_start timestamptz;
begin
  select c.family_id into v_family_id
  from public.child_profiles c
  where c.id = p_child_id;
  if not found then
    raise exception 'child not found' using errcode = 'P0002';
  end if;
  if not public.is_family_member(v_family_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- ISO week starts Monday in this codebase
  v_week_start := date_trunc('week', (now() at time zone 'UTC'));

  select count(*) into v_already
  from public.coin_ledger
  where child_id = p_child_id
    and reason = 'adjustment'
    and amount_mynt = 50
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
    (v_family_id, p_child_id, 50, 'adjustment', auth.uid());

  return jsonb_build_object('claimed', true, 'amount', 50);
end;
$$;

revoke all on function public.claim_streak_bonus(uuid) from public;
grant  execute on function public.claim_streak_bonus(uuid) to authenticated;

notify pgrst, 'reload schema';
