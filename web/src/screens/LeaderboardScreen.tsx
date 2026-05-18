import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import type { ChildProgress } from "../lib/types";
import { currentStadium } from "../lib/karaktar";
import { C } from "../design/tokens";
import { Kort, ScreenContainer } from "../design/components";

export function LeaderboardScreen() {
  const { familyId } = useSession();
  const nav = useNavigate();
  const [rows, setRows] = useState<ChildProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!familyId) return;
    setLoading(true);
    void (async () => {
      // Fetch opted-in child IDs from child_profiles (column guaranteed to exist).
      // child_progress.global_leaderboard_opt_in is added by a later migration
      // and may not exist on older cloud instances, so we filter in JS instead.
      const { data: cpData } = await supabase
        .from("child_profiles")
        .select("id")
        .eq("family_id", familyId)
        .eq("global_leaderboard_opt_in", true);
      const optedIn = new Set((cpData ?? []).map((c) => c.id));

      const { data, error } = await supabase
        .from("child_progress")
        .select("*")
        .eq("family_id", familyId)
        .order("mynt_today", { ascending: false });
      if (error) setErr(error.message);
      else setRows(((data ?? []) as ChildProgress[]).filter((r) => optedIn.has(r.child_id)));
      setLoading(false);
    })();
  }, [familyId]);

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
            <div style={{ fontSize: 32 }}>🏆</div>
            <h2 style={{ margin: "4px 0", color: C.gold }}>Superäventyrare</h2>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Mest mynt idag</p>
          </div>
        </Kort>

        {loading && <p style={{ color: C.muted, fontSize: 13, marginTop: 12 }}>Laddar…</p>}
        {err && <p style={{ color: C.red, fontSize: 13, marginTop: 12 }}>{err}</p>}
        {!loading && !err && rows.length === 0 && (
          <Kort>
            <p style={{ color: C.muted, fontSize: 13, margin: 0, textAlign: "center" }}>
              Inga barn deltar i topplistan än. Slå på “Visa i global topplista”
              i Inställningar för att vara med.
            </p>
          </Kort>
        )}

        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {rows.map((r, i) => {
            const stadium = currentStadium(r.approved_missions);
            const badge = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
            return (
              <Kort key={r.child_id}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24, width: 30, textAlign: "center" }}>{badge}</span>
                  <span style={{ fontSize: 26 }}>{r.avatar_emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{r.nickname}</div>
                    <div style={{ fontSize: 11, color: stadium.accentFärg }}>{stadium.namn}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, color: C.gold }}>{r.mynt_today} 🪙</div>
                    <div style={{ fontSize: 10, color: C.muted }}>idag</div>
                  </div>
                </div>
              </Kort>
            );
          })}
        </div>
      </div>
    </ScreenContainer>
  );
}
