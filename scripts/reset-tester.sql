-- reset-tester.sql — completely wipe one beta tester's data.
--
-- Paste into Supabase Dashboard → SQL Editor and run. The SQL editor
-- runs as the postgres superuser, so it bypasses RLS and can delete
-- the auth.users row too (which the in-app GDPR RPC deliberately
-- can't).
--
-- HOW TO USE: set the email on the next line, then Run.
--   Everything below is parameterised off it — no other edits needed.

do $$
declare
  v_email      text := 'CHANGE-ME@example.com';   -- <<< set the tester's parent email
  v_user_id    uuid;
  v_family_id  uuid;
  v_child_ids  uuid[];
  v_child_auth uuid[];
begin
  select id into v_user_id from auth.users where lower(email) = lower(v_email);
  if v_user_id is null then
    raise notice 'No auth user for %, nothing to do.', v_email;
    return;
  end if;

  select family_id into v_family_id
  from public.family_members
  where user_id = v_user_id
  limit 1;

  if v_family_id is not null then
    -- Collect the family's children + any child auth logins.
    select array_agg(id), array_remove(array_agg(auth_user_id), null)
      into v_child_ids, v_child_auth
    from public.child_profiles
    where family_id = v_family_id;

    -- Family-scoped data, in FK-safe order.
    delete from public.coin_ledger         where family_id = v_family_id;
    delete from public.redemptions         where family_id = v_family_id;
    delete from public.mission_submissions where family_id = v_family_id;
    delete from public.savings_goals       where family_id = v_family_id;
    delete from public.child_invites       where family_id = v_family_id;
    delete from public.missions            where family_id = v_family_id;
    delete from public.mission_templates   where family_id = v_family_id;
    delete from public.payout_ledger       where family_id = v_family_id;
    delete from public.profile_configs     where family_id = v_family_id;
    delete from public.child_profiles      where family_id = v_family_id;
    delete from public.family_members      where family_id = v_family_id;
    delete from public.families            where id = v_family_id;

    -- Delete any child auth accounts that belonged to this family.
    if v_child_auth is not null then
      delete from auth.users where id = any(v_child_auth);
    end if;
  end if;

  -- Finally the parent auth account itself.
  delete from auth.users where id = v_user_id;

  raise notice 'Wiped tester % (user %, family %).', v_email, v_user_id, v_family_id;
end $$;
