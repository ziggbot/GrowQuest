import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import type { Mission } from "../lib/types";
import { tipsFor } from "../lib/tips";
import { C } from "../design/tokens";
import { Kort, Knapp, Pill, ScreenContainer } from "../design/components";

export function MissionDetailScreen() {
  const { childId, missionId } = useParams<{ childId: string; missionId: string }>();
  const { familyId } = useSession();
  const nav = useNavigate();

  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!missionId) return;
    void (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("missions")
          .select("*")
          .eq("id", missionId)
          .single();
        if (error) throw error;
        setMission(data as Mission);
        // Was it already submitted today?
        if (childId) {
          const start = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
          const { data: subs } = await supabase
            .from("mission_submissions")
            .select("id")
            .eq("mission_id", missionId)
            .eq("child_id", childId)
            .gte("submitted_at", start);
          setSubmitted((subs ?? []).length > 0);
        }
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [missionId, childId]);

  async function submit() {
    if (!mission || !childId || !familyId || submitted || submitting) return;
    setSubmitting(true);
    setErr(null);
    try {
      const { error } = await supabase.from("mission_submissions").insert({
        family_id: familyId,
        mission_id: mission.id,
        child_id: childId
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <ScreenContainer>
        <p style={{ color: C.muted, textAlign: "center", marginTop: 80 }}>Laddar…</p>
      </ScreenContainer>
    );
  }

  if (!mission) {
    return (
      <ScreenContainer>
        <p style={{ color: C.red, textAlign: "center" }}>Hittade inte uppdraget.</p>
        <Knapp title="Tillbaka" onClick={() => nav(-1)} />
      </ScreenContainer>
    );
  }

  const tips = tipsFor(mission.title, mission.description);

  return (
    <ScreenContainer>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <button
          onClick={() => nav(-1)}
          style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", marginBottom: 8 }}
        >
          ‹ Tillbaka
        </button>

        {/* Hero */}
        <div
          style={{
            textAlign: "center",
            padding: "24px 16px 28px",
            background: `linear-gradient(180deg, ${C.surfaceHov}, transparent)`,
            borderRadius: 22,
            border: `1px solid ${C.border}`,
            marginBottom: 14
          }}
        >
          <div style={{ fontSize: 64, lineHeight: 1 }}>{tips.emoji}</div>
          <h1 style={{ fontSize: 24, margin: "10px 0 4px", fontWeight: 800 }}>{mission.title}</h1>
          {mission.description && (
            <p style={{ color: C.text, opacity: 0.85, fontSize: 14, margin: "8px 0 12px", lineHeight: 1.4 }}>
              {mission.description}
            </p>
          )}
          <Pill text={`${mission.reward_mynt} 🪙`} tint={C.gold} />
        </div>

        {/* Cheer */}
        <Kort style={{ marginBottom: 14 }}>
          <p
            style={{
              margin: 0,
              fontSize: 16,
              color: C.gold,
              fontWeight: 700,
              textAlign: "center"
            }}
          >
            {tips.intro}
          </p>
        </Kort>

        {/* Tips */}
        <Kort style={{ marginBottom: 14 }}>
          <h3 style={{ margin: "0 0 8px", color: C.text, fontSize: 15 }}>💡 Tips</h3>
          <ul style={{ margin: 0, paddingLeft: 18, color: C.text, fontSize: 14, lineHeight: 1.5 }}>
            {tips.tips.map((t, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                {t}
              </li>
            ))}
          </ul>
        </Kort>

        {/* Cheer footer */}
        <p
          style={{
            color: C.muted,
            fontSize: 13,
            fontStyle: "italic",
            textAlign: "center",
            margin: "0 0 16px"
          }}
        >
          {tips.cheer}
        </p>

        {/* Submit */}
        {submitted ? (
          <Kort>
            <div style={{ textAlign: "center", padding: "12px 8px" }}>
              <div style={{ fontSize: 40 }}>🎉</div>
              <p style={{ color: C.green, fontWeight: 700, margin: "8px 0 4px" }}>
                Bra jobbat! Inskickat till föräldern.
              </p>
              <p style={{ color: C.muted, fontSize: 12, margin: "0 0 12px" }}>
                När föräldern godkänner får du dina mynt.
              </p>
              <Knapp title="Tillbaka till uppdrag" onClick={() => nav(-1)} />
            </div>
          </Kort>
        ) : (
          <Knapp
            title={submitting ? "Skickar…" : "Klar! 🎉"}
            onClick={submit}
            disabled={submitting}
          />
        )}

        {err && <p style={{ color: C.red, fontSize: 13, marginTop: 12, textAlign: "center" }}>{err}</p>}
      </div>
    </ScreenContainer>
  );
}
