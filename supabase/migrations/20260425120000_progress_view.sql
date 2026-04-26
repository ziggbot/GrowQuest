-- 20260425120000_progress_view.sql
-- Issues #11 (topplista) + #12 (karaktär-stadier).
--
-- One view powers both:
--   * mynt_today        — today's positive coin_ledger entries per child
--                         (drives the family leaderboard rank)
--   * approved_missions — all-time count of approved missions per child
--                         (drives the character-evolution stage —
--                          UPPDRAG_PER_NIVÅ = [0,1,2,4,6])
--
-- security_invoker = true (PG15+) so the view runs as the caller — RLS on
-- child_profiles + coin_ledger applies, and members only see their family.

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
      as approved_missions
  from public.child_profiles c
  left join public.coin_ledger l on l.child_id = c.id
  group by c.id, c.family_id;

grant select on public.child_progress to authenticated;
