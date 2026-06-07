import type { CSSProperties } from "react";
import { C } from "./tokens";

// Standard "‹ Tillbaka" pill used at the top-left of every screen and
// sheet so back-navigation looks and lands identically across the app.

export function BackButton({
  onClick,
  style
}: {
  onClick: () => void;
  style?: CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        color: C.text,
        cursor: "pointer",
        padding: "6px 14px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 700,
        boxShadow: C.shadowSoft,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        ...style
      }}
    >
      ‹ Tillbaka
    </button>
  );
}
