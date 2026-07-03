import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import type { ChildProfile } from "../lib/types";
import { C } from "../design/tokens";
import { Kort, Knapp, Input, ScreenContainer } from "../design/components";
import { Avatar } from "../design/Avatar";
import { AddChildSheet } from "./AddChildSheet";
import { Sheet } from "./Sheet";
import { BackButton } from "../design/BackButton";
import { getMuted, setMuted, playPop } from "../design/sounds";
import {
  enableNotifications,
  disableNotifications,
  notificationsEnabled,
  notificationsPermission
} from "../lib/notifications";
import { CoinRain } from "../design/lottie";
import { APP_VERSION, BUILD_TIME } from "../lib/version";
import { CHILD_PROFILE_COLS } from "../lib/columns";

export function SettingsScreen() {
  const nav = useNavigate();
  const { user, familyId, signOut } = useSession();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<ChildProfile | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    if (!familyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("child_profiles")
      .select(CHILD_PROFILE_COLS)
      .eq("family_id", familyId)
      .order("created_at");
    setLoading(false);
    if (error) setErr(error.message);
    else setChildren((data ?? []) as unknown as ChildProfile[]);
  }

  useEffect(() => {
    void reload();
  }, [familyId]);

  if (!familyId) {
    return (
      <ScreenContainer>
        <p style={{ color: C.muted, textAlign: "center", marginTop: 80 }}>Laddar…</p>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 16,
          boxSizing: "border-box",
          minWidth: 0
        }}
      >
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", padding: "4px 0 8px", gap: 12 }}>
          <BackButton onClick={() => nav("/")} />
          <h2 style={{ margin: 0, flex: 1, color: C.text, fontSize: 20, fontWeight: 800 }}>
            Inställningar
          </h2>
        </div>

        {err && <p style={{ color: C.red, fontSize: 13 }}>{err}</p>}

        {/* Children */}
        <Kort>
          <h3 style={{ margin: "0 0 12px", color: C.text }}>Barn</h3>
          {loading && children.length === 0 ? (
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Laddar…</p>
          ) : children.length === 0 ? (
            <p style={{ color: C.muted, fontSize: 13, margin: "0 0 12px" }}>
              Inga barn ännu.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {children.map((c) => (
                <ChildRow
                  key={c.id}
                  child={c}
                  onEdit={() => setEditing(c)}
                />
              ))}
            </div>
          )}
          <div style={{ marginTop: 14 }}>
            <Knapp title="+ Lägg till barn" onClick={() => setShowAdd(true)} />
          </div>
          {children.length > 0 && (
            <p style={{ color: C.muted, fontSize: 11, margin: "12px 0 0", lineHeight: 1.45 }}>
              Skärmtid, ekonomi och plånbok ställer du in per barn — tryck{" "}
              <strong style={{ color: C.text }}>Hantera</strong> på barnet.
            </p>
          )}
        </Kort>

        {/* Notifications */}
        <NotificationsCard />

        {/* Sounds */}
        <SoundsCard />

        {/* Password */}
        <PasswordCardEntry email={user?.email ?? null} />

        {/* Feedback */}
        <FeedbackCard email={user?.email ?? null} />

        {/* About */}
        <Kort>
          <h3 style={{ margin: "0 0 8px", color: C.text }}>Om</h3>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
            Rise · {user?.email}
          </p>
          <p style={{ color: C.muted, fontSize: 11, margin: "6px 0 10px" }}>
            Version {APP_VERSION} · bygge {BUILD_TIME}
          </p>
          <div style={{ display: "flex", gap: 14 }}>
            <a href="/legal/privacy" style={{ color: C.gold, fontSize: 12 }}>
              Integritetspolicy
            </a>
            <a href="/legal/terms" style={{ color: C.gold, fontSize: 12 }}>
              Användarvillkor
            </a>
          </div>
        </Kort>

        {/* Sign out — last in the list */}
        <div style={{ marginTop: 4 }}>
          <button
            onClick={signOut}
            style={{
              width: "100%",
              background: "transparent",
              border: `1px solid ${C.red}55`,
              borderRadius: 12,
              padding: "12px 16px",
              color: C.red,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer"
            }}
          >
            Logga ut
          </button>
        </div>
      </div>

      {showAdd && (
        <AddChildSheet
          familyId={familyId}
          onClose={() => setShowAdd(false)}
          onSaved={(c) => {
            setChildren((cs) => [...cs, c]);
            setShowAdd(false);
          }}
        />
      )}

      {editing && (
        <AddChildSheet
          familyId={familyId}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(c) => {
            setChildren((cs) => cs.map((x) => (x.id === c.id ? c : x)));
            setEditing(null);
          }}
          onDeleted={(childId) => {
            setChildren((cs) => cs.filter((x) => x.id !== childId));
            setEditing(null);
          }}
        />
      )}
    </ScreenContainer>
  );
}

function ChildRow({ child, onEdit }: { child: ChildProfile; onEdit: () => void }) {
  return (
    <div
      style={{
        background: C.surfaceHov,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 12,
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxSizing: "border-box",
        width: "100%"
      }}
    >
      <Avatar child={child} size={42} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            color: C.text,
            fontSize: 15,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}
        >
          {child.nickname}
        </div>
        <div style={{ color: C.muted, fontSize: 12 }}>{child.age_band ?? "—"}</div>
      </div>
      <button
        onClick={onEdit}
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
        Hantera
      </button>
    </div>
  );
}

function NotificationsCard() {
  const [enabled, setEnabledState] = useState(notificationsEnabled());
  const [perm, setPerm] = useState(notificationsPermission());
  const [err, setErr] = useState<string | null>(null);

  async function toggle() {
    setErr(null);
    if (enabled) {
      disableNotifications();
      setEnabledState(false);
      return;
    }
    const result = await enableNotifications();
    setPerm(notificationsPermission());
    if (result.ok) {
      setEnabledState(true);
    } else if (result.reason === "denied") {
      setErr(
        "Notiser är blockerade i webbläsaren. Tillåt dem för den här sidan i webbläsarens inställningar och prova igen."
      );
    } else if (result.reason === "unsupported") {
      setErr("Den här webbläsaren stödjer inte notiser.");
    }
  }

  const unsupported = perm === "unsupported";

  return (
    <Kort>
      <h3 style={{ margin: "0 0 8px", color: C.text }}>Notiser</h3>
      <div
        role="button"
        onClick={() => {
          if (unsupported) return;
          void toggle();
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 10px",
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          cursor: unsupported ? "not-allowed" : "pointer",
          opacity: unsupported ? 0.6 : 1
        }}
      >
        <input
          type="checkbox"
          checked={enabled}
          readOnly
          disabled={unsupported}
          style={{ width: 18, height: 18, accentColor: C.gold, margin: 0 }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>Skicka popup-notiser</div>
          <div style={{ color: C.muted, fontSize: 11 }}>
            Få ett popup-meddelande när barnet skickar in ett uppdrag eller en
            skärmtids-/pengabegäran.
          </div>
        </div>
      </div>
      {unsupported && (
        <p style={{ color: C.muted, fontSize: 11, margin: "8px 0 0" }}>
          Din webbläsare stödjer inte notiser. På iOS måste appen läggas till på hemskärmen.
        </p>
      )}
      {err && <p style={{ color: C.red, fontSize: 12, margin: "8px 0 0" }}>{err}</p>}
    </Kort>
  );
}

function SoundsCard() {
  const [muted, setMutedState] = useState(getMuted());
  const [testRain, setTestRain] = useState(false);
  return (
    <Kort>
      <h3 style={{ margin: "0 0 8px", color: C.text }}>Ljud</h3>
      <div
        role="button"
        onClick={() => {
          const next = !muted;
          setMuted(next);
          setMutedState(next);
          if (!next) playPop();
        }}
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
          checked={!muted}
          readOnly
          style={{ width: 18, height: 18, accentColor: C.gold, margin: 0 }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>Ljudeffekter</div>
          <div style={{ color: C.muted, fontSize: 11 }}>
            Mynt-klink vid godkända uppdrag, klick-pop när du växlar flik.
          </div>
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <Knapp title="🧪 Testa myntregn" onClick={() => setTestRain(true)} style="secondary" />
      </div>
      {testRain && <CoinRain onDone={() => setTestRain(false)} />}
    </Kort>
  );
}

function FeedbackCard({ email }: { email: string | null }) {
  // Pre-filled mailto so beta testers can report without friction. The
  // version + build land in the body so we know what they were running.
  const subject = encodeURIComponent("Rise feedback");
  const body = encodeURIComponent(
    `\n\n---\nBerätta vad du gjorde, vad du förväntade dig och vad som hände.\n` +
      `Skicka gärna en skärmbild.\n\n` +
      `(Teknisk info — radera inte)\n` +
      `Version: ${APP_VERSION}\n` +
      `Bygge: ${BUILD_TIME}\n` +
      `Konto: ${email ?? "okänt"}\n` +
      `Enhet: ${typeof navigator !== "undefined" ? navigator.userAgent : "okänd"}`
  );
  const href = `mailto:peter.gbg.andersson@gmail.com?subject=${subject}&body=${body}`;

  return (
    <Kort>
      <h3 style={{ margin: "0 0 4px", color: C.text }}>Tyck till</h3>
      <p style={{ color: C.muted, fontSize: 12, margin: "0 0 12px" }}>
        Hittat en bugg eller har en idé? Vi läser allt — det hjälper oss göra appen bättre.
      </p>
      <a href={href} style={{ textDecoration: "none" }}>
        <div
          style={{
            width: "100%",
            boxSizing: "border-box",
            textAlign: "center",
            background: C.gold,
            borderRadius: 12,
            padding: "12px 16px",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14
          }}
        >
          ✉️ Skicka feedback
        </div>
      </a>
    </Kort>
  );
}

function PasswordCardEntry({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Kort>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, color: C.text }}>Mitt lösenord</h3>
            {email && <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{email}</div>}
          </div>
          <button
            onClick={() => setOpen(true)}
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
            Byt lösenord
          </button>
        </div>
      </Kort>
      {open && email && (
        <ChangePasswordSheet email={email} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function ChangePasswordSheet({ email, onClose }: { email: string; onClose: () => void }) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const mismatch = newPw.length > 0 && confirm.length > 0 && newPw !== confirm;
  const canSubmit =
    !saving &&
    currentPw.length >= 1 &&
    newPw.length >= 10 &&
    newPw === confirm &&
    newPw !== currentPw;

  async function save() {
    if (!canSubmit) return;
    setSaving(true);
    setErr(null);
    setMsg(null);
    // Verify the current password by signing in with it. If it fails we
    // bail before issuing the update. The signInWithPassword call refreshes
    // the existing session, so we don't lose auth state on success.
    const { error: signinErr } = await supabase.auth.signInWithPassword({
      email,
      password: currentPw
    });
    if (signinErr) {
      setSaving(false);
      setErr("Nuvarande lösenord stämmer inte.");
      return;
    }
    const { error: updErr } = await supabase.auth.updateUser({ password: newPw });
    setSaving(false);
    if (updErr) {
      setErr(updErr.message);
      return;
    }
    setMsg("Lösenordet är uppdaterat.");
    setCurrentPw("");
    setNewPw("");
    setConfirm("");
    window.setTimeout(onClose, 900);
  }

  return (
    <Sheet title="Byt lösenord" onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <Kort>
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 4 }}>
                Nuvarande lösenord
              </label>
              <Input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Bekräfta att det är du"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 4 }}>
                Nytt lösenord
              </label>
              <Input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Minst 10 tecken"
                autoComplete="new-password"
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
              <p style={{ color: C.red, fontSize: 12, margin: 0 }}>De nya lösenorden matchar inte.</p>
            )}
            {err && <p style={{ color: C.red, fontSize: 13, margin: 0 }}>{err}</p>}
            {msg && <p style={{ color: C.green, fontSize: 13, margin: 0 }}>{msg}</p>}
          </div>
        </Kort>
        <Knapp
          title={saving ? "Sparar…" : "Byt lösenord"}
          onClick={save}
          disabled={!canSubmit}
        />
      </div>
    </Sheet>
  );
}
