-- Economy realignment — schema only.
--
-- Originally this migration also rewrote redeem_screen_time,
-- redeem_cash, deposit_to_savings and introduced expire_mynt. The
-- combined diff was big enough that any subtle PL/pgSQL hiccup on
-- cloud aborted the whole transaction and the new columns never
-- showed up, breaking the Settings toggles.
--
-- Split: this file is now schema-only (idempotent) so the columns
-- always land. The function rewrites + expire_mynt live in
-- 20260530110000_economy_logic.sql which can fail independently
-- without blocking the UI.

alter table public.profile_configs
  add column if not exists require_daily_mission boolean not null default false;

alter table public.profile_configs
  add column if not exists mynt_expiry_days int
    check (mynt_expiry_days is null or mynt_expiry_days between 1 and 365);

alter table public.profile_configs
  alter column daily_limit_minutes set default 60;

alter table public.coin_ledger
  add column if not exists ref_expired_entry uuid
    references public.coin_ledger(id) on delete set null;

alter table public.coin_ledger drop constraint if exists coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check
  check (reason in (
    'mission_approved', 'redemption', 'adjustment', 'refund',
    'savings_deposit', 'savings_withdraw', 'expiry'
  ));

create index if not exists coin_ledger_expiry_ref_idx
  on public.coin_ledger(ref_expired_entry)
  where ref_expired_entry is not null;

notify pgrst, 'reload schema';
