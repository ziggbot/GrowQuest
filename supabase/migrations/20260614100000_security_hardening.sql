-- Security hardening:
--   1. peek_child_invite no longer returns the invited email. The
--      column never granted anything actionable to a leaker — the
--      auth user's email still has to match at accept_child_invite
--      time — but anyone who got the SMS/email link could see the
--      child's address. JoinScreen now asks the child to type the
--      email themselves, which both confirms identity and removes
--      the leak surface.
--   2. profile_configs.daily_limit_minutes gains a check constraint
--      matching the per-child override (0–600 min). The client
--      already clamps, but a hand-crafted PostgREST request could
--      previously set absurd values.

create or replace function public.peek_child_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  select i.expires_at, i.accepted_at,
         c.nickname, c.avatar_emoji
  into v_row
  from public.child_invites i
  join public.child_profiles c on c.id = i.child_id
  where i.token = p_token;
  if not found then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
  end if;
  if v_row.accepted_at is not null then
    return jsonb_build_object('valid', false, 'reason', 'used');
  end if;
  if v_row.expires_at < now() then
    return jsonb_build_object('valid', false, 'reason', 'expired');
  end if;
  -- Email intentionally omitted: a holder of a leaked invite link
  -- shouldn't get the child's address. accept_child_invite still
  -- enforces email match at claim time.
  return jsonb_build_object(
    'valid', true,
    'nickname', v_row.nickname,
    'avatar_emoji', v_row.avatar_emoji
  );
end;
$$;

alter table public.profile_configs
  drop constraint if exists profile_configs_daily_limit_minutes_check;
alter table public.profile_configs
  add constraint profile_configs_daily_limit_minutes_check
  check (daily_limit_minutes between 0 and 600);

notify pgrst, 'reload schema';
