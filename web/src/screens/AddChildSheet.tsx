import { useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import type { ChildProfile, AgeBand, Gender } from "../lib/types";
import { AVATARER } from "../lib/profiler";
import { compressImageToDataUrl } from "../lib/image";
import { C } from "../design/tokens";
import { Kort, Knapp, Input } from "../design/components";
import { Sheet } from "./Sheet";

const AGE_BANDS: AgeBand[] = ["4-6", "7-9", "10-12", "13+"];

const limitStepBtn: React.CSSProperties = {
  padding: "8px 14px",
  background: "rgba(255,255,255,0.7)",
  border: "1px solid rgba(0,0,0,0.1)",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 14,
  minWidth: 56
};

const toggleRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  cursor: "pointer",
  marginTop: 10
};

const checkboxStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  accentColor: C.gold,
  margin: 0
};

export function AddChildSheet({
  familyId,
  editing,
  onClose,
  onSaved,
  onDeleted
}: {
  familyId: string;
  editing?: ChildProfile;
  onClose: () => void;
  onSaved: (c: ChildProfile) => void;
  onDeleted?: (childId: string) => void;
}) {
  const [nickname, setNickname] = useState(editing?.nickname ?? "");
  const [avatar, setAvatar] = useState<string>(editing?.avatar_emoji ?? AVATARER[0]);
  const [ageBand, setAgeBand] = useState<AgeBand>(editing?.age_band ?? "7-9");
  const [gender, setGender] = useState<Gender | null>(editing?.gender ?? null);
  const [photoData, setPhotoData] = useState<string | null>(editing?.avatar_photo ?? null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [optIn, setOptIn] = useState<boolean>(editing?.global_leaderboard_opt_in ?? false);
  const [screenLimit, setScreenLimit] = useState<number>(
    editing?.daily_limit_minutes_override ?? 60
  );
  const [requireDailyMission, setRequireDailyMission] = useState<boolean>(
    editing?.require_daily_mission ?? false
  );
  const [myntExpiryDays, setMyntExpiryDays] = useState<number | null>(
    editing?.mynt_expiry_days ?? null
  );
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        avatar_photo: photoData,
        age_band: ageBand,
        gender,
        global_leaderboard_opt_in: optIn,
        daily_limit_minutes_override: screenLimit,
        require_daily_mission: requireDailyMission,
        mynt_expiry_days: myntExpiryDays
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

  async function sendInvite() {
    if (!editing) return;
    const trimmed = inviteEmail.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      setErr("Skriv en giltig e-postadress.");
      return;
    }
    setInviting(true);
    setErr(null);
    setInviteLink(null);
    try {
      const { data, error } = await supabase.rpc("create_child_invite", {
        p_child_id: editing.id,
        p_email: trimmed
      });
      if (error) throw error;
      const token = (data as { token?: string } | null)?.token;
      if (!token) throw new Error("Inget token returnerades.");
      setInviteLink(`${window.location.origin}/join?token=${token}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setInviting(false);
    }
  }

  async function deleteChild() {
    if (!editing) return;
    const name = editing.nickname;
    const typed = window.prompt(
      `Detta raderar ${name} och ALL data permanent (GDPR). Skriv barnets namn för att bekräfta:`
    );
    if (typed === null) return;
    if (typed.trim().toLowerCase() !== name.trim().toLowerCase()) {
      setErr("Namnet stämde inte — inget raderades.");
      return;
    }
    setDeleting(true);
    setErr(null);
    const { error } = await supabase.rpc("delete_child_completely", {
      p_child_id: editing.id
    });
    setDeleting(false);
    if (error) {
      setErr(error.message);
      return;
    }
    onDeleted?.(editing.id);
    onClose();
  }

  async function resetChildPassword() {
    if (!editing?.email) return;
    setResetMsg(null);
    setErr(null);
    const { error } = await supabase.auth.resetPasswordForEmail(editing.email, {
      redirectTo: `${window.location.origin}/`
    });
    if (error) setErr(error.message);
    else setResetMsg(`Återställningslänk skickad till ${editing.email}.`);
  }

  return (
    <Sheet title={isEditing ? "Hantera barn" : "Nytt barn"} onClose={onClose}>
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
          <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 8 }}>
            Foto (frivilligt)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setPhotoBusy(true);
              setErr(null);
              try {
                const data = await compressImageToDataUrl(file, 400, 0.78);
                setPhotoData(data);
              } catch (ex) {
                setErr((ex as Error).message);
              } finally {
                setPhotoBusy(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }
            }}
            style={{ display: "none" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: C.surfaceHov,
                border: `1px solid ${C.border}`,
                overflow: "hidden",
                display: "grid",
                placeItems: "center",
                fontSize: 34,
                flexShrink: 0
              }}
            >
              {photoData ? (
                <img
                  src={photoData}
                  alt="Förhandsvisning"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                avatar
              )}
            </div>
            <div style={{ display: "grid", gap: 6, flex: 1 }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoBusy}
                style={{
                  padding: "8px 12px",
                  background: C.gold,
                  border: "none",
                  borderRadius: 10,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer"
                }}
              >
                {photoBusy ? "Bearbetar…" : photoData ? "📷 Byt foto" : "📷 Ta/ladda upp foto"}
              </button>
              {photoData && (
                <button
                  type="button"
                  onClick={() => setPhotoData(null)}
                  style={{
                    padding: "6px 12px",
                    background: "transparent",
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    color: C.muted,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer"
                  }}
                >
                  Ta bort foto
                </button>
              )}
            </div>
          </div>
        </Kort>

        <Kort>
          <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 8 }}>
            Symbol {photoData ? "(används som reserv)" : ""}
          </label>
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

        <Kort>
          <h3 style={{ margin: "0 0 4px", color: C.text, fontSize: 15 }}>Skärmtid &amp; ekonomi</h3>
          <p style={{ color: C.muted, fontSize: 11, margin: "0 0 12px" }}>
            Reglerna gäller bara {nickname.trim() || "det här barnet"}. 1 mynt = 1 minut skärmtid.
          </p>

          {/* Per-child daily screen-time cap */}
          <label style={{ color: C.muted, fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>
            Max skärmtid per dag
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setScreenLimit((v) => Math.max(0, v - 15))}
              style={limitStepBtn}
            >
              −15
            </button>
            <div style={{ flex: 1, textAlign: "center", color: C.purple, fontWeight: 800, fontSize: 18 }}>
              {screenLimit} min
            </div>
            <button
              onClick={() => setScreenLimit((v) => Math.min(600, v + 15))}
              style={limitStepBtn}
            >
              +15
            </button>
          </div>
          <div style={{ color: C.muted, fontSize: 11, marginTop: 6, textAlign: "center" }}>
            {(screenLimit / 60).toFixed(1)} timmar
          </div>

          {/* Require a mission today */}
          <div
            role="button"
            onClick={() => setRequireDailyMission((v) => !v)}
            style={toggleRow}
          >
            <input type="checkbox" checked={requireDailyMission} readOnly style={checkboxStyle} />
            <div style={{ flex: 1 }}>
              <div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>
                Kräver minst ett uppdrag idag
              </div>
              <div style={{ color: C.muted, fontSize: 11 }}>
                Barnet måste ha klarat ett uppdrag idag innan det kan växla mynt till skärmtid.
              </div>
            </div>
          </div>

          {/* Mynt expiry */}
          <div
            role="button"
            onClick={() => setMyntExpiryDays((v) => (v == null ? 14 : null))}
            style={toggleRow}
          >
            <input type="checkbox" checked={myntExpiryDays != null} readOnly style={checkboxStyle} />
            <div style={{ flex: 1 }}>
              <div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>Mynt går ut</div>
              <div style={{ color: C.muted, fontSize: 11 }}>
                Oanvända mynt försvinner efter ett antal dagar — gör att aktivitet idag räknas mest.
              </div>
            </div>
          </div>
          {myntExpiryDays != null && (
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => setMyntExpiryDays((v) => Math.max(1, (v ?? 14) - 7))}
                style={limitStepBtn}
              >
                −7
              </button>
              <div style={{ flex: 1, textAlign: "center", color: C.gold, fontWeight: 800, fontSize: 18 }}>
                {myntExpiryDays} dagar
              </div>
              <button
                onClick={() => setMyntExpiryDays((v) => Math.min(365, (v ?? 14) + 7))}
                style={limitStepBtn}
              >
                +7
              </button>
            </div>
          )}
        </Kort>

        {isEditing && <WalletAdjustCard childId={editing!.id} nickname={nickname} />}

        <Kort>
          <div
            role="button"
            onClick={() => setOptIn((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "4px 0",
              cursor: "pointer"
            }}
          >
            <input
              type="checkbox"
              checked={optIn}
              readOnly
              style={{ width: 18, height: 18, accentColor: C.gold, margin: 0 }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>
                Visa i global topplista
              </div>
              <div style={{ color: C.muted, fontSize: 11 }}>
                Tillåt att {nickname.trim() || "barnets"} mynt syns på den globala
                superäventyrar-listan.
              </div>
            </div>
          </div>
        </Kort>

        {isEditing && (
          <Kort>
            <h3 style={{ margin: "0 0 4px", color: C.text, fontSize: 15 }}>
              Eget inlogg för {nickname || "barnet"}
            </h3>
            <p style={{ color: C.muted, fontSize: 12, margin: "0 0 10px" }}>
              Bjud in barnet med en e-post — de skapar sitt eget lösenord och loggar in på sin
              egen enhet. Lämna tomt för att barnet ska använda föräldraenhet-läget.
            </p>
            {editing?.auth_user_id ? (
              <div style={{ display: "grid", gap: 10 }}>
                <div
                  style={{
                    padding: "10px 12px",
                    background: `${C.green}15`,
                    border: `1px solid ${C.green}55`,
                    borderRadius: 10,
                    color: C.green,
                    fontSize: 13,
                    fontWeight: 700
                  }}
                >
                  ✓ Aktiverat — {editing.email}
                </div>
                <button
                  onClick={() => void resetChildPassword()}
                  type="button"
                  style={{
                    background: "transparent",
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: "10px 12px",
                    color: C.text,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 700
                  }}
                >
                  📧 Skicka återställningslänk
                </button>
                <p style={{ color: C.muted, fontSize: 11, margin: 0 }}>
                  Lösenord lagras hashat och kan inte visas — använd återställningslänk om
                  barnet glömt.
                </p>
                {resetMsg && (
                  <p style={{ color: C.green, fontSize: 12, margin: 0 }}>{resetMsg}</p>
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={editing?.email ?? "barn@exempel.se"}
                  autoComplete="email"
                />
                <button
                  onClick={() => void sendInvite()}
                  disabled={inviting || inviteEmail.trim().length < 3}
                  type="button"
                  style={{
                    background: C.gold,
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 12px",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 700,
                    opacity: inviting || inviteEmail.trim().length < 3 ? 0.5 : 1
                  }}
                >
                  {inviting ? "Skapar…" : "Skapa inbjudningslänk"}
                </button>
                {inviteLink && (
                  <div
                    style={{
                      padding: "10px 12px",
                      background: `${C.gold}15`,
                      border: `1px solid ${C.gold}55`,
                      borderRadius: 10,
                      display: "grid",
                      gap: 8
                    }}
                  >
                    <div style={{ color: C.text, fontSize: 12, fontWeight: 700 }}>
                      Skicka denna länk till barnet:
                    </div>
                    <div
                      style={{
                        background: "rgba(255,255,255,0.7)",
                        padding: "8px 10px",
                        borderRadius: 8,
                        wordBreak: "break-all",
                        fontSize: 11,
                        color: C.text,
                        fontFamily: "monospace"
                      }}
                    >
                      {inviteLink}
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(inviteLink);
                          setResetMsg("Länk kopierad!");
                          window.setTimeout(() => setResetMsg(null), 1500);
                        } catch {
                          /* clipboard may be blocked; user can long-press */
                        }
                      }}
                      type="button"
                      style={{
                        background: "transparent",
                        border: `1px solid ${C.gold}`,
                        color: C.gold,
                        borderRadius: 8,
                        padding: "6px 12px",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 700
                      }}
                    >
                      📋 Kopiera länk
                    </button>
                    {resetMsg && (
                      <p style={{ color: C.green, fontSize: 12, margin: 0 }}>{resetMsg}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </Kort>
        )}

        {err && <p style={{ color: C.red, fontSize: 13, margin: 0 }}>{err}</p>}

        <Knapp
          title={saving ? "Sparar…" : isEditing ? "Spara ändringar" : "Lägg till barn"}
          onClick={save}
          disabled={!canSubmit}
        />

        {isEditing && (
          <Kort style={{ border: `1px solid ${C.red}44` }}>
            <h3 style={{ margin: "0 0 4px", color: C.red, fontSize: 14 }}>Radera barn (GDPR)</h3>
            <p style={{ color: C.muted, fontSize: 12, margin: "0 0 10px", lineHeight: 1.45 }}>
              Tar bort {nickname || "barnet"} och ALL data permanent: plånbok, uppdragshistorik,
              foton, sparmål och begäran. Kan inte ångras.
            </p>
            <button
              type="button"
              onClick={() => void deleteChild()}
              disabled={deleting}
              style={{
                width: "100%",
                background: "transparent",
                border: `1px solid ${C.red}`,
                borderRadius: 12,
                padding: "10px 14px",
                color: C.red,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                opacity: deleting ? 0.5 : 1
              }}
            >
              {deleting ? "Raderar…" : "🗑 Radera barnet permanent"}
            </button>
          </Kort>
        )}
      </div>
    </Sheet>
  );
}

// Manual coin correction for a single child — bonus, fixup, etc. Lives
// inside the per-child manage sheet so it's scoped to one wallet (no
// child picker). adjust_balance writes an append-only coin_ledger row.
function WalletAdjustCard({ childId, nickname }: { childId: string; nickname: string }) {
  const [amount, setAmount] = useState(10);
  const [direction, setDirection] = useState<"add" | "sub">("add");
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function apply() {
    if (amount < 1 || working) return;
    setWorking(true);
    setErr(null);
    setMsg(null);
    const signed = direction === "add" ? amount : -amount;
    const { error } = await supabase.rpc("adjust_balance", {
      p_child_id: childId,
      p_amount: signed
    });
    setWorking(false);
    if (error) {
      setErr(error.message);
    } else {
      const who = nickname.trim() || "barnet";
      setMsg(
        direction === "add"
          ? `+${amount} 🪙 tillagda till ${who}.`
          : `−${amount} 🪙 dragna från ${who}.`
      );
    }
  }

  return (
    <Kort>
      <h3 style={{ margin: "0 0 4px", color: C.text, fontSize: 15 }}>Korrigera plånbok</h3>
      <p style={{ color: C.muted, fontSize: 12, margin: "0 0 10px" }}>
        Lägg till eller dra bort mynt manuellt — t.ex. för bonus eller rättning.
      </p>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setDirection("add")}
            style={{
              flex: 1,
              padding: "10px 8px",
              background: direction === "add" ? `${C.green}22` : C.surfaceHov,
              border: `${direction === "add" ? 2 : 1}px solid ${
                direction === "add" ? C.green : C.border
              }`,
              borderRadius: 10,
              color: direction === "add" ? C.green : C.text,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            + Lägg till
          </button>
          <button
            onClick={() => setDirection("sub")}
            style={{
              flex: 1,
              padding: "10px 8px",
              background: direction === "sub" ? `${C.red}22` : C.surfaceHov,
              border: `${direction === "sub" ? 2 : 1}px solid ${
                direction === "sub" ? C.red : C.border
              }`,
              borderRadius: 10,
              color: direction === "sub" ? C.red : C.text,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            − Dra bort
          </button>
        </div>
        <div>
          <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 4 }}>
            Antal mynt
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setAmount((a) => Math.max(1, a - 5))} style={limitStepBtn}>
              −5
            </button>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
              style={{
                flex: 1,
                minWidth: 0,
                width: "100%",
                padding: "8px 10px",
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                color: C.gold,
                fontSize: 18,
                fontWeight: 700,
                textAlign: "center",
                fontFamily: "inherit"
              }}
            />
            <button onClick={() => setAmount((a) => a + 5)} style={limitStepBtn}>
              +5
            </button>
          </div>
        </div>
        <Knapp
          title={
            working
              ? "Sparar…"
              : direction === "add"
              ? `Lägg till ${amount} 🪙`
              : `Dra bort ${amount} 🪙`
          }
          onClick={apply}
          disabled={working}
        />
        {msg && <p style={{ color: C.green, fontSize: 13, margin: 0 }}>{msg}</p>}
        {err && <p style={{ color: C.red, fontSize: 13, margin: 0 }}>{err}</p>}
      </div>
    </Kort>
  );
}
