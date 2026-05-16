import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { ChildProfile, Mission } from "../lib/types";
import { C } from "../design/tokens";
import { Kort, Pill } from "../design/components";

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
  const [missions, setMissions] = useState<Mission[]>([]);
  const [submittedToday, setSubmittedToday] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setErr(null);
    try {
      const [mRes, sRes] = await Promise.all([
        supabase
          .from("missions")
          .select("*")
          .eq("family_id", familyId)
          .eq("active", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("mission_submissions")
          .select("mission_id")
          .eq("child_id", child.id)
          .gte("submitted_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      ]);
      if (mRes.error) throw mRes.error;
      if (sRes.error) throw sRes.error;
      setMissions((mRes.data ?? []) as Mission[]);
      setSubmittedToday(new Set((sRes.data ?? []).map((r: any) => r.mission_id)));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [child.id]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <button
        onClick={onOpenWallet}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: C.text
        }}
      >
        <Kort>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 36 }}>{child.avatar_emoji}</span>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ color: C.muted, fontSize: 12 }}>Min plånbok</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{child.nickname}</div>
            </div>
            <span style={{ color: C.muted }}>›</span>
          </div>
        </Kort>
      </button>

      <div>
        <h3 style={{ margin: "4px 0 8px", color: C.text }}>Dagens uppdrag</h3>
        {loading && <p style={{ color: C.muted, fontSize: 13 }}>Laddar…</p>}
        {!loading && missions.length === 0 && (
          <Kort>
            <p style={{ color: C.muted, fontSize: 13, margin: 0, textAlign: "center" }}>
              Inga uppdrag idag. Be en förälder skapa ett!
            </p>
          </Kort>
        )}
        <div style={{ display: "grid", gap: 8 }}>
          {missions.map((m) => {
            const done = submittedToday.has(m.id);
            return (
              <button
                key={m.id}
                onClick={() => nav(`/child/${child.id}/mission/${m.id}`)}
                style={{
                  textAlign: "left",
                  padding: 14,
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  cursor: "pointer",
                  color: C.text,
                  opacity: done ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 12
                }}
              >
                <span style={{ fontSize: 24 }}>🎯</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{m.title}</div>
                  {m.description && <div style={{ fontSize: 12, color: C.muted }}>{m.description}</div>}
                </div>
                <Pill text={`${m.reward_mynt} 🪙`} tint={C.gold} />
                {done && <Pill text="Inskickat" icon="⏳" tint={C.purple} />}
              </button>
            );
          })}
        </div>
      </div>

      {err && <p style={{ color: C.red, fontSize: 13 }}>{err}</p>}
    </div>
  );
}
