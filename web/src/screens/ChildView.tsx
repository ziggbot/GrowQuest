import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import type { ChildProfile, Mission } from "../lib/types";
import { CK } from "../design/tokens";
import { KortKid, PillKid } from "../design/components";

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
    </div>
  );

  // When the parent previews the child's perspective from the parent dashboard,
  // wrap the bright child UI in a soft sky→cream frame so the theme contrast is
  // intentional rather than broken-looking against the dark parent shell.
  if (isParentPreview) {
    return (
      <div
        style={{
          background: `linear-gradient(180deg, ${CK.bgGradTop} 0%, ${CK.bgGradMid} 55%, ${CK.bgGradBot} 100%)`,
          borderRadius: 22,
          padding: 14,
          boxShadow: CK.shadow
        }}
      >
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
