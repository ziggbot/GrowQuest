import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import type { Mission } from "../lib/types";
import { tipsFor } from "../lib/tips";
import { compressImage } from "../lib/image";
import { CK } from "../design/tokens";
import { ChildScreenContainer, KortKid, KnappKid, PillKid } from "../design/components";

export function MissionDetailScreen() {
  const { childId, missionId } = useParams<{ childId: string; missionId: string }>();
  const { familyId } = useSession();
  const nav = useNavigate();

  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

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
      const submissionId = crypto.randomUUID();
      let photoPath: string | null = null;
      if (photoFile) {
        const blob = await compressImage(photoFile);
        photoPath = `${familyId}/${submissionId}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("mission-photos")
          .upload(photoPath, blob, { contentType: "image/jpeg", upsert: false });
        if (upErr) throw upErr;
      }
      const trimmedNote = note.trim();
      const { error } = await supabase.from("mission_submissions").insert({
        id: submissionId,
        family_id: familyId,
        mission_id: mission.id,
        child_id: childId,
        photo_path: photoPath,
        child_note: trimmedNote.length > 0 ? trimmedNote : null
      });
      if (error) {
        if (photoPath) {
          await supabase.storage.from("mission-photos").remove([photoPath]);
        }
        throw error;
      }
      setSubmitted(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <ChildScreenContainer>
        <p style={{ color: CK.muted, textAlign: "center", marginTop: 80 }}>Laddar…</p>
      </ChildScreenContainer>
    );
  }

  if (!mission) {
    return (
      <ChildScreenContainer>
        <p style={{ color: CK.red, textAlign: "center" }}>Hittade inte uppdraget.</p>
        <KnappKid title="Tillbaka" onClick={() => nav(-1)} />
      </ChildScreenContainer>
    );
  }

  const tips = tipsFor(mission.title, mission.description);

  return (
    <ChildScreenContainer>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <button
          onClick={() => nav(-1)}
          style={{
            background: CK.surface,
            border: `1px solid ${CK.border}`,
            color: CK.text,
            cursor: "pointer",
            marginBottom: 12,
            padding: "6px 12px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: CK.shadowSoft
          }}
        >
          ‹ Tillbaka
        </button>

        {/* Hero card — big emoji on a soft cyan halo, white card */}
        <KortKid style={{ textAlign: "center", padding: "28px 18px 24px", marginBottom: 14 }}>
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: "50%",
              background: `radial-gradient(circle at 50% 40%, ${CK.accentFade} 0%, transparent 70%)`,
              margin: "0 auto 8px",
              display: "grid",
              placeItems: "center"
            }}
          >
            <div style={{ fontSize: 72, lineHeight: 1 }}>{tips.emoji}</div>
          </div>
          <h1 style={{ fontSize: 24, margin: "6px 0 8px", fontWeight: 800, color: CK.text }}>
            {mission.title}
          </h1>
          {mission.description && (
            <p
              style={{
                color: CK.textSoft,
                fontSize: 14,
                margin: "4px 0 14px",
                lineHeight: 1.45
              }}
            >
              {mission.description}
            </p>
          )}
          <PillKid text={`${mission.reward_mynt} 🪙`} tint={CK.gold} />
        </KortKid>

        {/* Cheer banner */}
        <div
          style={{
            background: `linear-gradient(135deg, ${CK.accent}, ${CK.accentDeep})`,
            borderRadius: 18,
            padding: "14px 18px",
            marginBottom: 14,
            color: "#ffffff",
            textAlign: "center",
            boxShadow: CK.shadow
          }}
        >
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{tips.intro}</p>
        </div>

        {/* Tips */}
        <KortKid style={{ marginBottom: 14 }}>
          <h3
            style={{
              margin: "0 0 10px",
              color: CK.text,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 0.4,
              textTransform: "uppercase"
            }}
          >
            💡 Tips
          </h3>
          <ul style={{ margin: 0, paddingLeft: 18, color: CK.textSoft, fontSize: 14, lineHeight: 1.55 }}>
            {tips.tips.map((t, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                {t}
              </li>
            ))}
          </ul>
        </KortKid>

        {/* Cheer footer */}
        <p
          style={{
            color: CK.muted,
            fontSize: 13,
            fontStyle: "italic",
            textAlign: "center",
            margin: "0 0 18px"
          }}
        >
          {tips.cheer}
        </p>

        {/* Photo proof + comment */}
        {!submitted && (
          <KortKid style={{ marginBottom: 14 }}>
            <h3
              style={{
                margin: "0 0 10px",
                color: CK.text,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: 0.4,
                textTransform: "uppercase"
              }}
            >
              📸 Bevis (frivilligt)
            </h3>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setPhotoFile(f);
              }}
              style={{ display: "none" }}
            />
            {photoPreview ? (
              <div style={{ display: "grid", gap: 10 }}>
                <img
                  src={photoPreview}
                  alt="Bevis"
                  style={{
                    width: "100%",
                    maxHeight: 260,
                    objectFit: "cover",
                    borderRadius: 14,
                    border: `1px solid ${CK.border}`
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      flex: 1,
                      background: CK.surface,
                      border: `1px solid ${CK.border}`,
                      borderRadius: 12,
                      padding: "10px 12px",
                      color: CK.text,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 700
                    }}
                  >
                    Byt bild
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoFile(null)}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: `1px solid ${CK.border}`,
                      borderRadius: 12,
                      padding: "10px 12px",
                      color: CK.muted,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 700
                    }}
                  >
                    Ta bort
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: "100%",
                  background: CK.accentFade,
                  border: `1px dashed ${CK.accent}`,
                  borderRadius: 14,
                  padding: "18px 12px",
                  color: CK.text,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8
                }}
              >
                <span style={{ fontSize: 22 }}>📷</span>
                Lägg till foto
              </button>
            )}
            <label
              style={{
                display: "block",
                color: CK.muted,
                fontSize: 12,
                fontWeight: 700,
                marginTop: 14,
                marginBottom: 6
              }}
            >
              Kommentar till föräldern (frivilligt)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="T.ex. ”Jag hjälpte även lillebror!”"
              maxLength={500}
              rows={3}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: CK.surface,
                border: `1px solid ${CK.border}`,
                borderRadius: 12,
                padding: "10px 12px",
                color: CK.text,
                fontSize: 14,
                fontFamily: "inherit",
                resize: "vertical"
              }}
            />
          </KortKid>
        )}

        {/* Submit */}
        {submitted ? (
          <KortKid>
            <div style={{ textAlign: "center", padding: "12px 8px" }}>
              <div style={{ fontSize: 44 }}>🎉</div>
              <p style={{ color: CK.green, fontWeight: 800, margin: "8px 0 4px", fontSize: 16 }}>
                Bra jobbat! Inskickat till föräldern.
              </p>
              <p style={{ color: CK.muted, fontSize: 12, margin: "0 0 14px" }}>
                När föräldern godkänner får du dina mynt.
              </p>
              <KnappKid title="Tillbaka till uppdrag" onClick={() => nav(-1)} />
            </div>
          </KortKid>
        ) : (
          <KnappKid
            title={submitting ? "Skickar…" : "Klar! 🎉"}
            onClick={submit}
            disabled={submitting}
          />
        )}

        {err && <p style={{ color: CK.red, fontSize: 13, marginTop: 12, textAlign: "center" }}>{err}</p>}
      </div>
    </ChildScreenContainer>
  );
}
