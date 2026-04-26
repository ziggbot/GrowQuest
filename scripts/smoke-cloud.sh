#!/usr/bin/env bash
# scripts/smoke-cloud.sh — end-to-end smoke test against any Supabase environment.
#
# Reads SUPABASE_URL + SUPABASE_ANON_KEY from .env (or environment) and
# exercises the full mission loop over the wire:
#
#   sign up → trigger creates family → insert child → insert mission →
#   submit mission (as user) → approve_mission RPC → assert coin_ledger
#
# Use this to confirm the schema + RPC work against a real Supabase project
# (local or cloud) without launching the iOS app. Useful for catching RLS
# regressions, migration drift, and PostgREST shape changes.
#
# Each run uses a fresh timestamped email so the script is idempotent.
# The test user is left behind — clean up via the Supabase dashboard if needed.
#
# Requirements: bash, curl, jq.
# Caveat: if your Supabase project requires email confirmation, the signup
# call won't return an access_token. Disable confirmations on a test project,
# or use the local stack (`supabase start`).

set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "missing: jq (brew install jq)" >&2; exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ -f .env ]; then
  # shellcheck disable=SC1091
  set -a; source .env; set +a
fi

: "${SUPABASE_URL:?SUPABASE_URL missing — set in .env or env}"
: "${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY missing — set in .env or env}"

red()   { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
yel()   { printf "\033[33m%s\033[0m\n" "$*"; }
step()  { printf "\n\033[1m── %s\033[0m\n" "$*"; }

email="smoke+$(date +%s)@growquest.test"
password="smoke-test-password-12345"

step "1/7  sign up new user $email"
signup=$(curl -sS -X POST "$SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$email\",\"password\":\"$password\"}")

jwt=$(jq -r '.access_token // empty' <<<"$signup")
uid=$(jq -r '.user.id // .id // empty'   <<<"$signup")

if [ -z "$jwt" ]; then
  yel "  no access_token in signup; trying password sign-in (confirmations may be off in dashboard)"
  signin=$(curl -sS -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}")
  jwt=$(jq -r '.access_token // empty' <<<"$signin")
  uid=$(jq -r '.user.id // empty'      <<<"$signin")
fi

if [ -z "$jwt" ] || [ -z "$uid" ]; then
  red "  signup did not yield a session"
  echo "  signup response:  $signup" >&2
  echo "  hint: disable email confirmations on your test Supabase project, or use \`supabase start\` locally." >&2
  exit 1
fi
green "  user $uid"

auth() {
  curl -sS \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $jwt" \
    "$@"
}

step "2/7  family bootstrap trigger fired?"
fid=$(auth "$SUPABASE_URL/rest/v1/family_members?user_id=eq.$uid&select=family_id" \
  | jq -r '.[0].family_id // empty')
[ -n "$fid" ] || { red "  no family_members row for user — trigger missing or RLS blocked"; exit 1; }
green "  family $fid"

step "3/7  insert child"
child_resp=$(auth -X POST "$SUPABASE_URL/rest/v1/child_profiles" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"family_id\":\"$fid\",\"nickname\":\"Smoketest\",\"avatar_emoji\":\"🦊\",\"age_band\":\"7-9\"}")
cid=$(jq -r '.[0].id // empty' <<<"$child_resp")
[ -n "$cid" ] || { red "  child insert failed: $child_resp"; exit 1; }
green "  child $cid"

step "4/7  insert mission"
mission_resp=$(auth -X POST "$SUPABASE_URL/rest/v1/missions" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"family_id\":\"$fid\",\"title\":\"Smoke uppdrag\",\"reward_mynt\":50,\"recurrence\":\"once\",\"created_by\":\"$uid\"}")
mid=$(jq -r '.[0].id // empty' <<<"$mission_resp")
[ -n "$mid" ] || { red "  mission insert failed: $mission_resp"; exit 1; }
green "  mission $mid"

step "5/7  submit mission as the (would-be) child"
sub_resp=$(auth -X POST "$SUPABASE_URL/rest/v1/mission_submissions" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"family_id\":\"$fid\",\"mission_id\":\"$mid\",\"child_id\":\"$cid\"}")
sid=$(jq -r '.[0].id // empty' <<<"$sub_resp")
[ -n "$sid" ] || { red "  submission insert failed: $sub_resp"; exit 1; }
green "  submission $sid (status: pending)"

step "6/7  approve via approve_mission RPC"
rpc_resp=$(auth -X POST "$SUPABASE_URL/rest/v1/rpc/approve_mission" \
  -H "Content-Type: application/json" \
  -d "{\"p_submission_id\":\"$sid\",\"p_action\":\"approve\"}")
echo "  rpc returned: $rpc_resp"

step "7/7  child_balances view reflects the credit"
bal=$(auth "$SUPABASE_URL/rest/v1/child_balances?child_id=eq.$cid&select=balance" \
  | jq -r '.[0].balance // empty')
if [ "$bal" != "50" ]; then
  red "  expected balance=50, got '$bal'"; exit 1
fi
green "  balance: 50 mynt"

# Bonus: re-approving the same submission must fail (RPC raises 'already reviewed').
step "bonus  re-approving the same submission must fail"
re=$(auth -X POST "$SUPABASE_URL/rest/v1/rpc/approve_mission" \
  -H "Content-Type: application/json" \
  -d "{\"p_submission_id\":\"$sid\",\"p_action\":\"approve\"}")
if jq -e '.code // empty' <<<"$re" >/dev/null 2>&1; then
  green "  re-approve correctly rejected ($(jq -r '.message // .code' <<<"$re"))"
else
  red "  re-approve unexpectedly succeeded: $re"; exit 1
fi

step "redemption  upsert profile_configs + redeem 15 min of screen time"
auth -X POST "$SUPABASE_URL/rest/v1/profile_configs?on_conflict=family_id" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d "{\"family_id\":\"$fid\",\"profile_id\":\"balans\",\"uppdrag_multiplier\":1.00,\"screen_time_multiplier\":1.00,\"daily_limit_minutes\":90}" \
  >/dev/null

redeem=$(auth -X POST "$SUPABASE_URL/rest/v1/rpc/redeem_screen_time" \
  -H "Content-Type: application/json" \
  -d "{\"p_child_id\":\"$cid\",\"p_minutes\":15}")
cost=$(jq -r '.mynt_cost // empty' <<<"$redeem")
[ "$cost" = "40" ] || { red "  expected mynt_cost=40, got '$cost' (response: $redeem)"; exit 1; }
green "  redeemed 15 min for $cost 🪙"

bal_after=$(auth "$SUPABASE_URL/rest/v1/child_balances?child_id=eq.$cid&select=balance" \
  | jq -r '.[0].balance // empty')
[ "$bal_after" = "10" ] || { red "  expected balance=10 after redemption, got '$bal_after'"; exit 1; }
green "  post-redemption balance: 10 🪙"

step "redemption  insufficient mynt must fail"
re2=$(auth -X POST "$SUPABASE_URL/rest/v1/rpc/redeem_screen_time" \
  -H "Content-Type: application/json" \
  -d "{\"p_child_id\":\"$cid\",\"p_minutes\":15}")
if jq -e '.code // empty' <<<"$re2" >/dev/null 2>&1; then
  green "  insufficient-mynt correctly rejected ($(jq -r '.message // .code' <<<"$re2"))"
else
  red "  expected insufficient-mynt failure, got: $re2"; exit 1
fi

echo
green "✅ smoke test passed end-to-end against $SUPABASE_URL"
echo "   test user: $email — delete via dashboard if you don't want it lingering"
