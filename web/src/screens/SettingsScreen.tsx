import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import type { ChildProfile, ProfileConfig } from "../lib/types";
import { C } from "../design/tokens";
import { Kort, Knapp, Input, ScreenContainer } from "../design/components";
import { AddChildSheet } from "./AddChildSheet";
import { getMuted, setMuted, playPop } from "../design/sounds";
import { CoinRain } from "../design/lottie";

export function SettingsScreen() {
  const nav = useNavigate();
  const { user, familyId } = useSession();
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

  async function toggleOptIn(child: ChildProfile, value: boolean) {
    setErr(null);
    // Optimistic update so the tick feels instant
    setChildren((cs) =>
      cs.map((c) => (c.id === child.id ? { ...c, global_leaderboard_opt_in: value } : c))
    );
    const { data, error } = await supabase
      .from("child_profiles")
      .update({ global_leaderboard_opt_in: value })
      .eq("id", child.id)
      .select("id, global_leaderboard_opt_in");
    console.log("[Settings] toggleOptIn response:", {
      requestedValue: value,
      childId: child.id,
      error,
      data
    });
    if (error) {
      console.error("toggleOptIn failed", error);
      setErr(`Kunde inte spara: ${error.message}`);
      void reload();
      return;
    }
    if (!data || data.length === 0) {
      console.error("toggleOptIn returned no rows", { childId: child.id });
      setErr("Sparades inte (inga rader uppdaterade). Migrationen kanske inte är klar än.");
      void reload();
      return;
    }
    // Sync local state to the actual server value (so a silent server-side
    // rewrite is visible, not papered over by the optimistic update).
    const serverValue = data[0].global_leaderboard_opt_in;
    setChildren((cs) =>
      cs.map((c) => (c.id === child.id ? { ...c, global_leaderboard_opt_in: serverValue } : c))
    );
    if (serverValue !== value) {
      setErr(
        `Servern returnerade ${serverValue} fast vi skickade ${value}. Kolla console för detaljer.`
      );
    }
  }

  if (!familyId) {
    return (
      <ScreenContainer>
        <p style={{ color: C.muted, textAlign: "center", marginTop: 80 }}>Laddar…</p>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <div style={{ maxWidth: 480, margin: "0 auto", display: "grid", gap: 16 }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", padding: "4px 0 8px", gap: 12 }}>
          <button
            onClick={() => nav("/")}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 999,
              padding: "8px 14px",
              color: C.text,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              boxShadow: C.shadowSoft
            }}
          >
            ‹ Tillbaka
          </button>
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
                  onToggleOptIn={(v) => void toggleOptIn(c, v)}
                />
              ))}
            </div>
          )}
          <div style={{ marginTop: 14 }}>
            <Knapp title="+ Lägg till barn" onClick={() => setShowAdd(true)} />
          </div>
        </Kort>

        {/* Daily screen-time limit */}
        {familyId && <DailyLimitCard familyId={familyId} />}

        {/* Sounds */}
        <SoundsCard />

        {/* Password */}
        <PasswordCard email={user?.email ?? null} />

        {/* About */}
        <Kort>
          <h3 style={{ margin: "0 0 8px", color: C.text }}>Om</h3>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
            GrowQuest · {user?.email}
          </p>
        </Kort>
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

function ChildRow({
  child,
  onEdit,
  onToggleOptIn
}: {
  child: ChildProfile;
  onEdit: () => void;
  onToggleOptIn: (value: boolean) => void;
}) {
  return (
    <div
      style={{
        background: C.surfaceHov,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 12,
        display: "grid",
        gap: 10
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 32 }}>{child.avatar_emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>{child.nickname}</div>
          <div style={{ color: C.muted, fontSize: 12 }}>{child.age_band ?? "—"}</div>
        </div>
        <button
          onClick={onEdit}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "6px 12px",
            color: C.text,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600
          }}
        >
          Ändra
        </button>
      </div>

      <div
        role="button"
        onClick={() => onToggleOptIn(!child.global_leaderboard_opt_in)}
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
          checked={Boolean(child.global_leaderboard_opt_in)}
          readOnly
          style={{ width: 18, height: 18, accentColor: C.gold, margin: 0 }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>
            Visa i global topplista
          </div>
          <div style={{ color: C.muted, fontSize: 11 }}>
            Tillåt att {child.nickname}s mynt syns på den globala superäventyrar-listan.
          </div>
        </div>
      </div>
    </div>
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

function PasswordCard({ email }: { email: string | null }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = !saving && pw.length >= 8 && pw === confirm;
  const mismatch = pw.length > 0 && confirm.length > 0 && pw !== confirm;

  async function changePassword() {
    if (!canSubmit) return;
    setSaving(true);
    setErr(null);
    setMsg(null);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) {
      setErr(error.message);
    } else {
      setMsg("Lösenord uppdaterat.");
      setPw("");
      setConfirm("");
    }
  }

  return (
    <Kort>
      <h3 style={{ margin: "0 0 4px", color: C.text }}>Mitt lösenord</h3>
      {email && (
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>{email}</div>
      )}
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
        {msg && <p style={{ color: C.green, fontSize: 13, margin: 0 }}>{msg}</p>}
        <Knapp
          title={saving ? "Sparar…" : "Byt lösenord"}
          onClick={changePassword}
          disabled={!canSubmit}
        />
      </div>
    </Kort>
  );
}
