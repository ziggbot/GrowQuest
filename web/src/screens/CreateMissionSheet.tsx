import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { AgeBand, ChildProfile, Mission, MissionTemplate as DbMissionTemplate, Recurrence } from "../lib/types";
import {
  MISSION_TEMPLATES,
  TEMPLATE_AGE_BANDS,
  AGE_BAND_LABELS,
  MAX_MISSION_REWARD,
  estimateMissionReward,
  type MissionTemplate as BuiltInTemplate
} from "../lib/templates";
import {
  EXERCISES,
  workoutDescription,
  workoutReward,
  type WorkoutItem
} from "../lib/exercises";
import { C } from "../design/tokens";
import { Kort, Knapp, Pill, Input } from "../design/components";
import { Avatar } from "../design/Avatar";
import { Sheet } from "./Sheet";

const RECURRENCE_LABELS: Record<Recurrence, string> = {
  once: "En gång",
  daily: "Dagligen",
  weekly: "Varje vecka"
};

const RECURRENCE_TINTS: Record<Recurrence, string> = {
  once: C.purple,
  daily: C.green,
  weekly: C.gold
};

const RECURRENCE_ICONS: Record<Recurrence, string> = {
  once: "✨",
  daily: "🔄",
  weekly: "📅"
};

export function CreateMissionSheet({
  familyId,
  userId,
  multiplier,
  children,
  missions,
  onClose,
  onCreated,
  onMissionsChanged
}: {
  familyId: string;
  userId: string;
  multiplier: number;
  children: ChildProfile[];
  missions: Mission[];
  onClose: () => void;
  onCreated: () => void;
  onMissionsChanged: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState(20);
  const [recurrence, setRecurrence] = useState<Recurrence>("daily");
  const [workout, setWorkout] = useState<WorkoutItem[]>([]);
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [assignedChildId, setAssignedChildId] = useState<string | null>(null);
  const [personalTemplates, setPersonalTemplates] = useState<DbMissionTemplate[]>([]);
  const [ageBand, setAgeBand] = useState<AgeBand>("7-9");
  const [autoApprove, setAutoApprove] = useState(false);
  const [autoApproveHours, setAutoApproveHours] = useState(24);
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

  // Missions already targeted at the selected child (or broadcast → all).
  const assignedToCurrent = useMemo(() => {
    if (assignedChildId === null) return [];
    return missions.filter(
      (m) => m.assigned_child_id === assignedChildId || m.assigned_child_id === null
    );
  }, [missions, assignedChildId]);

  const selectedChild = useMemo(
    () => (assignedChildId ? children.find((c) => c.id === assignedChildId) ?? null : null),
    [children, assignedChildId]
  );

  // Auto-pick the age-band from the selected child, but only if that
  // child's age fits one of the template buckets (skip "4-6").
  useEffect(() => {
    if (selectedChild?.age_band && TEMPLATE_AGE_BANDS.includes(selectedChild.age_band)) {
      setAgeBand(selectedChild.age_band);
    }
  }, [selectedChild]);

  const builtInsForAge = useMemo(
    () => MISSION_TEMPLATES.filter((t) => t.ageBand === ageBand),
    [ageBand]
  );

  const personalForAge = useMemo(
    () => personalTemplates.filter((t) => (t.age_band ?? "7-9") === ageBand),
    [personalTemplates, ageBand]
  );

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
    // Older personal templates may predate the 30-mynt ceiling.
    setReward(Math.min(MAX_MISSION_REWARD, t.reward_mynt));
  }

  function toggleExercise(id: string) {
    setWorkout((items) => {
      if (items.some((i) => i.exerciseId === id)) {
        return items.filter((i) => i.exerciseId !== id);
      }
      const ex = EXERCISES.find((e) => e.id === id);
      return ex ? [...items, { exerciseId: id, amount: ex.defaultAmount }] : items;
    });
  }

  function stepExercise(id: string, delta: number) {
    setWorkout((items) =>
      items.map((i) => {
        if (i.exerciseId !== id) return i;
        const ex = EXERCISES.find((e) => e.id === id);
        if (!ex) return i;
        return { ...i, amount: Math.max(ex.step, Math.min(ex.max, i.amount + delta)) };
      })
    );
  }

  function applyWorkout() {
    if (workout.length === 0) return;
    setPickedKey("workout");
    setTitle("Träningspass");
    setDescription(workoutDescription(workout));
    setRecurrence("daily");
    setReward(workoutReward(workout));
  }

  async function deleteMission(m: Mission) {
    if (!window.confirm(`Radera "${m.title}"?`)) return;
    const { error } = await supabase
      .from("missions")
      .update({ active: false })
      .eq("id", m.id);
    if (error) {
      setErr(error.message);
      return;
    }
    onMissionsChanged();
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
    reward <= MAX_MISSION_REWARD &&
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

      const baseRow = {
        family_id: familyId,
        title: trimmedTitle,
        description: trimmedDesc,
        reward_mynt: reward,
        recurrence,
        active: true,
        created_by: userId
      };
      const fullRows = targetChildIds.map((childId) => ({
        ...baseRow,
        assigned_child_id: childId,
        auto_approve: autoApprove,
        auto_approve_hours: autoApproveHours
      }));

      let { error } = await supabase.from("missions").insert(fullRows);
      // Soft-fall-back if the cloud migration with auto_approve hasn't
      // landed yet — try again without the new columns.
      if (
        error &&
        (error.message.includes("auto_approve") || error.message.includes("auto_approve_hours"))
      ) {
        const fallback = targetChildIds.map((childId) => ({
          ...baseRow,
          assigned_child_id: childId
        }));
        const retry = await supabase.from("missions").insert(fallback);
        error = retry.error;
      }
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
            age_band: ageBand,
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
                <Avatar child={c} size={18} />
                <span>{c.nickname}</span>
              </button>
            ))}
          </div>
        </Kort>

        {selectedChild && (
          <Kort>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8, gap: 6 }}>
              <Avatar child={selectedChild} size={18} />
              <label style={{ color: C.muted, fontSize: 12, flex: 1 }}>
                {selectedChild.nickname}s uppdrag ({assignedToCurrent.length})
              </label>
            </div>
            {assignedToCurrent.length === 0 ? (
              <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
                Inga uppdrag tilldelade än.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {assignedToCurrent.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto auto auto",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 4px"
                    }}
                  >
                    <span
                      style={{
                        color: C.text,
                        fontSize: 13,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {m.title}
                    </span>
                    <Pill
                      text={RECURRENCE_LABELS[m.recurrence]}
                      icon={RECURRENCE_ICONS[m.recurrence]}
                      tint={RECURRENCE_TINTS[m.recurrence]}
                    />
                    <Pill text={`${m.reward_mynt} 🪙`} tint={C.gold} />
                    <button
                      type="button"
                      onClick={() => void deleteMission(m)}
                      aria-label={`Radera ${m.title}`}
                      title="Radera uppdrag"
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: "transparent",
                        border: `1px solid ${C.border}`,
                        color: C.red,
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 700,
                        lineHeight: 1,
                        padding: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Kort>
        )}

        <Kort>
          <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 8 }}>
            Färdiga mallar — välj åldersgrupp
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {TEMPLATE_AGE_BANDS.map((band) => (
              <button
                key={band}
                onClick={() => {
                  setAgeBand(band);
                  setPickedKey(null);
                }}
                style={pillStyle(ageBand === band)}
              >
                {AGE_BAND_LABELS[band]}
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {builtInsForAge.map((t) => {
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

        <Kort>
          <label style={{ color: C.muted, fontSize: 12, fontWeight: 700, display: "block", marginBottom: 2 }}>
            🏋️ Träningspass
          </label>
          <p style={{ color: C.muted, fontSize: 11, margin: "0 0 10px", lineHeight: 1.4 }}>
            Välj övningar och bygg ihop ett eget pass — det blir uppdragets beskrivning.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {EXERCISES.map((ex) => {
              const isOn = workout.some((i) => i.exerciseId === ex.id);
              return (
                <button
                  key={ex.id}
                  onClick={() => toggleExercise(ex.id)}
                  title={ex.namn}
                  style={templateCardStyle(isOn)}
                >
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{ex.icon}</span>
                  <span style={templateTitleStyle}>{ex.namn}</span>
                </button>
              );
            })}
          </div>

          {workout.length > 0 && (
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {workout.map((item) => {
                const ex = EXERCISES.find((e) => e.id === item.exerciseId);
                if (!ex) return null;
                return (
                  <div
                    key={item.exerciseId}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{ex.icon}</span>
                    <span style={{ flex: 1, color: C.text, fontSize: 13, fontWeight: 600 }}>
                      {ex.namn}
                    </span>
                    <button
                      onClick={() => stepExercise(item.exerciseId, -ex.step)}
                      style={{ ...stepBtn, minWidth: 40, padding: "6px 8px" }}
                    >
                      −{ex.step}
                    </button>
                    <span
                      style={{
                        minWidth: 62,
                        textAlign: "center",
                        color: C.gold,
                        fontWeight: 700,
                        fontSize: 14
                      }}
                    >
                      {item.amount} {ex.unit === "seconds" ? "sek" : "st"}
                    </span>
                    <button
                      onClick={() => stepExercise(item.exerciseId, ex.step)}
                      style={{ ...stepBtn, minWidth: 40, padding: "6px 8px" }}
                    >
                      +{ex.step}
                    </button>
                  </div>
                );
              })}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  borderTop: `1px solid ${C.border}`,
                  paddingTop: 8
                }}
              >
                <span style={{ flex: 1, color: C.muted, fontSize: 12 }}>
                  {workout.length} övning{workout.length > 1 ? "ar" : ""} · förslag{" "}
                  <strong style={{ color: C.gold }}>{workoutReward(workout)} 🪙</strong>
                </span>
                <button
                  onClick={applyWorkout}
                  style={{
                    background: C.gold,
                    border: "none",
                    borderRadius: 10,
                    padding: "8px 14px",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 700
                  }}
                >
                  Använd passet
                </button>
              </div>
            </div>
          )}
        </Kort>

        {personalForAge.length > 0 && (
          <Kort>
            <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 8 }}>
              Mina mallar ({AGE_BAND_LABELS[ageBand]})
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {personalForAge.map((t) => {
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
                <button
                  onClick={() => setReward((r) => Math.min(MAX_MISSION_REWARD, r + 5))}
                  style={stepBtn}
                >
                  +5
                </button>
              </div>
              <div style={{ color: C.muted, fontSize: 11, marginTop: 4, textAlign: "center" }}>
                Max {MAX_MISSION_REWARD} 🪙 per uppdrag
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
            <div>
              <div
                role="button"
                onClick={() => setAutoApprove((v) => !v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  cursor: "pointer"
                }}
              >
                <input
                  type="checkbox"
                  checked={autoApprove}
                  readOnly
                  style={{ width: 18, height: 18, accentColor: C.gold, margin: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>Auto-godkänn</div>
                  <div style={{ color: C.muted, fontSize: 11 }}>
                    Lita på inskick utan att vänta — godkänns automatiskt efter X timmar.
                  </div>
                </div>
              </div>
              {autoApprove && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => setAutoApproveHours((h) => Math.max(1, h - 1))}
                    style={stepBtn}
                  >
                    −1
                  </button>
                  <div
                    style={{
                      flex: 1,
                      textAlign: "center",
                      color: C.gold,
                      fontWeight: 700,
                      fontSize: 16
                    }}
                  >
                    {autoApproveHours} {autoApproveHours === 1 ? "timme" : "timmar"}
                  </div>
                  <button
                    onClick={() => setAutoApproveHours((h) => Math.min(168, h + 1))}
                    style={stepBtn}
                  >
                    +1
                  </button>
                </div>
              )}
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
