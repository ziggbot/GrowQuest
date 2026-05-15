import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { ProfileConfig } from "../lib/types";
import { PROFILER } from "../lib/profiler";
import { C } from "../design/tokens";
import { Knapp, ScreenContainer } from "../design/components";

export function ProfilePickerScreen({
  familyId,
  onSaved
}: {
  familyId: string;
  onSaved: (p: ProfileConfig) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => setErr(null), [selected]);

  async function save() {
    if (!selected) return;
    const entry = PROFILER.find((p) => p.id === selected);
    if (!entry) return;
    setSaving(true);
    setErr(null);
    try {
      const row = {
        family_id: familyId,
        profile_id: entry.id,
        uppdrag_multiplier: entry.uppdrag_multiplier,
        screen_time_multiplier: entry.screen_time_multiplier,
        daily_limit_minutes: entry.daily_limit_minutes
      };
      const { error } = await supabase
        .from("profile_configs")
        .upsert(row, { onConflict: "family_id" });
      if (error) throw error;
      onSaved(row as ProfileConfig);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <h2 style={{ color: C.text, fontSize: 26, margin: "8px 0 4px", fontWeight: 800 }}>
          Välj din profil
        </h2>
        <p style={{ color: C.muted, fontSize: 13, margin: "0 0 16px" }}>
          Du kan ändra detta när som helst i inställningarna.
        </p>

        <div style={{ display: "grid", gap: 12 }}>
          {PROFILER.map((p) => {
            const isOn = selected === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                style={{
                  textAlign: "left",
                  padding: 16,
                  background: `${p.färg}1a`,
                  border: `${isOn ? 2 : 1}px solid ${isOn ? p.färg : C.border}`,
                  borderRadius: 18,
                  cursor: "pointer",
                  color: C.text
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 28 }}>{p.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: p.färg, fontWeight: 800, fontSize: 18 }}>{p.namn}</div>
                    <div style={{ color: C.muted, fontSize: 12 }}>{p.tagline}</div>
                  </div>
                  {isOn && <div style={{ color: p.färg, fontSize: 20 }}>✓</div>}
                </div>
                <p style={{ fontSize: 13, margin: "10px 0 8px", lineHeight: 1.4 }}>{p.beskrivning}</p>
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, display: "grid", gap: 4, fontSize: 12 }}>
                  <Row label="Uppdrag" value={p.exempelUppdrag} />
                  <Row label="Skärmtid" value={p.exempelSkärmtid} />
                  <Row label="Dagsgräns" value={p.exempelDagsgräns} />
                </div>
              </button>
            );
          })}
        </div>

        {err && <p style={{ color: C.red, fontSize: 13, marginTop: 12 }}>{err}</p>}

        <div style={{ marginTop: 16 }}>
          <Knapp
            title={saving ? "Sparar…" : "Bekräfta"}
            onClick={save}
            disabled={!selected || saving}
          />
        </div>
      </div>
    </ScreenContainer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: C.muted }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
