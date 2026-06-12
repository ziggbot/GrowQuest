-- Enable Supabase realtime on savings_goals so the parent dashboard /
-- inbox react the moment a child proposes a new goal. The earlier
-- 20260520110000 added mission_submissions and 20260521100000 added
-- redemptions; this completes the trio.
--
-- A side effect we hit in the wild: subscribing to a postgres_changes
-- channel for a table that *isn't* in the publication can disrupt the
-- whole realtime socket. Hence symptoms like "popup och inbox-rad
-- saknas vid nytt uppdrag" — the missions channel was fine on the
-- server but the client connection went quiet.
--
-- Idempotent: re-add the other two tables too in case any earlier
-- migration was rolled back without us noticing.

do $$
begin
  alter publication supabase_realtime add table public.savings_goals;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.mission_submissions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.redemptions;
exception when duplicate_object then null;
end $$;
