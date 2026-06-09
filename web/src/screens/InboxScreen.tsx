import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import type {
  ChildProfile,
  Mission,
  MissionSubmission,
  Redemption
} from "../lib/types";
import { labelForApp } from "../lib/apps";
import { C } from "../design/tokens";
import { Kort, Pill, Knapp, ScreenContainer } from "../design/components";
import { Avatar } from "../design/Avatar";
import { BackButton } from "../design/BackButton";
import { playPop, playReject } from "../design/sounds";

type Item =
  | {
      kind: "mission";
      id: string;
      submission: MissionSubmission;
      mission: Mission;
      child: ChildProfile;
      photoUrl: string | null;
    }
  | {
      kind: "redemption";
      id: string;
      redemption: Redemption;
      child: ChildProfile;
    };

export function InboxScreen() {
  const { familyId } = useSession();
  const nav = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function reload() {
    if (!familyId) return;
    setLoading(true);
    setErr(null);
    try {
      const [subsRes, redsRes, mRes, cRes] = await Promise.all([
        supabase
          .from("mission_submissions")
          .select("*")
          .eq("family_id", familyId)
          .eq("status", "pending")
          .order("submitted_at"),
        supabase
          .from("redemptions")
          .select("*")
          .eq("family_id", familyId)
          .eq("status", "pending")
          .order("started_at"),
        supabase.from("missions").select("*").eq("family_id", familyId),
        supabase
          .from("child_profiles")
          .select(
            "id, family_id, nickname, avatar_emoji, avatar_photo, age_band, gender, global_leaderboard_opt_in, daily_limit_minutes_override, email, auth_user_id"
          )
          .eq("family_id", familyId)
      ]);
      if (subsRes.error) throw subsRes.error;
      if (redsRes.error) throw redsRes.error;
      if (mRes.error) throw mRes.error;
      if (cRes.error) throw cRes.error;

      const missions = new Map((mRes.data as Mission[]).map((m) => [m.id, m]));
      const children = new Map((cRes.data as ChildProfile[]).map((c) => [c.id, c]));

      const next: Item[] = [];
      for (const s of (subsRes.data ?? []) as MissionSubmission[]) {
        const m = missions.get(s.mission_id);
        const c = children.get(s.child_id);
        if (m && c) {
          next.push({
            kind: "mission",
            id: `mission:${s.id}`,
            submission: s,
            mission: m,
            child: c,
            photoUrl: s.photo_data
          });
        }
      }
      for (const r of (redsRes.data ?? []) as Redemption[]) {
        const c = children.get(r.child_id);
        if (c) {
          next.push({
            kind: "redemption",
            id: `redemption:${r.id}`,
            redemption: r,
            child: c
          });
        }
      }
      next.sort((a, b) => itemDate(a).getTime() - itemDate(b).getTime());
      setItems(next);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [familyId]);

  // Realtime: refresh on any pending change so the inbox is live.
  useEffect(() => {
    if (!familyId) return;
    const channels = [
      supabase
        .channel(`inbox-subs-${familyId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "mission_submissions", filter: `family_id=eq.${familyId}` },
          () => void reload()
        )
        .subscribe(),
      supabase
        .channel(`inbox-reds-${familyId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "redemptions", filter: `family_id=eq.${familyId}` },
          () => void reload()
        )
        .subscribe()
    ];
    return () => {
      for (const ch of channels) void supabase.removeChannel(ch);
    };
  }, [familyId]);

  async function reviewItem(item: Item, action: "approve" | "reject"): Promise<void> {
    if (item.kind === "mission") {
      const noteText = (notes[item.id] ?? "").trim();
      const { error } = await supabase.rpc("approve_mission", {
        p_submission_id: item.submission.id,
        p_action: action,
        p_note: noteText.length > 0 ? noteText : null
      });
      if (error) throw error;
    } else {
      const { error } = await supabase.rpc("review_redemption", {
        p_redemption_id: item.redemption.id,
        p_action: action
      });
      if (error) throw error;
    }
  }

  async function reviewOne(item: Item, action: "approve" | "reject") {
    setErr(null);
    try {
      await reviewItem(item, action);
      if (action === "approve") playPop();
      else playReject();
      setItems((xs) => xs.filter((x) => x.id !== item.id));
      setNotes((n) => {
        const { [item.id]: _drop, ...rest } = n;
        return rest;
      });
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function approveAll() {
    if (busy || items.length === 0) return;
    if (!window.confirm(`Godkänn alla ${items.length} väntande?`)) return;
    setBusy(true);
    setErr(null);
    let ok = 0;
    const remaining: Item[] = [];
    for (const item of items) {
      try {
        await reviewItem(item, "approve");
        ok++;
      } catch (e) {
        remaining.push(item);
        setErr((e as Error).message);
      }
    }
    if (ok > 0) playPop();
    setItems(remaining);
    setBusy(false);
  }

  const groups = useMemo(() => {
    const byChild = new Map<string, { child: ChildProfile; items: Item[] }>();
    for (const it of items) {
      const cid = it.kind === "mission" ? it.submission.child_id : it.redemption.child_id;
      const existing = byChild.get(cid);
      if (existing) existing.items.push(it);
      else byChild.set(cid, { child: it.child, items: [it] });
    }
    return Array.from(byChild.values());
  }, [items]);

  return (
    <ScreenContainer>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <BackButton onClick={() => nav("/")} />
          <h2 style={{ margin: 0, flex: 1 }}>Att granska</h2>
          {items.length > 0 && <Pill text={String(items.length)} tint={C.purple} />}
        </div>

        {loading && <p style={{ color: C.muted, fontSize: 13 }}>Laddar…</p>}
        {!loading && items.length === 0 && (
          <Kort>
            <p style={{ color: C.muted, fontSize: 13, margin: 0, textAlign: "center" }}>
              🎉 Inboxen är tom. Inget väntar.
            </p>
          </Kort>
        )}

        {items.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <Knapp
              title={busy ? "Godkänner…" : `✓ Godkänn alla (${items.length})`}
              onClick={approveAll}
              disabled={busy}
            />
          </div>
        )}

        <div style={{ display: "grid", gap: 14 }}>
          {groups.map(({ child, items: groupItems }) => (
            <div key={child.id} style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar child={child} size={28} />
                <strong style={{ fontSize: 15 }}>{child.nickname}</strong>
                <Pill text={String(groupItems.length)} tint={C.muted} />
              </div>
              {groupItems.map((it) => (
                <Kort key={it.id}>
                  {it.kind === "mission" ? (
                    <MissionItemBody
                      item={it}
                      note={notes[it.id] ?? ""}
                      onNote={(v) => setNotes((n) => ({ ...n, [it.id]: v }))}
                      onAction={(a) => void reviewOne(it, a)}
                    />
                  ) : (
                    <RedemptionItemBody item={it} onAction={(a) => void reviewOne(it, a)} />
                  )}
                </Kort>
              ))}
            </div>
          ))}
        </div>

        {err && <p style={{ color: C.red, fontSize: 13, marginTop: 12 }}>{err}</p>}
      </div>
    </ScreenContainer>
  );
}

function MissionItemBody({
  item,
  note,
  onNote,
  onAction
}: {
  item: Extract<Item, { kind: "mission" }>;
  note: string;
  onNote: (v: string) => void;
  onAction: (a: "approve" | "reject") => void;
}) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 22 }}>🎯</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>UPPDRAG</div>
          <div style={{ fontWeight: 700 }}>{item.mission.title}</div>
        </div>
        <Pill text={`${item.mission.reward_mynt} 🪙`} tint={C.gold} />
      </div>
      {item.mission.description && (
        <p style={{ color: C.muted, fontSize: 12, margin: "0 0 10px" }}>
          {item.mission.description}
        </p>
      )}
      {item.photoUrl && (
        <a
          href={item.photoUrl}
          target="_blank"
          rel="noreferrer"
          style={{ display: "block", marginBottom: 10 }}
        >
          <img
            src={item.photoUrl}
            alt={`Bevis från ${item.child.nickname}`}
            style={{
              width: "100%",
              maxHeight: 240,
              objectFit: "cover",
              borderRadius: 12,
              border: `1px solid ${C.border}`
            }}
          />
        </a>
      )}
      {item.submission.child_note && (
        <div
          style={{
            background: C.surfaceHov,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "8px 10px",
            color: C.text,
            fontSize: 13,
            margin: "0 0 10px",
            whiteSpace: "pre-wrap"
          }}
        >
          <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 2 }}>
            Hälsning från {item.child.nickname}
          </div>
          {item.submission.child_note}
        </div>
      )}
      <textarea
        value={note}
        onChange={(e) => onNote(e.target.value)}
        placeholder="Skriv en kommentar (frivilligt)"
        maxLength={500}
        rows={2}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "8px 10px",
          color: C.text,
          fontSize: 13,
          fontFamily: "inherit",
          resize: "vertical",
          marginBottom: 10
        }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <Knapp title="Avvisa" style="secondary" onClick={() => onAction("reject")} />
        <Knapp title="Godkänn" onClick={() => onAction("approve")} />
      </div>
    </>
  );
}

function RedemptionItemBody({
  item,
  onAction
}: {
  item: Extract<Item, { kind: "redemption" }>;
  onAction: (a: "approve" | "reject") => void;
}) {
  const r = item.redemption;
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 22 }}>{r.kind === "cash_payout" ? "💰" : "⏱"}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>BEGÄRAN</div>
          <div style={{ fontWeight: 700 }}>
            {r.kind === "cash_payout" ? "Växla mynt till pengar" : `${r.minutes} min skärmtid`}
          </div>
        </div>
        <Pill text={`${r.mynt_cost} 🪙`} tint={C.gold} />
      </div>
      {(r.requested_apps?.length || r.other_app) && (
        <div
          style={{
            background: C.surfaceHov,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "8px 10px",
            marginBottom: 10
          }}
        >
          <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
            Vill använda till
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(r.requested_apps ?? []).map((appId) => {
              const a = labelForApp(appId);
              return <Pill key={appId} text={a.label} icon={a.icon} tint={C.purple} />;
            })}
            {r.other_app && <Pill text={r.other_app} icon="📦" tint={C.purple} />}
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <Knapp title="Avslå" style="secondary" onClick={() => onAction("reject")} />
        <Knapp title="Godkänn" onClick={() => onAction("approve")} />
      </div>
    </>
  );
}

function itemDate(it: Item): Date {
  if (it.kind === "mission") return new Date(it.submission.submitted_at);
  return new Date(it.redemption.started_at);
}
