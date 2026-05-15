import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { ChildProfile } from "../lib/types";
import { estimateScreenTimeCost } from "../lib/templates";
import { C } from "../design/tokens";
import { Kort, Knapp } from "../design/components";
import { Sheet } from "./Sheet";

const OPTIONS = [15, 30, 60];

export function RedeemSheet({
  child,
  multiplier,
  dailyLimit,
  usedToday,
  onClose,
  onRedeemed
}: {
  child: ChildProfile;
  multiplier: number;
  dailyLimit: number;
  usedToday: number;
  onClose: () => void;
  onRedeemed: () => void;
}) {
  const [minutes, setMinutes] = useState(30);
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cost = estimateScreenTimeCost(minutes, multiplier);
  const leftToday = Math.max(0, dailyLimit - usedToday);
  const fitsLimit = minutes <= leftToday;

  async function redeem() {
    if (!fitsLimit) return;
    setWorking(true);
    setErr(null);
    try {
      const { error } = await supabase.rpc("redeem_screen_time", {
        p_child_id: child.id,
        p_minutes: minutes
      });
      if (error) throw error;
      onRedeemed();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <Sheet title="Lös in mynt" onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>
        <Kort>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, color: C.muted }}>
              {child.avatar_emoji} {child.nickname} väljer hur länge.
            </div>
          </div>
        </Kort>

        <Kort>
          <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 8 }}>Hur länge?</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {OPTIONS.map((opt) => {
              const isOn = minutes === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setMinutes(opt)}
                  style={{
                    padding: 14,
                    background: isOn ? `${C.purple}33` : C.surfaceHov,
                    border: `${isOn ? 2 : 1}px solid ${isOn ? C.purple : C.border}`,
                    borderRadius: 12,
                    cursor: "pointer",
                    color: isOn ? C.purple : C.text,
                    fontWeight: 700
                  }}
                >
                  <div style={{ fontSize: 22 }}>{opt}</div>
                  <div style={{ fontSize: 11 }}>min</div>
                </button>
              );
            })}
          </div>
        </Kort>

        <Kort>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: C.muted }}>Kostnad</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: C.gold }}>{cost} 🪙</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Kvar idag: {leftToday} min</div>
          </div>
        </Kort>

        {!fitsLimit && (
          <p style={{ color: C.red, fontSize: 13, margin: 0 }}>
            Den valda tiden överskrider dagens gräns.
          </p>
        )}
        {err && <p style={{ color: C.red, fontSize: 13, margin: 0 }}>{err}</p>}

        <Knapp
          title={working ? "Löser in…" : "Lös in"}
          onClick={redeem}
          disabled={working || !fitsLimit}
        />
      </div>
    </Sheet>
  );
}
