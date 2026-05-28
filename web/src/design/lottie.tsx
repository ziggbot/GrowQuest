import { useEffect, useState } from "react";
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
  const data = await res.json();
  cache.set(src, data);
  return data;
}

export function JumperAnimation({
  gender,
  size = 96
}: {
  gender: Gender;
  size?: number;
}) {
  const [data, setData] = useState<unknown>(cache.get(SOURCES[gender]) ?? null);
  useEffect(() => {
    let cancelled = false;
    void loadAnimation(SOURCES[gender]).then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [gender]);

  if (!data) {
    return <div style={{ width: size, height: size }} />;
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
    void loadAnimation(COIN_RAIN_SRC).then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
