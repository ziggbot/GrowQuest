import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import type {
  ChildProfile,
  CoinLedgerEntry,
  ChildProgress,
  ProfileConfig,
  Redemption
} from "../lib/types";
import { currentStadium, nextStadium } from "../lib/karaktar";
import { C, CK } from "../design/tokens";
import {
  Kort,
  Pill,
  Knapp,
  ScreenContainer,
  KortKid,
  PillKid,
  KnappKid,
  ChildScreenContainer
} from "../design/components";
import { RedeemSheet } from "./RedeemSheet";

export function WalletScreen() {
  const { familyId, childId: deviceChildId } = useSession();
  const isChildMode = deviceChildId !== null;
  const nav = useNavigate();
  const { childId } = useParams<{ childId: string }>();
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [balance, setBalance] = useState(0);
  const [entries, setEntries] = useState<CoinLedgerEntry[]>([]);
  const [progress, setProgress] = useState<ChildProgress | null>(null);
  const [config, setConfig] = useState<ProfileConfig | null>(null);
  const [active, setActive] = useState<Redemption | null>(null);
  const [usedToday, setUsedToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showRedeem, setShowRedeem] = useState(false);

  async function reload() {
    if (!familyId || !childId) return;
    setLoading(true);
    setErr(null);
    try {
      const [chRes, balRes, ledRes, prRes, cfgRes, redRes] = await Promise.all([
        supabase.from("child_profiles").select("*").eq("id", childId).single(),
        supabase.from("child_balances").select("*").eq("child_id", childId).maybeSingle(),
        supabase
          .from("coin_ledger")
          .select("*")
          .eq("child_id", childId)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.from("child_progress").select("*").eq("child_id", childId).maybeSingle(),
        supabase.from("profile_configs").select("*").eq("family_id", familyId).maybeSingle(),
        supabase
          .from("redemptions")
          .select("*")
          .eq("child_id", childId)
          .gte("started_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
          .order("started_at", { ascending: false })
      ]);
      if (chRes.error) throw chRes.error;
      setChild(chRes.data as ChildProfile);
      setBalance(((balRes.data as any)?.balance ?? 0) | 0);
      setEntries((ledRes.data ?? []) as CoinLedgerEntry[]);
      setProgress((prRes.data as ChildProgress | null) ?? null);
      setConfig((cfgRes.data as ProfileConfig | null) ?? null);
      const reds = (redRes.data ?? []) as Redemption[];
      setUsedToday(reds.reduce((s, r) => s + r.minutes, 0));
      setActive(reds.find((r) => new Date(r.ends_at) > new Date()) ?? null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [familyId, childId]);

  if (!child && !loading) {
    const Container = isChildMode ? ChildScreenContainer : ScreenContainer;
    return (
      <Container>
        <p style={{ color: isChildMode ? CK.red : C.red, textAlign: "center" }}>
          Barnet kunde inte hittas.
        </p>
        {isChildMode ? (
          <KnappKid title="Tillbaka" onClick={() => nav("/")} />
        ) : (
          <Knapp title="Tillbaka" onClick={() => nav("/")} />
        )}
      </Container>
    );
  }

  const approved = progress?.approved_missions ?? 0;
  const stadium = currentStadium(approved);
  const next = nextStadium(stadium);

  if (isChildMode) {
    return (
      <ChildScreenContainer>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <button
            onClick={() => nav("/")}
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

          {/* Balance hero */}
          <KortKid style={{ textAlign: "center", padding: "24px 16px" }}>
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: "50%",
                background: CK.accentFade,
                display: "grid",
                placeItems: "center",
                margin: "0 auto 8px",
                fontSize: 44
              }}
            >
              {child?.avatar_emoji}
            </div>
            <h2 style={{ margin: "4px 0 6px", color: CK.text, fontWeight: 800 }}>
              {child?.nickname}
            </h2>
            <div
              style={{
                fontSize: 40,
                fontWeight: 900,
                color: CK.gold,
                letterSpacing: -1
              }}
            >
              {balance} 🪙
            </div>
            <div style={{ color: CK.muted, fontSize: 12, marginTop: 2 }}>Saldo</div>
          </KortKid>

          {/* Character stage card */}
          <div
            style={{
              marginTop: 14,
              borderRadius: 22,
              border: `1px solid ${stadium.accentFärg}44`,
              overflow: "hidden",
              position: "relative",
              background: `linear-gradient(180deg, ${stadium.himmel[0]}, ${stadium.himmel[1]})`,
              height: 150,
              boxShadow: CK.shadow
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 32,
                background: stadium.mark,
                borderRadius: "50% 50% 0 0 / 32px 32px 0 0"
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 44,
                textAlign: "center",
                padding: "0 16px"
              }}
            >
              <div style={{ color: stadium.accentFärg, fontWeight: 800, fontSize: 17 }}>
                {stadium.namn}
              </div>
              <div style={{ color: "#ffffff", fontSize: 11, marginTop: 2, opacity: 0.95 }}>
                {stadium.beskrivning}
              </div>
              <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 10, marginTop: 4 }}>
                {next
                  ? `Nästa nivå om ${Math.max(0, next.threshold - approved)} godkända uppdrag`
                  : "🎉 Toppnivå nådd!"}
              </div>
            </div>
          </div>

          {active && (
            <KortKid style={{ marginTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: CK.purpleFade,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 22
                  }}
                >
                  🔓
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: CK.purple, fontWeight: 800 }}>Skärmtid upplåst</div>
                  <div style={{ color: CK.muted, fontSize: 12 }}>
                    {Math.max(
                      0,
                      Math.floor((new Date(active.ends_at).getTime() - Date.now()) / 60000)
                    )}{" "}
                    min kvar
                  </div>
                </div>
              </div>
            </KortKid>
          )}

          {config && balance > 0 && (
            <div style={{ marginTop: 14 }}>
              <KnappKid title="Lös in skärmtid" onClick={() => setShowRedeem(true)} />
            </div>
          )}

          <KortKid style={{ marginTop: 14 }}>
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
              Senaste transaktioner
            </h3>
            {entries.length === 0 ? (
              <p style={{ color: CK.muted, fontSize: 13, margin: 0 }}>Inga transaktioner än.</p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {entries.map((e) => (
                  <div key={e.id} style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ flex: 1, color: CK.textSoft, fontSize: 14 }}>
                      {reasonLabel(e.reason)}
                    </span>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: 14,
                        color: e.amount_mynt >= 0 ? CK.green : CK.red
                      }}
                    >
                      {e.amount_mynt >= 0 ? "+" : ""}
                      {e.amount_mynt} 🪙
                    </span>
                  </div>
                ))}
              </div>
            )}
          </KortKid>

          {err && <p style={{ color: CK.red, fontSize: 13, marginTop: 12 }}>{err}</p>}

          {showRedeem && child && config && (
            <RedeemSheet
              child={child}
              multiplier={config.screen_time_multiplier}
              dailyLimit={config.daily_limit_minutes}
              usedToday={usedToday}
              onClose={() => setShowRedeem(false)}
              onRedeemed={() => {
                setShowRedeem(false);
                void reload();
              }}
            />
          )}
        </div>
      </ChildScreenContainer>
    );
  }

  // Parent view (unchanged dark theme).
  return (
    <ScreenContainer>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <button
          onClick={() => nav("/")}
          style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", marginBottom: 8 }}
        >
          ‹ Tillbaka
        </button>

        <Kort>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, lineHeight: 1 }}>{child?.avatar_emoji}</div>
            <h2 style={{ margin: "8px 0 4px" }}>{child?.nickname}</h2>
            <div style={{ fontSize: 36, fontWeight: 800, color: C.gold }}>{balance} 🪙</div>
          </div>
        </Kort>

        <div
          style={{
            margin: "14px 0 0",
            borderRadius: 18,
            border: `1px solid ${stadium.accentFärg}55`,
            overflow: "hidden",
            position: "relative",
            background: `linear-gradient(180deg, ${stadium.himmel[0]}, ${stadium.himmel[1]})`,
            height: 140
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 28,
              background: stadium.mark,
              borderRadius: "50% 50% 0 0 / 30px 30px 0 0"
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 40,
              textAlign: "center",
              padding: "0 16px"
            }}
          >
            <div style={{ color: stadium.accentFärg, fontWeight: 700, fontSize: 16 }}>{stadium.namn}</div>
            <div style={{ color: C.text, fontSize: 11, marginTop: 2 }}>{stadium.beskrivning}</div>
            <div style={{ color: C.muted, fontSize: 10, marginTop: 4 }}>
              {next
                ? `Nästa nivå om ${Math.max(0, next.threshold - approved)} godkända uppdrag`
                : "🎉 Toppnivå nådd!"}
            </div>
          </div>
        </div>

        {active && (
          <Kort style={{ marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>🔓</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.purple, fontWeight: 700 }}>Skärmtid upplåst</div>
                <div style={{ color: C.muted, fontSize: 12 }}>
                  {Math.max(0, Math.floor((new Date(active.ends_at).getTime() - Date.now()) / 60000))} min kvar
                </div>
              </div>
            </div>
          </Kort>
        )}

        {config && balance > 0 && (
          <div style={{ marginTop: 14 }}>
            <Knapp title="Lös in skärmtid" onClick={() => setShowRedeem(true)} />
          </div>
        )}

        <Kort style={{ marginTop: 14 }}>
          <h3 style={{ margin: "0 0 8px" }}>Senaste transaktioner</h3>
          {entries.length === 0 ? (
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Inga transaktioner än.</p>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {entries.map((e) => (
                <div key={e.id} style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ flex: 1 }}>{reasonLabel(e.reason)}</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: e.amount_mynt >= 0 ? C.green : C.red
                    }}
                  >
                    {e.amount_mynt >= 0 ? "+" : ""}
                    {e.amount_mynt} 🪙
                  </span>
                </div>
              ))}
            </div>
          )}
        </Kort>

        {err && <p style={{ color: C.red, fontSize: 13 }}>{err}</p>}

        {showRedeem && child && config && (
          <RedeemSheet
            child={child}
            multiplier={config.screen_time_multiplier}
            dailyLimit={config.daily_limit_minutes}
            usedToday={usedToday}
            onClose={() => setShowRedeem(false)}
            onRedeemed={() => {
              setShowRedeem(false);
              void reload();
            }}
          />
        )}
      </div>
    </ScreenContainer>
  );
}

function reasonLabel(reason: string): string {
  switch (reason) {
    case "mission_approved":
      return "Godkänt uppdrag";
    case "redemption":
      return "Inlöst skärmtid";
    case "adjustment":
      return "Justering";
    case "refund":
      return "Återbetalning";
    default:
      return reason;
  }
}
