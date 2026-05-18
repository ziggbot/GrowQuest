-- Mission proof photo (inline data-URL).
--
-- The previous attempt at this feature stored photos in a Supabase
-- Storage bucket. Bucket creation from a SQL migration didn't survive
-- cloud env, so we're switching to storing the compressed JPEG inline
-- as a base64 data URL in a text column on mission_submissions.
--
-- The client compresses photos to ~800px / quality 0.75 before encode,
-- which keeps each row well under 150 KB. Postgres TOASTs the column
-- transparently, so this is fine for the volumes we expect.
--
-- This migration is defensive: it tears down any storage scaffolding
-- left behind by the old approach so we don't have orphans.

-- Add the new column.
alter table public.mission_submissions
  add column if not exists photo_data text;

-- Remove the old storage-path column if it was previously created.
alter table public.mission_submissions drop column if exists photo_path;

-- Tear down any leftover storage policies (no-op when absent).
do $$
begin
  drop policy if exists "mission_photos_select" on storage.objects;
  drop policy if exists "mission_photos_insert" on storage.objects;
  drop policy if exists "mission_photos_delete" on storage.objects;
exception when others then null;
end $$;

-- Remove the leftover bucket if it survived (no-op when absent).
do $$
begin
  delete from storage.buckets where id = 'mission-photos';
exception when others then null;
end $$;

notify pgrst, 'reload schema';
