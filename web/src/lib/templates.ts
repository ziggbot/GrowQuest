import type { AgeBand, Recurrence } from "./types";

export interface MissionTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;
  baseRewardMynt: number;
  recurrence: Recurrence;
  ageBand: AgeBand;
}

// Age bands available in the create-mission picker. Built-in templates
// are grouped by these; personal templates are saved against whichever
// band was selected when the parent created the mission.
export const TEMPLATE_AGE_BANDS: AgeBand[] = ["7-9", "10-12", "13+"];

export const AGE_BAND_LABELS: Record<AgeBand, string> = {
  "4-6": "4–6 år",
  "7-9": "7–9 år",
  "10-12": "10–12 år",
  "13+": "13–15 år"
};

// 10 templates per age band, balanced across:
//   🏃 Rörelse / utomhus
//   🤝 Hjälp till / hemma
//   🎨 Skapande
//   🧠 Lärande
//   🫶 Socialt / självständighet
// Rewards roughly map to "minutes of activity" since 1 mynt = 1 minute.
export const MISSION_TEMPLATES: readonly MissionTemplate[] = [
  // ───── 7–9 år ──────────────────────────────────────────────────────
  { id: "y79-1",  ageBand: "7-9", title: "Naturpromenad",        description: "Ut i 20 minuter — räkna 3 saker du ser",       icon: "🌳", baseRewardMynt: 25, recurrence: "daily" },
  { id: "y79-2",  ageBand: "7-9", title: "Cykla en runda",       description: "En egen runda i kvarteret eller med förälder", icon: "🚲", baseRewardMynt: 30, recurrence: "daily" },
  { id: "y79-3",  ageBand: "7-9", title: "Hoppande Hjälten",     description: "20 stjärnhopp + 10 armhävningar",              icon: "⚡", baseRewardMynt: 20, recurrence: "daily" },
  { id: "y79-4",  ageBand: "7-9", title: "Bygg något du gillar", description: "Lego, kojhörna eller pärlplatta i 20 min",     icon: "🧱", baseRewardMynt: 25, recurrence: "once"  },
  { id: "y79-5",  ageBand: "7-9", title: "Rita eller måla",      description: "En egen teckning — ge den en titel",           icon: "🎨", baseRewardMynt: 20, recurrence: "once"  },
  { id: "y79-6",  ageBand: "7-9", title: "Läs en bok",           description: "15 minuters läsning — gärna högt för någon",   icon: "📚", baseRewardMynt: 20, recurrence: "daily" },
  { id: "y79-7",  ageBand: "7-9", title: "Hjälp i köket",        description: "Duka, skala eller hjälp förbereda en måltid",  icon: "🍳", baseRewardMynt: 15, recurrence: "daily" },
  { id: "y79-8",  ageBand: "7-9", title: "Bädda sängen",         description: "Snyggt och prydligt på morgonen",               icon: "🛏", baseRewardMynt: 10, recurrence: "daily" },
  { id: "y79-9",  ageBand: "7-9", title: "Ring mormor/farfar",   description: "Berätta något kul från din vecka i 5 min",     icon: "📞", baseRewardMynt: 20, recurrence: "weekly"},
  { id: "y79-10", ageBand: "7-9", title: "Vattna blommorna",     description: "Ge alla krukväxter en omgång vatten",          icon: "🌱", baseRewardMynt: 10, recurrence: "weekly"},

  // ───── 10–12 år ────────────────────────────────────────────────────
  { id: "y1012-1",  ageBand: "10-12", title: "Träna 30 minuter",        description: "Spring, cykla, simma eller eget pass",        icon: "🏃", baseRewardMynt: 35, recurrence: "daily" },
  { id: "y1012-2",  ageBand: "10-12", title: "Bollsport ute",           description: "Fotboll, basket eller liknande i 30 min",     icon: "⚽", baseRewardMynt: 30, recurrence: "daily" },
  { id: "y1012-3",  ageBand: "10-12", title: "Övar instrument",         description: "20 minuter fokuserad övning",                 icon: "🎸", baseRewardMynt: 25, recurrence: "daily" },
  { id: "y1012-4",  ageBand: "10-12", title: "Skriv en berättelse",     description: "En sida fritt skrivande om vad som helst",    icon: "✍️", baseRewardMynt: 30, recurrence: "once"  },
  { id: "y1012-5",  ageBand: "10-12", title: "Läxor 30 minuter",        description: "Fokus utan distraktion",                       icon: "📝", baseRewardMynt: 30, recurrence: "daily" },
  { id: "y1012-6",  ageBand: "10-12", title: "Läs 30 minuter",          description: "Bok, faktabok eller tidning",                  icon: "📖", baseRewardMynt: 25, recurrence: "daily" },
  { id: "y1012-7",  ageBand: "10-12", title: "Hjälp laga middag",       description: "Hacka, röra eller följ ett recept i 20 min",  icon: "🍳", baseRewardMynt: 30, recurrence: "daily" },
  { id: "y1012-8",  ageBand: "10-12", title: "Promenera med hund",      description: "30 min — eller en granne som behöver hjälp",  icon: "🐕", baseRewardMynt: 30, recurrence: "daily" },
  { id: "y1012-9",  ageBand: "10-12", title: "Spel utan skärm",         description: "Brädspel eller kortspel med någon hemma",      icon: "🎲", baseRewardMynt: 25, recurrence: "weekly"},
  { id: "y1012-10", ageBand: "10-12", title: "Dammsug ditt rum",        description: "Hela golvet — under sängen också",             icon: "🧹", baseRewardMynt: 20, recurrence: "weekly"},

  // ───── 13–15 år ────────────────────────────────────────────────────
  { id: "y13-1",  ageBand: "13+", title: "Träningspass 45 min",     description: "Gym, cykling, simhall eller hård löprunda",    icon: "💪", baseRewardMynt: 45, recurrence: "daily" },
  { id: "y13-2",  ageBand: "13+", title: "Föreningsträning",        description: "Närvaro på en träning med ditt lag",           icon: "🏆", baseRewardMynt: 60, recurrence: "weekly"},
  { id: "y13-3",  ageBand: "13+", title: "Hjälp en granne",         description: "Bär kassar, klipp gräs eller lös ett problem", icon: "🫶", baseRewardMynt: 50, recurrence: "once"  },
  { id: "y13-4",  ageBand: "13+", title: "Laga middag själv",       description: "Planera, handla och tillaga åt familjen",      icon: "👨‍🍳", baseRewardMynt: 60, recurrence: "weekly"},
  { id: "y13-5",  ageBand: "13+", title: "Övar instrument 30 min",  description: "Fokuserad övning, inte bara spela igenom",     icon: "🎹", baseRewardMynt: 30, recurrence: "daily" },
  { id: "y13-6",  ageBand: "13+", title: "Läxor 60 minuter",        description: "Djupfokus — telefonen ur sikte",               icon: "📚", baseRewardMynt: 60, recurrence: "daily" },
  { id: "y13-7",  ageBand: "13+", title: "Läs en bok 45 min",       description: "Ingen lärobok — något du själv valt",          icon: "📖", baseRewardMynt: 30, recurrence: "daily" },
  { id: "y13-8",  ageBand: "13+", title: "Lär dig något nytt",      description: "Tutorial, kurs eller experiment i 45 min",     icon: "🧠", baseRewardMynt: 45, recurrence: "weekly"},
  { id: "y13-9",  ageBand: "13+", title: "Bjud middag eller fika",  description: "Förbered och bjud en vän — ingen skärm",       icon: "🍪", baseRewardMynt: 50, recurrence: "weekly"},
  { id: "y13-10", ageBand: "13+", title: "Passa småsyskon",         description: "60 min — lekar och aktiviteter, ingen skärm",  icon: "👶", baseRewardMynt: 60, recurrence: "once"  }
] as const;

export function templatesForAge(band: AgeBand): readonly MissionTemplate[] {
  return MISSION_TEMPLATES.filter((t) => t.ageBand === band);
}

// The epsilon compensates for binary-float products landing a hair
// below x.5 where the server's numeric math yields exactly x.5 —
// keeps the client estimate equal to what the server actually charges.
export function estimateMissionReward(base: number, multiplier: number): number {
  return Math.max(0, Math.round((base * multiplier) / 5 + 1e-9) * 5);
}

// 1 mynt = 1 minute, scaled by the family's screen_time_multiplier.
// (Strict 1.6 → 60 min costs 96 mynt; Free 0.65 → 60 min costs 39.)
export function estimateScreenTimeCost(minutes: number, multiplier: number): number {
  return Math.max(1, Math.round(minutes * multiplier + 1e-9));
}
