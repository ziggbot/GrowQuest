import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { ChildProfile, AgeBand, Gender } from "../lib/types";
import { AVATARER } from "../lib/profiler";
import { C } from "../design/tokens";
import { Kort, Knapp, Input } from "../design/components";
import { Sheet } from "./Sheet";

const AGE_BANDS: AgeBand[] = ["4-6", "7-9", "10-12", "13+"];

export function AddChildSheet({
  familyId,
  editing,
  onClose,
  onSaved
}: {
  familyId: string;
  editing?: ChildProfile;
  onClose: () => void;
  onSaved: (c: ChildProfile) => void;
}) {
  const [nickname, setNickname] = useState(editing?.nickname ?? "");
  const [avatar, setAvatar] = useState<string>(editing?.avatar_emoji ?? AVATARER[0]);
  const [ageBand, setAgeBand] = useState<AgeBand>(editing?.age_band ?? "7-9");
  const [gender, setGender] = useState<Gender | null>(editing?.gender ?? null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isEditing = !!editing;
  const canSubmit = !saving && nickname.trim().length >= 1 && nickname.trim().length <= 30;

  async function save() {
    if (!canSubmit) return;
    setSaving(true);
    setErr(null);
    try {
      const row = {
        family_id: familyId,
        nickname: nickname.trim(),
        avatar_emoji: avatar,
        age_band: ageBand,
        gender
      };
      const { data, error } = isEditing
        ? await supabase
            .from("child_profiles")
            .update(row)
            .eq("id", editing!.id)
            .select()
            .single()
        : await supabase.from("child_profiles").insert(row).select().single();
      if (error) throw error;
      onSaved(data as ChildProfile);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title={isEditing ? "Ändra barn" : "Nytt barn"} onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>
        <Kort>
          <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 6 }}>Smeknamn</label>
          <Input
            placeholder="Smeknamn"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            autoFocus
          />
        </Kort>

        <Kort>
          <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 8 }}>Avatar</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {AVATARER.map((e) => (
              <button
                key={e}
                onClick={() => setAvatar(e)}
                style={{
                  padding: 10,
                  fontSize: 28,
                  background: avatar === e ? `${C.gold}22` : C.surfaceHov,
                  border: `${avatar === e ? 2 : 1}px solid ${avatar === e ? C.gold : C.border}`,
                  borderRadius: 12,
                  cursor: "pointer"
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </Kort>

        <Kort>
          <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 8 }}>Ålder</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {AGE_BANDS.map((b) => (
              <button
                key={b}
                onClick={() => setAgeBand(b)}
                style={{
                  padding: "10px 8px",
                  background: ageBand === b ? `${C.gold}22` : C.surfaceHov,
                  border: `${ageBand === b ? 2 : 1}px solid ${ageBand === b ? C.gold : C.border}`,
                  borderRadius: 10,
                  cursor: "pointer",
                  color: C.text
                }}
              >
                {b}
              </button>
            ))}
          </div>
        </Kort>

        <Kort>
          <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 8 }}>
            Karaktärsanimation
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {([
              { value: null, label: "Ingen" },
              { value: "boy" as const, label: "Kille" },
              { value: "girl" as const, label: "Tjej" }
            ]).map((opt) => {
              const isOn = gender === opt.value;
              return (
                <button
                  key={opt.label}
                  onClick={() => setGender(opt.value)}
                  style={{
                    padding: "10px 8px",
                    background: isOn ? `${C.gold}22` : C.surfaceHov,
                    border: `${isOn ? 2 : 1}px solid ${isOn ? C.gold : C.border}`,
                    borderRadius: 10,
                    cursor: "pointer",
                    color: C.text
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Kort>

        {err && <p style={{ color: C.red, fontSize: 13, margin: 0 }}>{err}</p>}

        <Knapp
          title={saving ? "Sparar…" : isEditing ? "Spara ändringar" : "Lägg till barn"}
          onClick={save}
          disabled={!canSubmit}
        />
      </div>
    </Sheet>
  );
}
