-- 1. Optional avatar photo on child_profiles (base64 data URL, same
--    storage strategy as mission proof photos — keeps things bucket-free).
-- 2. New adjust_balance RPC so a parent can manually add/subtract mynt
--    from a child's wallet via Settings.

alter table public.child_profiles
  add column if not exists avatar_photo text;

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

  if not exists (
    select 1 from public.family_members
    where family_id = v_family_id
      and user_id   = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.coin_ledger
    (family_id, child_id, amount_mynt, reason, created_by)
  values
    (v_family_id, p_child_id, p_amount, 'adjustment', auth.uid());

  return jsonb_build_object('amount', p_amount);
end;
$$;

revoke all on function public.adjust_balance(uuid, int) from public;
grant  execute on function public.adjust_balance(uuid, int) to authenticated;

notify pgrst, 'reload schema';
