import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { ProfileConfig } from "../lib/types";
import { PROFILER } from "../lib/profiler";
import { C } from "../design/tokens";
import { Kort, Knapp, ScreenContainer } from "../design/components";

// First-run welcome for a brand-new family. The old "pick a family
// profile" step is gone — screen time and economy are configured per
// child under Hantera now. We still need a profile_configs row to exist
// (redeem_screen_time reads screen_time_multiplier from it), so we seed
// the balanced default silently when the parent taps "Kom igång".
const DEFAULT_PROFILE =
  PROFILER.find((p) => p.id === "balans") ?? PROFILER[0];

export function ProfilePickerScreen({
  familyId,
  onSaved
}: {
  familyId: string;
  onSaved: (p: ProfileConfig) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setSaving(true);
    setErr(null);
    try {
      const row = {
        family_id: familyId,
        profile_id: DEFAULT_PROFILE.id,
        uppdrag_multiplier: DEFAULT_PROFILE.uppdrag_multiplier,
        screen_time_multiplier: DEFAULT_PROFILE.screen_time_multiplier,
        daily_limit_minutes: DEFAULT_PROFILE.daily_limit_minutes
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
      <div style={{ maxWidth: 480, margin: "0 auto", display: "grid", gap: 16, paddingTop: 24 }}>
        <Kort>
          <div style={{ fontSize: 30, marginBottom: 8 }}>🌳</div>
          <h2 style={{ color: C.text, fontSize: 22, margin: "0 0 8px", fontWeight: 800 }}>
            Välkommen till Rise
          </h2>
          <p style={{ color: C.text, fontSize: 14, margin: "0 0 10px", lineHeight: 1.55 }}>
            Rise gör skärmtid till något barnet förtjänar. Genom uppdrag som får dem att{" "}
            <strong>röra på sig, hjälpa till och skapa</strong> byggs en mer aktiv och medveten
            mobilanvändning.
          </p>
          <p style={{ color: C.muted, fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            1 mynt = 1 minut skärmtid. Du sätter reglerna per barn — de bygger vanan.
          </p>
        </Kort>

        <Kort>
          <h3 style={{ color: C.text, fontSize: 15, margin: "0 0 8px", fontWeight: 800 }}>
            Så kommer du igång
          </h3>
          <ol
            style={{
              margin: 0,
              paddingLeft: 18,
              color: C.text,
              fontSize: 13,
              lineHeight: 1.6
            }}
          >
            <li>Lägg till ditt barn.</li>
            <li>
              Ställ in skärmtid och ekonomi per barn under{" "}
              <strong>Hantera</strong>.
            </li>
            <li>Planera uppdrag — barnet utför, du godkänner, mynt delas ut.</li>
          </ol>
        </Kort>

        {err && <p style={{ color: C.red, fontSize: 13, margin: 0 }}>{err}</p>}

        <Knapp title={saving ? "Förbereder…" : "Kom igång"} onClick={start} disabled={saving} />
      </div>
    </ScreenContainer>
  );
}
