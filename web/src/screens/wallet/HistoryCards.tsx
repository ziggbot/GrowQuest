import type { CSSProperties } from "react";
import type { Redemption } from "../../lib/types";

// Shared cards used by both the child and parent branches of
// WalletScreen so layout and copy stay in sync. The two callers pass
// in their own theme tokens (light parent / kid colours).

interface Theme {
  surface: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  red: string;
  green: string;
  gold: string;
}

export function ScreenTimeHistoryCard({
  items,
  theme,
  cardStyle
}: {
  items: Redemption[];
  theme: Theme;
  cardStyle?: CSSProperties;
}) {
  if (items.length === 0) return null;
  const totalMin = items.reduce((s, r) => s + r.minutes, 0);
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "baseline", marginBottom: 8, gap: 8 }}>
        <h3 style={{ margin: 0, flex: 1, color: theme.text }}>Växlat till skärmtid</h3>
        <span style={{ color: theme.accent, fontWeight: 800, fontSize: 16 }}>
          {totalMin} min
        </span>
      </div>
      <div style={{ color: theme.muted, fontSize: 11, marginBottom: 10 }}>
        Totalt {items.length} godkänd{items.length === 1 ? "" : "a"} växling
        {items.length === 1 ? "" : "ar"}
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {items.map((r) => (
          <div
            key={r.id}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "6px 0",
              borderTop: `1px solid ${theme.border}`
            }}
          >
            <span style={{ flex: 1, fontSize: 13, color: theme.text }}>
              {formatShortDate(r.reviewed_at ?? r.started_at)}
            </span>
            <span style={{ color: theme.accent, fontWeight: 700, fontSize: 14 }}>
              {r.minutes} min
            </span>
            <span style={{ color: theme.muted, fontSize: 11, marginLeft: 8 }}>
              {r.mynt_cost} 🪙
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CashHistoryCard({
  items,
  theme,
  cardStyle
}: {
  items: Redemption[];
  theme: Theme;
  cardStyle?: CSSProperties;
}) {
  if (items.length === 0) return null;
  const totalMynt = items.reduce((s, r) => s + r.mynt_cost, 0);
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "baseline", marginBottom: 8, gap: 8 }}>
        <h3 style={{ margin: 0, flex: 1, color: theme.text }}>Växlat till pengar</h3>
        <span style={{ color: theme.gold, fontWeight: 800, fontSize: 16 }}>{totalMynt} 🪙</span>
      </div>
      <div style={{ color: theme.muted, fontSize: 11, marginBottom: 10 }}>
        Totalt {items.length} godkänd{items.length === 1 ? "" : "a"} växling
        {items.length === 1 ? "" : "ar"}
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {items.map((r) => (
          <div
            key={r.id}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "6px 0",
              borderTop: `1px solid ${theme.border}`
            }}
          >
            <span style={{ flex: 1, fontSize: 13, color: theme.text }}>
              {formatShortDate(r.reviewed_at ?? r.started_at)}
            </span>
            <span style={{ color: theme.gold, fontWeight: 700, fontSize: 14 }}>
              {r.mynt_cost} 🪙
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}
