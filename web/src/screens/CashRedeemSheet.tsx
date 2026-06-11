import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { ChildProfile, SavingsGoal } from "../lib/types";
import { C } from "../design/tokens";
import { Kort, Knapp } from "../design/components";
import { Sheet } from "./Sheet";

const QUICK_AMOUNTS = [10, 25, 50, 100];

export function CashRedeemSheet({
  child,
  balance,
  goals = [],
  onClose,
  onRedeemed
}: {
  child: ChildProfile;
  balance: number;
  goals?: (SavingsGoal & { saved: number })[];
  onClose: () => void;
  onRedeemed: () => void;
}) {
  const [amount, setAmount] = useState(25);
  // null = parent payout, otherwise the savings goal to deposit into.
  const [targetGoalId, setTargetGoalId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = !working && amount > 0 && amount <= balance;
  const targetGoal = goals.find((g) => g.id === targetGoalId) ?? null;

  async function submit() {
    if (!canSubmit) return;
    setWorking(true);
    setErr(null);
    try {
      const { error } = await supabase.rpc("redeem_cash", {
        p_child_id: child.id,
        p_mynt_amount: amount,
        p_goal_id: targetGoalId
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
            Bra jobbat, {child.nickname}! Välj vart pengarna ska gå.
          </div>
        </Kort>

        <Kort>
          <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 8 }}>
            Vart ska mynten?
          </label>
          <div style={{ display: "grid", gap: 8 }}>
            <button
              type="button"
              onClick={() => setTargetGoalId(null)}
              style={{
                padding: "10px 12px",
                background: targetGoalId === null ? `${C.gold}22` : C.surfaceHov,
                border: `${targetGoalId === null ? 2 : 1}px solid ${
                  targetGoalId === null ? C.gold : C.border
                }`,
                borderRadius: 12,
                cursor: "pointer",
                color: C.text,
                fontWeight: 700,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 8,
                textAlign: "left"
              }}
            >
              <span style={{ fontSize: 20 }}>💵</span>
              <div style={{ flex: 1 }}>
                <div>Pengar från föräldern</div>
                <div style={{ color: C.muted, fontSize: 11, fontWeight: 400 }}>
                  Föräldern godkänner och betalar ut
                </div>
              </div>
            </button>
            {goals.map((g) => {
              const isOn = targetGoalId === g.id;
              const room = g.target_mynt - g.saved;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setTargetGoalId(g.id)}
                  style={{
                    padding: "10px 12px",
                    background: isOn ? `${C.gold}22` : C.surfaceHov,
                    border: `${isOn ? 2 : 1}px solid ${isOn ? C.gold : C.border}`,
                    borderRadius: 12,
                    cursor: "pointer",
                    color: C.text,
                    fontWeight: 700,
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    textAlign: "left"
                  }}
                >
                  <span style={{ fontSize: 20 }}>{g.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div>{g.title}</div>
                    <div style={{ color: C.muted, fontSize: 11, fontWeight: 400 }}>
                      {g.saved}/{g.target_mynt} 🪙 — {room} kvar till målet
                    </div>
                  </div>
                </button>
              );
            })}
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
            <div style={{ fontSize: 11, color: C.muted }}>
              {targetGoal
                ? `Sparas direkt i "${targetGoal.title}"`
                : "Begäran skickas till föräldern"}
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: C.gold, marginTop: 4 }}>
              {amount} 🪙
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
              {targetGoal
                ? `Saldo: ${balance} 🪙 — mynten flyttas till sparmålet på en gång.`
                : `Saldo: ${balance} 🪙 — mynten dras direkt, om föräldern säger nej får du tillbaka dem.`}
            </div>
          </div>
        </Kort>

        {amount > balance && (
          <p style={{ color: C.red, fontSize: 13, margin: 0 }}>Du har inte tillräckligt med mynt.</p>
        )}
        {err && <p style={{ color: C.red, fontSize: 13, margin: 0 }}>{err}</p>}

        <Knapp
          title={
            working
              ? "Skickar…"
              : targetGoal
              ? `Spara mot ${targetGoal.emoji} ${targetGoal.title}`
              : "Skicka begäran"
          }
          onClick={submit}
          disabled={!canSubmit}
        />
      </div>
    </Sheet>
  );
}
