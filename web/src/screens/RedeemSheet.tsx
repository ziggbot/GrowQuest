import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { ChildProfile } from "../lib/types";
import { estimateScreenTimeCost } from "../lib/templates";
import { APP_OPTIONS } from "../lib/apps";
import { C } from "../design/tokens";
import { Kort, Knapp } from "../design/components";
import { Sheet } from "./Sheet";

const OPTIONS = [15, 30, 60];

export function RedeemSheet({
  child,
  multiplier,
  dailyLimit,
  usedToday,
  onClose,
  onRedeemed
}: {
  child: ChildProfile;
  multiplier: number;
  dailyLimit: number;
  usedToday: number;
  onClose: () => void;
  onRedeemed: () => void;
}) {
  const [minutes, setMinutes] = useState(30);
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set(["screen_time"]));
  const [otherApp, setOtherApp] = useState("");
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cost = estimateScreenTimeCost(minutes, multiplier);
  const leftToday = Math.max(0, dailyLimit - usedToday);
  const fitsLimit = minutes <= leftToday;
  const trimmedOther = otherApp.trim();
  const hasSelection = selectedApps.size > 0 || trimmedOther.length > 0;

  function toggleApp(id: string) {
    setSelectedApps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function redeem() {
    if (!fitsLimit || !hasSelection) return;
    setWorking(true);
    setErr(null);
    try {
      const { error } = await supabase.rpc("redeem_screen_time", {
        p_child_id: child.id,
        p_minutes: minutes,
        p_requested_apps: selectedApps.size > 0 ? Array.from(selectedApps) : null,
        p_other_app: trimmedOther.length > 0 ? trimmedOther : null
      });
      if (error) throw error;
      onRedeemed();
    } catch (e) {
      const msg = (e as Error).message;
      // The RPC raises a Swedish "Dagens skärmtidsgräns…" message when
      // the parent's daily limit would be exceeded. The older deploy may
      // still emit the English "daily limit exceeded" string; translate
      // it so the kid sees a clear note either way.
      if (/daily limit exceeded|skärmtidsgräns/i.test(msg)) {
        setErr(
          `Max-gränsen för daglig skärmtid (${dailyLimit} min) är nådd. Begäran avslås — försök igen i morgon.`
        );
      } else {
        setErr(msg);
      }
    } finally {
      setWorking(false);
    }
  }

  return (
    <Sheet title="Begär skärmtid" onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>
        <Kort>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, color: C.muted }}>
              {child.avatar_emoji} {child.nickname} skickar en begäran till föräldern.
            </div>
          </div>
        </Kort>

        <Kort>
          <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 8 }}>Hur länge?</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {OPTIONS.map((opt) => {
              const isOn = minutes === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setMinutes(opt)}
                  style={{
                    padding: 14,
                    background: isOn ? `${C.purple}33` : C.surfaceHov,
                    border: `${isOn ? 2 : 1}px solid ${isOn ? C.purple : C.border}`,
                    borderRadius: 12,
                    cursor: "pointer",
                    color: isOn ? C.purple : C.text,
                    fontWeight: 700
                  }}
                >
                  <div style={{ fontSize: 22 }}>{opt}</div>
                  <div style={{ fontSize: 11 }}>min</div>
                </button>
              );
            })}
          </div>
        </Kort>

        <Kort>
          <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 8 }}>
            Vad vill du använda tiden till?
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            {APP_OPTIONS.map((app) => {
              const isOn = selectedApps.has(app.id);
              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => toggleApp(app.id)}
                  style={{
                    padding: "10px 12px",
                    background: isOn ? `${C.gold}22` : C.surfaceHov,
                    border: `${isOn ? 2 : 1}px solid ${isOn ? C.gold : C.border}`,
                    borderRadius: 12,
                    cursor: "pointer",
                    color: isOn ? C.gold : C.text,
                    fontWeight: 700,
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    textAlign: "left"
                  }}
                >
                  <span style={{ fontSize: 20 }}>{app.icon}</span>
                  <span>{app.label}</span>
                </button>
              );
            })}
          </div>
          <label
            style={{
              color: C.muted,
              fontSize: 12,
              display: "block",
              marginTop: 12,
              marginBottom: 4
            }}
          >
            Övrigt
          </label>
          <input
            type="text"
            value={otherApp}
            onChange={(e) => setOtherApp(e.target.value)}
            placeholder="T.ex. Minecraft"
            maxLength={100}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              color: C.text,
              fontSize: 14,
              fontFamily: "inherit"
            }}
          />
        </Kort>

        <Kort>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: C.muted }}>Kostnad</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: C.gold }}>{cost} 🪙</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Kvar idag: {leftToday} min</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
              Mynten dras direkt och återbetalas om föräldern avslår.
            </div>
          </div>
        </Kort>

        {leftToday <= 0 ? (
          <Kort style={{ background: `${C.red}11`, border: `1px solid ${C.red}55` }}>
            <p style={{ color: C.red, fontSize: 14, margin: 0, fontWeight: 700 }}>
              🚫 Max-gränsen för daglig skärmtid ({dailyLimit} min) är nådd.
            </p>
            <p style={{ color: C.red, fontSize: 12, margin: "4px 0 0" }}>
              Begäran avslås automatiskt. Försök igen i morgon.
            </p>
          </Kort>
        ) : !fitsLimit && (
          <p style={{ color: C.red, fontSize: 13, margin: 0 }}>
            Den valda tiden överskrider dagens gräns.
          </p>
        )}
        {!hasSelection && (
          <p style={{ color: C.red, fontSize: 13, margin: 0 }}>
            Välj minst en app eller skriv något under Övrigt.
          </p>
        )}
        {err && <p style={{ color: C.red, fontSize: 13, margin: 0 }}>{err}</p>}

        <Knapp
          title={working ? "Skickar…" : "Skicka begäran"}
          onClick={redeem}
          disabled={working || !fitsLimit || !hasSelection}
        />
      </div>
    </Sheet>
  );
}
