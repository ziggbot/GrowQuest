import { useEffect, useMemo, useState } from "react";
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
import { ProfilePickerScreen } from "./ProfilePickerScreen";
import { CreateMissionSheet } from "./CreateMissionSheet";
import { ChildView } from "./ChildView";

type Perspective = { kind: "parent" } | { kind: "child"; id: string };

type TodaySubMap = Record<string, Record<string, SubmissionStatus>>;

export function HomeScreen() {
  const { user, familyId, signOut } = useSession();
  const nav = useNavigate();
  const [profile, setProfile] = useState<ProfileConfig | null>(null);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingRedemptionsCount, setPendingRedemptionsCount] = useState(0);
  const [todaySubs, setTodaySubs] = useState<TodaySubMap>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showCreateMission, setShowCreateMission] = useState(false);
  const [perspective, setPerspective] = useState<Perspective>({ kind: "parent" });

  async function reload() {
    if (!familyId) return;
    setLoading(true);
    setErr(null);
    try {
      const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      const [pcRes, kidsRes, mRes, pRes, todayRes, rRes] = await Promise.all([
        supabase.from("profile_configs").select("*").eq("family_id", familyId).maybeSingle(),
        supabase.from("child_profiles").select("*").eq("family_id", familyId).order("created_at"),
        supabase.from("missions").select("*").eq("family_id", familyId).eq("active", true),
        supabase.from("mission_submissions").select("id").eq("family_id", familyId).eq("status", "pending"),
        supabase
          .from("mission_submissions")
          .select("mission_id, child_id, status")
          .eq("family_id", familyId)
          .gte("submitted_at", startOfToday),
        supabase.from("redemptions").select("id").eq("family_id", familyId).eq("status", "pending")
      ]);
      if (pcRes.error && pcRes.error.code !== "PGRST116") throw pcRes.error;
      if (kidsRes.error) throw kidsRes.error;
      if (mRes.error) throw mRes.error;
      if (pRes.error) throw pRes.error;
      if (todayRes.error) throw todayRes.error;
      // Soft-tolerate redemptions status not being on cloud yet.
      const redemptionsRows = rRes.error ? [] : rRes.data ?? [];

      const subMap: TodaySubMap = {};
      for (const sub of (todayRes.data ?? []) as Pick<MissionSubmission, "mission_id" | "child_id" | "status">[]) {
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
      setChildren((kidsRes.data ?? []) as ChildProfile[]);
      setMissions((mRes.data ?? []) as Mission[]);
      setPendingCount(pRes.data?.length ?? 0);
      setPendingRedemptionsCount(redemptionsRows.length);
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

  if (!familyId) {
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
            <div style={{ color: C.gold, fontWeight: 800, fontSize: 20 }}>GrowQuest</div>
            <div style={{ color: C.muted, fontSize: 11 }}>{user?.email}</div>
          </div>
          <button
            onClick={signOut}
            style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13 }}
          >
            Logga ut
          </button>
          <button
            onClick={() => nav("/settings")}
            aria-label="Inställningar"
            title="Inställningar"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 999,
              width: 36,
              height: 36,
              padding: 0,
              color: C.text,
              cursor: "pointer",
              fontSize: 17,
              lineHeight: 1,
              boxShadow: C.shadowSoft,
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
              onClick={() => setPerspective({ kind: "parent" })}
            />
            {children.map((c) => (
              <Tab
                key={c.id}
                icon={c.avatar_emoji}
                label={c.nickname}
                isOn={perspective.kind === "child" && perspective.id === c.id}
                onClick={() => setPerspective({ kind: "child", id: c.id })}
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
            pendingCount={pendingCount}
            pendingRedemptionsCount={pendingRedemptionsCount}
            todaySubs={todaySubs}
            onAddChild={() => nav("/settings")}
            onCreateMission={() => setShowCreateMission(true)}
            onOpenWallet={(c) => nav(`/wallet/${c.id}`)}
            onOpenApprove={() => nav(`/approve`)}
            onOpenScreenTime={() => nav(`/screentime`)}
            onOpenLeaderboard={() => nav(`/leaderboard`)}
            loading={loading}
          />
        ) : activeChild ? (
          <ChildView child={activeChild} familyId={familyId} onOpenWallet={() => nav(`/wallet/${activeChild.id}`)} />
        ) : null}

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
  icon: string;
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
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function ParentDashboard({
  children,
  missions,
  pendingCount,
  pendingRedemptionsCount,
  todaySubs,
  onAddChild,
  onCreateMission,
  onOpenWallet,
  onOpenApprove,
  onOpenScreenTime,
  onOpenLeaderboard,
  loading
}: {
  children: ChildProfile[];
  missions: Mission[];
  pendingCount: number;
  pendingRedemptionsCount: number;
  todaySubs: TodaySubMap;
  onAddChild: () => void;
  onCreateMission: () => void;
  onOpenWallet: (c: ChildProfile) => void;
  onOpenApprove: () => void;
  onOpenScreenTime: () => void;
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

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Kort>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ margin: 0, flex: 1 }}>Uppdrag att granska</h3>
          {pendingCount > 0 && <Pill text={String(pendingCount)} tint={C.purple} />}
        </div>
        <button
          onClick={onOpenApprove}
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
            {pendingCount > 0
              ? `Du har ${pendingCount} inskickade uppdrag`
              : "Inga uppdrag väntar"}
          </span>
          <span style={{ color: C.muted }}>›</span>
        </button>
      </Kort>

      <Kort>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ margin: 0, flex: 1 }}>Skärmbegäran</h3>
          {pendingRedemptionsCount > 0 && (
            <Pill text={String(pendingRedemptionsCount)} tint={C.purple} />
          )}
        </div>
        <button
          onClick={onOpenScreenTime}
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
            {pendingRedemptionsCount > 0
              ? `${pendingRedemptionsCount} barn väntar på skärmtid`
              : "Inga öppna skärm-begäran"}
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
            + Nytt
          </button>
        </div>
        {missions.length === 0 ? (
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Inga uppdrag än. Skapa det första!</p>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {children.map((c) => {
              const childMissions = missions.filter((m) => m.assigned_child_id === c.id);
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
              <span style={{ fontSize: 22 }}>{c.avatar_emoji}</span>
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
        <span style={{ fontSize: 18 }}>{child.avatar_emoji}</span>
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
