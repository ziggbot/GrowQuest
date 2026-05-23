import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { ChildProfile } from "../lib/types";
import { C } from "../design/tokens";
import { Kort, Knapp } from "../design/components";
import { Sheet } from "./Sheet";

const QUICK_AMOUNTS = [10, 25, 50, 100];

export function CashRedeemSheet({
  child,
  balance,
  onClose,
  onRedeemed
}: {
  child: ChildProfile;
  balance: number;
  onClose: () => void;
  onRedeemed: () => void;
}) {
  const [amount, setAmount] = useState(25);
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = !working && amount > 0 && amount <= balance;

  async function submit() {
    if (!canSubmit) return;
    setWorking(true);
    setErr(null);
    try {
      const { error } = await supabase.rpc("redeem_cash", {
        p_child_id: child.id,
        p_mynt_amount: amount
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
    <Sheet title="Växla mynt till pengar" onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>
        <Kort>
          <div style={{ textAlign: "center", color: C.muted, fontSize: 14 }}>
            {child.avatar_emoji} {child.nickname} begär att växla mynt.
          </div>
        </Kort>

        <Kort>
          <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 8 }}>
            Hur många mynt?
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {QUICK_AMOUNTS.map((q) => {
              const isOn = amount === q;
              return (
                <button
                  key={q}
                  onClick={() => setAmount(q)}
                  style={{
                    padding: 14,
                    background: isOn ? `${C.gold}33` : C.surfaceHov,
                    border: `${isOn ? 2 : 1}px solid ${isOn ? C.gold : C.border}`,
                    borderRadius: 12,
                    cursor: "pointer",
                    color: isOn ? C.gold : C.text,
                    fontWeight: 700,
                    fontSize: 18
                  }}
                >
                  {q}
                </button>
              );
            })}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 12
            }}
          >
            <input
              type="number"
              min={1}
              max={balance}
              value={amount}
              onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
              style={{
                flex: 1,
                padding: "10px 12px",
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                color: C.text,
                fontSize: 16,
                fontWeight: 700,
                fontFamily: "inherit",
                textAlign: "center"
              }}
            />
            <span style={{ color: C.gold, fontWeight: 700 }}>🪙</span>
          </div>
        </Kort>

        <Kort>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: C.muted }}>Begäran skickas till föräldern</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: C.gold, marginTop: 4 }}>
              {amount} 🪙
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
              Saldo: {balance} 🪙 — mynten dras direkt, återbetalas vid avslag.
            </div>
          </div>
        </Kort>

        {amount > balance && (
          <p style={{ color: C.red, fontSize: 13, margin: 0 }}>Du har inte tillräckligt med mynt.</p>
        )}
        {err && <p style={{ color: C.red, fontSize: 13, margin: 0 }}>{err}</p>}

        <Knapp
          title={working ? "Skickar…" : "Skicka begäran"}
          onClick={submit}
          disabled={!canSubmit}
        />
      </div>
    </Sheet>
  );
}
