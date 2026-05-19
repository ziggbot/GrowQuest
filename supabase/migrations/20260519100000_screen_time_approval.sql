-- Screen-time approval flow.
--
-- Previously redeem_screen_time deducted mynt immediately and the
-- redemption was effectively auto-approved. Now the child submits a
-- *request* — mynt are held by an upfront ledger entry, status starts
-- as 'pending', and the parent decides whether to approve (status →
-- approved, mynt stay deducted) or reject (status → rejected, mynt
-- refunded via a positive coin_ledger entry with reason='refund').
--
-- The child can also tag the request with which apps they want to use
-- (predefined: screen_time / youtube / zoomerang / pokemon_go / roblox)
-- plus an "other" free-text field. The parent sees both when reviewing.

-- ─── columns ─────────────────────────────────────────────────────────────
alter table public.redemptions
  add column if not exists status text not null default 'approved'
    check (status in ('pending', 'approved', 'rejected')),
  add column if not exists requested_apps text[],
  add column if not exists other_app text check (length(other_app) <= 100),
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

-- Existing rows pre-date the approval flow; mark them approved
-- explicitly so the daily-limit check still picks them up.
update public.redemptions set status = 'approved' where status is null;

-- New redemptions start as pending — change the default after the
-- backfill so existing rows weren't affected.
alter table public.redemptions alter column status set default 'pending';

create index if not exists redemptions_family_status_idx
  on public.redemptions(family_id, status);

-- ─── redeem_screen_time RPC (now creates a pending request) ──────────────
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

  if p_other_app is not null and length(p_other_app) > 100 then
    raise exception 'other_app too long' using errcode = '22023';
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

  -- Pending and approved both count toward the daily cap so a child
  -- can't queue up requests beyond their limit.
  select coalesce(sum(minutes), 0) into v_used_today
  from public.redemptions
  where child_id = p_child_id
    and started_at >= date_trunc('day', (now() at time zone 'UTC'))
    and status in ('pending', 'approved');
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

-- Drop the old 2-arg signature so it doesn't shadow the new one.
-- (No-op if it was already replaced in place above; Postgres treats
-- the two arities as separate functions.)
drop function if exists public.redeem_screen_time(uuid, int);

revoke all on function public.redeem_screen_time(uuid, int, text[], text) from public;
grant  execute on function public.redeem_screen_time(uuid, int, text[], text) to authenticated;

-- ─── review_redemption RPC ───────────────────────────────────────────────
create or replace function public.review_redemption(
  p_redemption_id uuid,
  p_action        text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_family_id  uuid;
  v_child_id   uuid;
  v_cost       int;
  v_status     text;
begin
  if p_action not in ('approve', 'reject') then
    raise exception 'invalid action: %', p_action using errcode = '22023';
  end if;

  select family_id, child_id, mynt_cost, status
    into v_family_id, v_child_id, v_cost, v_status
  from public.redemptions
  where id = p_redemption_id
  for update;
  if not found then
    raise exception 'redemption not found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.family_members
    where family_id = v_family_id
      and user_id   = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_status <> 'pending' then
    raise exception 'redemption already reviewed (status=%)', v_status
      using errcode = '23514';
  end if;

  update public.redemptions
  set status      = case when p_action = 'approve' then 'approved' else 'rejected' end,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      -- Reset the countdown to start at approval time so ends_at is meaningful.
      started_at  = case when p_action = 'approve' then now() else started_at end,
      ends_at     = case when p_action = 'approve' then now() + (minutes || ' minutes')::interval
                         else ends_at end
  where id = p_redemption_id;

  if p_action = 'reject' then
    insert into public.coin_ledger
      (family_id, child_id, amount_mynt, reason, ref_redemption, created_by)
    values
      (v_family_id, v_child_id, v_cost, 'refund', p_redemption_id, auth.uid());
  end if;

  return jsonb_build_object(
    'redemption_id', p_redemption_id,
    'status', case when p_action = 'approve' then 'approved' else 'rejected' end
  );
end;
$$;

revoke all on function public.review_redemption(uuid, text) from public;
grant  execute on function public.review_redemption(uuid, text) to authenticated;

notify pgrst, 'reload schema';
