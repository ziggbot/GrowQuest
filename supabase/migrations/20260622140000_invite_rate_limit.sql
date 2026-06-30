-- Rate-limit child invite creation.
--
-- create_child_invite is parent-only and sends no email itself (the
-- parent shares the returned link manually), so it's not an email-bomb
-- vector — but it's otherwise unbounded and writes a row + overwrites
-- child_profiles.email on every call. Cap it per family per rolling
-- hour so a compromised or buggy client can't spam the table. Ten is
-- far above any legitimate need (a family rarely has ten kids).

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
  v_recent    int;
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

  -- Rate limit: at most 10 invites per family per rolling hour.
  select count(*) into v_recent
  from public.child_invites
  where family_id = v_family_id
    and created_at > now() - interval '1 hour';
  if v_recent >= 10 then
    raise exception
      'För många inbjudningar skapade nyligen. Försök igen om en stund.'
      using errcode = '54000';
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

notify pgrst, 'reload schema';
