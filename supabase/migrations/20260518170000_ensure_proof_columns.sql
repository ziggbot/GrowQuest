-- Belt-and-braces: ensure the proof-photo / child-note columns exist on
-- mission_submissions and force PostgREST to drop its schema cache.
--
-- The previous two attempts (20260518150000, 20260518160000) should
-- already have added these, but the schema cache lag observed in the
-- client suggests either an unreliable cache reload or that earlier
-- migrations didn't fully land in cloud. This migration is idempotent:
-- if the columns are already there it's a no-op for the DDL, and the
-- NOTIFY at the end always re-fires.

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name  = 'mission_submissions'
      and column_name = 'child_note'
  ) then
    alter table public.mission_submissions
      add column child_note text check (length(child_note) <= 500);
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name  = 'mission_submissions'
      and column_name = 'photo_data'
  ) then
    alter table public.mission_submissions
      add column photo_data text;
  end if;
end $$;

notify pgrst, 'reload schema';
