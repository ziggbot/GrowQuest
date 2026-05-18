-- Force PostgREST to reload its schema cache so the new
-- child_profiles.global_leaderboard_opt_in column (added in
-- 20260517140000) is queryable via the REST API.
--
-- supabase db push usually triggers this automatically but on some
-- projects the cache lags by a few minutes. This NOTIFY is a no-op if
-- PostgREST has already reloaded.
NOTIFY pgrst, 'reload schema';
