import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import type { Gender } from "../lib/types";
import { AdventureBoy, AdventureGirl } from "./AdventureCharacter";
import { playWinChime } from "./sounds";

// The uploaded Lottie character files turned out to render as a flat
// rectangle on iOS Safari (the source has a 256x256 background shape
// as the first layer that obscures everything else). Until proper
// character Lotties are available we route through hand-drawn SVG
// characters in AdventureCharacter.tsx — they animate via CSS and look
// the same on every browser.
export function JumperAnimation({
  gender,
  size = 96,
  approvedMissions = 0,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fallback
}: {
  gender: Gender;
  size?: number;
  approvedMissions?: number;
  fallback?: ReactNode;
}) {
  return gender === "boy" ? (
    <AdventureBoy size={size} approvedMissions={approvedMissions} />
  ) : (
    <AdventureGirl size={size} approvedMissions={approvedMissions} />
  );
}

const COIN_RAIN_KEYFRAMES = `
  @keyframes gq-coin-fall {
    0% {
      transform: translateY(-12vh) rotate(0deg);
      opacity: 0;
    }
    8% {
      opacity: 1;
    }
    92% {
      opacity: 1;
    }
    100% {
      transform: translateY(112vh) rotate(720deg);
      opacity: 0;
    }
  }
`;

interface FallingCoin {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
}

// Full-screen coin shower built with CSS-animated emojis — no Lottie,
// no asset downloads. Plays the win-chime sound the moment it mounts,
// fires onDone after the longest coin has landed.
export function CoinRain({ onDone }: { onDone: () => void }) {
  const coins = useMemo<FallingCoin[]>(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 1.8 + Math.random() * 1.4,
        size: 28 + Math.random() * 26
      })),
    []
  );
  const totalMs = useMemo(
    () => Math.max(...coins.map((c) => (c.delay + c.duration) * 1000)) + 100,
    [coins]
  );

  // onDone lives in a ref so a parent re-render (fresh arrow prop)
  // doesn't re-run the effect — that replayed the chime and reset the
  // completion timer on every state change while the rain was falling.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    playWinChime();
    const t = setTimeout(() => onDoneRef.current(), totalMs);
    return () => clearTimeout(t);
  }, [totalMs]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        pointerEvents: "none",
        overflow: "hidden"
      }}
    >
      <style>{COIN_RAIN_KEYFRAMES}</style>
      {coins.map((c) => (
        <div
          key={c.id}
          style={{
            position: "absolute",
            top: 0,
            left: `${c.left}%`,
            fontSize: c.size,
            animation: `gq-coin-fall ${c.duration}s linear ${c.delay}s 1 forwards`,
            textShadow: "0 2px 6px rgba(0,0,0,0.25)",
            willChange: "transform, opacity"
          }}
        >
          🪙
        </div>
      ))}
    </div>
  );
}

