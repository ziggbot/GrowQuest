-- Mission proof photos + child note.
--
-- Lets the kid attach a photo and a short comment to a mission submission.
-- Photos live in a private storage bucket keyed by family_id so RLS keeps
-- families isolated. Path layout: '<family_id>/<submission_id>.jpg'.

alter table public.mission_submissions
  add column if not exists child_note text check (length(child_note) <= 500),
  add column if not exists photo_path text;

insert into storage.buckets (id, name, public)
values ('mission-photos', 'mission-photos', false)
on conflict (id) do nothing;

drop policy if exists "mission_photos_select" on storage.objects;
create policy "mission_photos_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'mission-photos'
    and public.is_family_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "mission_photos_insert" on storage.objects;
create policy "mission_photos_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'mission-photos'
    and public.is_family_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "mission_photos_delete" on storage.objects;
create policy "mission_photos_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'mission-photos'
    and public.is_family_member((storage.foldername(name))[1]::uuid)
  );

notify pgrst, 'reload schema';
