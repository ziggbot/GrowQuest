// Explicit column lists used in PostgREST `.select(...)` calls instead
// of `*`. Two reasons:
//   1. Defense-in-depth: a future migration that adds a sensitive
//      column (e.g. a phone number, an internal flag) won't silently
//      start shipping it to the client. We have to opt the column in
//      here.
//   2. Self-documenting: the columns each screen actually consumes are
//      visible in one place.
//
// RLS still does the heavy lifting — these strings don't add a
// permission boundary, they just make the data flow explicit.

// Used by every screen that renders a ChildProfile-shaped row through
// the Avatar component. Includes avatar_photo because the photo is the
// point — explicit columns aren't there to shrink the payload, they're
// there to make the schema flow obvious.
export const CHILD_PROFILE_COLS =
  "id, family_id, nickname, avatar_emoji, avatar_photo, age_band, gender, " +
  "global_leaderboard_opt_in, daily_limit_minutes_override, require_daily_mission, " +
  "mynt_expiry_days, email, auth_user_id";
