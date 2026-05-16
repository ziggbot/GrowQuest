import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { ChildProfile, Mission, Recurrence } from "../lib/types";
import { MISSION_TEMPLATES, estimateMissionReward, type MissionTemplate } from "../lib/templates";
import { C } from "../design/tokens";
import { Kort, Knapp, Input } from "../design/components";
import { Sheet } from "./Sheet";

const RECURRENCE_LABELS: Record<Recurrence, string> = {
  once: "En gång",
  daily: "Dagligen",
  weekly: "Varje vecka"
};

export function CreateMissionSheet({
  familyId,
  userId,
  multiplier,
  children,
  onClose,
  onCreated
}: {
  familyId: string;
  userId: string;
  multiplier: number;
  children: ChildProfile[];
  onClose: () => void;
  onCreated: (m: Mission) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState(60);
  const [recurrence, setRecurrence] = useState<Recurrence>("daily");
  const [pickedTemplate, setPickedTemplate] = useState<string | null>(null);
  const [assignedChildId, setAssignedChildId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function applyTemplate(t: MissionTemplate) {
    setPickedTemplate(t.id);
    setTitle(t.title);
    setDescription(t.description);
    setRecurrence(t.recurrence);
    setReward(estimateMissionReward(t.baseRewardMynt, multiplier));
  }

  const canSubmit =
    !saving && title.trim().length >= 1 && title.trim().length <= 80 && reward >= 0 && reward <= 10000;

  async function save() {
    if (!canSubmit) return;
    setSaving(true);
    setErr(null);
    try {
      const row = {
        family_id: familyId,
        title: title.trim(),
        description: description.trim() || null,
        reward_mynt: reward,
        recurrence,
        active: true,
        created_by: userId,
        assigned_child_id: assignedChildId
      };
      const { data, error } = await supabase.from("missions").insert(row).select().single();
      if (error) throw error;
      onCreated(data as Mission);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title="Nytt uppdrag" onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>
        <Kort>
          <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 8 }}>Mall (valfritt)</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {MISSION_TEMPLATES.map((t) => {
              const isOn = pickedTemplate === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  title={t.title}
                  style={{
                    padding: "8px 4px",
                    background: isOn ? `${C.gold}22` : C.surfaceHov,
                    border: `${isOn ? 2 : 1}px solid ${isOn ? C.gold : C.border}`,
                    borderRadius: 10,
                    cursor: "pointer",
                    color: C.text,
                    display: "grid",
                    gap: 2,
                    placeItems: "center",
                    minWidth: 0,
                    overflow: "hidden"
                  }}
                >
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{t.icon}</span>
                  <span
                    style={{
                      fontSize: 10,
                      lineHeight: 1.1,
                      width: "100%",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {t.title}
                  </span>
                </button>
              );
            })}
          </div>
        </Kort>

        <Kort>
          <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 8 }}>För vem?</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              onClick={() => setAssignedChildId(null)}
              style={{
                padding: "6px 12px",
                background: assignedChildId === null ? `${C.gold}22` : C.surfaceHov,
                border: `${assignedChildId === null ? 2 : 1}px solid ${assignedChildId === null ? C.gold : C.border}`,
                borderRadius: 999,
                cursor: "pointer",
                color: assignedChildId === null ? C.gold : C.text,
                fontSize: 13,
                fontWeight: 500
              }}
            >
              Alla barn
            </button>
            {children.map((c) => {
              const isOn = assignedChildId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setAssignedChildId(c.id)}
                  style={{
                    padding: "6px 12px",
                    background: isOn ? `${C.gold}22` : C.surfaceHov,
                    border: `${isOn ? 2 : 1}px solid ${isOn ? C.gold : C.border}`,
                    borderRadius: 999,
                    cursor: "pointer",
                    color: isOn ? C.gold : C.text,
                    fontSize: 13,
                    fontWeight: 500,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <span>{c.avatar_emoji}</span>
                  <span>{c.nickname}</span>
                </button>
              );
            })}
          </div>
        </Kort>

        <Kort>
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Titel</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
            </div>
            <div>
              <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 4 }}>
                Beskrivning (valfritt)
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detaljer för barnet"
                maxLength={500}
              />
            </div>
            <div>
              <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Belöning</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setReward((r) => Math.max(0, r - 5))} style={stepBtn}>−5</button>
                <div style={{ flex: 1, textAlign: "center", color: C.gold, fontWeight: 700, fontSize: 18 }}>
                  {reward} 🪙
                </div>
                <button onClick={() => setReward((r) => Math.min(10000, r + 5))} style={stepBtn}>+5</button>
              </div>
            </div>
            <div>
              <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Återkomst</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(Object.keys(RECURRENCE_LABELS) as Recurrence[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRecurrence(r)}
                    style={{
                      padding: "6px 12px",
                      background: recurrence === r ? `${C.gold}22` : C.surfaceHov,
                      border: `${recurrence === r ? 2 : 1}px solid ${recurrence === r ? C.gold : C.border}`,
                      borderRadius: 999,
                      cursor: "pointer",
                      color: recurrence === r ? C.gold : C.text,
                      fontSize: 13,
                      fontWeight: 500
                    }}
                  >
                    {RECURRENCE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Kort>

        {err && <p style={{ color: C.red, fontSize: 13, margin: 0 }}>{err}</p>}

        <Knapp title={saving ? "Skapar…" : "Skapa uppdrag"} onClick={save} disabled={!canSubmit} />
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
