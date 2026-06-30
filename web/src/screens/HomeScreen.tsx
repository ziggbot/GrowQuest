import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type {
  ChildProfile,
  Mission,
  MissionSubmission,
  ProfileConfig,
  SubmissionStatus
} from "../lib/types";
import { useSession } from "../lib/session";
import { PROFILER } from "../lib/profiler";
import { C } from "../design/tokens";
import { Kort, Pill, Knapp, ScreenContainer } from "../design/components";
import { Avatar } from "../design/Avatar";
import { playPop } from "../design/sounds";
import { notify } from "../lib/notifications";
import { computeMissionVisibility } from "../lib/missions";
import { CHILD_PROFILE_COLS } from "../lib/columns";
import { ProfilePickerScreen } from "./ProfilePickerScreen";
import { CreateMissionSheet } from "./CreateMissionSheet";
import { GuideSheet } from "./GuideSheet";
import { ChildView } from "./ChildView";

type Perspective = { kind: "parent" } | { kind: "child"; id: string };

type TodaySubMap = Record<string, Record<string, SubmissionStatus>>;

export function HomeScreen() {
  const { user, familyId, signOut } = useSession();
  const nav = useNavigate();
  const [profile, setProfile] = useState<ProfileConfig | null>(null);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [submissions, setSubmissions] = useState<
    ReadonlyArray<
      Pick<MissionSubmission, "mission_id" | "child_id" | "status" | "submitted_at" | "reviewed_at">
    >
  >([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingRedemptionsCount, setPendingRedemptionsCount] = useState(0);
  const [pendingGoalsCount, setPendingGoalsCount] = useState(0);
  const [todaySubs, setTodaySubs] = useState<TodaySubMap>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showCreateMission, setShowCreateMission] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  // Persist the parent/child perspective so navigating into wallet/leaderboard
  // and back doesn't reset us to "Förälder".
  const [perspective, setPerspective] = useState<Perspective>(() => {
    try {
      const raw = sessionStorage.getItem("growquest:perspective");
      if (raw) {
        const parsed = JSON.parse(raw) as Perspective;
        if (parsed?.kind === "parent" || (parsed?.kind === "child" && typeof parsed.id === "string")) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return { kind: "parent" };
  });
  useEffect(() => {
    try {
      sessionStorage.setItem("growquest:perspective", JSON.stringify(perspective));
    } catch {
      /* ignore */
    }
  }, [perspective]);

  async function reload() {
    if (!familyId) return;
    setLoading(true);
    setErr(null);
    try {
      // Best-effort: clear any pending submissions that have aged past the
      // parent's auto-approve window. Silently ignore if the migration
      // hasn't shipped yet.
      void supabase.rpc("auto_approve_stale", { p_family_id: familyId });
      const now = new Date();
      const startOfToday = new Date(now.setHours(0, 0, 0, 0));
      const startOfTodayIso = startOfToday.toISOString();
      // 30 days back covers daily / weekly visibility checks; once-missions
      // older than that are already hidden by the created_at < today rule.
      const lookback = new Date(startOfToday);
      lookback.setDate(lookback.getDate() - 30);
      const [pcRes, kidsRes, mRes, pRes, subsRes, rRes, gRes] = await Promise.all([
        supabase.from("profile_configs").select("*").eq("family_id", familyId).maybeSingle(),
        supabase
          .from("child_profiles")
          .select(CHILD_PROFILE_COLS)
          .eq("family_id", familyId)
          .order("created_at"),
        supabase.from("missions").select("*").eq("family_id", familyId).eq("active", true),
        supabase.from("mission_submissions").select("id").eq("family_id", familyId).eq("status", "pending"),
        supabase
          .from("mission_submissions")
          .select("mission_id, child_id, status, submitted_at, reviewed_at")
          .eq("family_id", familyId)
          .gte("submitted_at", lookback.toISOString()),
        supabase.from("redemptions").select("id").eq("family_id", familyId).eq("status", "pending"),
        // Pending savings goal proposals waiting for parent approval.
        // Soft-tolerate older clouds without the status column.
        supabase.from("savings_goals").select("id, status").eq("family_id", familyId)
      ]);
      if (pcRes.error && pcRes.error.code !== "PGRST116") throw pcRes.error;
      if (kidsRes.error) throw kidsRes.error;
      if (mRes.error) throw mRes.error;
      if (pRes.error) throw pRes.error;
      if (subsRes.error) throw subsRes.error;
      // Soft-tolerate redemptions status not being on cloud yet.
      const redemptionsRows = rRes.error ? [] : rRes.data ?? [];
      // Soft-tolerate savings_goals.status not being on cloud yet.
      const pendingGoals = gRes.error
        ? 0
        : ((gRes.data ?? []) as { status?: string }[]).filter((g) => g.status === "pending").length;

      const allSubs = (subsRes.data ?? []) as Pick<
        MissionSubmission,
        "mission_id" | "child_id" | "status" | "submitted_at" | "reviewed_at"
      >[];

      // Today's status pill per (child, mission) — only today's submissions.
      const subMap: TodaySubMap = {};
      for (const sub of allSubs) {
        if (new Date(sub.submitted_at) < startOfToday) continue;
        if (!subMap[sub.child_id]) subMap[sub.child_id] = {};
        const existing = subMap[sub.child_id][sub.mission_id];
        if (
          !existing ||
          existing === "rejected" ||
          (existing === "pending" && sub.status === "approved")
        ) {
          subMap[sub.child_id][sub.mission_id] = sub.status;
        }
      }

      setProfile(pcRes.data as ProfileConfig | null);
      setChildren((kidsRes.data ?? []) as unknown as ChildProfile[]);
      setMissions((mRes.data ?? []) as Mission[]);
      setSubmissions(allSubs);
      setPendingCount(pRes.data?.length ?? 0);
      setPendingRedemptionsCount(redemptionsRows.length);
      setPendingGoalsCount(pendingGoals);
      setTodaySubs(subMap);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [familyId]);

  // Realtime: bump the pending-request count and fire a popup notice
  // the moment a child submits a new mission or a redemption.
  // Keep the latest children list in a ref so the channel callback can
  // resolve names without re-subscribing on every reload.
  const childrenRef = useRef<ChildProfile[]>(children);
  useEffect(() => {
    childrenRef.current = children;
  }, [children]);

  useEffect(() => {
    if (!familyId) return;
    const childName = (cid: string) =>
      childrenRef.current.find((c) => c.id === cid)?.nickname ?? "Barnet";

    const redChannel = supabase
      .channel(`redemptions-${familyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "redemptions",
          filter: `family_id=eq.${familyId}`
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const r = payload.new as {
              child_id: string;
              kind: string;
              minutes: number;
              mynt_cost: number;
            };
            const who = childName(r.child_id);
            const what =
              r.kind === "cash_payout"
                ? `vill växla ${r.mynt_cost} 🪙 till pengar`
                : `förtjänade ${r.minutes} min skärmtid`;
            notify(`${who} ${what}`, {
              body: "Tryck för att godkänna.",
              tag: `redemption:${r.child_id}`,
              url: "/inbox"
            });
          }
          void reload();
        }
      )
      .subscribe();

    const subChannel = supabase
      .channel(`submissions-${familyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mission_submissions",
          filter: `family_id=eq.${familyId}`
        },
        (payload) => {
          const s = payload.new as { child_id: string; status?: string };
          if (s.status && s.status !== "pending") return;
          const who = childName(s.child_id);
          notify(`🌟 ${who} klarade ett uppdrag!`, {
            body: "Tryck för att titta och godkänna.",
            tag: `submission:${s.child_id}`,
            url: "/inbox"
          });
          void reload();
        }
      )
      .subscribe();

    const goalChannel = supabase
      .channel(`goals-${familyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "savings_goals",
          filter: `family_id=eq.${familyId}`
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const g = payload.new as { child_id: string; title: string; status?: string };
            if (g.status === "pending") {
              const who = childName(g.child_id);
              notify(`💡 ${who} föreslog ett sparmål`, {
                body: `"${g.title}" väntar på ditt OK.`,
                tag: `goal:${g.child_id}`,
                url: "/inbox"
              });
            }
          }
          void reload();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(redChannel);
      void supabase.removeChannel(subChannel);
      void supabase.removeChannel(goalChannel);
    };
  }, [familyId]);

  // Schedule a refresh at midnight so the date header and "today's missions"
  // roll over without the user having to reload.
  const [todayKey, setTodayKey] = useState(() => new Date().toDateString());
  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setDate(now.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);
    const ms = nextMidnight.getTime() - now.getTime() + 200;
    const timer = setTimeout(() => {
      setTodayKey(new Date().toDateString());
      void reload();
    }, ms);
    return () => clearTimeout(timer);
  }, [todayKey, familyId]);

  const profileEntry = useMemo(
    () => (profile ? PROFILER.find((p) => p.id === profile.profile_id) : undefined),
    [profile]
  );

  if (!familyId || loading) {
    return (
      <ScreenContainer>
        <p style={{ color: C.muted, textAlign: "center", marginTop: 80 }}>Förbereder din familj…</p>
      </ScreenContainer>
    );
  }

  if (!profile) {
    return <ProfilePickerScreen familyId={familyId} onSaved={(p) => setProfile(p)} />;
  }

  const activeChild =
    perspective.kind === "child" ? children.find((c) => c.id === perspective.id) ?? null : null;

  return (
    <ScreenContainer>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "8px 4px 12px",
            borderBottom: `1px solid ${C.border}`,
            marginBottom: 12,
            gap: 8
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                color: C.gold,
                fontWeight: 900,
                fontSize: 30,
                letterSpacing: -0.5,
                textShadow: "0 2px 4px rgba(0,0,0,0.15)"
              }}
            >
              Rise
            </div>
          </div>
          <button
            onClick={() => setShowGuide(true)}
            aria-label="Föräldraguide"
            title="Föräldraguide"
            style={{
              background: `${C.gold}1f`,
              border: `1.5px solid ${C.gold}66`,
              borderRadius: 999,
              width: 40,
              height: 40,
              padding: 0,
              color: C.gold,
              cursor: "pointer",
              fontSize: 22,
              fontWeight: 900,
              lineHeight: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ?
          </button>
          <button
            onClick={() => nav("/settings")}
            aria-label="Inställningar"
            title="Inställningar"
            style={{
              background: "transparent",
              border: "none",
              borderRadius: 999,
              width: 40,
              height: 40,
              padding: 0,
              color: C.gold,
              cursor: "pointer",
              fontSize: 26,
              lineHeight: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ⚙
          </button>
        </div>

        {/* Perspective picker */}
        <div style={{ overflowX: "auto", marginBottom: 14, WebkitOverflowScrolling: "touch" }}>
          <div style={{ display: "flex", gap: 6, paddingBottom: 4 }}>
            <Tab
              icon="👤"
              label="Förälder"
              isOn={perspective.kind === "parent"}
              onClick={() => {
                playPop();
                setPerspective({ kind: "parent" });
              }}
            />
            {children.map((c) => (
              <Tab
                key={c.id}
                icon={<Avatar child={c} size={22} />}
                label={c.nickname}
                isOn={perspective.kind === "child" && perspective.id === c.id}
                onClick={() => {
                  playPop();
                  setPerspective({ kind: "child", id: c.id });
                }}
              />
            ))}
            {children.length === 0 && (
              <button
                onClick={() => nav("/settings")}
                style={{
                  padding: "8px 12px",
                  background: "transparent",
                  border: `1px dashed ${C.border}`,
                  borderRadius: 999,
                  color: C.muted,
                  cursor: "pointer",
                  fontSize: 12,
                  whiteSpace: "nowrap"
                }}
              >
                + Lägg till barn
              </button>
            )}
          </div>
        </div>

        {err && <p style={{ color: C.red, fontSize: 13 }}>{err}</p>}

        {perspective.kind === "parent" ? (
          <ParentDashboard
            children={children}
            missions={missions}
            submissions={submissions}
            pendingCount={pendingCount}
            pendingRedemptionsCount={pendingRedemptionsCount}
            pendingGoalsCount={pendingGoalsCount}
            todaySubs={todaySubs}
            onAddChild={() => nav("/settings")}
            onCreateMission={() => setShowCreateMission(true)}
            onOpenWallet={(c) => nav(`/wallet/${c.id}`)}
            onOpenInbox={() => nav(`/inbox`)}
            onOpenLeaderboard={() => nav(`/leaderboard`)}
            loading={loading}
          />
        ) : activeChild ? (
          <ChildView child={activeChild} familyId={familyId} onOpenWallet={() => nav(`/wallet/${activeChild.id}`)} />
        ) : null}

        {showGuide && <GuideSheet onClose={() => setShowGuide(false)} />}

        {showCreateMission && profileEntry && (
          <CreateMissionSheet
            familyId={familyId}
            userId={user!.id}
            multiplier={profileEntry.uppdrag_multiplier}
            children={children}
            missions={missions}
            onClose={() => setShowCreateMission(false)}
            onCreated={() => {
              setShowCreateMission(false);
              void reload();
            }}
            onMissionsChanged={() => void reload()}
          />
        )}
      </div>
    </ScreenContainer>
  );
}

function Tab({
  icon,
  label,
  isOn,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  isOn: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px",
        background: isOn ? `${C.gold}22` : C.surfaceHov,
        border: `${isOn ? 2 : 1}px solid ${isOn ? C.gold : C.border}`,
        borderRadius: 999,
        color: isOn ? C.gold : C.text,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
        gap: 6
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ParentDashboard({
  children,
  missions,
  submissions,
  pendingCount,
  pendingRedemptionsCount,
  pendingGoalsCount,
  todaySubs,
  onAddChild,
  onCreateMission,
  onOpenWallet,
  onOpenInbox,
  onOpenLeaderboard,
  loading
}: {
  children: ChildProfile[];
  missions: Mission[];
  submissions: ReadonlyArray<
    Pick<MissionSubmission, "mission_id" | "child_id" | "status" | "submitted_at" | "reviewed_at">
  >;
  pendingCount: number;
  pendingRedemptionsCount: number;
  pendingGoalsCount: number;
  todaySubs: TodaySubMap;
  onAddChild: () => void;
  onCreateMission: () => void;
  onOpenWallet: (c: ChildProfile) => void;
  onOpenInbox: () => void;
  onOpenLeaderboard: () => void;
  loading: boolean;
}) {
  if (!loading && children.length === 0) {
    return (
      <Kort>
        <div style={{ textAlign: "center", padding: "16px 8px" }}>
          <h3 style={{ margin: "0 0 8px" }}>Lägg till ditt första barn</h3>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
            Du behöver minst ett barn för att skapa uppdrag.
          </p>
          <Knapp title="Lägg till barn" onClick={onAddChild} />
        </div>
      </Kort>
    );
  }

  const inboxTotal = pendingCount + pendingRedemptionsCount + pendingGoalsCount;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Kort>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ margin: 0, flex: 1 }}>Att granska</h3>
          {inboxTotal > 0 && <Pill text={String(inboxTotal)} tint={C.purple} />}
        </div>
        <button
          onClick={onOpenInbox}
          style={{
            width: "100%",
            background: "none",
            border: "none",
            color: C.text,
            textAlign: "left",
            padding: 0,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <span>
            {inboxTotal === 0
              ? "🎉 Inget väntar"
              : `${pendingCount} uppdrag · ${pendingRedemptionsCount} begäran${
                  pendingGoalsCount > 0 ? ` · ${pendingGoalsCount} sparmål` : ""
                }`}
          </span>
          <span style={{ color: C.muted }}>›</span>
        </button>
      </Kort>

      <Kort>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0 }}>Dagens aktiva uppdrag</h3>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{formatTodayShort()}</div>
          </div>
          <button
            onClick={onCreateMission}
            style={{ background: "none", border: "none", color: C.gold, fontWeight: 700, cursor: "pointer", fontSize: 14 }}
          >
            + Planera uppdrag
          </button>
        </div>
        {missions.length === 0 ? (
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Inga uppdrag än. Skapa det första!</p>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {children.map((c) => {
              // Same visibility rules as the child sees on their own tab —
              // hides once-missions from previous days, daily/weekly that
              // are already done for this period, etc.
              const { visible: childMissions } = computeMissionVisibility(
                missions,
                submissions,
                c.id
              );
              if (childMissions.length === 0) return null;
              return (
                <ChildMissionGroup
                  key={c.id}
                  child={c}
                  missions={childMissions}
                  subs={todaySubs[c.id] ?? {}}
                />
              );
            })}
          </div>
        )}
      </Kort>

      {children.length > 0 && (
        <Kort>
          <h3 style={{ margin: "0 0 8px" }}>Plånbok</h3>
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => onOpenWallet(c)}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                color: C.text,
                padding: "8px 0",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10
              }}
            >
              <Avatar child={c} size={22} />
              <span style={{ flex: 1, textAlign: "left" }}>{c.nickname}</span>
              <span style={{ color: C.muted }}>›</span>
            </button>
          ))}
        </Kort>
      )}

      <Kort>
        <button
          onClick={onOpenLeaderboard}
          style={{
            width: "100%",
            background: "none",
            border: "none",
            color: C.text,
            padding: 0,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10
          }}
        >
          <span style={{ fontSize: 26 }}>🏆</span>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontWeight: 700, color: C.gold }}>Superäventyrare</div>
            <div style={{ fontSize: 12, color: C.muted }}>Vem samlar mest mynt idag?</div>
          </div>
          <span style={{ color: C.muted }}>›</span>
        </button>
      </Kort>
    </div>
  );
}

function ChildMissionGroup({
  child,
  missions,
  subs
}: {
  child: ChildProfile;
  missions: Mission[];
  subs: Record<string, SubmissionStatus>;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Avatar child={child} size={20} />
        <span style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{child.nickname}</span>
      </div>
      {missions.map((m) => (
        <MissionLine key={m.id} mission={m} status={subs[m.id] ?? null} />
      ))}
    </div>
  );
}

function MissionLine({ mission, status }: { mission: Mission; status: SubmissionStatus | null }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 64px 110px",
        alignItems: "center",
        gap: 8,
        paddingLeft: 8
      }}
    >
      <span
        style={{
          color: C.text,
          fontSize: 13,
          fontWeight: 400,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}
      >
        {mission.title}
      </span>
      <Pill text={`${mission.reward_mynt} 🪙`} tint={C.gold} />
      <StatusPill status={status} />
    </div>
  );
}

function StatusPill({ status }: { status: SubmissionStatus | null }) {
  if (status === null) return <Pill text="Ej startad" tint={C.muted} />;
  if (status === "pending") return <Pill text="Inskickad" icon="⏳" tint={C.purple} />;
  if (status === "approved") return <Pill text="Godkänd" icon="✅" tint={C.green} />;
  return <Pill text="Nekad" tint={C.red} />;
}

const SV_MONTHS_SHORT = [
  "jan", "feb", "mar", "apr", "maj", "jun",
  "jul", "aug", "sep", "okt", "nov", "dec"
];

function formatTodayShort(): string {
  const now = new Date();
  const day = now.getDate();
  const month = SV_MONTHS_SHORT[now.getMonth()];
  const year = String(now.getFullYear()).slice(-2);
  return `${day} ${month}-${year}`;
}
