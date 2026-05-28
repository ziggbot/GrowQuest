import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Lottie from "lottie-react";
import type { Gender } from "../lib/types";
import { AdventureBoy, AdventureGirl } from "./AdventureCharacter";

const COIN_RAIN_SRC = "/animations/coin_rain_win_lottie.json";

const cache = new Map<string, unknown>();

async function loadAnimation(src: string): Promise<unknown> {
  if (cache.has(src)) return cache.get(src)!;
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Lottie ${src} → HTTP ${res.status}`);
  const data = await res.json();
  cache.set(src, data);
  return data;
}

// The Lottie files turned out to render as a flat coloured rectangle on
// device (the AI-generated source only had a background shape laid out
// at full canvas size). Until proper character Lotties are available we
// route everything through the hand-drawn SVG characters in
// AdventureCharacter.tsx — they animate via CSS and look the same on
// every browser.
export function JumperAnimation({
  gender,
  size = 96,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fallback
}: {
  gender: Gender;
  size?: number;
  fallback?: ReactNode;
}) {
  return gender === "boy" ? <AdventureBoy size={size} /> : <AdventureGirl size={size} />;
}

export function CoinRain({ onDone }: { onDone: () => void }) {
  const [data, setData] = useState<unknown>(cache.get(COIN_RAIN_SRC) ?? null);
  useEffect(() => {
    let cancelled = false;
    loadAnimation(COIN_RAIN_SRC)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) onDone();
      });
    return () => {
      cancelled = true;
    };
  }, [onDone]);

  if (!data) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        pointerEvents: "none",
        display: "grid",
        placeItems: "center"
      }}
    >
      <Lottie
        animationData={data}
        loop={false}
        autoplay
        onComplete={onDone}
        style={{ width: "100%", height: "100%", maxWidth: 720, maxHeight: "100vh" }}
      />
    </div>
  );
}
