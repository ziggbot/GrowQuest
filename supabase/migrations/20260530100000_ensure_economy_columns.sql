-- Belt-and-braces: ensure the two economy columns exist on
-- profile_configs and force PostgREST to drop its schema cache.
-- 20260529100000 should have created them already; if the cloud
-- workflow is mid-flight or the cache is stale, this fixes both
-- without breaking anything when the originals are present.

alter table public.profile_configs
  add column if not exists require_daily_mission boolean not null default false;

alter table public.profile_configs
  add column if not exists mynt_expiry_days int
    check (mynt_expiry_days is null or mynt_expiry_days between 1 and 365);

notify pgrst, 'reload schema';
