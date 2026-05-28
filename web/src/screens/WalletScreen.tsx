import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import type {
  ChildProfile,
  CoinLedgerEntry,
  ChildProgress,
  ProfileConfig,
  Redemption,
  SavingsGoal
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
import { CashRedeemSheet } from "./CashRedeemSheet";
import { CreateSavingsGoalSheet } from "./CreateSavingsGoalSheet";
import { JumperAnimation } from "../design/lottie";

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
  const [showCash, setShowCash] = useState(false);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [goals, setGoals] = useState<(SavingsGoal & { saved: number })[]>([]);

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
      // Pending + approved both count toward today's used minutes (rejected
      // gets a coin refund so it shouldn't subtract from the daily budget).
      const liveReds = reds.filter((r) => r.status !== "rejected");
      setUsedToday(liveReds.reduce((s, r) => s + r.minutes, 0));
      setActive(
        liveReds.find(
          (r) => (r.status ?? "approved") === "approved" && new Date(r.ends_at) > new Date()
        ) ?? null
      );

      // Savings goals + deposited amounts
      const { data: goalsData } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("child_id", childId)
        .order("created_at");
      const fetchedGoals = (goalsData ?? []) as SavingsGoal[];
      if (fetchedGoals.length > 0) {
        const { data: deps } = await supabase
          .from("coin_ledger")
          .select("ref_savings_goal, amount_mynt")
          .eq("child_id", childId)
          .eq("reason", "savings_deposit");
        const savedMap = new Map<string, number>();
        for (const d of (deps ?? []) as { ref_savings_goal: string; amount_mynt: number }[]) {
          savedMap.set(d.ref_savings_goal, (savedMap.get(d.ref_savings_goal) ?? 0) + Math.abs(d.amount_mynt));
        }
        setGoals(fetchedGoals.map((g) => ({ ...g, saved: savedMap.get(g.id) ?? 0 })));
      } else {
        setGoals([]);
      }
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

          {/* Animated character — replaces the old stadium stage. */}
          <KortKid style={{ marginTop: 14, padding: 16 }}>
            <div style={{ display: "grid", placeItems: "center" }}>
              <JumperAnimation
                gender={child?.gender ?? "girl"}
                size={180}
                fallback={child?.avatar_emoji ?? "🧒"}
              />
              <div style={{ color: CK.muted, fontSize: 12, marginTop: 8 }}>
                {approved} godkända uppdrag totalt
              </div>
            </div>
          </KortKid>

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
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <KnappKid title="Begär skärmtid" onClick={() => setShowRedeem(true)} />
              <KnappKid title="Växla till pengar" onClick={() => setShowCash(true)} />
            </div>
          )}

          {goals.length > 0 && (
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
                Sparmål
              </h3>
              <div style={{ display: "grid", gap: 10 }}>
                {goals.map((g) => {
                  const pct = Math.min(100, Math.round((g.saved / g.target_mynt) * 100));
                  return (
                    <div key={g.id}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 22 }}>{g.emoji}</span>
                        <span style={{ flex: 1, fontWeight: 700, color: CK.text, fontSize: 14 }}>
                          {g.title}
                        </span>
                        <span style={{ color: CK.gold, fontWeight: 700, fontSize: 13 }}>
                          {g.saved}/{g.target_mynt} 🪙
                        </span>
                      </div>
                      <div
                        style={{
                          height: 10,
                          borderRadius: 5,
                          background: CK.surfaceMuted ?? CK.border,
                          overflow: "hidden"
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            borderRadius: 5,
                            background: pct >= 100
                              ? CK.green
                              : `linear-gradient(90deg, ${CK.gold}, ${CK.accent})`
                          }}
                        />
                      </div>
                      {pct < 100 && balance > 0 && (
                        <button
                          onClick={async () => {
                            const deposit = Math.min(balance, g.target_mynt - g.saved);
                            if (deposit < 1) return;
                            const { error: dErr } = await supabase.rpc("deposit_to_savings", {
                              p_goal_id: g.id,
                              p_amount: deposit
                            });
                            if (dErr) setErr(dErr.message);
                            else void reload();
                          }}
                          style={{
                            marginTop: 6,
                            background: "transparent",
                            border: `1px solid ${CK.border}`,
                            borderRadius: 10,
                            padding: "6px 12px",
                            color: CK.gold,
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 700
                          }}
                        >
                          Spara {Math.min(balance, g.target_mynt - g.saved)} 🪙
                        </button>
                      )}
                      {pct >= 100 && (
                        <div style={{ color: CK.green, fontSize: 12, fontWeight: 700, marginTop: 4 }}>
                          Målet nått!
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </KortKid>
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

          {showCash && child && (
            <CashRedeemSheet
              child={child}
              balance={balance}
              onClose={() => setShowCash(false)}
              onRedeemed={() => {
                setShowCash(false);
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
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Knapp title="Begär skärmtid" onClick={() => setShowRedeem(true)} />
            <Knapp title="Växla till pengar" onClick={() => setShowCash(true)} />
          </div>
        )}

        {goals.length > 0 && (
          <Kort style={{ marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <h3 style={{ margin: 0, flex: 1 }}>Sparmål</h3>
              <Knapp
                title="+ Nytt mål"
                onClick={() => setShowCreateGoal(true)}
                style="secondary"
              />
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {goals.map((g) => {
                const pct = Math.min(100, Math.round((g.saved / g.target_mynt) * 100));
                return (
                  <div key={g.id}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 20 }}>{g.emoji}</span>
                      <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{g.title}</span>
                      <span style={{ color: C.gold, fontWeight: 700, fontSize: 13 }}>
                        {g.saved}/{g.target_mynt} 🪙
                      </span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 4,
                        background: C.surfaceHov,
                        overflow: "hidden"
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          borderRadius: 4,
                          background: pct >= 100 ? C.green : C.gold
                        }}
                      />
                    </div>
                    {pct >= 100 && (
                      <div style={{ color: C.green, fontSize: 12, fontWeight: 700, marginTop: 4 }}>
                        Målet nått!
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Kort>
        )}

        {goals.length === 0 && child && familyId && (
          <div style={{ marginTop: 14 }}>
            <Knapp
              title="+ Nytt sparmål"
              onClick={() => setShowCreateGoal(true)}
              style="secondary"
            />
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

        {showCash && child && (
          <CashRedeemSheet
            child={child}
            balance={balance}
            onClose={() => setShowCash(false)}
            onRedeemed={() => {
              setShowCash(false);
              void reload();
            }}
          />
        )}

        {showCreateGoal && child && familyId && (
          <CreateSavingsGoalSheet
            familyId={familyId}
            childId={child.id}
            onClose={() => setShowCreateGoal(false)}
            onSaved={() => {
              setShowCreateGoal(false);
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
      return "Begäran (skärm/pengar)";
    case "adjustment":
      return "Justering";
    case "refund":
      return "Återbetalning";
    case "savings_deposit":
      return "Sparat till mål";
    case "savings_withdraw":
      return "Uttag från mål";
    default:
      return reason;
  }
}
