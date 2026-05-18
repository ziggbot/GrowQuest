export interface Family {
  id: string;
  name: string;
  created_by: string;
}

export interface FamilyMember {
  family_id: string;
  user_id: string;
  role: "parent" | "co_parent";
}

export type ProfileId = "stram" | "balans" | "fri";

export interface ProfileConfig {
  family_id: string;
  profile_id: ProfileId;
  uppdrag_multiplier: number;
  screen_time_multiplier: number;
  daily_limit_minutes: number;
}

export type AgeBand = "4-6" | "7-9" | "10-12" | "13+";

export interface ChildProfile {
  id: string;
  family_id: string;
  nickname: string;
  avatar_emoji: string;
  age_band: AgeBand | null;
  global_leaderboard_opt_in: boolean;
}

export type Recurrence = "once" | "daily" | "weekly";

export interface MissionTemplate {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  reward_mynt: number;
  recurrence: Recurrence;
  created_at: string;
}

export interface Mission {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  reward_mynt: number;
  recurrence: Recurrence;
  active: boolean;
  created_by: string;
  created_at: string;
  assigned_child_id: string | null;
}

export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface MissionSubmission {
  id: string;
  family_id: string;
  mission_id: string;
  child_id: string;
  submitted_at: string;
  status: SubmissionStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  note: string | null;
  child_note: string | null;
  photo_data: string | null;
}

export interface CoinLedgerEntry {
  id: string;
  family_id: string;
  child_id: string;
  amount_mynt: number;
  reason: string;
  created_at: string;
}

export interface ChildBalance {
  child_id: string;
  family_id: string;
  balance: number;
}

export interface ChildProgress {
  child_id: string;
  family_id: string;
  nickname: string;
  avatar_emoji: string;
  global_leaderboard_opt_in: boolean;
  mynt_today: number;
  approved_missions: number;
}

export interface Redemption {
  id: string;
  family_id: string;
  child_id: string;
  kind: string;
  minutes: number;
  mynt_cost: number;
  started_at: string;
  ends_at: string;
}
