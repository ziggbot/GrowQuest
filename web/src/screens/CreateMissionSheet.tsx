import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { ChildProfile, MissionTemplate as DbMissionTemplate, Recurrence } from "../lib/types";
import {
  MISSION_TEMPLATES,
  estimateMissionReward,
  type MissionTemplate as BuiltInTemplate
} from "../lib/templates";
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
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState(60);
  const [recurrence, setRecurrence] = useState<Recurrence>("daily");
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [assignedChildId, setAssignedChildId] = useState<string | null>(null);
  const [personalTemplates, setPersonalTemplates] = useState<DbMissionTemplate[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from("mission_templates")
        .select("*")
        .eq("family_id", familyId)
        .order("created_at", { ascending: false });
      if (!error && data) setPersonalTemplates(data as DbMissionTemplate[]);
    })();
  }, [familyId]);

  const reservedTitles = useMemo(() => {
    const set = new Set<string>();
    MISSION_TEMPLATES.forEach((t) => set.add(t.title.trim().toLowerCase()));
    personalTemplates.forEach((t) => set.add(t.title.trim().toLowerCase()));
    return set;
  }, [personalTemplates]);

  function applyBuiltIn(t: BuiltInTemplate) {
    setPickedKey(`builtin:${t.id}`);
    setTitle(t.title);
    setDescription(t.description);
    setRecurrence(t.recurrence);
    setReward(estimateMissionReward(t.baseRewardMynt, multiplier));
  }

  function applyPersonal(t: DbMissionTemplate) {
    setPickedKey(`personal:${t.id}`);
    setTitle(t.title);
    setDescription(t.description ?? "");
    setRecurrence(t.recurrence);
    setReward(t.reward_mynt);
  }

  async function deletePersonal(id: string) {
    const prev = personalTemplates;
    setPersonalTemplates((ts) => ts.filter((t) => t.id !== id));
    const { error } = await supabase.from("mission_templates").delete().eq("id", id);
    if (error) {
      setPersonalTemplates(prev);
      setErr(error.message);
    }
  }

  const canSubmit =
    !saving &&
    title.trim().length >= 1 &&
    title.trim().length <= 80 &&
    reward >= 0 &&
    reward <= 10000 &&
    children.length > 0;

  async function save() {
    if (!canSubmit) return;
    setSaving(true);
    setErr(null);
    try {
      const trimmedTitle = title.trim();
      const trimmedDesc = description.trim() || null;

      // Fan out across all children when "Alla barn" is selected.
      const targetChildIds =
        assignedChildId === null ? children.map((c) => c.id) : [assignedChildId];

      const rows = targetChildIds.map((childId) => ({
        family_id: familyId,
        title: trimmedTitle,
        description: trimmedDesc,
        reward_mynt: reward,
        recurrence,
        active: true,
        created_by: userId,
        assigned_child_id: childId
      }));

      const { error } = await supabase.from("missions").insert(rows);
      if (error) throw error;

      // Best-effort: save as personal template if this title is new
      if (!reservedTitles.has(trimmedTitle.toLowerCase())) {
        const { data: tplData } = await supabase
          .from("mission_templates")
          .insert({
            family_id: familyId,
            title: trimmedTitle,
            description: trimmedDesc,
            reward_mynt: reward,
            recurrence,
            created_by: userId
          })
          .select()
          .single();
        if (tplData) {
          setPersonalTemplates((ts) => [tplData as DbMissionTemplate, ...ts]);
        }
      }

      onCreated();
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
          <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 8 }}>För vem?</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              onClick={() => setAssignedChildId(null)}
              style={pillStyle(assignedChildId === null)}
            >
              Alla barn
            </button>
            {children.map((c) => (
              <button
                key={c.id}
                onClick={() => setAssignedChildId(c.id)}
                style={{
                  ...pillStyle(assignedChildId === c.id),
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <span>{c.avatar_emoji}</span>
                <span>{c.nickname}</span>
              </button>
            ))}
          </div>
        </Kort>

        <Kort>
          <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 8 }}>
            Färdiga mallar
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {MISSION_TEMPLATES.map((t) => {
              const isOn = pickedKey === `builtin:${t.id}`;
              return (
                <button
                  key={t.id}
                  onClick={() => applyBuiltIn(t)}
                  title={t.title}
                  style={templateCardStyle(isOn)}
                >
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{t.icon}</span>
                  <span style={templateTitleStyle}>{t.title}</span>
                </button>
              );
            })}
          </div>
        </Kort>

        {personalTemplates.length > 0 && (
          <Kort>
            <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 8 }}>
              Mina mallar
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {personalTemplates.map((t) => {
                const isOn = pickedKey === `personal:${t.id}`;
                return (
                  <div key={t.id} style={{ position: "relative" }}>
                    <button
                      onClick={() => applyPersonal(t)}
                      title={t.title}
                      style={templateCardStyle(isOn)}
                    >
                      <span style={{ fontSize: 22, lineHeight: 1 }}>📋</span>
                      <span style={templateTitleStyle}>{t.title}</span>
                    </button>
                    <button
                      onClick={() => void deletePersonal(t.id)}
                      aria-label={`Ta bort ${t.title}`}
                      title="Ta bort mall"
                      style={{
                        position: "absolute",
                        top: -4,
                        right: -4,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: C.red,
                        color: "#fff",
                        border: "none",
                        fontSize: 12,
                        fontWeight: 700,
                        lineHeight: "20px",
                        cursor: "pointer",
                        padding: 0
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </Kort>
        )}

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
                  <button key={r} onClick={() => setRecurrence(r)} style={pillStyle(recurrence === r)}>
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

function pillStyle(isOn: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    background: isOn ? `${C.gold}22` : C.surfaceHov,
    border: `${isOn ? 2 : 1}px solid ${isOn ? C.gold : C.border}`,
    borderRadius: 999,
    cursor: "pointer",
    color: isOn ? C.gold : C.text,
    fontSize: 13,
    fontWeight: 500
  };
}

function templateCardStyle(isOn: boolean): React.CSSProperties {
  return {
    width: "100%",
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
  };
}

const templateTitleStyle: React.CSSProperties = {
  fontSize: 10,
  lineHeight: 1.1,
  width: "100%",
  textAlign: "center",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis"
};

const stepBtn: React.CSSProperties = {
  padding: "8px 14px",
  background: C.surfaceHov,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  color: C.text,
  cursor: "pointer",
  minWidth: 56
};
