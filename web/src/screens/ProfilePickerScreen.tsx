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
        {/* Welcome / positioning */}
        <div
          style={{
            background: `linear-gradient(135deg, ${C.gold}22, ${C.green}1f)`,
            border: `1px solid ${C.gold}55`,
            borderRadius: 18,
            padding: 18,
            marginBottom: 18
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 6 }}>🌳</div>
          <h2 style={{ color: C.text, fontSize: 22, margin: "0 0 6px", fontWeight: 800 }}>
            Välkommen till GrowQuest
          </h2>
          <p style={{ color: C.text, fontSize: 14, margin: "0 0 8px", lineHeight: 1.5 }}>
            GrowQuest är <strong>inte</strong> en app som stoppar skärmtid. Det är en app som
            gör att barn vill <strong>röra på sig, hjälpa till och skapa</strong> innan de
            sätter sig med skärmen.
          </p>
          <p style={{ color: C.muted, fontSize: 13, margin: 0, lineHeight: 1.4 }}>
            Barnet förtjänar mynt genom uppdrag. 1 mynt = 1 minut skärmtid. Föräldern
            bestämmer reglerna; barnet bygger vanor.
          </p>
        </div>

        <h3 style={{ color: C.text, fontSize: 18, margin: "8px 0 4px", fontWeight: 800 }}>
          Välj din familjs profil
        </h3>
        <p style={{ color: C.muted, fontSize: 12, margin: "0 0 14px" }}>
          Styr hur generös ekonomin är. Allt går att finjustera senare i Inställningar.
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
