import React, { useState, useEffect } from "react";
import {
  KARAKTÄR_STADIER,
  UPPDRAG_PER_NIVÅ,
  KaraktärSVG,
} from "../../mockup.jsx";

// Color palette — local copy to keep StagesGallery self-contained.
const C = {
  bg: "#0d1117",
  surface: "rgba(255,255,255,0.07)",
  border: "rgba(255,255,255,0.12)",
  text: "#f0f0f0",
  muted: "rgba(240,240,240,0.55)",
  gold: "#f5c842",
};

// Sparkle keyframes used by the euforisk stage in the mockup. We re-declare
// them once at the top of the gallery so each stage card stays self-contained.
const galleryCss = `
  @keyframes sparkle { 0%,100% { transform: scale(1) rotate(0deg); opacity:0.9 } 50% { transform: scale(1.4) rotate(20deg); opacity:0.6 } }
`;

function MoodBadge({ humör, accent }) {
  const label = {
    trött: "😴 Seg",
    nyfiken: "👀 Nyfiken",
    aktiv: "😊 Aktiv",
    energisk: "🏃 Energisk",
    euforisk: "🤸 Naturhjälte",
  }[humör];
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 14,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(6px)",
        borderRadius: 20,
        padding: "4px 12px",
        fontFamily: "'Fredoka One',cursive",
        color: accent,
        fontSize: "0.72rem",
      }}
    >
      {label}
    </div>
  );
}

function StageCard({ stadium, index, totalApproved, isSelected, onSelect }) {
  return (
    <div
      onClick={() => onSelect(index)}
      style={{
        cursor: "pointer",
        borderRadius: 22,
        overflow: "hidden",
        border: `1.5px solid ${
          isSelected ? stadium.accentFärg : C.border
        }`,
        background: C.bg,
        transition: "transform 0.2s ease, border-color 0.2s ease",
        transform: isSelected ? "scale(1.02)" : "scale(1)",
        boxShadow: isSelected
          ? `0 0 36px ${stadium.accentFärg}33`
          : "none",
      }}
    >
      {/* Sky + ground frame, identical structure to mockup `Karaktär`. */}
      <div
        style={{
          background: `linear-gradient(180deg, ${stadium.himmel[0]}, ${stadium.himmel[1]})`,
          height: 220,
          position: "relative",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 50,
            background: stadium.mark,
            borderRadius: "50% 50% 0 0 / 30px 30px 0 0",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <KaraktärSVG humör={stadium.humör} />
        </div>
        <MoodBadge humör={stadium.humör} accent={stadium.accentFärg} />

        {stadium.humör === "euforisk" &&
          ["🌟", "✨", "⭐", "💫"].map((e, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: `${10 + i * 12}%`,
                left: `${10 + i * 22}%`,
                fontSize: "1rem",
                animation: `sparkle ${1.5 + i * 0.4}s ease-in-out ${
                  i * 0.2
                }s infinite`,
              }}
            >
              {e}
            </div>
          ))}
      </div>

      {/* Footer with name, threshold, description. */}
      <div
        style={{
          padding: "12px 16px",
          background: "rgba(10,15,10,0.85)",
          borderTop: `1px solid ${stadium.accentFärg}33`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 4,
          }}
        >
          <div
            style={{
              fontFamily: "'Fredoka One',cursive",
              color: stadium.accentFärg,
              fontSize: "1rem",
            }}
          >
            {stadium.namn}
          </div>
          <div style={{ color: C.muted, fontSize: "0.72rem" }}>
            Nivå {index} · {UPPDRAG_PER_NIVÅ[index]}+ uppdrag
          </div>
        </div>
        <div
          style={{
            color: C.text,
            fontSize: "0.78rem",
            opacity: 0.85,
            lineHeight: 1.4,
          }}
        >
          {stadium.beskrivning}
        </div>
      </div>
    </div>
  );
}

function ProgressSimulator({ selected, onSelect }) {
  const [auto, setAuto] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => setTick((t) => t + 1), 1500);
    return () => clearInterval(id);
  }, [auto]);

  useEffect(() => {
    if (!auto) return;
    onSelect((selected + 1) % KARAKTÄR_STADIER.length);
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "rgba(13,17,23,0.92)",
        backdropFilter: "blur(8px)",
        borderBottom: `1px solid ${C.border}`,
        padding: "10px 14px",
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontFamily: "'Fredoka One',cursive",
          color: C.gold,
          fontSize: "0.95rem",
          marginRight: 6,
        }}
      >
        Stages
      </div>
      {KARAKTÄR_STADIER.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          style={{
            cursor: "pointer",
            border: `1px solid ${
              i === selected ? s.accentFärg : C.border
            }`,
            background:
              i === selected ? `${s.accentFärg}22` : "transparent",
            color: i === selected ? s.accentFärg : C.muted,
            borderRadius: 16,
            padding: "5px 11px",
            fontSize: "0.78rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {i}. {s.namn}
        </button>
      ))}
      <button
        onClick={() => setAuto((a) => !a)}
        style={{
          marginLeft: "auto",
          cursor: "pointer",
          border: `1px solid ${auto ? C.gold : C.border}`,
          background: auto ? `${C.gold}22` : "transparent",
          color: auto ? C.gold : C.muted,
          borderRadius: 16,
          padding: "5px 11px",
          fontSize: "0.78rem",
        }}
      >
        {auto ? "⏸ Stoppa" : "▶ Spela upp"}
      </button>
    </div>
  );
}

export default function StagesGallery() {
  const [selected, setSelected] = useState(2);

  return (
    <>
      <style>{galleryCss}</style>
      <ProgressSimulator selected={selected} onSelect={setSelected} />
      <div style={{ padding: "12px 14px", display: "grid", gap: 14 }}>
        <p
          style={{
            color: C.muted,
            fontSize: "0.85rem",
            margin: "4px 2px 0",
            lineHeight: 1.5,
          }}
        >
          Karaktär-stadier från <code>mockup.jsx</code> — fem nivåer som låses
          upp efter <strong>{UPPDRAG_PER_NIVÅ.join(", ")}</strong> godkända
          uppdrag. Tryck på en pill ovan för att markera, eller starta en
          automatisk genomspelning.
        </p>
        {KARAKTÄR_STADIER.map((s, i) => (
          <StageCard
            key={i}
            stadium={s}
            index={i}
            totalApproved={UPPDRAG_PER_NIVÅ[i]}
            isSelected={selected === i}
            onSelect={setSelected}
          />
        ))}
      </div>
    </>
  );
}
