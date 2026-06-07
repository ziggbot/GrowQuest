-- Per-child daily screen-time override.
--
-- profile_configs.daily_limit_minutes stays as the family-wide default.
-- A child with a non-null daily_limit_minutes_override uses that value
-- instead — useful when one kid earns longer or shorter days than the
-- household baseline.

alter table public.child_profiles
  add column if not exists daily_limit_minutes_override int
    check (daily_limit_minutes_override is null
           or daily_limit_minutes_override between 0 and 600);

-- Reissue redeem_screen_time so the daily cap consults the child
-- override first, falling back to the family-wide value if NULL.

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

  select screen_time_multiplier, daily_limit_minutes
    into v_multiplier, v_family_limit
  from public.profile_configs
  where family_id = v_family_id;
  if not found then
    raise exception 'profile config missing — finish onboarding first'
      using errcode = '23502';
  end if;

  v_daily_limit := coalesce(v_child_override, v_family_limit);

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

notify pgrst, 'reload schema';
