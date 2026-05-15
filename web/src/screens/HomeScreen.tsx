import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type {
  ChildProfile,
  Mission,
  MissionSubmission,
  ProfileConfig
} from "../lib/types";
import { useSession } from "../lib/session";
import { PROFILER } from "../lib/profiler";
import { C } from "../design/tokens";
import { Kort, Pill, Knapp, ScreenContainer } from "../design/components";
import { ProfilePickerScreen } from "./ProfilePickerScreen";
import { AddChildSheet } from "./AddChildSheet";
import { CreateMissionSheet } from "./CreateMissionSheet";
import { ChildView } from "./ChildView";

type Perspective = { kind: "parent" } | { kind: "child"; id: string };

export function HomeScreen() {
  const { user, familyId, signOut } = useSession();
  const nav = useNavigate();
  const [profile, setProfile] = useState<ProfileConfig | null>(null);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showCreateMission, setShowCreateMission] = useState(false);
  const [perspective, setPerspective] = useState<Perspective>({ kind: "parent" });

  async function reload() {
    if (!familyId) return;
    setLoading(true);
    setErr(null);
    try {
      const [pcRes, kidsRes, mRes, pRes] = await Promise.all([
        supabase.from("profile_configs").select("*").eq("family_id", familyId).maybeSingle(),
        supabase.from("child_profiles").select("*").eq("family_id", familyId).order("created_at"),
        supabase.from("missions").select("*").eq("family_id", familyId).eq("active", true),
        supabase.from("mission_submissions").select("id").eq("family_id", familyId).eq("status", "pending")
      ]);
      if (pcRes.error && pcRes.error.code !== "PGRST116") throw pcRes.error;
      if (kidsRes.error) throw kidsRes.error;
      if (mRes.error) throw mRes.error;
      if (pRes.error) throw pRes.error;

      setProfile(pcRes.data as ProfileConfig | null);
      setChildren((kidsRes.data ?? []) as ChildProfile[]);
      setMissions((mRes.data ?? []) as Mission[]);
      setPendingCount(pRes.data?.length ?? 0);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [familyId]);

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
            marginBottom: 12
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ color: C.gold, fontWeight: 800, fontSize: 20 }}>GrowQuest</div>
            <div style={{ color: C.muted, fontSize: 11 }}>
              {profileEntry?.namn ?? "—"} · {user?.email}
            </div>
          </div>
          <button
            onClick={signOut}
            style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13 }}
          >
            Logga ut
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
            <button
              onClick={() => setShowAddChild(true)}
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
              + Barn
            </button>
          </div>
        </div>

        {err && <p style={{ color: C.red, fontSize: 13 }}>{err}</p>}

        {perspective.kind === "parent" ? (
          <ParentDashboard
            children={children}
            missions={missions}
            pendingCount={pendingCount}
            onAddChild={() => setShowAddChild(true)}
            onCreateMission={() => setShowCreateMission(true)}
            onOpenWallet={(c) => nav(`/wallet/${c.id}`)}
            onOpenApprove={() => nav(`/approve`)}
            onOpenLeaderboard={() => nav(`/leaderboard`)}
            loading={loading}
          />
        ) : activeChild ? (
          <ChildView child={activeChild} familyId={familyId} onOpenWallet={() => nav(`/wallet/${activeChild.id}`)} />
        ) : null}

        {showAddChild && (
          <AddChildSheet
            familyId={familyId}
            onClose={() => setShowAddChild(false)}
            onSaved={(c) => {
              setChildren((cs) => [...cs, c]);
              setShowAddChild(false);
            }}
          />
        )}

        {showCreateMission && profileEntry && (
          <CreateMissionSheet
            familyId={familyId}
            userId={user!.id}
            multiplier={profileEntry.uppdrag_multiplier}
            onClose={() => setShowCreateMission(false)}
            onCreated={(m) => {
              setMissions((ms) => [m, ...ms]);
              setShowCreateMission(false);
            }}
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
  onAddChild,
  onCreateMission,
  onOpenWallet,
  onOpenApprove,
  onOpenLeaderboard,
  loading
}: {
  children: ChildProfile[];
  missions: Mission[];
  pendingCount: number;
  onAddChild: () => void;
  onCreateMission: () => void;
  onOpenWallet: (c: ChildProfile) => void;
  onOpenApprove: () => void;
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
          <h3 style={{ margin: 0, flex: 1 }}>Att granska</h3>
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

      <Kort>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ margin: 0, flex: 1 }}>Aktiva uppdrag</h3>
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
          <div style={{ display: "grid", gap: 6 }}>
            {missions.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center" }}>
                <span style={{ flex: 1 }}>{m.title}</span>
                <Pill text={`${m.reward_mynt} 🪙`} tint={C.gold} />
              </div>
            ))}
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
    </div>
  );
}
