// Unified light theme — same palette for parent and child screens.
// Card surfaces stay white-ish so content reads cleanly on top of the
// jungle background. Text is navy, accents are warm gold + cyan.
export const C = {
  // Solid fallback (used briefly while jungle-bg loads or if it 404s).
  bg: "#fff4dc",
  // Card surfaces — opaque white with soft border + shadow.
  surface: "#ffffff",
  surfaceHov: "#fff8e8",
  surfaceMuted: "#f3edde",
  border: "rgba(36,58,82,0.10)",
  borderStrong: "rgba(36,58,82,0.18)",
  shadow: "0 6px 18px rgba(140,100,60,0.12)",
  shadowSoft: "0 2px 8px rgba(140,100,60,0.08)",
  // Brand accents
  gold: "#f5b400",
  goldFade: "rgba(245,180,0,0.16)",
  green: "#2bb673",
  greenFade: "rgba(43,182,115,0.14)",
  red: "#ff6464",
  redFade: "rgba(255,100,100,0.14)",
  purple: "#7a6bd6",
  purpleFade: "rgba(122,107,214,0.14)",
  blue: "#1ec0d6",
  blueFade: "rgba(30,192,214,0.14)",
  // Typography
  text: "#243a52",
  textSoft: "#3b5673",
  muted: "#5d7491"
} as const;

// CK kept as an alias of C for backward compatibility — child screens
// already import from CK. Eventually we can consolidate, but for now
// every export has a matching key.
export const CK = {
  // Light gradient stack (still used by some preview frames)
  bgGradTop: "#cfe9f7",
  bgGradMid: "#fde7c4",
  bgGradBot: "#fff4dc",
  // Surfaces
  surface: C.surface,
  surfaceSoft: C.surfaceHov,
  surfaceMuted: C.surfaceMuted,
  border: C.border,
  borderStrong: C.borderStrong,
  shadow: C.shadow,
  shadowSoft: C.shadowSoft,
  // Typography
  text: C.text,
  textSoft: C.textSoft,
  muted: C.muted,
  // Accents
  accent: "#1ec0d6",
  accentDeep: "#0fa4b8",
  accentFade: "rgba(30,192,214,0.14)",
  gold: C.gold,
  goldFade: C.goldFade,
  green: C.green,
  greenFade: C.greenFade,
  red: C.red,
  redFade: C.redFade,
  purple: C.purple,
  purpleFade: C.purpleFade
} as const;
