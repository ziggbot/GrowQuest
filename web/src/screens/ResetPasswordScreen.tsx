import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import { C } from "../design/tokens";
import { Kort, Knapp, Input, ScreenContainer } from "../design/components";

// Shown after the user clicks the "Återställ lösenord"-link in their
// email. Supabase has already exchanged the recovery token by the time
// we mount here (PASSWORD_RECOVERY event was fired in session.tsx), so
// we just need to capture the new password and write it.

export function ResetPasswordScreen() {
  const { clearRecovery, signOut } = useSession();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mismatch = pw.length > 0 && confirm.length > 0 && pw !== confirm;
  const canSubmit = !saving && pw.length >= 8 && pw === confirm;

  async function save() {
    if (!canSubmit) return;
    setSaving(true);
    setErr(null);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setDone(true);
    clearRecovery();
  }

  return (
    <ScreenContainer>
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          margin: "0 auto",
          display: "grid",
          gap: 16,
          paddingTop: 40
        }}
      >
        <Kort>
          <div style={{ textAlign: "center", marginBottom: 6 }}>
            <div style={{ fontSize: 40 }}>🔑</div>
          </div>
          <h2 style={{ margin: "0 0 6px", color: C.text, textAlign: "center" }}>
            Sätt nytt lösenord
          </h2>
          <p style={{ color: C.muted, fontSize: 13, textAlign: "center", margin: "0 0 16px" }}>
            Du har följt återställningslänken. Välj ett nytt lösenord nedan.
          </p>

          {done ? (
            <div style={{ display: "grid", gap: 10 }}>
              <p style={{ color: C.green, fontWeight: 700, fontSize: 14, margin: 0 }}>
                Lösenordet är uppdaterat. Logga in igen.
              </p>
              <Knapp
                title="Till inloggning"
                onClick={async () => {
                  await signOut();
                }}
              />
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 4 }}>
                  Nytt lösenord
                </label>
                <Input
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="Minst 8 tecken"
                  autoComplete="new-password"
                  autoFocus
                />
              </div>
              <div>
                <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 4 }}>
                  Bekräfta nytt lösenord
                </label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Skriv igen"
                  autoComplete="new-password"
                />
              </div>
              {mismatch && (
                <p style={{ color: C.red, fontSize: 12, margin: 0 }}>Lösenorden matchar inte.</p>
              )}
              {err && <p style={{ color: C.red, fontSize: 13, margin: 0 }}>{err}</p>}
              <Knapp
                title={saving ? "Sparar…" : "Spara nytt lösenord"}
                onClick={save}
                disabled={!canSubmit}
              />
            </div>
          )}
        </Kort>
      </div>
    </ScreenContainer>
  );
}
