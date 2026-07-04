import { MAX_MISSION_REWARD } from "./templates";

// Building blocks for the "Träningspass" mission category. The parent
// picks exercises and amounts; we compose the mission description and
// suggest a reward from the estimated effort (1 mynt ≈ 1 minute,
// capped at MAX_MISSION_REWARD like every other mission).

export type ExerciseUnit = "reps" | "seconds";

export interface Exercise {
  id: string;
  namn: string;
  icon: string;
  unit: ExerciseUnit;
  /** Default amount when the exercise is added to a workout. */
  defaultAmount: number;
  /** Stepper increment. */
  step: number;
  /** Max sensible amount for a kid's workout. */
  max: number;
  /** Rough effort in seconds per rep (or 1 for time-based exercises). */
  secondsPerUnit: number;
}

export const EXERCISES: readonly Exercise[] = [
  { id: "krysshopp",   namn: "Krysshopp",        icon: "🤸", unit: "reps",    defaultAmount: 20, step: 5,  max: 100, secondsPerUnit: 2 },
  { id: "armhav",      namn: "Armhävningar",     icon: "💪", unit: "reps",    defaultAmount: 10, step: 5,  max: 50,  secondsPerUnit: 3 },
  { id: "situps",      namn: "Situps",           icon: "🔄", unit: "reps",    defaultAmount: 15, step: 5,  max: 60,  secondsPerUnit: 3 },
  { id: "springstall", namn: "Spring på stället", icon: "🏃", unit: "seconds", defaultAmount: 30, step: 15, max: 180, secondsPerUnit: 1 },
  { id: "rygglyft",    namn: "Rygglyft",         icon: "🦾", unit: "reps",    defaultAmount: 10, step: 5,  max: 40,  secondsPerUnit: 3 },
  { id: "knaboj",      namn: "Knäböj",           icon: "🦵", unit: "reps",    defaultAmount: 15, step: 5,  max: 60,  secondsPerUnit: 3 },
  { id: "plankan",     namn: "Plankan",          icon: "🧘", unit: "seconds", defaultAmount: 20, step: 10, max: 120, secondsPerUnit: 1 },
  { id: "hogakn",      namn: "Höga knän",        icon: "⬆️", unit: "reps",    defaultAmount: 20, step: 10, max: 100, secondsPerUnit: 1.5 },
  { id: "utfall",      namn: "Utfallssteg",      icon: "🚶", unit: "reps",    defaultAmount: 10, step: 5,  max: 40,  secondsPerUnit: 3 },
  { id: "hopprep",     namn: "Hopprep",          icon: "🪢", unit: "seconds", defaultAmount: 60, step: 30, max: 300, secondsPerUnit: 1 }
] as const;

export interface WorkoutItem {
  exerciseId: string;
  amount: number;
}

function exercise(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}

export function formatWorkoutItem(item: WorkoutItem): string {
  const ex = exercise(item.exerciseId);
  if (!ex) return "";
  return ex.unit === "seconds"
    ? `${item.amount} sek ${ex.namn.toLowerCase()}`
    : `${item.amount} ${ex.namn.toLowerCase()}`;
}

// The mission description the child sees, e.g.
// "Träningspass: 20 krysshopp · 10 armhävningar · 30 sek plankan".
export function workoutDescription(items: WorkoutItem[]): string {
  const parts = items.map(formatWorkoutItem).filter(Boolean);
  return parts.length > 0 ? `Träningspass: ${parts.join(" · ")}` : "";
}

// Suggested reward: estimated effort seconds ×2 (rest/setup between
// exercises), converted to minutes, rounded to nearest 5, min 5 and
// never above the global mission ceiling.
export function workoutReward(items: WorkoutItem[]): number {
  const effortSeconds = items.reduce((sum, item) => {
    const ex = exercise(item.exerciseId);
    return ex ? sum + item.amount * ex.secondsPerUnit : sum;
  }, 0);
  if (effortSeconds <= 0) return 0;
  const minutes = (effortSeconds * 2) / 60;
  const rounded = Math.max(5, Math.round(minutes / 5 + 1e-9) * 5);
  return Math.min(MAX_MISSION_REWARD, rounded);
}
