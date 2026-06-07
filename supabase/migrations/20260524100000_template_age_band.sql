-- Add age_band to mission_templates so personal templates remember
-- which age category they belong to. Matches the AgeBand TS type.

alter table public.mission_templates
  add column if not exists age_band text
    check (age_band in ('4-6', '7-9', '10-12', '13+'));

notify pgrst, 'reload schema';
