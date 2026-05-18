import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import type { ChildProfile, Mission, MissionSubmission } from "../lib/types";
import { CK } from "../design/tokens";
import { KortKid, PillKid } from "../design/components";
import { MissionHistorySheet } from "./MissionHistorySheet";

export function ChildView({
  child,
  familyId,
  onOpenWallet
}: {
  child: ChildProfile;
  familyId: string;
  onOpenWallet: () => void;
}) {
  const nav = useNavigate();
  const { childId: deviceChildId } = useSession();
  const isParentPreview = deviceChildId === null;
  const [missions, setMissions] = useState<Mission[]>([]);
  const [submittedToday, setSubmittedToday] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setErr(null);
    try {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      // ISO week start (Monday)
      const startOfWeek = new Date(now);
      const dow = (startOfWeek.getDay() + 6) % 7; // 0 = Monday
      startOfWeek.setDate(startOfWeek.getDate() - dow);
      startOfWeek.setHours(0, 0, 0, 0);

      const [mRes, sRes] = await Promise.all([
        supabase
          .from("missions")
          .select("*")
          .eq("family_id", familyId)
          .eq("active", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("mission_submissions")
          .select("mission_id, status, submitted_at, reviewed_at")
          .eq("child_id", child.id)
      ]);
      if (mRes.error) throw mRes.error;
      if (sRes.error) throw sRes.error;

      const allMissions = (mRes.data ?? []) as Mission[];
      const allSubs = (sRes.data ?? []) as Pick<
        MissionSubmission,
        "mission_id" | "status" | "submitted_at" | "reviewed_at"
      >[];

      const todaySubmitted = new Set<string>();
      const hiddenApproved = new Set<string>();

      for (const sub of allSubs) {
        if (new Date(sub.submitted_at) >= startOfToday) {
          todaySubmitted.add(sub.mission_id);
        }
        if (sub.status !== "approved") continue;
        const mission = allMissions.find((m) => m.id === sub.mission_id);
        if (!mission) continue;
        const reviewed = sub.reviewed_at ? new Date(sub.reviewed_at) : null;
        if (mission.recurrence === "once") {
          hiddenApproved.add(sub.mission_id);
        } else if (mission.recurrence === "daily" && reviewed && reviewed >= startOfToday) {
          hiddenApproved.add(sub.mission_id);
        } else if (mission.recurrence === "weekly" && reviewed && reviewed >= startOfWeek) {
          hiddenApproved.add(sub.mission_id);
        }
      }

      const visible = allMissions.filter((m) => {
        if (m.assigned_child_id !== null && m.assigned_child_id !== child.id) return false;
        if (hiddenApproved.has(m.id)) return false;
        // "once" missions are for the day they were created; after midnight
        // they disappear from the active list and surface in history as
        // "ej utfört" if never done.
        if (m.recurrence === "once" && new Date(m.created_at) < startOfToday) return false;
        return true;
      });

      setMissions(visible);
      setSubmittedToday(todaySubmitted);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [child.id]);

  const content = (
    <div style={{ display: "grid", gap: 16 }}>
      <button
        onClick={onOpenWallet}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: CK.text
        }}
      >
        <KortKid
          style={{
            background: `linear-gradient(135deg, ${CK.surface} 0%, ${CK.surfaceSoft} 100%)`
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: CK.accentFade,
                display: "grid",
                placeItems: "center",
                fontSize: 32
              }}
            >
              {child.avatar_emoji}
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ color: CK.muted, fontSize: 12, fontWeight: 600, letterSpacing: 0.4 }}>
                MIN PLÅNBOK
              </div>
              <div style={{ fontWeight: 800, fontSize: 19, color: CK.text, marginTop: 2 }}>
                {child.nickname}
              </div>
            </div>
            <span style={{ color: CK.accent, fontSize: 22, fontWeight: 700 }}>›</span>
          </div>
        </KortKid>
      </button>

      <div>
        <h3
          style={{
            margin: "4px 4px 10px",
            color: CK.text,
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: 0.4,
            textTransform: "uppercase"
          }}
        >
          Dagens uppdrag
        </h3>
        {loading && (
          <p style={{ color: CK.muted, fontSize: 13, padding: "0 4px" }}>Laddar…</p>
        )}
        {!loading && missions.length === 0 && (
          <KortKid>
            <p style={{ color: CK.textSoft, fontSize: 14, margin: 0, textAlign: "center" }}>
              Inga uppdrag idag. Be en förälder skapa ett!
            </p>
          </KortKid>
        )}
        <div style={{ display: "grid", gap: 10 }}>
          {missions.map((m) => {
            const done = submittedToday.has(m.id);
            return (
              <button
                key={m.id}
                onClick={() => nav(`/child/${child.id}/mission/${m.id}`)}
                style={{
                  width: "100%",
                  minWidth: 0,
                  boxSizing: "border-box",
                  textAlign: "left",
                  padding: 14,
                  background: CK.surface,
                  border: `1px solid ${CK.border}`,
                  borderRadius: 18,
                  cursor: "pointer",
                  color: CK.text,
                  opacity: done ? 0.65 : 1,
                  boxShadow: CK.shadowSoft,
                  display: "flex",
                  alignItems: "center",
                  gap: 12
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: done ? CK.surfaceMuted : CK.accentFade,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 22,
                    flexShrink: 0
                  }}
                >
                  {done ? "✓" : "🎯"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      color: CK.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {m.title}
                  </div>
                  {m.description && (
                    <div
                      style={{
                        fontSize: 12,
                        color: CK.muted,
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {m.description}
                    </div>
                  )}
                </div>
                <div style={{ flexShrink: 0 }}>
                  {done ? (
                    <PillKid text="Inskickat" icon="⏳" tint={CK.purple} />
                  ) : (
                    <PillKid text={`${m.reward_mynt} 🪙`} tint={CK.gold} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {err && <p style={{ color: CK.red, fontSize: 13 }}>{err}</p>}

      <button
        onClick={() => setShowHistory(true)}
        style={{
          background: "transparent",
          border: `1px solid ${CK.border}`,
          borderRadius: 14,
          padding: "10px 16px",
          color: CK.muted,
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          margin: "4px auto 0"
        }}
      >
        🕓 Historik
      </button>

      <button
        onClick={() => nav("/leaderboard")}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: CK.text
        }}
      >
        <KortKid>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: CK.accentFade,
                display: "grid",
                placeItems: "center",
                fontSize: 26,
                flexShrink: 0
              }}
            >
              🏆
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: CK.gold }}>Superäventyrare</div>
              <div style={{ fontSize: 12, color: CK.muted, marginTop: 2 }}>
                Vem samlar mest mynt idag?
              </div>
            </div>
            <span style={{ color: CK.accent, fontSize: 22, fontWeight: 700 }}>›</span>
          </div>
        </KortKid>
      </button>

      {showHistory && (
        <MissionHistorySheet
          child={child}
          familyId={familyId}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );

  if (isParentPreview) {
    return (
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: CK.muted,
            textAlign: "center",
            marginBottom: 10
          }}
        >
          Barnvy · förhandsgranskning
        </div>
        {content}
      </div>
    );
  }
  return content;
}
