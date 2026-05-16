import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import type { ChildProfile } from "../lib/types";
import { ChildView } from "./ChildView";
import { C } from "../design/tokens";
import { Knapp, ScreenContainer } from "../design/components";

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
      <ScreenContainer>
        <Knapp title="Logga ut" onClick={signOut} />
        <p style={{ color: C.red, textAlign: "center", marginTop: 16 }}>{err}</p>
      </ScreenContainer>
    );
  }

  if (!child || !familyId) {
    return (
      <ScreenContainer>
        <p style={{ color: C.muted, textAlign: "center", marginTop: 80 }}>Laddar…</p>
      </ScreenContainer>
    );
  }

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
          <span style={{ fontSize: 28 }}>{child.avatar_emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Hej {child.nickname}!</div>
            <div style={{ color: C.muted, fontSize: 11 }}>Dagens uppdrag väntar.</div>
          </div>
          <button
            onClick={() => nav(`/wallet/${child.id}`)}
            style={{
              background: C.surfaceHov,
              border: `1px solid ${C.border}`,
              borderRadius: 999,
              padding: "6px 12px",
              color: C.gold,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 4
            }}
          >
            🪙 Plånbok
          </button>
          <button
            onClick={signOut}
            style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13 }}
          >
            Logga ut
          </button>
        </div>

        <ChildView child={child} familyId={familyId} onOpenWallet={() => nav(`/wallet/${child.id}`)} />
      </div>
    </ScreenContainer>
  );
}
