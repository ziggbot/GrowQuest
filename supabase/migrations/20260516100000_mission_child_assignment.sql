-- Adds optional per-child assignment to missions.
-- NULL = visible to all children in the family (broadcast, backward-compatible).
-- Non-NULL = assigned to that specific child only.
ALTER TABLE public.missions
  ADD COLUMN assigned_child_id uuid
    REFERENCES public.child_profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.missions.assigned_child_id IS
  'If set, mission is only shown to this child. NULL means family-wide (broadcast).';
