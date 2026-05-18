-- Expose child_profiles.global_leaderboard_opt_in through the
-- child_progress view so the leaderboard query can filter children that
-- haven't opted in to the global topplista.
--
-- Without this column the opt-in toggle in Settings is dead code — the
-- value persists in the DB but the leaderboard reads child_progress and
-- can't see the flag, so children appear regardless.
--
-- IMPORTANT: CREATE OR REPLACE VIEW cannot reorder or rename existing
-- columns — it can only ADD new columns to the end of the select list.
-- The new global_leaderboard_opt_in column is therefore appended after
-- the original four (child_id, family_id, nickname, avatar_emoji,
-- mynt_today, approved_missions). Inserting it earlier in the list
-- makes Postgres think you're renaming mynt_today and aborts with
-- "cannot change name of view column" (SQLSTATE 42P16).

create or replace view public.child_progress
with (security_invoker = true)
as
  select
    c.id            as child_id,
    c.family_id     as family_id,
    c.nickname      as nickname,
    c.avatar_emoji  as avatar_emoji,
    coalesce(sum(
      case
        when l.amount_mynt > 0
         and l.created_at >= date_trunc('day', (now() at time zone 'UTC'))
        then l.amount_mynt
        else 0
      end
    ), 0)::bigint as mynt_today,
    coalesce(sum(case when l.reason = 'mission_approved' then 1 else 0 end), 0)::int
      as approved_missions,
    c.global_leaderboard_opt_in as global_leaderboard_opt_in
  from public.child_profiles c
  left join public.coin_ledger l on l.child_id = c.id
  group by c.id, c.family_id, c.global_leaderboard_opt_in;

grant select on public.child_progress to authenticated;

notify pgrst, 'reload schema';
