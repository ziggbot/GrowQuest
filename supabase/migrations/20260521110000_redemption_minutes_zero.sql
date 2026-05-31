-- Cash payouts insert minutes=0 (the field is meaningless for them —
-- no countdown). The original check constraint required minutes
-- between 1 and 600, which now rejects cash requests. Relax to allow
-- zero; 600 minutes (10 h) stays as the upper bound for screen time.

alter table public.redemptions drop constraint if exists redemptions_minutes_check;
alter table public.redemptions add constraint redemptions_minutes_check
  check (minutes between 0 and 600);
