-- Optional gender on child_profiles, used to pick which jumping
-- Lottie animation we show on the kid's home view. Free-form 'boy' /
-- 'girl' / null — parents who'd rather not pick can leave it blank
-- and the app falls back to the emoji avatar.

alter table public.child_profiles
  add column if not exists gender text
    check (gender in ('boy', 'girl'));

notify pgrst, 'reload schema';
