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

export function startOfDayLocal(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfISOWeekLocal(now: Date = new Date()): Date {
  const d = startOfDayLocal(now);
  // ISO week starts Monday (0=Sun → 6, 1=Mon → 0, ...)
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
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
  const startOfToday = startOfDayLocal(now);
  const startOfWeek = startOfISOWeekLocal(now);

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
