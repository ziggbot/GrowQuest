import type { CSSProperties, ReactNode } from "react";
import { C, CK } from "./tokens";

// Jungle background — fixed, covers the viewport, with a soft cream overlay
// to ensure text/cards stay readable on top.
const JUNGLE_BG_STYLE: CSSProperties = {
  minHeight: "100dvh",
  background: `
    linear-gradient(180deg, rgba(207,233,247,0.30) 0%, rgba(255,244,220,0.35) 60%, rgba(255,244,220,0.55) 100%),
    url('/images/jungle-bg.png') center/cover no-repeat fixed,
    ${C.bg}
  `,
  padding: "max(env(safe-area-inset-top), 12px) 12px max(env(safe-area-inset-bottom), 12px)",
  boxSizing: "border-box",
  color: C.text
};

export function JungleBackground({ children }: { children: ReactNode }) {
  return <div style={JUNGLE_BG_STYLE}>{children}</div>;
}

// Backwards-compatible aliases — every screen that imports either of these
// now gets the unified jungle theme automatically.
export function ScreenContainer({ children }: { children: ReactNode }) {
  return <JungleBackground>{children}</JungleBackground>;
}

export function ChildScreenContainer({ children }: { children: ReactNode }) {
  return <JungleBackground>{children}</JungleBackground>;
}

// Card — white surface, soft border + shadow. Reads cleanly on the bg.
export function Kort({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 18,
        padding: 16,
        boxSizing: "border-box",
        boxShadow: C.shadow,
        color: C.text,
        ...style
      }}
    >
      {children}
    </div>
  );
}

type KnappStyle = "primary" | "secondary" | "danger";

export function Knapp({
  title,
  onClick,
  style = "primary",
  disabled = false,
  full = true
}: {
  title: string;
  onClick: () => void;
  style?: KnappStyle;
  disabled?: boolean;
  full?: boolean;
}) {
  const bg = style === "primary" ? C.gold : style === "danger" ? C.red : C.surface;
  const fg = style === "secondary" ? C.text : "#ffffff";
  const border = style === "secondary" ? `1px solid ${C.borderStrong}` : "none";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: full ? "100%" : "auto",
        padding: "12px 16px",
        borderRadius: 14,
        background: bg,
        color: fg,
        border,
        fontWeight: 700,
        fontSize: 15,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        boxShadow: disabled ? "none" : C.shadowSoft,
        WebkitAppearance: "none"
      }}
    >
      {title}
    </button>
  );
}

export function Pill({
  text,
  icon,
  tint = C.gold
}: {
  text: string;
  icon?: string;
  tint?: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        background: `${tint}22`,
        border: `1px solid ${tint}55`,
        color: tint,
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: "nowrap"
      }}
    >
      {icon && <span>{icon}</span>}
      <span>{text}</span>
    </span>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { style, ...rest } = props;
  return (
    <input
      {...rest}
      style={{
        width: "100%",
        padding: 12,
        background: C.surfaceHov,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        color: C.text,
        outline: "none",
        boxSizing: "border-box",
        ...style
      }}
    />
  );
}

// Child-themed variants kept as aliases now that the theme is unified —
// existing imports (KortKid, KnappKid, PillKid) still resolve.
export function KortKid({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: CK.surface,
        border: `1px solid ${CK.border}`,
        borderRadius: 22,
        padding: 16,
        boxSizing: "border-box",
        boxShadow: CK.shadow,
        color: CK.text,
        ...style
      }}
    >
      {children}
    </div>
  );
}

type KnappKidStyle = "primary" | "secondary" | "danger";

export function KnappKid({
  title,
  onClick,
  style = "primary",
  disabled = false,
  full = true
}: {
  title: string;
  onClick: () => void;
  style?: KnappKidStyle;
  disabled?: boolean;
  full?: boolean;
}) {
  const bg =
    style === "primary" ? CK.accent : style === "danger" ? CK.red : CK.surface;
  const fg = style === "secondary" ? CK.text : "#ffffff";
  const border = style === "secondary" ? `1px solid ${CK.borderStrong}` : "none";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: full ? "100%" : "auto",
        padding: "14px 18px",
        borderRadius: 16,
        background: bg,
        color: fg,
        border,
        fontWeight: 700,
        fontSize: 16,
        letterSpacing: 0.2,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        boxShadow: disabled ? "none" : CK.shadowSoft,
        WebkitAppearance: "none"
      }}
    >
      {title}
    </button>
  );
}

export function PillKid({
  text,
  icon,
  tint = CK.accent
}: {
  text: string;
  icon?: string;
  tint?: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 12px",
        borderRadius: 999,
        background: `${tint}22`,
        border: `1px solid ${tint}44`,
        color: tint,
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: "nowrap"
      }}
    >
      {icon && <span>{icon}</span>}
      <span>{text}</span>
    </span>
  );
}
