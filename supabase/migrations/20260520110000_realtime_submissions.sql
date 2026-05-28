-- Enable Supabase realtime on mission_submissions so the child view
-- can listen for approval events (used to trigger the coin-rain
-- animation the moment a parent approves their mission).
--
-- Idempotent: if the table is already in the publication, ALTER
-- PUBLICATION raises an error, so we guard with a do-block.

do $$
begin
  alter publication supabase_realtime add table public.mission_submissions;
exception when duplicate_object then
  null;
end $$;
