import type { ProfileId } from "./types";

export interface ProfileEntry {
  id: ProfileId;
  icon: string;
  namn: string;
  tagline: string;
  beskrivning: string;
  färg: string;
  uppdrag_multiplier: number;
  screen_time_multiplier: number;
  daily_limit_minutes: number;
  exempelUppdrag: string;
  exempelSkärmtid: string;
  exempelDagsgräns: string;
}

export const PROFILER: readonly ProfileEntry[] = [
  {
    id: "stram",
    icon: "🛑",
    namn: "Skärmfri start",
    tagline: "Skärmen är ett stort problem hemma",
    beskrivning:
      "Mynt tjänas långsamt och skärmtid kostar mycket. Barnet behöver verkligen anstränga sig för att förtjäna sin tid.",
    färg: "#ff6b6b",
    uppdrag_multiplier: 0.7,
    screen_time_multiplier: 1.6,
    daily_limit_minutes: 45,
    exempelUppdrag: "Promenad 20 min → 55 🪙",
    exempelSkärmtid: "30 min Roblox → 128 🪙",
    exempelDagsgräns: "Max 45 min/dag"
  },
  {
    id: "balans",
    icon: "⚖️",
    namn: "Balanserad",
    tagline: "Vi vill ha lite mer struktur",
    beskrivning:
      "Standardinställningar. Barnet tjänar mynt i bra takt och skärmtid kostar ett rättvist pris.",
    färg: "#a78bfa",
    uppdrag_multiplier: 1.0,
    screen_time_multiplier: 1.0,
    daily_limit_minutes: 90,
    exempelUppdrag: "Promenad 20 min → 80 🪙",
    exempelSkärmtid: "30 min Roblox → 80 🪙",
    exempelDagsgräns: "Max 90 min/dag"
  },
  {
    id: "fri",
    icon: "🌿",
    namn: "Fritt barn",
    tagline: "Barnet sköter sig redan bra",
    beskrivning:
      "Uppdrag ger generöst med mynt och skärmtid är billigare. Fokus på belöning och motivation snarare än begränsning.",
    färg: "#3ddc84",
    uppdrag_multiplier: 1.35,
    screen_time_multiplier: 0.65,
    daily_limit_minutes: 150,
    exempelUppdrag: "Promenad 20 min → 108 🪙",
    exempelSkärmtid: "30 min Roblox → 52 🪙",
    exempelDagsgräns: "Max 150 min/dag"
  }
] as const;

export const AVATARER = ["🦸", "🧙", "🐉", "🦊", "🐺", "🦁", "🐸", "🐼"] as const;
