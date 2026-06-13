import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { C } from "../design/tokens";
import { Kort, Knapp, Input, ScreenContainer } from "../design/components";

// Public screen reached via /join?token=… — the invite token the
// parent shared. We peek at the token (no auth) to show the child
// who's inviting them, then sign them up with the invite's email
// and a password they choose, then link the auth user to the
// child_profiles row via accept_child_invite.

interface InvitePeek {
  valid: true;
  email: string;
  nickname: string;
  avatar_emoji: string;
}
interface InviteInvalid {
  valid: false;
  reason: string;
}

export function JoinScreen() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = params.get("token") ?? "";
  const [peek, setPeek] = useState<InvitePeek | InviteInvalid | null>(null);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Set when email confirmation is on and we've sent the verification
  // mail but the account isn't usable yet.
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  useEffect(() => {
    if (!token) {
      setPeek({ valid: false, reason: "no_token" });
      return;
    }
    void (async () => {
      const { data, error } = await supabase.rpc("peek_child_invite", { p_token: token });
      if (error) {
        setPeek({ valid: false, reason: error.message });
        return;
      }
      setPeek(data as InvitePeek | InviteInvalid);
    })();
  }, [token]);

  // If the child arrives here already signed in (e.g. they clicked the
  // email-confirmation link, which lands them back on /join authed),
  // finish claiming the profile automatically.
  useEffect(() => {
    if (!token || peek?.valid !== true) return;
    void (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const sessionEmail = sess.session?.user.email?.toLowerCase();
      if (sessionEmail && sessionEmail === peek.email.toLowerCase()) {
        const { error: acceptErr } = await supabase.rpc("accept_child_invite", {
          p_token: token
        });
        if (!acceptErr) {
          setDone(true);
          window.setTimeout(() => nav("/"), 800);
        }
      }
    })();
  }, [token, peek, nav]);

  const mismatch = pw.length > 0 && confirm.length > 0 && pw !== confirm;
  const canSubmit =
    !working && peek?.valid === true && pw.length >= 8 && pw === confirm;

  async function accept() {
    if (!canSubmit || peek?.valid !== true) return;
    setWorking(true);
    setErr(null);
    try {
      // 1. Sign up with the invite's email. Send any confirmation link
      //    back to this same /join URL so the child returns here authed
      //    and the second effect above completes the claim.
      const { data: signupData, error: signupErr } = await supabase.auth.signUp({
        email: peek.email,
        password: pw,
        options: { emailRedirectTo: `${window.location.origin}/join?token=${token}` }
      });
      if (signupErr && /already.*register/i.test(signupErr.message)) {
        const { error: signinErr } = await supabase.auth.signInWithPassword({
          email: peek.email,
          password: pw
        });
        if (signinErr) throw new Error("Kontot finns redan med ett annat lösenord.");
      } else if (signupErr) {
        throw signupErr;
      }

      // 2. If email confirmation is on, signUp returns no session — the
      //    child must verify their email first. Show the waiting state;
      //    the claim happens when they come back via the email link.
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session && !signupData.session) {
        setAwaitingConfirm(true);
        return;
      }

      // 3. We have a session — claim the child profile now.
      const { error: acceptErr } = await supabase.rpc("accept_child_invite", {
        p_token: token
      });
      if (acceptErr) throw acceptErr;

      setDone(true);
      window.setTimeout(() => nav("/"), 800);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setWorking(false);
    }
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
          {peek === null ? (
            <p style={{ color: C.muted, textAlign: "center", margin: 0 }}>Laddar inbjudan…</p>
          ) : peek.valid === false ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 6 }}>🚫</div>
              <h2 style={{ margin: "0 0 6px", color: C.text }}>Inbjudan ogiltig</h2>
              <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
                {peek.reason === "expired"
                  ? "Länken har gått ut. Be föräldern skapa en ny."
                  : peek.reason === "used"
                  ? "Inbjudan är redan använd."
                  : "Vi hittade ingen aktiv inbjudan för den här länken."}
              </p>
            </div>
          ) : done ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 6 }}>🎉</div>
              <h2 style={{ margin: "0 0 6px", color: C.text }}>Välkommen, {peek.nickname}!</h2>
              <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Tar dig till appen…</p>
            </div>
          ) : awaitingConfirm ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 6 }}>📧</div>
              <h2 style={{ margin: "0 0 6px", color: C.text }}>Bekräfta din e-post</h2>
              <p style={{ color: C.muted, fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                Vi har skickat ett mejl till <strong style={{ color: C.text }}>{peek.email}</strong>.
                Öppna det och klicka på länken — då loggas du in och kommer in i appen.
              </p>
            </div>
          ) : (
            <>
              <div style={{ textAlign: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 56, lineHeight: 1 }}>{peek.avatar_emoji}</div>
                <h2 style={{ margin: "8px 0 4px", color: C.text }}>Hej {peek.nickname}!</h2>
                <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
                  Du har blivit inbjuden till GrowQuest. Skapa ett lösenord för{" "}
                  <strong style={{ color: C.text }}>{peek.email}</strong>.
                </p>
              </div>
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
                    Bekräfta lösenord
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
                  title={working ? "Aktiverar…" : "Skapa konto & logga in"}
                  onClick={accept}
                  disabled={!canSubmit}
                />
              </div>
            </>
          )}
        </Kort>
      </div>
    </ScreenContainer>
  );
}
