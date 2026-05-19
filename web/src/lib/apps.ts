// Predefined apps the kid can request screen time for. The `id`s are
// what we persist on redemptions.requested_apps; labels + icons drive
// the UI on both the request sheet and the parent's review queue.

export interface AppOption {
  id: string;
  label: string;
  icon: string;
}

export const APP_OPTIONS: readonly AppOption[] = [
  { id: "screen_time", label: "Ren skärmtid", icon: "📱" },
  { id: "youtube", label: "YouTube", icon: "📺" },
  { id: "zoomerang", label: "Zoomerang", icon: "🎬" },
  { id: "pokemon_go", label: "Pokémon GO", icon: "🐉" },
  { id: "roblox", label: "Roblox", icon: "🎮" }
] as const;

export function labelForApp(id: string): { label: string; icon: string } {
  const hit = APP_OPTIONS.find((a) => a.id === id);
  if (hit) return { label: hit.label, icon: hit.icon };
  return { label: id, icon: "📦" };
}
