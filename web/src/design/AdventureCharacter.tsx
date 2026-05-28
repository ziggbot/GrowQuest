import type { CSSProperties } from "react";

// Hand-drawn SVG fallback character — a cheerful blonde explorer girl.
// Used when no Lottie animation loads (the uploaded Lottie files turned
// out to render as a single light-blue rectangle on iOS Safari).
//
// Pure SVG + CSS keyframes so it costs nothing to bundle and animates
// smoothly. Bobs up and down like she's jumping; ponytails sway.

const KEYFRAMES = `
  @keyframes gq-girl-bob {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-6%); }
  }
  @keyframes gq-girl-arms {
    0%, 100% { transform: rotate(-4deg); }
    50%      { transform: rotate(4deg); }
  }
  @keyframes gq-girl-arms-r {
    0%, 100% { transform: rotate(4deg); }
    50%      { transform: rotate(-4deg); }
  }
  @keyframes gq-girl-ponytail-l {
    0%, 100% { transform: rotate(-6deg); }
    50%      { transform: rotate(2deg); }
  }
  @keyframes gq-girl-ponytail-r {
    0%, 100% { transform: rotate(6deg); }
    50%      { transform: rotate(-2deg); }
  }
`;

export function AdventureGirl({ size = 180, style }: { size?: number; style?: CSSProperties }) {
  return (
    <div style={{ width: size, height: size, ...style }}>
      <style>{KEYFRAMES}</style>
      <svg
        viewBox="0 0 200 200"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Ground shadow */}
        <ellipse cx="100" cy="186" rx="38" ry="4" fill="rgba(0,0,0,0.12)" />

        {/* Whole character bobs */}
        <g style={{ animation: "gq-girl-bob 1.6s ease-in-out infinite", transformOrigin: "100px 186px" }}>
          {/* Legs */}
          <g>
            <rect x="84" y="138" width="12" height="32" rx="6" fill="#f1c89b" />
            <rect x="104" y="138" width="12" height="32" rx="6" fill="#f1c89b" />
            {/* Boots */}
            <rect x="80" y="166" width="20" height="10" rx="4" fill="#7a4a2b" />
            <rect x="100" y="166" width="20" height="10" rx="4" fill="#7a4a2b" />
          </g>

          {/* Body — green explorer dress */}
          <g>
            <path
              d="M68 110 Q100 100 132 110 L138 150 Q100 158 62 150 Z"
              fill="#6cb35a"
              stroke="#3f7e2e"
              strokeWidth="2"
            />
            {/* Belt */}
            <rect x="68" y="135" width="64" height="6" fill="#a06a3c" />
            <rect x="96" y="135" width="8" height="6" fill="#d4a55c" />
          </g>

          {/* Left arm */}
          <g style={{ animation: "gq-girl-arms 1.6s ease-in-out infinite", transformOrigin: "72px 112px" }}>
            <rect x="56" y="108" width="14" height="34" rx="7" fill="#6cb35a" stroke="#3f7e2e" strokeWidth="1.5" />
            <circle cx="63" cy="146" r="7" fill="#f1c89b" />
          </g>

          {/* Right arm */}
          <g style={{ animation: "gq-girl-arms-r 1.6s ease-in-out infinite", transformOrigin: "128px 112px" }}>
            <rect x="130" y="108" width="14" height="34" rx="7" fill="#6cb35a" stroke="#3f7e2e" strokeWidth="1.5" />
            <circle cx="137" cy="146" r="7" fill="#f1c89b" />
          </g>

          {/* Hair — back layer (long blonde) */}
          <g>
            <path
              d="M60 78 Q60 130 78 138 L78 105 Q58 100 60 78"
              fill="#f3c83b"
              stroke="#c7951a"
              strokeWidth="1"
              style={{ animation: "gq-girl-ponytail-l 1.6s ease-in-out infinite", transformOrigin: "70px 82px" }}
            />
            <path
              d="M140 78 Q140 130 122 138 L122 105 Q142 100 140 78"
              fill="#f3c83b"
              stroke="#c7951a"
              strokeWidth="1"
              style={{ animation: "gq-girl-ponytail-r 1.6s ease-in-out infinite", transformOrigin: "130px 82px" }}
            />
          </g>

          {/* Head */}
          <ellipse cx="100" cy="78" rx="32" ry="34" fill="#f9d6ad" stroke="#cc9462" strokeWidth="1.5" />

          {/* Hair — front (bangs) */}
          <path
            d="M68 70 Q72 48 100 46 Q128 48 132 70 Q126 60 112 62 Q108 70 96 64 Q86 70 80 62 Q72 64 68 70 Z"
            fill="#f3c83b"
            stroke="#c7951a"
            strokeWidth="1"
          />

          {/* Explorer hat */}
          <g>
            <ellipse cx="100" cy="50" rx="40" ry="6" fill="#a06a3c" />
            <path
              d="M76 50 Q76 30 100 30 Q124 30 124 50 Z"
              fill="#a06a3c"
              stroke="#6b4724"
              strokeWidth="1.5"
            />
            <rect x="76" y="46" width="48" height="4" fill="#6b4724" />
            {/* Leaf accent */}
            <path d="M118 38 Q126 30 130 38 Q126 42 118 38 Z" fill="#6cb35a" />
          </g>

          {/* Face: blush */}
          <circle cx="82" cy="88" r="4" fill="#f4a8a0" opacity="0.7" />
          <circle cx="118" cy="88" r="4" fill="#f4a8a0" opacity="0.7" />

          {/* Eyes */}
          <g fill="#2b2118">
            <ellipse cx="88" cy="80" rx="3" ry="4" />
            <ellipse cx="112" cy="80" rx="3" ry="4" />
          </g>
          {/* Eye shine */}
          <g fill="#ffffff">
            <circle cx="89" cy="78" r="1" />
            <circle cx="113" cy="78" r="1" />
          </g>

          {/* Smile */}
          <path
            d="M92 92 Q100 99 108 92"
            stroke="#5a3322"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}

export function AdventureBoy({ size = 180, style }: { size?: number; style?: CSSProperties }) {
  return (
    <div style={{ width: size, height: size, ...style }}>
      <style>{KEYFRAMES}</style>
      <svg
        viewBox="0 0 200 200"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="100" cy="186" rx="38" ry="4" fill="rgba(0,0,0,0.12)" />
        <g style={{ animation: "gq-girl-bob 1.6s ease-in-out infinite", transformOrigin: "100px 186px" }}>
          {/* Legs */}
          <rect x="84" y="138" width="12" height="32" rx="6" fill="#f1c89b" />
          <rect x="104" y="138" width="12" height="32" rx="6" fill="#f1c89b" />
          <rect x="80" y="166" width="20" height="10" rx="4" fill="#5b3a20" />
          <rect x="100" y="166" width="20" height="10" rx="4" fill="#5b3a20" />

          {/* Body — blue adventurer shirt */}
          <path
            d="M68 110 Q100 100 132 110 L138 150 Q100 158 62 150 Z"
            fill="#4a8fd6"
            stroke="#27548f"
            strokeWidth="2"
          />
          <rect x="68" y="135" width="64" height="6" fill="#a06a3c" />

          {/* Arms */}
          <g style={{ animation: "gq-girl-arms 1.6s ease-in-out infinite", transformOrigin: "72px 112px" }}>
            <rect x="56" y="108" width="14" height="34" rx="7" fill="#4a8fd6" stroke="#27548f" strokeWidth="1.5" />
            <circle cx="63" cy="146" r="7" fill="#f1c89b" />
          </g>
          <g style={{ animation: "gq-girl-arms-r 1.6s ease-in-out infinite", transformOrigin: "128px 112px" }}>
            <rect x="130" y="108" width="14" height="34" rx="7" fill="#4a8fd6" stroke="#27548f" strokeWidth="1.5" />
            <circle cx="137" cy="146" r="7" fill="#f1c89b" />
          </g>

          {/* Head */}
          <ellipse cx="100" cy="78" rx="32" ry="34" fill="#f9d6ad" stroke="#cc9462" strokeWidth="1.5" />

          {/* Brown messy hair */}
          <path
            d="M66 70 Q66 42 100 42 Q134 42 134 70 Q128 62 118 64 Q112 56 104 64 Q96 56 88 64 Q78 58 72 66 Q68 64 66 70 Z"
            fill="#7a4a2b"
            stroke="#4a2e18"
            strokeWidth="1"
          />

          {/* Explorer hat */}
          <ellipse cx="100" cy="48" rx="40" ry="6" fill="#a06a3c" />
          <path d="M76 48 Q76 28 100 28 Q124 28 124 48 Z" fill="#a06a3c" stroke="#6b4724" strokeWidth="1.5" />
          <rect x="76" y="44" width="48" height="4" fill="#6b4724" />

          {/* Blush */}
          <circle cx="82" cy="88" r="4" fill="#f4a8a0" opacity="0.7" />
          <circle cx="118" cy="88" r="4" fill="#f4a8a0" opacity="0.7" />

          {/* Eyes */}
          <g fill="#2b2118">
            <ellipse cx="88" cy="80" rx="3" ry="4" />
            <ellipse cx="112" cy="80" rx="3" ry="4" />
          </g>
          <g fill="#ffffff">
            <circle cx="89" cy="78" r="1" />
            <circle cx="113" cy="78" r="1" />
          </g>

          {/* Smile */}
          <path
            d="M92 92 Q100 99 108 92"
            stroke="#5a3322"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}
