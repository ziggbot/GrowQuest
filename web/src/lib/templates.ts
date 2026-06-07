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

// 10 templates per age band — progressively more demanding for older kids.
export const MISSION_TEMPLATES: readonly MissionTemplate[] = [
  // ───── 7–9 år: enkla, korta vardagsrutiner ─────────────────────────
  { id: "y79-1",  ageBand: "7-9",   title: "Bädda sängen",        description: "Bädda din säng på morgonen",            icon: "🛏",  baseRewardMynt: 20, recurrence: "daily" },
  { id: "y79-2",  ageBand: "7-9",   title: "Borsta tänderna",     description: "Morgon och kväll, minst 2 minuter",     icon: "🦷",  baseRewardMynt: 15, recurrence: "daily" },
  { id: "y79-3",  ageBand: "7-9",   title: "Plocka upp leksaker", description: "Allt på golvet tillbaka i lådorna",     icon: "🧸",  baseRewardMynt: 25, recurrence: "daily" },
  { id: "y79-4",  ageBand: "7-9",   title: "Duka bordet",         description: "Sätt fram tallrik, glas och bestick",   icon: "🍽",  baseRewardMynt: 20, recurrence: "daily" },
  { id: "y79-5",  ageBand: "7-9",   title: "Läs i 15 minuter",    description: "Välj en bok och läs på lugn plats",     icon: "📚",  baseRewardMynt: 30, recurrence: "daily" },
  { id: "y79-6",  ageBand: "7-9",   title: "Rita eller måla",     description: "Skapa något fint i 15 minuter",         icon: "🎨",  baseRewardMynt: 25, recurrence: "once"  },
  { id: "y79-7",  ageBand: "7-9",   title: "Hoppande Hjälten",    description: "Gör 20 stjärnhopp",                      icon: "⚡",  baseRewardMynt: 30, recurrence: "daily" },
  { id: "y79-8",  ageBand: "7-9",   title: "Vattna blommorna",    description: "Vattna alla krukväxter en gång",        icon: "🌱",  baseRewardMynt: 25, recurrence: "weekly"},
  { id: "y79-9",  ageBand: "7-9",   title: "Hänga upp ytterkläder",description: "Jacka, mössa och skor på rätt plats",  icon: "🧥",  baseRewardMynt: 15, recurrence: "daily" },
  { id: "y79-10", ageBand: "7-9",   title: "Naturpromenad",       description: "Ut på 20 minuters promenad",            icon: "🌿",  baseRewardMynt: 40, recurrence: "daily" },

  // ───── 10–12 år: lite mer ansträngande ─────────────────────────────
  { id: "y1012-1",  ageBand: "10-12", title: "Töm diskmaskinen",      description: "Plocka in allt rent porslin på rätt plats", icon: "🍽",  baseRewardMynt: 40, recurrence: "daily" },
  { id: "y1012-2",  ageBand: "10-12", title: "Dammsug ditt rum",      description: "Hela golvet — under sängen också",          icon: "🧹",  baseRewardMynt: 50, recurrence: "weekly"},
  { id: "y1012-3",  ageBand: "10-12", title: "Hjälp till med middag", description: "Skala, hacka eller röra i 20 minuter",      icon: "🍳",  baseRewardMynt: 55, recurrence: "daily" },
  { id: "y1012-4",  ageBand: "10-12", title: "Läxor 30 minuter",      description: "Fokuserad läxtid utan distraktioner",       icon: "📝",  baseRewardMynt: 50, recurrence: "daily" },
  { id: "y1012-5",  ageBand: "10-12", title: "Läs i 30 minuter",      description: "En bok, en tidning eller faktatext",        icon: "📚",  baseRewardMynt: 45, recurrence: "daily" },
  { id: "y1012-6",  ageBand: "10-12", title: "Träna 30 minuter",      description: "Cykla, springa eller egen träning",         icon: "🏃",  baseRewardMynt: 60, recurrence: "daily" },
  { id: "y1012-7",  ageBand: "10-12", title: "Hänga tvätt",           description: "Hela tvättkorgen — använd galge där det går",icon: "🧺",  baseRewardMynt: 40, recurrence: "weekly"},
  { id: "y1012-8",  ageBand: "10-12", title: "Slänga soporna",        description: "Töm sopborstet och in i sopkärlet",         icon: "🗑",  baseRewardMynt: 30, recurrence: "daily" },
  { id: "y1012-9",  ageBand: "10-12", title: "Torka köksbänk",        description: "Torka ren bänk och spis efter middagen",    icon: "🧽",  baseRewardMynt: 35, recurrence: "daily" },
  { id: "y1012-10", ageBand: "10-12", title: "Promenad med hund",     description: "30 minuters tur, plocka upp efter hunden",  icon: "🐕",  baseRewardMynt: 55, recurrence: "daily" },

  // ───── 13–15 år: större ansvar, längre uppdrag ─────────────────────
  { id: "y13-1",  ageBand: "13+",   title: "Laga middag själv",        description: "Planera och tillaga en hel middag",         icon: "👨‍🍳", baseRewardMynt: 120, recurrence: "weekly"},
  { id: "y13-2",  ageBand: "13+",   title: "Storstäda rummet",         description: "Damma, dammsuga, sortera bland kläderna",   icon: "✨", baseRewardMynt: 100, recurrence: "weekly"},
  { id: "y13-3",  ageBand: "13+",   title: "Klippa gräsmattan",        description: "Hela tomten — och ta hand om gräset",       icon: "🌾", baseRewardMynt: 110, recurrence: "weekly"},
  { id: "y13-4",  ageBand: "13+",   title: "Tvätta bilen",             description: "Yttre tvätt + insidan dammsugen",           icon: "🚗", baseRewardMynt: 90,  recurrence: "weekly"},
  { id: "y13-5",  ageBand: "13+",   title: "Handla i mataffär",        description: "Handla efter inköpslista",                  icon: "🛒", baseRewardMynt: 80,  recurrence: "weekly"},
  { id: "y13-6",  ageBand: "13+",   title: "Läxor 60 minuter",         description: "Djupfokus på pluggandet — inga avbrott",    icon: "📖", baseRewardMynt: 75,  recurrence: "daily" },
  { id: "y13-7",  ageBand: "13+",   title: "Träna 45 minuter",         description: "Pass på gym, cykling eller hård löprunda",  icon: "💪", baseRewardMynt: 85,  recurrence: "daily" },
  { id: "y13-8",  ageBand: "13+",   title: "Vika och lägg tvätt",      description: "Hela hushållets ren tvätt sorterat i högar", icon: "🧦", baseRewardMynt: 60,  recurrence: "weekly"},
  { id: "y13-9",  ageBand: "13+",   title: "Sopsortera fullt ut",      description: "Källsortera och kör till återvinning",      icon: "♻️", baseRewardMynt: 70,  recurrence: "weekly"},
  { id: "y13-10", ageBand: "13+",   title: "Passa småsyskon",          description: "Ansvar för syskon i minst 60 minuter",      icon: "👶", baseRewardMynt: 100, recurrence: "once" }
] as const;

export function templatesForAge(band: AgeBand): readonly MissionTemplate[] {
  return MISSION_TEMPLATES.filter((t) => t.ageBand === band);
}

export function estimateMissionReward(base: number, multiplier: number): number {
  return Math.max(0, Math.round((base * multiplier) / 5) * 5);
}

export function estimateScreenTimeCost(minutes: number, multiplier: number): number {
  const base = 80;
  return Math.max(0, Math.round((minutes / 30) * base * multiplier / 5) * 5);
}
