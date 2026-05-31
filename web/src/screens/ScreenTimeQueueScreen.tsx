import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import type { ChildProfile, Redemption } from "../lib/types";
import { labelForApp } from "../lib/apps";
import { C } from "../design/tokens";
import { Kort, Pill, Knapp, ScreenContainer } from "../design/components";
import { Avatar } from "../design/Avatar";

interface QueueItem {
  redemption: Redemption;
  child: ChildProfile;
}

export function ScreenTimeQueueScreen() {
  const { familyId } = useSession();
  const nav = useNavigate();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  async function reload() {
    if (!familyId) return;
    setLoading(true);
    setErr(null);
    try {
      const [rRes, cRes] = await Promise.all([
        supabase
          .from("redemptions")
          .select("*")
          .eq("family_id", familyId)
          .eq("status", "pending")
          .order("started_at"),
        supabase.from("child_profiles").select("*").eq("family_id", familyId)
      ]);
      if (rRes.error) throw rRes.error;
      if (cRes.error) throw cRes.error;

      const children = new Map((cRes.data as ChildProfile[]).map((c) => [c.id, c]));
      const list: QueueItem[] = [];
      for (const r of rRes.data as Redemption[]) {
        const child = children.get(r.child_id);
        if (child) list.push({ redemption: r, child });
      }
      setItems(list);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [familyId]);

  async function review(item: QueueItem, action: "approve" | "reject") {
    setErr(null);
    setLastResult(null);
    try {
      const { error } = await supabase.rpc("review_redemption", {
        p_redemption_id: item.redemption.id,
        p_action: action
      });
      if (error) throw error;
      setItems((xs) => xs.filter((x) => x.redemption.id !== item.redemption.id));
      setLastResult(
        action === "approve"
          ? item.redemption.kind === "cash_payout"
            ? `${item.redemption.mynt_cost} 🪙 godkänt att växla.`
            : `${item.redemption.minutes} min godkänt.`
          : `Avslaget — ${item.redemption.mynt_cost} 🪙 återbetalda.`
      );
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <ScreenContainer>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <button
          onClick={() => nav("/")}
          style={{
            background: "none",
            border: "none",
            color: C.muted,
            cursor: "pointer",
            marginBottom: 8
          }}
        >
          ‹ Tillbaka
        </button>
        <h2 style={{ margin: "0 0 12px" }}>Begäran</h2>

        {loading && <p style={{ color: C.muted, fontSize: 13 }}>Laddar…</p>}
        {!loading && items.length === 0 && (
          <Kort>
            <p style={{ color: C.muted, fontSize: 13, margin: 0, textAlign: "center" }}>
              Inga öppna begäran just nu.
            </p>
          </Kort>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          {items.map((it) => (
            <Kort key={it.redemption.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Avatar child={it.child} size={30} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: C.muted }}>{it.child.nickname}</div>
                  <div style={{ fontWeight: 700 }}>
                    {it.redemption.kind === "cash_payout"
                      ? "Växla mynt till pengar"
                      : `${it.redemption.minutes} min skärmtid`}
                  </div>
                </div>
                <Pill text={`${it.redemption.mynt_cost} 🪙`} tint={C.gold} />
              </div>

              {(it.redemption.requested_apps?.length || it.redemption.other_app) && (
                <div
                  style={{
                    background: C.surfaceHov,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: "8px 10px",
                    marginBottom: 10
                  }}
                >
                  <div
                    style={{ color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 6 }}
                  >
                    Vill använda till
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(it.redemption.requested_apps ?? []).map((appId) => {
                      const a = labelForApp(appId);
                      return (
                        <Pill key={appId} text={a.label} icon={a.icon} tint={C.purple} />
                      );
                    })}
                    {it.redemption.other_app && (
                      <Pill text={it.redemption.other_app} icon="📦" tint={C.purple} />
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <Knapp title="Avslå" style="secondary" onClick={() => review(it, "reject")} />
                <Knapp title="Godkänn" onClick={() => review(it, "approve")} />
              </div>
            </Kort>
          ))}
        </div>

        {lastResult && (
          <p style={{ color: C.green, fontSize: 13, marginTop: 12 }}>{lastResult}</p>
        )}
        {err && <p style={{ color: C.red, fontSize: 13, marginTop: 12 }}>{err}</p>}
      </div>
    </ScreenContainer>
  );
}
