import { useState } from "react";
import { supabase } from "../lib/supabase";
import { C } from "../design/tokens";
import { Knapp, Input, Kort, ScreenContainer } from "../design/components";

type Mode = "signin" | "signup";

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const canSubmit =
    !working &&
    email.includes("@") &&
    password.length >= 10 &&
    (mode === "signin" || password === confirm);

  async function submit() {
    if (!canSubmit) return;
    setErr(null);
    setInfo(null);
    setWorking(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo("Klart! Om e-postbekräftelse är på, kolla din inkorg.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      const msg = (e as Error).message;
      if (/invalid login/i.test(msg)) setErr("Fel e-post eller lösenord.");
      else if (/already registered/i.test(msg)) setErr("E-postadressen är redan registrerad.");
      else setErr(msg);
    } finally {
      setWorking(false);
    }
  }

  async function reset() {
    if (!email.includes("@")) {
      setErr("Skriv din e-postadress först.");
      return;
    }
    setErr(null);
    setInfo(null);
    setWorking(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setInfo("Återställningslänk skickad till " + email + ".");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <ScreenContainer>
      <div style={{ maxWidth: 420, margin: "0 auto", paddingTop: 40 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ color: C.gold, fontSize: 36, margin: 0, fontWeight: 800, letterSpacing: -0.5 }}>
            GrowQuest
          </h1>
          <p style={{ color: C.muted, fontSize: 14, margin: "8px 0 0" }}>
            {mode === "signin" ? "Välkommen tillbaka" : "Skapa ett föräldrakonto"}
          </p>
        </div>

        <div style={{ display: "flex", background: C.surface, borderRadius: 14, padding: 4, marginBottom: 16 }}>
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: "10px 12px",
                background: mode === m ? C.gold : "transparent",
                color: mode === m ? "#0d1117" : C.text,
                border: "none",
                borderRadius: 10,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              {m === "signin" ? "Logga in" : "Skapa konto"}
            </button>
          ))}
        </div>

        <Kort>
          <div style={{ display: "grid", gap: 10 }}>
            <Input
              type="email"
              placeholder="E-post"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder={mode === "signup" ? "Lösenord (minst 10 tecken)" : "Lösenord"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === "signup" && (
              <Input
                type="password"
                placeholder="Bekräfta lösenord"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            )}
            <Knapp
              title={working ? "Arbetar…" : mode === "signin" ? "Logga in" : "Skapa konto"}
              onClick={submit}
              disabled={!canSubmit}
            />
          </div>
        </Kort>

        {mode === "signin" && (
          <button
            onClick={reset}
            disabled={working}
            style={{
              background: "none",
              border: "none",
              color: C.muted,
              fontSize: 13,
              marginTop: 12,
              cursor: "pointer",
              width: "100%",
              textAlign: "center"
            }}
          >
            Glömt lösenord?
          </button>
        )}

        {info && <p style={{ color: C.green, fontSize: 13, marginTop: 12, textAlign: "center" }}>{info}</p>}
        {err && <p style={{ color: C.red, fontSize: 13, marginTop: 12, textAlign: "center" }}>{err}</p>}
      </div>
    </ScreenContainer>
  );
}
