export interface Stadium {
  level: number;
  threshold: number;
  namn: string;
  beskrivning: string;
  humör: "trött" | "nyfiken" | "aktiv" | "energisk" | "euforisk";
  himmel: [string, string];
  mark: string;
  accentFärg: string;
}

export const KARAKTÄR_STADIER: readonly Stadium[] = [
  { level: 0, threshold: 0, namn: "Soffpotatisen",       beskrivning: "Sitter och gapar... dags att röra på sig!",       humör: "trött",    himmel: ["#1a1a2e", "#16213e"], mark: "#1a1a2e", accentFärg: "#64748b" },
  { level: 1, threshold: 1, namn: "Nyfikna utforskaren", beskrivning: "Sitter upprätt och tittar nyfiket ut i världen!", humör: "nyfiken",  himmel: ["#1e2d3d", "#243447"], mark: "#1a2a1a", accentFärg: "#60a5fa" },
  { level: 2, threshold: 2, namn: "Aktiva äventyraren",  beskrivning: "Står upp med ett leende — rörlig och redo!",      humör: "aktiv",    himmel: ["#1a3a2a", "#1e4d35"], mark: "#1a3015", accentFärg: "#3ddc84" },
  { level: 3, threshold: 4, namn: "Snabba löparen",      beskrivning: "Springer fritt i naturen — full av energi!",      humör: "energisk", himmel: ["#0d3320", "#1a5030"], mark: "#1a3a18", accentFärg: "#f5c842" },
  { level: 4, threshold: 6, namn: "Naturhjälten",        beskrivning: "Hoppar av glädje — stark, pigg och oslagbar!",    humör: "euforisk", himmel: ["#0a2040", "#1a3860"], mark: "#1a3020", accentFärg: "#f472b6" }
] as const;

export function currentStadium(approvedMissions: number): Stadium {
  let cur: Stadium = KARAKTÄR_STADIER[0];
  for (const s of KARAKTÄR_STADIER) if (s.threshold <= approvedMissions) cur = s;
  return cur;
}

export function nextStadium(s: Stadium): Stadium | null {
  return KARAKTÄR_STADIER.find((x) => x.level === s.level + 1) ?? null;
}
