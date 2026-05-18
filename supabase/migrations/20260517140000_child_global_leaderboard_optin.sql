-- Per-child opt-in for the (future) global "superäventyrare" leaderboard.
-- Default false (off) — parents have to actively approve sharing their
-- child's stats outside the family. Read by the future global leaderboard
-- view; family-internal leaderboards ignore this flag.
ALTER TABLE public.child_profiles
  ADD COLUMN global_leaderboard_opt_in boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.child_profiles.global_leaderboard_opt_in IS
  'Parent has approved this child appearing on the cross-family global leaderboard. Default false. Family-only leaderboards ignore this flag.';
