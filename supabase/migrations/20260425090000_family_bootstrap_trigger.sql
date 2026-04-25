-- 20260425090000_family_bootstrap_trigger.sql
-- Issue #4 — Family bootstrap on first sign-up.
--
-- On every new auth.users row, automatically:
--   1. Create a default `families` row owned by the new user.
--   2. Insert a `family_members(role='parent')` linking the user to it.
--
-- This guarantees every authenticated user has exactly one family on first
-- sign-in, so the iOS app never has to handle the limbo state of "session
-- exists but no family yet". Idempotent — re-running the trigger on the
-- same user is a no-op.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  new_family_id uuid;
begin
  if exists (select 1 from public.family_members where user_id = new.id) then
    return new;
  end if;

  insert into public.families (name, created_by)
  values ('Min familj', new.id)
  returning id into new_family_id;

  insert into public.family_members (family_id, user_id, role)
  values (new_family_id, new.id, 'parent');

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
