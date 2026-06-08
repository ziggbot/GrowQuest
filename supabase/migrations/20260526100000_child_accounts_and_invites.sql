-- Child accounts with their own login.
--
-- Tracks email + (optional) auth.users link on child_profiles so a
-- child who joined via an invite can sign in themselves. Adds a
-- child_invites table with single-use tokens. Adds a role='child'
-- to family_members. Helper public.is_family_parent for RPCs that
-- must remain locked to grown-ups even though child auth users are
-- also family_members.

-- ─── child_profiles extensions ───────────────────────────────────
alter table public.child_profiles
  add column if not exists email text,
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists child_profiles_auth_user_id_key
  on public.child_profiles(auth_user_id)
  where auth_user_id is not null;

create unique index if not exists child_profiles_email_key
  on public.child_profiles(lower(email))
  where email is not null;

-- ─── child_invites ───────────────────────────────────────────────
create table if not exists public.child_invites (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families(id) on delete cascade,
  child_id    uuid not null references public.child_profiles(id) on delete cascade,
  email       text not null,
  token       text not null unique,
  expires_at  timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists child_invites_family_idx
  on public.child_invites(family_id, accepted_at);

alter table public.child_invites enable row level security;
alter table public.child_invites force  row level security;

create policy "members read invites"
  on public.child_invites for select
  using (public.is_family_member(family_id));

-- No INSERT / UPDATE policy — only the RPCs below write here.

-- ─── family_members role extension ───────────────────────────────
alter table public.family_members
  drop constraint if exists family_members_role_check;
alter table public.family_members
  add constraint family_members_role_check
    check (role in ('parent', 'co_parent', 'child'));

-- ─── is_family_parent helper ─────────────────────────────────────
create or replace function public.is_family_parent(fid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.family_members
    where family_id = fid
      and user_id   = auth.uid()
      and role in ('parent', 'co_parent')
  );
$$;

revoke all on function public.is_family_parent(uuid) from public;
grant  execute on function public.is_family_parent(uuid) to authenticated;

-- ─── create_child_invite RPC (parent only) ───────────────────────
create or replace function public.create_child_invite(
  p_child_id uuid,
  p_email    text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_family_id uuid;
  v_token     text;
  v_invite_id uuid;
begin
  if p_email is null or position('@' in p_email) = 0 then
    raise exception 'invalid email' using errcode = '22023';
  end if;

  select family_id into v_family_id
  from public.child_profiles
  where id = p_child_id;
  if not found then
    raise exception 'child not found' using errcode = 'P0002';
  end if;

  if not public.is_family_parent(v_family_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Random URL-safe token
  v_token := encode(gen_random_bytes(24), 'base64');
  v_token := translate(v_token, '+/=', '-_');

  insert into public.child_invites (family_id, child_id, email, token, created_by)
  values (v_family_id, p_child_id, lower(trim(p_email)), v_token, auth.uid())
  returning id into v_invite_id;

  update public.child_profiles
    set email = lower(trim(p_email))
    where id = p_child_id;

  return jsonb_build_object('invite_id', v_invite_id, 'token', v_token);
end;
$$;

revoke all on function public.create_child_invite(uuid, text) from public;
grant  execute on function public.create_child_invite(uuid, text) to authenticated;

-- ─── peek_child_invite (public read for the join screen) ─────────
create or replace function public.peek_child_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  select i.email, i.expires_at, i.accepted_at,
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
  return jsonb_build_object(
    'valid', true,
    'email', v_row.email,
    'nickname', v_row.nickname,
    'avatar_emoji', v_row.avatar_emoji
  );
end;
$$;

revoke all on function public.peek_child_invite(text) from public;
grant  execute on function public.peek_child_invite(text) to anon, authenticated;

-- ─── accept_child_invite (called after the kid signed up) ────────
create or replace function public.accept_child_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_invite record;
  v_email  text;
begin
  select i.id, i.family_id, i.child_id, i.email, i.expires_at, i.accepted_at
  into v_invite
  from public.child_invites i
  where i.token = p_token
  for update;
  if not found then
    raise exception 'invite not found' using errcode = 'P0002';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'invite already used' using errcode = '23514';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'invite expired' using errcode = '23514';
  end if;

  -- The signed-in user must own the invited email
  select email into v_email
  from auth.users where id = auth.uid();
  if v_email is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if lower(v_email) <> lower(v_invite.email) then
    raise exception 'invite email mismatch' using errcode = '42501';
  end if;

  -- Link the child profile and grant family membership.
  update public.child_profiles
    set auth_user_id = auth.uid()
    where id = v_invite.child_id;

  insert into public.family_members (family_id, user_id, role)
    values (v_invite.family_id, auth.uid(), 'child')
    on conflict (family_id, user_id) do update set role = 'child';

  update public.child_invites
    set accepted_at = now()
    where id = v_invite.id;

  return jsonb_build_object(
    'child_id',  v_invite.child_id,
    'family_id', v_invite.family_id
  );
end;
$$;

revoke all on function public.accept_child_invite(text) from public;
grant  execute on function public.accept_child_invite(text) to authenticated;

-- ─── Lock admin RPCs to parents only ─────────────────────────────
-- approve_mission, review_redemption, adjust_balance — each must
-- check role='parent'|'co_parent' now that children can become
-- family_members and would otherwise pass is_family_member.
-- Re-issue with the tighter check.

-- approve_mission already lives in 20260425100000_app_views_and_rpcs;
-- we patch it in place here.
create or replace function public.approve_mission(
  p_submission_id uuid,
  p_action        text,
  p_note          text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_submission   record;
  v_reward       int;
begin
  if p_action not in ('approve', 'reject') then
    raise exception 'invalid action' using errcode = '22023';
  end if;

  select s.id, s.family_id, s.child_id, s.mission_id, s.status,
         m.reward_mynt, m.active
  into v_submission
  from public.mission_submissions s
  join public.missions m on m.id = s.mission_id
  where s.id = p_submission_id
  for update;
  if not found then
    raise exception 'submission not found' using errcode = 'P0002';
  end if;
  if v_submission.status <> 'pending' then
    raise exception 'submission already reviewed' using errcode = '23514';
  end if;
  if not public.is_family_parent(v_submission.family_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_reward := v_submission.reward_mynt;

  update public.mission_submissions
    set status      = case when p_action = 'approve' then 'approved' else 'rejected' end,
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        note        = p_note
  where id = p_submission_id;

  if p_action = 'approve' and v_reward > 0 then
    insert into public.coin_ledger
      (family_id, child_id, amount_mynt, reason, ref_submission, created_by)
    values
      (v_submission.family_id, v_submission.child_id, v_reward,
       'mission_approved', v_submission.id, auth.uid());
  end if;

  return jsonb_build_object('status', case when p_action = 'approve' then 'approved' else 'rejected' end);
end;
$$;

-- review_redemption: tighten
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
  if not public.is_family_parent(v_family_id) then
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

-- adjust_balance: tighten
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
