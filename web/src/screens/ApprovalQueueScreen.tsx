import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import type { MissionSubmission, Mission, ChildProfile } from "../lib/types";
import { C } from "../design/tokens";
import { Kort, Pill, Knapp, ScreenContainer } from "../design/components";

interface QueueItem {
  submission: MissionSubmission;
  mission: Mission;
  child: ChildProfile;
}

export function ApprovalQueueScreen() {
  const { familyId } = useSession();
  const nav = useNavigate();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  async function reload() {
    if (!familyId) return;
    setLoading(true);
    setErr(null);
    try {
      const [subsRes, mRes, cRes] = await Promise.all([
        supabase
          .from("mission_submissions")
          .select("*")
          .eq("family_id", familyId)
          .eq("status", "pending")
          .order("submitted_at"),
        supabase.from("missions").select("*").eq("family_id", familyId),
        supabase.from("child_profiles").select("*").eq("family_id", familyId)
      ]);
      if (subsRes.error) throw subsRes.error;
      if (mRes.error) throw mRes.error;
      if (cRes.error) throw cRes.error;

      const missions = new Map((mRes.data as Mission[]).map((m) => [m.id, m]));
      const children = new Map((cRes.data as ChildProfile[]).map((c) => [c.id, c]));
      const list: QueueItem[] = [];
      for (const s of subsRes.data as MissionSubmission[]) {
        const m = missions.get(s.mission_id);
        const c = children.get(s.child_id);
        if (m && c) list.push({ submission: s, mission: m, child: c });
      }
      setItems(list);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [familyId]);

  async function review(item: QueueItem, action: "approve" | "reject") {
    setErr(null);
    setLastResult(null);
    try {
      const noteText = (notes[item.submission.id] ?? "").trim();
      const { error } = await supabase.rpc("approve_mission", {
        p_submission_id: item.submission.id,
        p_action: action,
        p_note: noteText.length > 0 ? noteText : null
      });
      if (error) throw error;
      setItems((xs) => xs.filter((x) => x.submission.id !== item.submission.id));
      setNotes((n) => {
        const { [item.submission.id]: _drop, ...rest } = n;
        return rest;
      });
      setLastResult(action === "approve" ? "Godkänt — mynt utdelade." : "Avvisat.");
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <ScreenContainer>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <button
          onClick={() => nav("/")}
          style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", marginBottom: 8 }}
        >
          ‹ Tillbaka
        </button>
        <h2 style={{ margin: "0 0 12px" }}>Att granska</h2>

        {loading && <p style={{ color: C.muted, fontSize: 13 }}>Laddar…</p>}
        {!loading && items.length === 0 && (
          <Kort>
            <p style={{ color: C.muted, fontSize: 13, margin: 0, textAlign: "center" }}>
              Inga uppdrag att granska just nu.
            </p>
          </Kort>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          {items.map((it) => (
            <Kort key={it.submission.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{it.child.avatar_emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: C.muted }}>{it.child.nickname}</div>
                  <div style={{ fontWeight: 600 }}>{it.mission.title}</div>
                </div>
                <Pill text={`${it.mission.reward_mynt} 🪙`} tint={C.gold} />
              </div>
              {it.mission.description && (
                <p style={{ color: C.muted, fontSize: 12, margin: "0 0 10px" }}>{it.mission.description}</p>
              )}
              {it.submission.photo_data && (
                <a
                  href={it.submission.photo_data}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "block", marginBottom: 10 }}
                >
                  <img
                    src={it.submission.photo_data}
                    alt={`Bevis från ${it.child.nickname}`}
                    style={{
                      width: "100%",
                      maxHeight: 280,
                      objectFit: "cover",
                      borderRadius: 12,
                      border: `1px solid ${C.border}`
                    }}
                  />
                </a>
              )}
              {it.submission.child_note && (
                <div
                  style={{
                    background: C.surfaceHov,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: "8px 10px",
                    color: C.text,
                    fontSize: 13,
                    margin: "0 0 10px",
                    whiteSpace: "pre-wrap"
                  }}
                >
                  <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 2 }}>
                    Hälsning från {it.child.nickname}
                  </div>
                  {it.submission.child_note}
                </div>
              )}
              <textarea
                value={notes[it.submission.id] ?? ""}
                onChange={(e) =>
                  setNotes((n) => ({ ...n, [it.submission.id]: e.target.value }))
                }
                placeholder="Skriv en kommentar (frivilligt)"
                maxLength={500}
                rows={2}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "8px 10px",
                  color: C.text,
                  fontSize: 13,
                  fontFamily: "inherit",
                  resize: "vertical",
                  marginBottom: 10
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <Knapp title="Avvisa" style="secondary" onClick={() => review(it, "reject")} />
                <Knapp title="Godkänn" onClick={() => review(it, "approve")} />
              </div>
            </Kort>
          ))}
        </div>

        {lastResult && <p style={{ color: C.green, fontSize: 13, marginTop: 12 }}>{lastResult}</p>}
        {err && <p style={{ color: C.red, fontSize: 13, marginTop: 12 }}>{err}</p>}
      </div>
    </ScreenContainer>
  );
}
