import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { ChildProfile, Mission, SubmissionStatus } from "../lib/types";
import { CK } from "../design/tokens";
import { KortKid, PillKid } from "../design/components";

type HistoryStatus = SubmissionStatus | "missed";

interface HistoryEntry {
  id: string;
  status: HistoryStatus;
  date: string;
  title: string;
  reward_mynt: number;
}

interface SubmissionRow {
  id: string;
  mission_id: string;
  status: SubmissionStatus;
  submitted_at: string;
  reviewed_at: string | null;
  missions: { title: string; reward_mynt: number } | null;
}

export function MissionHistorySheet({
  child,
  familyId,
  onClose
}: {
  child: ChildProfile;
  familyId: string;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const lookback = new Date(startOfToday);
        lookback.setDate(lookback.getDate() - 14);

        // Fetch all submissions (any status) so pending counts as "not missed"
        // and we can still display the approved/rejected entries.
        const [subsRes, missionsRes] = await Promise.all([
          supabase
            .from("mission_submissions")
            .select("id, mission_id, status, submitted_at, reviewed_at, missions(title, reward_mynt)")
            .eq("family_id", familyId)
            .eq("child_id", child.id)
            .order("submitted_at", { ascending: false })
            .limit(200),
          supabase
            .from("missions")
            .select("*")
            .eq("family_id", familyId)
        ]);
        if (subsRes.error) throw subsRes.error;
        if (missionsRes.error) throw missionsRes.error;

        const subs = (subsRes.data ?? []) as unknown as SubmissionRow[];
        const missions = (missionsRes.data ?? []) as Mission[];

        const list: HistoryEntry[] = subs
          .filter((r) => r.missions && (r.status === "approved" || r.status === "rejected"))
          .map((r) => ({
            id: r.id,
            status: r.status,
            date: r.reviewed_at ?? r.submitted_at,
            title: r.missions!.title,
            reward_mynt: r.missions!.reward_mynt
          }));

        // Group submission timestamps by mission for fast period lookups.
        const subsByMission = new Map<string, Date[]>();
        for (const s of subs) {
          if (!subsByMission.has(s.mission_id)) subsByMission.set(s.mission_id, []);
          subsByMission.get(s.mission_id)!.push(new Date(s.submitted_at));
        }
        const hasSubmissionInRange = (missionId: string, from: Date, toExcl: Date) =>
          (subsByMission.get(missionId) ?? []).some((d) => d >= from && d < toExcl);

        const startOfISOWeek = (d: Date) => {
          const r = new Date(d);
          r.setHours(0, 0, 0, 0);
          const dow = (r.getDay() + 6) % 7; // Monday = 0
          r.setDate(r.getDate() - dow);
          return r;
        };

        const startOfThisWeek = startOfISOWeek(new Date());

        for (const m of missions) {
          if (m.assigned_child_id !== null && m.assigned_child_id !== child.id) continue;
          const createdAt = new Date(m.created_at);
          const createdDay = new Date(createdAt);
          createdDay.setHours(0, 0, 0, 0);

          if (m.recurrence === "once") {
            if (createdDay >= startOfToday) continue;
            if (subsByMission.has(m.id)) continue;
            list.push({
              id: `missed-once-${m.id}`,
              status: "missed",
              date: m.created_at,
              title: m.title,
              reward_mynt: m.reward_mynt
            });
          } else if (m.recurrence === "daily") {
            const from = createdDay > lookback ? createdDay : lookback;
            const cursor = new Date(from);
            while (cursor < startOfToday) {
              const next = new Date(cursor);
              next.setDate(next.getDate() + 1);
              if (!hasSubmissionInRange(m.id, cursor, next)) {
                list.push({
                  id: `missed-daily-${m.id}-${cursor.toISOString().slice(0, 10)}`,
                  status: "missed",
                  date: cursor.toISOString(),
                  title: m.title,
                  reward_mynt: m.reward_mynt
                });
              }
              cursor.setDate(cursor.getDate() + 1);
            }
          } else if (m.recurrence === "weekly") {
            const createdWeek = startOfISOWeek(createdAt);
            const from = createdWeek > lookback ? createdWeek : startOfISOWeek(lookback);
            const cursor = new Date(from);
            while (cursor < startOfThisWeek) {
              const next = new Date(cursor);
              next.setDate(next.getDate() + 7);
              if (!hasSubmissionInRange(m.id, cursor, next)) {
                list.push({
                  id: `missed-weekly-${m.id}-${cursor.toISOString().slice(0, 10)}`,
                  status: "missed",
                  date: cursor.toISOString(),
                  title: m.title,
                  reward_mynt: m.reward_mynt
                });
              }
              cursor.setDate(cursor.getDate() + 7);
            }
          }
        }

        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEntries(list);
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [child.id, familyId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(36,58,82,0.45)",
        zIndex: 60,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          maxHeight: "92vh",
          background: `
            linear-gradient(180deg, rgba(255,244,220,0.85) 0%, rgba(255,244,220,0.92) 100%),
            url('/images/jungle-bg.png') center/cover no-repeat
          `,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          padding: 16,
          paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
          overflowY: "auto",
          boxSizing: "border-box",
          boxShadow: "0 -10px 40px rgba(36,58,82,0.25)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14, gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              background: CK.surface,
              border: `1px solid ${CK.border}`,
              color: CK.text,
              cursor: "pointer",
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: CK.shadowSoft
            }}
          >
            ‹ Tillbaka
          </button>
          <h3 style={{ margin: 0, flex: 1, color: CK.text, fontWeight: 800 }}>
            {child.avatar_emoji} Historik
          </h3>
        </div>

        {loading && <p style={{ color: CK.muted, textAlign: "center" }}>Laddar…</p>}
        {!loading && entries.length === 0 && !err && (
          <KortKid>
            <p style={{ color: CK.textSoft, fontSize: 14, margin: 0, textAlign: "center" }}>
              Inga avklarade uppdrag ännu.
            </p>
          </KortKid>
        )}
        {err && <p style={{ color: CK.red, fontSize: 13 }}>{err}</p>}

        <div style={{ display: "grid", gap: 10 }}>
          {entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 14,
                background: CK.surface,
                border: `1px solid ${CK.border}`,
                borderRadius: 16,
                boxShadow: CK.shadowSoft
              }}
            >
              <div style={{ fontSize: 22 }}>
                {entry.status === "approved"
                  ? "✅"
                  : entry.status === "rejected"
                  ? "❌"
                  : "⌛"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: CK.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  {entry.title}
                </div>
                <div style={{ fontSize: 11, color: CK.muted, marginTop: 2 }}>
                  {new Date(entry.date).toLocaleDateString("sv-SE", {
                    day: "numeric",
                    month: "short"
                  })}
                </div>
              </div>
              {entry.status === "approved" ? (
                <PillKid text={`+${entry.reward_mynt} 🪙`} tint={CK.gold} />
              ) : entry.status === "rejected" ? (
                <PillKid text="Nekad" tint={CK.red} />
              ) : (
                <PillKid text="Ej utfört" tint={CK.muted} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
