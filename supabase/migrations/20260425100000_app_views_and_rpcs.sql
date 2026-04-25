-- 20260425100000_app_views_and_rpcs.sql
-- Phase 1/2 application surface: a balance view and the approve_mission RPC.
--
-- We use a Postgres function (not an edge function) for approve_mission
-- because the operation is naturally transactional and we want RLS-aware
-- authorization via auth.uid(). SECURITY DEFINER lets us write to the
-- append-only coin_ledger that has no insert policy for authenticated.

-- ─── child_balances view ────────────────────────────────────────────────
-- Sum of coin_ledger per child. Uses security_invoker = true (PG15+) so the
-- caller's RLS applies — they only see balances for their own family.
create or replace view public.child_balances
with (security_invoker = true)
as
  select
    c.id        as child_id,
    c.family_id as family_id,
    coalesce(sum(l.amount_mynt), 0)::bigint as balance
  from public.child_profiles c
  left join public.coin_ledger l on l.child_id = c.id
  group by c.id, c.family_id;

grant select on public.child_balances to authenticated;

-- ─── approve_mission RPC ───────────────────────────────────────────────
-- Atomic: locks the submission row, validates the caller's family
-- membership, updates the submission, and (on approve) inserts the
-- coin_ledger credit — all in one transaction. SECURITY DEFINER bypasses
-- RLS; the internal `auth.uid()` check is the authorization gate.

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
  v_submission record;
begin
  if p_action not in ('approve', 'reject') then
    raise exception 'invalid action: %', p_action using errcode = '22023';
  end if;

  select s.id, s.family_id, s.mission_id, s.child_id, s.status, m.reward_mynt
    into v_submission
  from public.mission_submissions s
  join public.missions m on m.id = s.mission_id
  where s.id = p_submission_id
  for update;

  if not found then
    raise exception 'submission not found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.family_members
    where family_id = v_submission.family_id
      and user_id   = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_submission.status <> 'pending' then
    raise exception 'already reviewed' using errcode = '23505';
  end if;

  update public.mission_submissions
    set status      = case when p_action = 'approve' then 'approved' else 'rejected' end,
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        note        = p_note
  where id = p_submission_id;

  if p_action = 'approve' then
    insert into public.coin_ledger
      (family_id, child_id, amount_mynt, reason, ref_submission, created_by)
    values
      (v_submission.family_id, v_submission.child_id, v_submission.reward_mynt,
       'mission_approved', v_submission.id, auth.uid());
  end if;

  return jsonb_build_object(
    'submission_id', v_submission.id,
    'status', case when p_action = 'approve' then 'approved' else 'rejected' end,
    'reward_mynt', case when p_action = 'approve' then v_submission.reward_mynt else 0 end
  );
end;
$$;

revoke all on function public.approve_mission(uuid, text, text) from public;
grant  execute on function public.approve_mission(uuid, text, text) to authenticated;
