import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import type { ChildProfile } from "../lib/types";
import { ChildView } from "./ChildView";
import { CK } from "../design/tokens";
import { ChildScreenContainer, KnappKid } from "../design/components";

export function ChildHomeScreen({ childId }: { childId: string }) {
  const { familyId, signOut } = useSession();
  const nav = useNavigate();
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from("child_profiles")
        .select("*")
        .eq("id", childId)
        .single();
      if (error) setErr(error.message);
      else setChild(data as ChildProfile);
    })();
  }, [childId]);

  if (err) {
    return (
      <ChildScreenContainer>
        <KnappKid title="Logga ut" onClick={signOut} />
        <p style={{ color: CK.red, textAlign: "center", marginTop: 16 }}>{err}</p>
      </ChildScreenContainer>
    );
  }

  if (!child || !familyId) {
    return (
      <ChildScreenContainer>
        <p style={{ color: CK.muted, textAlign: "center", marginTop: 80 }}>Laddar…</p>
      </ChildScreenContainer>
    );
  }

  return (
    <ChildScreenContainer>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "6px 4px 14px",
            marginBottom: 8,
            gap: 10
          }}
        >
          <span style={{ fontSize: 30 }}>{child.avatar_emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: CK.text }}>
              Hej {child.nickname}!
            </div>
            <div style={{ color: CK.textSoft, fontSize: 12 }}>Dagens uppdrag väntar.</div>
          </div>
          <button
            onClick={() => nav(`/wallet/${child.id}`)}
            style={{
              background: CK.surface,
              border: `1px solid ${CK.border}`,
              borderRadius: 999,
              padding: "8px 14px",
              color: CK.gold,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              boxShadow: CK.shadowSoft,
              display: "flex",
              alignItems: "center",
              gap: 4
            }}
          >
            🪙 Plånbok
          </button>
          <button
            onClick={signOut}
            style={{
              background: "none",
              border: "none",
              color: CK.muted,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600
            }}
          >
            Logga ut
          </button>
        </div>

        <ChildView child={child} familyId={familyId} onOpenWallet={() => nav(`/wallet/${child.id}`)} />
      </div>
    </ChildScreenContainer>
  );
}
