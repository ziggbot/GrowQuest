// Compute the child's current "approved-missions" streak in days.
// We look at the most recent N coin_ledger entries with reason
// 'mission_approved' and count consecutive UTC-day buckets ending at
// (or one day before) today. Today counts even if no approval yet —
// a streak isn't broken until the day rolls over without one.

export function computeStreak(
  approvalDates: ReadonlyArray<string | Date>,
  now: Date = new Date()
): number {
  if (approvalDates.length === 0) return 0;

  const todayKey = utcDayKey(now);
  const yesterdayKey = utcDayKey(new Date(now.getTime() - 86_400_000));

  const days = new Set<string>();
  for (const d of approvalDates) {
    days.add(utcDayKey(new Date(d)));
  }

  // The streak only counts if there was an approval today *or* yesterday
  // — if yesterday and today are both empty the streak has already
  // broken.
  let cursor: Date;
  if (days.has(todayKey)) {
    cursor = new Date(now);
  } else if (days.has(yesterdayKey)) {
    cursor = new Date(now.getTime() - 86_400_000);
  } else {
    return 0;
  }

  let count = 0;
  while (days.has(utcDayKey(cursor))) {
    count += 1;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }
  return count;
}

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
