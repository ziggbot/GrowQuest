import { useEffect, useState } from "react";

// First-launch (and once-per-major-version) cinematic intro. Pure CSS
// keyframes — Lottie wasn't reliable for us, and a self-contained SVG
// + gradient gives us full control of timing.
//
// Sequence:
//   0.0s   dark pre-dawn sky overlay covers app
//   0.1s   sun begins rising from below the horizon
//   0.7s   "Rise" lettering lifts up and fades in
//   1.3s   "Time to rise" tagline fades in beneath
//   2.5s   whole overlay fades out, app appears
//   2.9s   onDone fires, we unmount

const KEY = "rise:splash:lastShown:v1";

export function hasSeenSplash(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

export function markSplashSeen(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
}

const KEYFRAMES = `
  @keyframes rise-overlay-fade-out {
    0%, 88% { opacity: 1; }
    100%    { opacity: 0; }
  }
  @keyframes rise-sky {
    0%   { background-position: 0 100%; }
    100% { background-position: 0 0%; }
  }
  @keyframes rise-sun {
    0%   { transform: translateY(60vh) scale(0.85); opacity: 0; }
    25%  { opacity: 1; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }
  @keyframes rise-glow {
    0%, 100% { opacity: 0.55; transform: scale(1); }
    50%      { opacity: 0.85; transform: scale(1.08); }
  }
  @keyframes rise-title {
    0%   { transform: translateY(28px); opacity: 0; letter-spacing: 0.4em; }
    100% { transform: translateY(0);    opacity: 1; letter-spacing: 0.08em; }
  }
  @keyframes rise-tag {
    0%   { opacity: 0; transform: translateY(8px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes rise-ray {
    0%   { transform: rotate(var(--ray-angle)) scaleY(0); opacity: 0; }
    50%  { opacity: 0.7; }
    100% { transform: rotate(var(--ray-angle)) scaleY(1); opacity: 0.4; }
  }
`;

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const fadeAt = window.setTimeout(() => setClosing(true), 2500);
    const doneAt = window.setTimeout(() => {
      markSplashSeen();
      onDone();
    }, 2900);
    return () => {
      window.clearTimeout(fadeAt);
      window.clearTimeout(doneAt);
    };
  }, [onDone]);

  const skip = () => {
    markSplashSeen();
    onDone();
  };

  // 8 sun rays placed around the disc, each at a different angle.
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <div
      onClick={skip}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        cursor: "pointer",
        opacity: closing ? 0 : 1,
        transition: "opacity 380ms ease-out",
        background:
          "linear-gradient(180deg, #0a1a3a 0%, #1d3461 35%, #b65b3b 75%, #f7c873 100%)",
        backgroundSize: "100% 220%",
        animation: "rise-sky 2.4s ease-out forwards",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff"
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Sun rising from below */}
      <div
        style={{
          position: "absolute",
          bottom: "38%",
          width: 160,
          height: 160,
          animation: "rise-sun 1.6s cubic-bezier(0.22, 1, 0.36, 1) forwards"
        }}
      >
        {/* Soft outer glow */}
        <div
          style={{
            position: "absolute",
            inset: -40,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,220,140,0.55) 0%, rgba(255,180,90,0.0) 70%)",
            animation: "rise-glow 2.4s ease-in-out infinite"
          }}
        />
        {/* Rays */}
        {rays.map((angle) => (
          <span
            key={angle}
            style={
              {
                "--ray-angle": `${angle}deg`,
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 4,
                height: 100,
                marginLeft: -2,
                marginTop: -50,
                borderRadius: 2,
                background:
                  "linear-gradient(180deg, rgba(255,236,180,0.0) 0%, rgba(255,236,180,0.9) 50%, rgba(255,236,180,0.0) 100%)",
                transformOrigin: "50% 50%",
                animation: `rise-ray 1.6s cubic-bezier(0.22, 1, 0.36, 1) ${0.5 + (angle / 360) * 0.4}s forwards`,
                opacity: 0
              } as React.CSSProperties
            }
          />
        ))}
        {/* Sun disc */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 35% 35%, #fff4cc 0%, #ffd76a 45%, #f0a040 100%)",
            boxShadow: "0 0 60px rgba(255, 200, 120, 0.65)"
          }}
        />
      </div>

      {/* Wordmark — paddingLeft matches letter-spacing to cancel the
          trailing gap after the last letter, so the visual center
          lines up with the page center. */}
      <h1
        style={{
          margin: 0,
          marginTop: 220,
          fontSize: 64,
          fontWeight: 900,
          letterSpacing: "0.08em",
          paddingLeft: "0.08em",
          textAlign: "center",
          textShadow: "0 4px 24px rgba(0,0,0,0.35)",
          opacity: 0,
          animation: "rise-title 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.7s forwards"
        }}
      >
        RISE
      </h1>
      <p
        style={{
          margin: "10px 0 0",
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: "0.18em",
          paddingLeft: "0.18em",
          textAlign: "center",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.92)",
          opacity: 0,
          animation: "rise-tag 0.8s ease-out 1.3s forwards"
        }}
      >
        Time to rise
      </p>
    </div>
  );
}
