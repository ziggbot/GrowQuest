-- Realtime on redemptions so the parent's dashboard can react the
-- instant a child submits a new screen-time or cash request (used to
-- bump the pending-count pill on the "Begäran" card without a refresh).

do $$
begin
  alter publication supabase_realtime add table public.redemptions;
exception when duplicate_object then
  null;
end $$;
