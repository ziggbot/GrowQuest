import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import type { ChildProfile, Mission, MissionSubmission } from "../lib/types";
import { CK } from "../design/tokens";
import { KortKid, PillKid } from "../design/components";
import { MissionHistorySheet } from "./MissionHistorySheet";
import { JumperAnimation, CoinRain } from "../design/lottie";
import { computeStreak } from "../lib/streak";

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
  const [approvedToday, setApprovedToday] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0);
  const [myntToday, setMyntToday] = useState(0);
  const [lifetimeApproved, setLifetimeApproved] = useState(0);
  const [streakClaimMsg, setStreakClaimMsg] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showCoinRain, setShowCoinRain] = useState(false);

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

      const lookback = new Date(now);
      lookback.setDate(lookback.getDate() - 30);
      const [mRes, sRes, lRes, pRes] = await Promise.all([
        supabase
          .from("missions")
          .select("*")
          .eq("family_id", familyId)
          .eq("active", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("mission_submissions")
          .select("mission_id, status, submitted_at, reviewed_at")
          .eq("child_id", child.id),
        supabase
          .from("coin_ledger")
          .select("amount_mynt, reason, created_at")
          .eq("child_id", child.id)
          .gte("created_at", lookback.toISOString()),
        supabase
          .from("child_progress")
          .select("approved_missions")
          .eq("child_id", child.id)
          .maybeSingle()
      ]);
      if (mRes.error) throw mRes.error;
      if (sRes.error) throw sRes.error;
      if (lRes.error) throw lRes.error;
      setLifetimeApproved((pRes.data?.approved_missions as number | undefined) ?? 0);

      const ledger = (lRes.data ?? []) as { amount_mynt: number; reason: string; created_at: string }[];
      const approvalDates = ledger
        .filter((e) => e.reason === "mission_approved")
        .map((e) => e.created_at);
      setStreak(computeStreak(approvalDates, now));
      const earnedToday = ledger
        .filter((e) => e.amount_mynt > 0 && new Date(e.created_at) >= startOfToday)
        .reduce((sum, e) => sum + e.amount_mynt, 0);
      setMyntToday(earnedToday);

      const allMissions = (mRes.data ?? []) as Mission[];
      const allSubs = (sRes.data ?? []) as Pick<
        MissionSubmission,
        "mission_id" | "status" | "submitted_at" | "reviewed_at"
      >[];

      const todaySubmitted = new Set<string>();
      const hiddenApproved = new Set<string>();
      const todayApproved = new Set<string>();

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
          todayApproved.add(sub.mission_id);
        } else if (mission.recurrence === "daily" && reviewed && reviewed >= startOfToday) {
          hiddenApproved.add(sub.mission_id);
          todayApproved.add(sub.mission_id);
        } else if (mission.recurrence === "weekly" && reviewed && reviewed >= startOfWeek) {
          hiddenApproved.add(sub.mission_id);
          todayApproved.add(sub.mission_id);
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
      setApprovedToday(todayApproved);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [child.id]);

  // Auto-claim the streak bonus on day 7+. Server-side it's idempotent
  // per ISO week so we can fire-and-forget every time the streak hits 7.
  useEffect(() => {
    if (isParentPreview) return;
    if (streak < 7) return;
    void (async () => {
      const { data } = await supabase.rpc("claim_streak_bonus", { p_child_id: child.id });
      const result = data as { claimed?: boolean; amount?: number } | null;
      if (result?.claimed && result.amount) {
        setStreakClaimMsg(`🔥 7 dagar i rad — bonus +${result.amount} 🪙!`);
        setShowCoinRain(true);
        void reload();
      }
    })();
  }, [streak, child.id, isParentPreview]);

  // Coin rain trigger — both realtime (live approval while child is on the
  // screen) and a catch-up on mount (parent approved while child was away).
  // Only runs in actual child mode so the parent's preview tab stays quiet.
  useEffect(() => {
    if (isParentPreview) return;
    const lastSeenKey = `growquest:approvalSeen:${child.id}`;
    const lastSeenRaw = localStorage.getItem(lastSeenKey);
    const lastSeen = lastSeenRaw ? new Date(lastSeenRaw) : new Date(0);

    void (async () => {
      const { data } = await supabase
        .from("mission_submissions")
        .select("id, reviewed_at")
        .eq("child_id", child.id)
        .eq("status", "approved")
        .order("reviewed_at", { ascending: false })
        .limit(1);
      const newest = (data ?? [])[0] as { reviewed_at: string | null } | undefined;
      if (newest?.reviewed_at && new Date(newest.reviewed_at) > lastSeen) {
        setShowCoinRain(true);
        localStorage.setItem(lastSeenKey, newest.reviewed_at);
      }
    })();

    const channel = supabase
      .channel(`coinrain-${child.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mission_submissions",
          filter: `child_id=eq.${child.id}`
        },
        (payload) => {
          const next = payload.new as { status?: string; reviewed_at?: string | null } | null;
          const prev = payload.old as { status?: string } | null;
          if (next?.status === "approved" && prev?.status !== "approved") {
            if (next.reviewed_at) localStorage.setItem(lastSeenKey, next.reviewed_at);
            setShowCoinRain(true);
            void reload();
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [child.id, isParentPreview]);

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
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: CK.accentFade,
                display: "grid",
                placeItems: "center",
                overflow: "hidden"
              }}
            >
              <JumperAnimation
                gender={child.gender ?? "girl"}
                size={72}
                approvedMissions={lifetimeApproved}
                fallback={child.avatar_emoji}
              />
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
        {streak > 0 && (
          <div
            style={{
              margin: "0 4px 10px",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 999,
              background: `linear-gradient(135deg, ${CK.gold}33, ${CK.gold}11)`,
              border: `1px solid ${CK.gold}66`,
              color: CK.text,
              fontWeight: 800,
              fontSize: 13
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>🔥</span>
            {streak} dag{streak === 1 ? "" : "ar"} i rad
            {streak >= 7 && <span style={{ color: CK.gold, marginLeft: 4 }}>· BONUS!</span>}
          </div>
        )}
        {streakClaimMsg && (
          <p
            style={{
              margin: "0 4px 10px",
              color: CK.gold,
              fontWeight: 800,
              fontSize: 13,
              textAlign: "center"
            }}
          >
            {streakClaimMsg}
          </p>
        )}
        {loading && (
          <p style={{ color: CK.muted, fontSize: 13, padding: "0 4px" }}>Laddar…</p>
        )}
        {!loading && missions.length === 0 && approvedToday.size === 0 && (
          <KortKid>
            <p style={{ color: CK.textSoft, fontSize: 14, margin: 0, textAlign: "center" }}>
              Inga uppdrag idag. Be en förälder skapa ett!
            </p>
          </KortKid>
        )}
        {!loading && missions.length === 0 && approvedToday.size > 0 && (
          <KortKid
            style={{
              textAlign: "center",
              padding: "26px 20px",
              background: `linear-gradient(135deg, ${CK.gold}22, ${CK.green}22)`,
              border: `2px solid ${CK.gold}55`
            }}
          >
            <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 6 }}>🎉</div>
            <h3 style={{ margin: "0 0 6px", color: CK.text, fontWeight: 800, fontSize: 18 }}>
              Klart för idag!
            </h3>
            <p style={{ color: CK.text, fontSize: 14, margin: "0 0 10px" }}>
              Du har klarat {approvedToday.size} uppdrag och tjänat <strong>{myntToday} 🪙</strong>.
            </p>
            <p style={{ color: CK.textSoft, fontSize: 13, margin: 0, fontStyle: "italic" }}>
              Lägg ifrån dig telefonen och kom tillbaka i morgon. 💪
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

      {showCoinRain && <CoinRain onDone={() => setShowCoinRain(false)} />}
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
