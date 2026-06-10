-- Admin foundation — no UI yet, just the data model + helpers so
-- future moderation/support tooling is a thin layer on top.
--
-- 1. app_admins table: which auth users hold app-wide admin powers.
--    Deliberately *not* writable via any RLS policy — rows are added
--    by the operator through the Supabase dashboard / SQL editor.
-- 2. is_app_admin() helper, same shape as is_family_member /
--    is_family_parent.
-- 3. child_profiles.hidden_from_leaderboard: moderation kill-switch.
--    Separate from the family's own global_leaderboard_opt_in so an
--    admin action never touches family-owned settings (and the family
--    can't undo a moderation hide by toggling opt-in).
-- 4. admin_audit_log: append-only record of admin interventions.
--    Admin RPCs write to it inline; only admins can read it.
--
-- Bootstrapping the first admin (run in the SQL editor):
--   insert into public.app_admins (user_id, role, note)
--   values ('<auth-user-uuid>', 'superadmin', 'founder');

-- ─── app_admins ──────────────────────────────────────────────────
create table if not exists public.app_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'support'
               check (role in ('support', 'moderator', 'superadmin')),
  note       text,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;
alter table public.app_admins force  row level security;

-- Admins can see who the admins are. Nobody can write via the API.
create policy "admins read admins"
  on public.app_admins for select
  using (public.is_app_admin());

-- ─── is_app_admin helper ─────────────────────────────────────────
create or replace function public.is_app_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.app_admins where user_id = auth.uid()
  );
$$;

revoke all on function public.is_app_admin() from public;
grant  execute on function public.is_app_admin() to authenticated;

-- The policy above references the function, so (re)create the policy
-- after the function exists. Postgres validates at runtime so the
-- ordering above is fine, but keep both in this migration regardless.

-- ─── moderation flag on child_profiles ───────────────────────────
alter table public.child_profiles
  add column if not exists hidden_from_leaderboard boolean not null default false;

-- Recreate child_progress view with the moderation flag honoured —
-- a hidden child reports opt-in=false to every consumer, so the
-- existing leaderboard filter keeps working unchanged.
-- NOTE: create or replace view can only append columns; the select
-- list order matches 20260518120000 exactly.
create or replace view public.child_progress
with (security_invoker = true)
as
  select
    c.id            as child_id,
    c.family_id     as family_id,
    c.nickname      as nickname,
    c.avatar_emoji  as avatar_emoji,
    coalesce(sum(
      case
        when l.amount_mynt > 0
         and l.created_at >= date_trunc('day', (now() at time zone 'UTC'))
        then l.amount_mynt
        else 0
      end
    ), 0)::bigint as mynt_today,
    coalesce(sum(case when l.reason = 'mission_approved' then 1 else 0 end), 0)::int
      as approved_missions,
    (c.global_leaderboard_opt_in and not c.hidden_from_leaderboard)
      as global_leaderboard_opt_in
  from public.child_profiles c
  left join public.coin_ledger l on l.child_id = c.id
  group by c.id, c.family_id, c.global_leaderboard_opt_in, c.hidden_from_leaderboard;

grant select on public.child_progress to authenticated;

-- ─── admin_audit_log (append-only) ───────────────────────────────
create table if not exists public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  -- Nullable: if the admin account is ever deleted the log row must
  -- survive (audit trail), so the FK nulls out rather than cascading.
  admin_id    uuid references auth.users(id) on delete set null,
  action      text not null,
  target_type text not null,
  target_id   uuid,
  detail      jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log(created_at desc);

alter table public.admin_audit_log enable row level security;
alter table public.admin_audit_log force  row level security;

create policy "admins read audit log"
  on public.admin_audit_log for select
  using (public.is_app_admin());
-- No insert/update/delete policies — only SECURITY DEFINER RPCs write.

-- ─── set_leaderboard_visibility (admin RPC) ──────────────────────
create or replace function public.set_leaderboard_visibility(
  p_child_id uuid,
  p_hidden   boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_app_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.child_profiles
     set hidden_from_leaderboard = p_hidden
   where id = p_child_id;
  if not found then
    raise exception 'child not found' using errcode = 'P0002';
  end if;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, detail)
  values (
    auth.uid(),
    case when p_hidden then 'leaderboard_hide' else 'leaderboard_unhide' end,
    'child_profile',
    p_child_id,
    null
  );

  return jsonb_build_object('child_id', p_child_id, 'hidden', p_hidden);
end;
$$;

revoke all on function public.set_leaderboard_visibility(uuid, boolean) from public;
grant  execute on function public.set_leaderboard_visibility(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
