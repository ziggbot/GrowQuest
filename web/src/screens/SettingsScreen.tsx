import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import type { ChildProfile, ProfileConfig } from "../lib/types";
import { C } from "../design/tokens";
import { Kort, Knapp, Input, ScreenContainer } from "../design/components";
import { Avatar } from "../design/Avatar";
import { AddChildSheet } from "./AddChildSheet";
import { Sheet } from "./Sheet";
import { BackButton } from "../design/BackButton";
import { getMuted, setMuted, playPop } from "../design/sounds";
import { CoinRain } from "../design/lottie";

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
      .select("id, family_id, nickname, avatar_emoji, age_band, global_leaderboard_opt_in")
      .eq("family_id", familyId)
      .order("created_at");
    setLoading(false);
    console.log("[Settings] reload result:", {
      error,
      rows: data?.map((c) => ({ id: c.id, opt_in: c.global_leaderboard_opt_in }))
    });
    if (error) setErr(error.message);
    else setChildren((data ?? []) as ChildProfile[]);
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
        </Kort>

        {/* Wallet adjustment */}
        {children.length > 0 && <WalletAdjustCard children={children} />}

        {/* Sounds */}
        <SoundsCard />

        {/* Password */}
        <PasswordCardEntry email={user?.email ?? null} />

        {/* About */}
        <Kort>
          <h3 style={{ margin: "0 0 8px", color: C.text }}>Om</h3>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
            GrowQuest · {user?.email}
          </p>
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

function WalletAdjustCard({ children }: { children: ChildProfile[] }) {
  const [childId, setChildId] = useState(children[0]?.id ?? "");
  const [amount, setAmount] = useState(10);
  const [direction, setDirection] = useState<"add" | "sub">("add");
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function apply() {
    if (!childId || amount < 1 || working) return;
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
      const child = children.find((c) => c.id === childId);
      setMsg(
        direction === "add"
          ? `+${amount} 🪙 tillagda till ${child?.nickname ?? "barnet"}.`
          : `−${amount} 🪙 dragna från ${child?.nickname ?? "barnet"}.`
      );
    }
  }

  return (
    <Kort>
      <h3 style={{ margin: "0 0 4px", color: C.text }}>Korrigera plånbok</h3>
      <p style={{ color: C.muted, fontSize: 12, margin: "0 0 10px" }}>
        Lägg till eller dra bort mynt manuellt — t.ex. för bonus eller rättning.
      </p>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Barn</label>
          <select
            value={childId}
            onChange={(e) => setChildId(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              color: C.text,
              fontSize: 14,
              fontFamily: "inherit"
            }}
          >
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.avatar_emoji} {c.nickname}
              </option>
            ))}
          </select>
        </div>
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
          <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Antal mynt</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setAmount((a) => Math.max(1, a - 5))}
              style={stepBtn}
            >
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
            <button
              onClick={() => setAmount((a) => a + 5)}
              style={stepBtn}
            >
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

function DailyLimitCard({ familyId }: { familyId: string }) {
  const [config, setConfig] = useState<ProfileConfig | null>(null);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("profile_configs")
        .select("*")
        .eq("family_id", familyId)
        .maybeSingle();
      setConfig((data as ProfileConfig | null) ?? null);
    })();
  }, [familyId]);

  async function save(nextMinutes: number) {
    if (!config || pending) return;
    setPending(true);
    setErr(null);
    setSaved(false);
    const clamped = Math.max(0, Math.min(600, nextMinutes));
    const prev = config.daily_limit_minutes;
    setConfig({ ...config, daily_limit_minutes: clamped });
    const { error } = await supabase
      .from("profile_configs")
      .update({ daily_limit_minutes: clamped })
      .eq("family_id", familyId);
    setPending(false);
    if (error) {
      setConfig({ ...config, daily_limit_minutes: prev });
      setErr(error.message);
    } else {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1200);
    }
  }

  if (!config) {
    return (
      <Kort>
        <h3 style={{ margin: "0 0 8px", color: C.text }}>Skärmtid per dag</h3>
        <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Laddar…</p>
      </Kort>
    );
  }

  const minutes = config.daily_limit_minutes;
  return (
    <Kort>
      <h3 style={{ margin: "0 0 4px", color: C.text }}>Skärmtid per dag</h3>
      <p style={{ color: C.muted, fontSize: 12, margin: "0 0 10px" }}>
        Max-gräns för hur mycket skärmtid barnet kan låsa upp varje dygn.
        Begäran som överskrider gränsen avslås automatiskt.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => void save(minutes - 15)}
          disabled={pending || minutes <= 0}
          style={stepBtn}
        >
          −15
        </button>
        <div
          style={{
            flex: 1,
            textAlign: "center",
            color: C.purple,
            fontWeight: 800,
            fontSize: 22
          }}
        >
          {minutes} min
        </div>
        <button
          onClick={() => void save(minutes + 15)}
          disabled={pending || minutes >= 600}
          style={stepBtn}
        >
          +15
        </button>
      </div>
      <div style={{ color: C.muted, fontSize: 11, marginTop: 6, textAlign: "center" }}>
        {saved ? "Sparat ✓" : `${(minutes / 60).toFixed(1)} timmar`}
      </div>
      {err && <p style={{ color: C.red, fontSize: 13, margin: "8px 0 0" }}>{err}</p>}
    </Kort>
  );
}

const stepBtn: React.CSSProperties = {
  padding: "8px 14px",
  background: C.surfaceHov,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  color: C.text,
  cursor: "pointer",
  minWidth: 56,
  fontSize: 14,
  fontWeight: 700
};

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
    newPw.length >= 8 &&
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
                placeholder="Minst 8 tecken"
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
