import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { SavingsGoal } from "../lib/types";
import { C } from "../design/tokens";
import { Kort, Knapp, Input } from "../design/components";
import { Sheet } from "./Sheet";

const EMOJIS = ["🎯", "🚲", "🎮", "📱", "⚽", "🎁", "🏖️", "🎵"];

export function CreateSavingsGoalSheet({
  familyId,
  childId,
  onClose,
  onSaved
}: {
  familyId: string;
  childId: string;
  onClose: () => void;
  onSaved: (g: SavingsGoal) => void;
}) {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState(100);
  const [emoji, setEmoji] = useState("🎯");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = !saving && title.trim().length >= 1 && target > 0;

  async function save() {
    if (!canSubmit) return;
    setSaving(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("savings_goals")
        .insert({
          family_id: familyId,
          child_id: childId,
          title: title.trim(),
          target_mynt: target,
          emoji
        })
        .select()
        .single();
      if (error) throw error;
      onSaved(data as SavingsGoal);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title="Nytt sparmål" onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>
        <Kort>
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 4 }}>
                Vad sparar barnet till?
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="T.ex. Ny cykel"
                maxLength={100}
                autoFocus
              />
            </div>
            <div>
              <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 4 }}>
                Målbelopp (mynt)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => setTarget((t) => Math.max(5, t - 25))}
                  style={stepBtn}
                >
                  −25
                </button>
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    color: C.gold,
                    fontWeight: 700,
                    fontSize: 22
                  }}
                >
                  {target} 🪙
                </div>
                <button onClick={() => setTarget((t) => t + 25)} style={stepBtn}>
                  +25
                </button>
              </div>
            </div>
            <div>
              <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 6 }}>
                Ikon
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    style={{
                      padding: 8,
                      fontSize: 22,
                      background: emoji === e ? `${C.gold}22` : C.surfaceHov,
                      border: `${emoji === e ? 2 : 1}px solid ${emoji === e ? C.gold : C.border}`,
                      borderRadius: 10,
                      cursor: "pointer"
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Kort>

        {err && <p style={{ color: C.red, fontSize: 13, margin: 0 }}>{err}</p>}

        <Knapp
          title={saving ? "Sparar…" : "Skapa sparmål"}
          onClick={save}
          disabled={!canSubmit}
        />
      </div>
    </Sheet>
  );
}

const stepBtn: React.CSSProperties = {
  padding: "8px 14px",
  background: C.surfaceHov,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  color: C.text,
  cursor: "pointer",
  minWidth: 56
};
