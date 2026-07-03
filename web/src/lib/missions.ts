import type { Mission, MissionSubmission } from "./types";

// "Today's active missions" — used by both the parent dashboard and the
// kid's view so they agree on what's relevant *right now*.
//
// A mission is visible for a given child today if:
//  - it isn't assigned to a different child (broadcast = visible to all)
//  - it isn't a once-mission whose creation day has passed
//  - it isn't already "done" for its current recurrence period:
//      once    → any approved submission ever  → done forever
//      daily   → approved with reviewed_at >= start-of-today
//      weekly  → approved with reviewed_at >= start-of-iso-week

type SubmissionRow = Pick<
  MissionSubmission,
  "mission_id" | "status" | "submitted_at" | "reviewed_at" | "child_id"
>;

// "Today" must match the server's definition. Every RPC and view uses
// date_trunc('day', now() at time zone 'UTC'), so the client counts
// days in UTC too — otherwise a Swedish device (UTC+1/+2) disagrees
// with the server between local midnight and 01:00/02:00: missions
// shown as done "today" while redeem_screen_time still rejects, and
// mynt-today numbers that differ from the leaderboard view.
export function startOfDayUTC(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function startOfISOWeekUTC(now: Date = new Date()): Date {
  const d = startOfDayUTC(now);
  // ISO week starts Monday (0=Sun → 6, 1=Mon → 0, ...)
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d;
}

export interface MissionVisibility {
  visible: Mission[];
  hiddenApprovedIds: Set<string>;
  submittedTodayIds: Set<string>;
  approvedTodayIds: Set<string>;
}

export function computeMissionVisibility(
  missions: Mission[],
  submissions: ReadonlyArray<SubmissionRow>,
  childId: string,
  now: Date = new Date()
): MissionVisibility {
  const startOfToday = startOfDayUTC(now);
  const startOfWeek = startOfISOWeekUTC(now);

  const submittedTodayIds = new Set<string>();
  const hiddenApprovedIds = new Set<string>();
  const approvedTodayIds = new Set<string>();

  // Only the child's own submissions decide their visibility — a sibling's
  // approval can't unlock or hide another sibling's mission.
  for (const sub of submissions) {
    if (sub.child_id !== childId) continue;
    if (new Date(sub.submitted_at) >= startOfToday) {
      submittedTodayIds.add(sub.mission_id);
    }
    if (sub.status !== "approved") continue;
    const mission = missions.find((m) => m.id === sub.mission_id);
    if (!mission) continue;
    const reviewed = sub.reviewed_at ? new Date(sub.reviewed_at) : null;
    if (mission.recurrence === "once") {
      hiddenApprovedIds.add(sub.mission_id);
      approvedTodayIds.add(sub.mission_id);
    } else if (mission.recurrence === "daily" && reviewed && reviewed >= startOfToday) {
      hiddenApprovedIds.add(sub.mission_id);
      approvedTodayIds.add(sub.mission_id);
    } else if (mission.recurrence === "weekly" && reviewed && reviewed >= startOfWeek) {
      hiddenApprovedIds.add(sub.mission_id);
      approvedTodayIds.add(sub.mission_id);
    }
  }

  const visible = missions.filter((m) => {
    if (m.assigned_child_id !== null && m.assigned_child_id !== childId) return false;
    if (hiddenApprovedIds.has(m.id)) return false;
    if (m.recurrence === "once" && new Date(m.created_at) < startOfToday) return false;
    return true;
  });

  return { visible, hiddenApprovedIds, submittedTodayIds, approvedTodayIds };
}
