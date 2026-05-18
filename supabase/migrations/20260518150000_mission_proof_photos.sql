-- Mission proof photo + child note.
--
-- Originally this migration also created a Storage bucket for the
-- photos, but bucket creation via SQL was unreliable in cloud and a
-- failure rolled the entire transaction back, leaving nothing in
-- place. We now store the (compressed) photo inline as base64 — see
-- the v2 migration that follows for the photo column and cleanup.

alter table public.mission_submissions
  add column if not exists child_note text check (length(child_note) <= 500);

notify pgrst, 'reload schema';
