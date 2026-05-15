import type { Recurrence } from "./types";

export interface MissionTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;
  baseRewardMynt: number;
  recurrence: Recurrence;
}

export const MISSION_TEMPLATES: readonly MissionTemplate[] = [
  { id: "drak",  title: "Drakarnas Vandring",   description: "Gå utomhus i 20 minuter",         icon: "🐉", baseRewardMynt: 80, recurrence: "daily" },
  { id: "kock",  title: "Kockens Lärling",      description: "Hjälp till att laga mat",         icon: "🍳", baseRewardMynt: 60, recurrence: "once"  },
  { id: "bok",   title: "Bokens Trollkarl",     description: "Läs i 30 minuter",                 icon: "📚", baseRewardMynt: 70, recurrence: "daily" },
  { id: "hopp",  title: "Hoppande Hjälten",     description: "Gör 20 stjärnhopp",                icon: "⚡", baseRewardMynt: 40, recurrence: "daily" },
  { id: "konst", title: "Konstnärens Resa",     description: "Rita eller måla något",            icon: "🎨", baseRewardMynt: 50, recurrence: "once"  },
  { id: "natur", title: "Naturutforskaren",     description: "Hitta 5 olika växter utomhus",     icon: "🌿", baseRewardMynt: 90, recurrence: "once"  },
  { id: "bädd",  title: "Bädda sängen",         description: "Bädda din säng på morgonen",       icon: "🛏", baseRewardMynt: 25, recurrence: "daily" },
  { id: "disk",  title: "Diskmaskinens Vän",    description: "Töm eller fyll diskmaskinen",      icon: "🍽", baseRewardMynt: 35, recurrence: "daily" }
] as const;

export function estimateMissionReward(base: number, multiplier: number): number {
  return Math.max(0, Math.round((base * multiplier) / 5) * 5);
}

export function estimateScreenTimeCost(minutes: number, multiplier: number): number {
  const base = 80;
  return Math.max(0, Math.round((minutes / 30) * base * multiplier / 5) * 5);
}
