-- Mission reward ceiling: no mission may pay more than 30 mynt.
--
-- 1 mynt = 1 minute of screen time, so 30 mynt = half an hour — the
-- ceiling keeps single missions from unlocking whole evenings. The
-- client enforces the same cap (MAX_MISSION_REWARD in templates.ts);
-- this makes the database authoritative.
--
-- Also tightens mission_templates writes to parents while we're here —
-- the insert/delete policies predate child logins and used
-- is_family_member, letting a child-account user spam or prune the
-- parent's saved templates.

-- Clamp existing rows so the new constraints can attach.
update public.missions          set reward_mynt = 30 where reward_mynt > 30;
update public.mission_templates set reward_mynt = 30 where reward_mynt > 30;

alter table public.missions
  drop constraint if exists missions_reward_mynt_check;
alter table public.missions
  add constraint missions_reward_mynt_check
  check (reward_mynt between 0 and 30);

alter table public.mission_templates
  drop constraint if exists mission_templates_reward_mynt_check;
alter table public.mission_templates
  add constraint mission_templates_reward_mynt_check
  check (reward_mynt between 0 and 30);

-- Parent-only writes on personal templates.
drop policy if exists mission_templates_insert on public.mission_templates;
create policy mission_templates_insert on public.mission_templates
  for insert with check (public.is_family_parent(family_id));

drop policy if exists mission_templates_delete on public.mission_templates;
create policy mission_templates_delete on public.mission_templates
  for delete using (public.is_family_parent(family_id));

notify pgrst, 'reload schema';
