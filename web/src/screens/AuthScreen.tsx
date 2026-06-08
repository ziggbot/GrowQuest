import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import { C } from "../design/tokens";
import { Knapp, Input, Kort, ScreenContainer } from "../design/components";

type Mode = "signin" | "signup" | "child";

const MODE_LABELS: Record<Mode, string> = {
  signin: "Logga in",
  signup: "Skapa konto",
  child: "Barn"
};

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const { setChildId } = useSession();

  const canSubmit =
    !working &&
    email.includes("@") &&
    password.length >= 10 &&
    (mode !== "signup" || password === confirm) &&
    (mode !== "child" || nickname.trim().length >= 1);

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
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // Child mode: sign in as parent, then look up the child by nickname
        // and lock the device to that child's perspective.
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInErr) throw signInErr;
        const userId = signInData.user?.id;
        if (!userId) throw new Error("Inloggning misslyckades.");

        const { data: fm, error: fmErr } = await supabase
          .from("family_members")
          .select("family_id")
          .eq("user_id", userId)
          .maybeSingle();
        if (fmErr) throw fmErr;
        if (!fm?.family_id) throw new Error("Hittade ingen familj för det här kontot.");

        const { data: kids, error: kErr } = await supabase
          .from("child_profiles")
          .select("id, nickname")
          .eq("family_id", fm.family_id);
        if (kErr) throw kErr;

        const target = nickname.trim().toLowerCase();
        const match = (kids ?? []).find((k: any) => k.nickname.toLowerCase() === target);
        if (!match) {
          await supabase.auth.signOut();
          throw new Error(`Inget barn med smeknamnet "${nickname}" hittades.`);
        }
        setChildId(match.id);
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`
      });
      if (error) throw error;
      setInfo(
        `Återställningslänk skickad till ${email}. Klicka på länken i mejlet — du landar tillbaka här och får sätta ett nytt lösenord.`
      );
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <ScreenContainer>
      <div style={{ maxWidth: 420, margin: "0 auto", paddingTop: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h1 style={{ color: C.gold, fontSize: 36, margin: 0, fontWeight: 800, letterSpacing: -0.5 }}>
            GrowQuest
          </h1>
          <p style={{ color: C.muted, fontSize: 14, margin: "8px 0 0" }}>
            {mode === "signin"
              ? "Välkommen tillbaka"
              : mode === "signup"
              ? "Skapa ett föräldrakonto"
              : "Logga in som barn"}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            background: C.surface,
            borderRadius: 14,
            padding: 4,
            marginBottom: 16,
            gap: 2
          }}
        >
          {(["signin", "signup", "child"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: "10px 8px",
                background: mode === m ? C.gold : "transparent",
                color: mode === m ? "#0d1117" : C.text,
                border: "none",
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer"
              }}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        <Kort>
          <div style={{ display: "grid", gap: 10 }}>
            {mode === "child" && (
              <>
                <Input
                  type="text"
                  placeholder="Ditt smeknamn"
                  autoComplete="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
                <p style={{ color: C.muted, fontSize: 11, margin: "-4px 0 4px" }}>
                  En förälder måste först ha lagt till dig.
                </p>
              </>
            )}
            <Input
              type="email"
              placeholder={mode === "child" ? "Förälderns e-post" : "E-post"}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder={
                mode === "signup"
                  ? "Lösenord (minst 10 tecken)"
                  : mode === "child"
                  ? "Förälderns lösenord"
                  : "Lösenord"
              }
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
              title={
                working
                  ? "Arbetar…"
                  : mode === "signin"
                  ? "Logga in"
                  : mode === "signup"
                  ? "Skapa konto"
                  : "Logga in som barn"
              }
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
