// Character progression based on cumulative approved missions.
// Each level unlocks a new accessory on the AdventureGirl / AdventureBoy
// SVG. Thresholds tuned so a kid with ~2 approvals/day hits a new
// milestone every 1-3 weeks early on.

export interface Level {
  level: number;
  threshold: number;
  title: string;
  unlock: string;
  // Cosmetic accessories layered on top of the base character.
  accessory: {
    backpack?: boolean;
    pet?: boolean;
    cape?: boolean;
    crown?: boolean;
  };
}

export const LEVELS: readonly Level[] = [
  { level: 1, threshold: 0,   title: "Nybörjare",   unlock: "Start!",                       accessory: {} },
  { level: 2, threshold: 10,  title: "Utforskare",  unlock: "🎒 Ryggsäck",                 accessory: { backpack: true } },
  { level: 3, threshold: 25,  title: "Äventyrare",  unlock: "🐾 Husdjur",                  accessory: { backpack: true, pet: true } },
  { level: 4, threshold: 50,  title: "Hjälte",      unlock: "🦸 Cape",                     accessory: { backpack: true, pet: true, cape: true } },
  { level: 5, threshold: 100, title: "Superhjälte", unlock: "👑 Gyllene krona",            accessory: { backpack: true, pet: true, cape: true, crown: true } }
] as const;

export function currentLevel(approvedMissions: number): Level {
  let l = LEVELS[0];
  for (const candidate of LEVELS) {
    if (approvedMissions >= candidate.threshold) l = candidate;
  }
  return l;
}

export function nextLevel(approvedMissions: number): Level | null {
  return LEVELS.find((l) => l.threshold > approvedMissions) ?? null;
}
