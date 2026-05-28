import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Lottie from "lottie-react";
import type { Gender } from "../lib/types";

const SOURCES: Record<Gender, string> = {
  boy: "/animations/boy_jump_icon_lottie_under50kb.json",
  girl: "/animations/girl_jump_icon_lottie_under50kb.json"
};

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

export function JumperAnimation({
  gender,
  size = 96,
  fallback
}: {
  gender: Gender;
  size?: number;
  fallback?: ReactNode;
}) {
  const [data, setData] = useState<unknown>(cache.get(SOURCES[gender]) ?? null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadAnimation(SOURCES[gender])
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [gender]);

  if (!data || failed) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: "grid",
          placeItems: "center",
          fontSize: Math.round(size * 0.5)
        }}
      >
        {fallback}
      </div>
    );
  }
  return (
    <Lottie
      animationData={data}
      loop
      autoplay
      style={{ width: size, height: size }}
    />
  );
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
