import { useState, useEffect, useRef } from "react";

// ── Färgpalett (identisk med v3) ──────────────────────────────
const C = {
  bg:         "#0d1117",
  surface:    "rgba(255,255,255,0.07)",
  surfaceHov: "rgba(255,255,255,0.11)",
  border:     "rgba(255,255,255,0.12)",
  gold:       "#f5c842",
  goldFade:   "rgba(245,200,66,0.15)",
  green:      "#3ddc84",
  greenFade:  "rgba(61,220,132,0.15)",
  red:        "#ff6b6b",
  redFade:    "rgba(255,107,107,0.15)",
  purple:     "#a78bfa",
  purpleFade: "rgba(167,139,250,0.15)",
  blue:       "#60a5fa",
  blueFade:   "rgba(96,165,250,0.15)",
  text:       "#f0f0f0",
  muted:      "rgba(240,240,240,0.45)",
};

// ── Data (identisk med v3) ─────────────────────────────────────
const AVATARER = ["🦸","🧙","🐉","🦊","🐺","🦁","🐸","🐼"];
const INTRESSEN = [
  { id:"dinosaurier", icon:"🦕", label:"Dinosaurier" },
  { id:"rymden",      icon:"🚀", label:"Rymden"      },
  { id:"sport",       icon:"⚽", label:"Sport"        },
  { id:"konst",       icon:"🎨", label:"Konst"        },
  { id:"fantasy",     icon:"🐉", label:"Fantasy"      },
  { id:"djur",        icon:"🐾", label:"Djur"         },
  { id:"musik",       icon:"🎵", label:"Musik"        },
  { id:"vetenskap",   icon:"🔬", label:"Vetenskap"    },
];

const KARAKTÄR_STADIER = [
  { namn:"Soffpotatisen",      beskrivning:"Sitter och gapar... dags att röra på sig!", himmel:["#1a1a2e","#16213e"], mark:"#1a1a2e", humör:"trött",    accentFärg:"#64748b" },
  { namn:"Nyfikna utforskaren",beskrivning:"Sitter upprätt och tittar nyfiket ut i världen!", himmel:["#1e2d3d","#243447"], mark:"#1a2a1a", humör:"nyfiken",  accentFärg:"#60a5fa" },
  { namn:"Aktiva äventyraren", beskrivning:"Står upp med ett leende — rörlig och redo!", himmel:["#1a3a2a","#1e4d35"], mark:"#1a3015", humör:"aktiv",    accentFärg:"#3ddc84" },
  { namn:"Snabba löparen",     beskrivning:"Springer fritt i naturen — full av energi!", himmel:["#0d3320","#1a5030"], mark:"#1a3a18", humör:"energisk", accentFärg:"#f5c842" },
  { namn:"Naturhjälten",       beskrivning:"Hoppar av glädje — stark, pigg och oslagbar!", himmel:["#0a2040","#1a3860"], mark:"#1a3020", humör:"euforisk", accentFärg:"#f472b6" },
];

const UPPDRAG_PER_NIVÅ = [0, 1, 2, 4, 6];

// ── STARTPROFILER ─────────────────────────────────────────────
// Varje profil styr tre dimensioner:
//   uppdragMultiplikator  — multiplicerar myntbelöning per uppdrag
//   skärmtidMultiplikator — multiplicerar myntpris per skärmtidsblock
//   dagsgränsMinuter      — max skärmtid per dag
const PROFILER = [
  {
    id:          "stram",
    ikon:        "🛑",
    namn:        "Skärmfri start",
    tagline:     "Skärmen är ett stort problem hemma",
    beskrivning: "Mynt tjänas långsamt och skärmtid kostar mycket. Barnet behöver verkligen anstränga sig för att förtjäna sin tid.",
    färg:        "#ff6b6b",
    färgFade:    "rgba(255,107,107,0.15)",
    uppdragMultiplikator:  0.7,   // uppdrag ger 70% av normalvärdet
    skärmtidMultiplikator: 1.6,   // skärmtid kostar 160% av normalvärdet
    dagsgränsMinuter:      45,
    exempelUppdrag:        "Promenad 20 min → 55 🪙",
    exempelSkärmtid:       "30 min Roblox → 128 🪙",
    exempelDagsgräns:      "Max 45 min/dag",
  },
  {
    id:          "balans",
    ikon:        "⚖️",
    namn:        "Balanserad",
    tagline:     "Vi vill ha lite mer struktur",
    beskrivning: "Standardinställningar. Barnet tjänar mynt i bra takt och skärmtid kostar ett rättvist pris.",
    färg:        "#a78bfa",
    färgFade:    "rgba(167,139,250,0.15)",
    uppdragMultiplikator:  1.0,
    skärmtidMultiplikator: 1.0,
    dagsgränsMinuter:      90,
    exempelUppdrag:        "Promenad 20 min → 80 🪙",
    exempelSkärmtid:       "30 min Roblox → 80 🪙",
    exempelDagsgräns:      "Max 90 min/dag",
  },
  {
    id:          "fri",
    ikon:        "🌿",
    namn:        "Fritt barn",
    tagline:     "Barnet sköter sig redan bra",
    beskrivning: "Uppdrag ger generöst med mynt och skärmtid är billigare. Fokus på belöning och motivation snarare än begränsning.",
    färg:        "#3ddc84",
    färgFade:    "rgba(61,220,132,0.15)",
    uppdragMultiplikator:  1.35,
    skärmtidMultiplikator: 0.65,
    dagsgränsMinuter:      150,
    exempelUppdrag:        "Promenad 20 min → 108 🪙",
    exempelSkärmtid:       "30 min Roblox → 52 🪙",
    exempelDagsgräns:      "Max 150 min/dag",
  },
];

// Applicera profil på uppdragslistan och skärmtidspriserna
function tillämpaProfilPåUppdrag(uppdrag, multiplikator) {
  return uppdrag.map(u => ({
    ...u,
    coins: Math.round(u.coins * multiplikator / 5) * 5, // avrunda till närmaste 5
  }));
}

function tillämpaProfilPåSkärmtid(skärmtidVal, multiplikator) {
  return skärmtidVal.map(v => ({
    ...v,
    mynt: Math.round(v.mynt * multiplikator / 5) * 5,
  }));
}

// ── ONBOARDING: VÄLJ PROFIL ───────────────────────────────────
function OnboardingProfil({ onVälj }) {
  const [vald, setVald] = useState(null);
  const [steg, setSteg] = useState("välj"); // "välj" | "justera"
  const [justerat, setJusterat] = useState(null); // kopia av profil med ev. justeringar

  const hanteraVälj = (profil) => {
    setVald(profil);
    setJusterat({ ...profil });
  };

  const hanteraFortsätt = () => {
    if (!vald) return;
    setSteg("justera");
    setJusterat({ ...vald });
  };

  const hanteraStarta = () => {
    onVälj(justerat);
  };

  // ── Steg 2: finjustera ────────────────────────────────────
  if (steg === "justera") {
    const uppdragEx  = Math.round(80 * justerat.uppdragMultiplikator / 5) * 5;
    const skärmEx    = Math.round(80 * justerat.skärmtidMultiplikator / 5) * 5;

    return (
      <div style={{ minHeight:"100vh", background:C.bg, maxWidth:420, margin:"0 auto", padding:"0 0 40px" }}>
        <div style={{ padding:"24px 20px 0" }}>
          <button onClick={() => setSteg("välj")} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"8px 14px", color:C.text, cursor:"pointer", fontFamily:"'Nunito',sans-serif", marginBottom:20 }}>←</button>
          <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.4rem", color:C.text, marginBottom:4 }}>
            Finjustera inställningar
          </div>
          <div style={{ color:C.muted, fontSize:"0.82rem", marginBottom:24, lineHeight:1.5 }}>
            Du har valt <span style={{ color:justerat.färg, fontWeight:700 }}>{justerat.namn}</span>. Justera om du vill, annars kör igång!
          </div>
        </div>

        <div style={{ padding:"0 20px" }}>

          {/* Uppdragsbelöning */}
          <Kort style={{ marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div>
                <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"0.95rem" }}>💪 Uppdragsbelöning</div>
                <div style={{ color:C.muted, fontSize:"0.72rem", marginTop:3 }}>Hur generöst uppdrag belönas med mynt</div>
              </div>
              <span style={{ fontFamily:"'Fredoka One',cursive", color:justerat.färg, fontSize:"1rem" }}>{uppdragEx} 🪙 / uppdrag</span>
            </div>
            <input type="range" min={40} max={180} step={5}
              value={Math.round(justerat.uppdragMultiplikator * 100)}
              onChange={e => setJusterat(j => ({ ...j, uppdragMultiplikator: parseInt(e.target.value) / 100 }))}
              style={{ width:"100%", accentColor:justerat.färg }}
            />
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.65rem", color:C.muted, marginTop:4 }}>
              <span>Sparsamt</span><span>Generöst</span>
            </div>
          </Kort>

          {/* Skärmtidspris */}
          <Kort style={{ marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div>
                <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"0.95rem" }}>📱 Skärmtidspris</div>
                <div style={{ color:C.muted, fontSize:"0.72rem", marginTop:3 }}>Hur mycket 30 min skärmtid kostar</div>
              </div>
              <span style={{ fontFamily:"'Fredoka One',cursive", color:justerat.färg, fontSize:"1rem" }}>{skärmEx} 🪙 / 30 min</span>
            </div>
            <input type="range" min={30} max={200} step={5}
              value={Math.round(justerat.skärmtidMultiplikator * 100)}
              onChange={e => setJusterat(j => ({ ...j, skärmtidMultiplikator: parseInt(e.target.value) / 100 }))}
              style={{ width:"100%", accentColor:justerat.färg }}
            />
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.65rem", color:C.muted, marginTop:4 }}>
              <span>Billigt</span><span>Dyrt</span>
            </div>
          </Kort>

          {/* Dagsgräns */}
          <Kort style={{ marginBottom:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div>
                <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"0.95rem" }}>⏰ Dagsgräns skärmtid</div>
                <div style={{ color:C.muted, fontSize:"0.72rem", marginTop:3 }}>Maximalt per dag oavsett mynt</div>
              </div>
              <span style={{ fontFamily:"'Fredoka One',cursive", color:justerat.färg, fontSize:"1rem" }}>{justerat.dagsgränsMinuter} min</span>
            </div>
            <input type="range" min={15} max={240} step={15}
              value={justerat.dagsgränsMinuter}
              onChange={e => setJusterat(j => ({ ...j, dagsgränsMinuter: parseInt(e.target.value) }))}
              style={{ width:"100%", accentColor:justerat.färg }}
            />
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.65rem", color:C.muted, marginTop:4 }}>
              <span>15 min</span><span>4 timmar</span>
            </div>
          </Kort>

          {/* Sammanfattning */}
          <div style={{ background:`${justerat.färg}12`, border:`1px solid ${justerat.färg}33`, borderRadius:16, padding:16, marginBottom:20 }}>
            <div style={{ fontFamily:"'Fredoka One',cursive", color:justerat.färg, fontSize:"0.82rem", marginBottom:10 }}>Din konfiguration</div>
            {[
              { label:"Promenad 20 min ger", val:`${Math.round(80 * justerat.uppdragMultiplikator / 5) * 5} 🪙` },
              { label:"30 min Roblox kostar", val:`${Math.round(80 * justerat.skärmtidMultiplikator / 5) * 5} 🪙` },
              { label:"Max skärmtid per dag", val:`${justerat.dagsgränsMinuter} min` },
            ].map(r => (
              <div key={r.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <span style={{ color:C.muted, fontSize:"0.78rem" }}>{r.label}</span>
                <span style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"0.82rem" }}>{r.val}</span>
              </div>
            ))}
          </div>

          <Knapp variant="grön" onClick={hanteraStarta}>Starta GrowQuest! 🚀</Knapp>
          <div style={{ textAlign:"center", marginTop:10 }}>
            <span onClick={hanteraStarta} style={{ color:C.muted, fontSize:"0.75rem", cursor:"pointer", textDecoration:"underline" }}>
              Hoppa över — använd standardinställningar
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── Steg 1: välj profil ───────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:C.bg, maxWidth:420, margin:"0 auto", padding:"0 0 40px" }}>
      <div style={{ padding:"36px 20px 0", textAlign:"center", marginBottom:28 }}>
        <div style={{ fontSize:"3rem", marginBottom:12, animation:"float 3s ease-in-out infinite" }}>🌱</div>
        <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.7rem", color:C.text, marginBottom:8 }}>
          Välkommen till GrowQuest!
        </div>
        <div style={{ color:C.muted, fontSize:"0.85rem", lineHeight:1.6, maxWidth:320, margin:"0 auto" }}>
          Välj en startprofil som passar er familj. Du kan alltid ändra inställningarna senare.
        </div>
      </div>

      <div style={{ padding:"0 20px" }}>
        {PROFILER.map(p => {
          const ärVald = vald?.id === p.id;
          return (
            <div key={p.id} onClick={() => hanteraVälj(p)} style={{
              background: ärVald ? `${p.färg}18` : C.surface,
              border: `2px solid ${ärVald ? p.färg : C.border}`,
              borderRadius:20, padding:"18px 16px", marginBottom:12,
              cursor:"pointer", transition:"all 0.18s",
              boxShadow: ärVald ? `0 0 28px ${p.färg}22` : "none",
            }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
                <div style={{ width:48, height:48, borderRadius:14, background:`${p.färg}22`, border:`1px solid ${p.färg}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.6rem", flexShrink:0 }}>
                  {p.ikon}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <div style={{ fontFamily:"'Fredoka One',cursive", color: ärVald ? p.färg : C.text, fontSize:"1rem" }}>{p.namn}</div>
                    {ärVald && <div style={{ width:18, height:18, borderRadius:"50%", background:p.färg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.6rem", color:"#fff", fontWeight:700 }}>✓</div>}
                  </div>
                  <div style={{ color:C.muted, fontSize:"0.78rem", fontStyle:"italic", marginBottom:10 }}>"{p.tagline}"</div>
                  <div style={{ color: ärVald ? `${p.färg}cc` : "rgba(240,240,240,0.35)", fontSize:"0.75rem", lineHeight:1.5, marginBottom:10 }}>
                    {p.beskrivning}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    {[p.exempelUppdrag, p.exempelSkärmtid, p.exempelDagsgräns].map((ex,i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ width:4, height:4, borderRadius:"50%", background: ärVald ? p.färg : C.muted, flexShrink:0 }}/>
                        <span style={{ fontSize:"0.72rem", color: ärVald ? `${p.färg}cc` : C.muted }}>{ex}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div style={{ marginTop:8 }}>
          <Knapp
            variant={vald ? "primary" : "ghost"}
            disabled={!vald}
            onClick={hanteraFortsätt}
          >
            {vald ? `Fortsätt med "${vald.namn}" →` : "Välj en profil för att fortsätta"}
          </Knapp>
          <div style={{ textAlign:"center", marginTop:12 }}>
            <span onClick={() => onVälj(PROFILER[1])} style={{ color:C.muted, fontSize:"0.75rem", cursor:"pointer", textDecoration:"underline" }}>
              Hoppa över — använd standardinställningar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
const BEVISMETODER = {
  utomhus:  ["timer", "foto", "anteckning"],
  träning:  ["timer", "anteckning"],
  läsning:  ["timer", "anteckning"],
  sysslor:  ["foto", "anteckning"],
  kreativt: ["foto", "anteckning"],
};

const INITIALA_UPPDRAG = [
  { id:1, title:"Drakarnas Vandring", desc:"Gå utomhus i 20 minuter",       coins:80, icon:"🐉", kategori:"utomhus",  svårighetsgrad:"medel", timerMinuter:20,   status:"assigned",         bevis:null, inskickatFör:null },
  { id:2, title:"Kockens Lärling",    desc:"Hjälp till att laga mat",        coins:60, icon:"🍳", kategori:"sysslor",  svårighetsgrad:"lätt",  timerMinuter:null, status:"pending_approval", bevis:{ typ:"timer", varaktighet:"22:14" }, inskickatFör:"5 min sedan" },
  { id:3, title:"Bokens Trollkarl",   desc:"Läs i 30 minuter",               coins:70, icon:"📚", kategori:"läsning",  svårighetsgrad:"medel", timerMinuter:30,   status:"assigned",         bevis:null, inskickatFör:null },
  { id:4, title:"Hoppande Hjälten",   desc:"Gör 20 stjärnhopp",              coins:40, icon:"⚡", kategori:"träning",  svårighetsgrad:"lätt",  timerMinuter:5,    status:"pending_approval", bevis:{ typ:"anteckning", text:"Jag gjorde 25 stjärnhopp! 💪" }, inskickatFör:"12 min sedan" },
  { id:5, title:"Konstnärens Resa",   desc:"Rita eller måla något",          coins:50, icon:"🎨", kategori:"kreativt", svårighetsgrad:"lätt",  timerMinuter:null, status:"approved",         bevis:{ typ:"foto" }, inskickatFör:"igår" },
  { id:6, title:"Naturutforskaren",   desc:"Hitta 5 olika växter utomhus",   coins:90, icon:"🌿", kategori:"utomhus",  svårighetsgrad:"svårt", timerMinuter:25,   status:"assigned",         bevis:null, inskickatFör:null },
];

const SKÄRMTID_VAL = [
  { minuter:15, mynt:40,  ikon:"⚡", etikett:"Snabbis"   },
  { minuter:30, mynt:80,  ikon:"📱", etikett:"Halvtimme" },
  { minuter:60, mynt:150, ikon:"🎮", etikett:"En timme"  },
];

const APPAR = [
  { id:"youtube", namn:"YouTube",    ikon:"📺", kategori:"Video"  },
  { id:"games",   namn:"Spel",       ikon:"🎮", kategori:"Spel"   },
  { id:"tiktok",  namn:"TikTok",     ikon:"🎵", kategori:"Video"  },
  { id:"valfri",  namn:"Valfri app", ikon:"📱", kategori:"Övrigt" },
];

// ── BONUS & BELÖNING ──────────────────────────────────────────
// triggerTyp: "mynt_milstolpe" | "alla_uppdrag_klara" | "streak"
// belöningTyp: "mynt" | "fri"
const INITIALA_BONUSAR = [
  { id:1, aktiv:true,  triggerTyp:"alla_uppdrag_klara", triggerVärde:null, ikon:"🌟", namn:"Perfekt dag!",   belöningMynt:50,  utlöst:false },
  { id:2, aktiv:true,  triggerTyp:"streak",             triggerVärde:7,    ikon:"🔥", namn:"Veckans hjälte", belöningMynt:100, utlöst:false },
  { id:3, aktiv:false, triggerTyp:"mynt_milstolpe",     triggerVärde:500,  ikon:"💰", namn:"Halvvägs!",      belöningMynt:80,  utlöst:false },
];

// ── MYNT → PENGAR ─────────────────────────────────────────────
// Två lägen: fast kurs (kurs kr per 100 mynt) + spargris (saldo i kr)
const INITIAL_EKONOMI = {
  kurs:     5,   // kr per 100 mynt
  historik: [
    { id:1, mynt:200, kr:10, datum:"igår",         beskrivning:"Swishad till Maja" },
    { id:2, mynt:100, kr:5,  datum:"förra veckan", beskrivning:"Kontant utbetalning" },
  ],
};

// ── Gemensamma komponenter (identiska med v3) ─────────────────
function Pill({ children, color = C.purple, style = {} }) {
  return (
    <span style={{
      background:`${color}22`, color, border:`1px solid ${color}44`,
      borderRadius:20, padding:"3px 10px", fontSize:"0.68rem",
      fontWeight:700, letterSpacing:"0.3px", ...style
    }}>{children}</span>
  );
}

function Knapp({ children, onClick, variant="primary", disabled, style={} }) {
  const v = {
    primary: { background:`linear-gradient(135deg,${C.purple},#7c3aed)`, color:"#fff", boxShadow:`0 6px 24px ${C.purpleFade}` },
    grön:    { background:`linear-gradient(135deg,${C.green},#22c55e)`,  color:"#fff", boxShadow:`0 6px 24px ${C.greenFade}` },
    blå:     { background:`linear-gradient(135deg,${C.blue},#2563eb)`,   color:"#fff", boxShadow:`0 6px 24px ${C.blueFade}` },
    ghost:   { background:"transparent", color:C.muted, border:`1px solid ${C.border}` },
    fara:    { background:`linear-gradient(135deg,${C.red},#dc2626)`,    color:"#fff", boxShadow:`0 6px 24px ${C.redFade}` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...(v[variant]??v.primary), border:"none", borderRadius:16,
      padding:"14px 20px", fontFamily:"'Fredoka One', cursive", fontSize:"1rem",
      cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.4:1,
      width:"100%", transition:"transform 0.12s, opacity 0.18s", ...style
    }}
      onMouseDown={e=>e.currentTarget.style.transform="scale(0.97)"}
      onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
      onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
    >{children}</button>
  );
}

function Kort({ children, style={}, glöd, onClick }) {
  return (
    <div onClick={onClick} style={{
      background:C.surface, border:`1px solid ${C.border}`,
      borderRadius:20, padding:16, backdropFilter:"blur(12px)",
      boxShadow:glöd?`0 0 32px ${glöd}`:"none",
      cursor:onClick?"pointer":"default",
      transition:"background 0.15s",
      ...style
    }}>{children}</div>
  );
}

// ── DEV TOGGLE (ny i v4) ──────────────────────────────────────
function DevToggle({ vy, setVy }) {
  return (
    <div style={{
      position:"fixed", top:12, right:12, zIndex:999,
      background:"rgba(13,17,23,0.92)", backdropFilter:"blur(12px)",
      border:`1px solid ${C.border}`, borderRadius:20,
      padding:"5px 6px", display:"flex", gap:4, alignItems:"center",
    }}>
      <span style={{ fontSize:"0.6rem", color:C.muted, fontFamily:"'Nunito',sans-serif", fontWeight:700, letterSpacing:"0.5px", paddingLeft:4, paddingRight:2, textTransform:"uppercase" }}>DEV</span>
      {[
        { id:"barn",    label:"🧒 Barn"     },
        { id:"förälder",label:"👩 Förälder" },
      ].map(v => (
        <button key={v.id} onClick={() => setVy(v.id)} style={{
          background: vy === v.id
            ? `linear-gradient(135deg,${C.purple},#7c3aed)`
            : "transparent",
          color: vy === v.id ? "#fff" : C.muted,
          border: vy === v.id ? "none" : `1px solid ${C.border}`,
          borderRadius:14, padding:"5px 12px",
          fontFamily:"'Fredoka One',cursive", fontSize:"0.72rem",
          cursor:"pointer", transition:"all 0.15s",
          boxShadow: vy === v.id ? `0 2px 12px ${C.purpleFade}` : "none",
        }}>{v.label}</button>
      ))}
    </div>
  );
}

// ── TIMER ─────────────────────────────────────────────────────
function Timer({ minuter, onKlar }) {
  const totaltSek = minuter * 60;
  const [sekKvar, setSekKvar] = useState(totaltSek);
  const [aktiv, setAktiv] = useState(false);
  const [klar, setKlar] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (aktiv && sekKvar > 0) {
      ref.current = setInterval(() => setSekKvar(s => s - 1), 1000);
    } else if (sekKvar === 0 && aktiv) {
      setAktiv(false); setKlar(true); clearInterval(ref.current);
    }
    return () => clearInterval(ref.current);
  }, [aktiv, sekKvar]);

  const min = Math.floor(sekKvar / 60);
  const sek = sekKvar % 60;
  const andel = (totaltSek - sekKvar) / totaltSek;
  const cirkelvärde = 2 * Math.PI * 54;

  if (klar) return (
    <div style={{ textAlign:"center", padding:"24px 0" }}>
      <div style={{ fontSize:"3.5rem", marginBottom:12, animation:"float 2s ease-in-out infinite" }}>🎉</div>
      <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.4rem", color:C.green, marginBottom:6 }}>Timer klar!</div>
      <div style={{ color:C.muted, fontSize:"0.82rem", marginBottom:20 }}>Du klarade {minuter} minuter! Bra jobbat!</div>
      <Knapp variant="grön" onClick={() => onKlar(`${minuter}:00`)}>Skicka in bevis ✓</Knapp>
    </div>
  );

  return (
    <div style={{ textAlign:"center", padding:"16px 0" }}>
      <div style={{ position:"relative", display:"inline-block", marginBottom:20 }}>
        <svg width="130" height="130" style={{ transform:"rotate(-90deg)" }}>
          <circle cx="65" cy="65" r="54" fill="none" stroke={C.border} strokeWidth="8"/>
          <circle cx="65" cy="65" r="54" fill="none" stroke={C.purple} strokeWidth="8"
            strokeDasharray={cirkelvärde} strokeDashoffset={andel * cirkelvärde}
            strokeLinecap="round" style={{ transition:"stroke-dashoffset 1s linear" }}/>
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"2rem", color:C.text, lineHeight:1 }}>
            {String(min).padStart(2,"0")}:{String(sek).padStart(2,"0")}
          </div>
          <div style={{ color:C.muted, fontSize:"0.65rem" }}>minuter kvar</div>
        </div>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        {!aktiv ? (
          <Knapp variant="grön" onClick={() => setAktiv(true)}>{sekKvar < totaltSek ? "▶ Fortsätt" : "▶ Starta timer"}</Knapp>
        ) : (
          <Knapp variant="ghost" onClick={() => { setAktiv(false); clearInterval(ref.current); }}>⏸ Pausa</Knapp>
        )}
        {sekKvar < totaltSek && !aktiv && (
          <Knapp variant="ghost" onClick={() => setSekKvar(totaltSek)} style={{ width:52, flexShrink:0 }}>↺</Knapp>
        )}
      </div>
    </div>
  );
}

// ── UPPDRAGSDETALJ ────────────────────────────────────────────
function UppdragsDetalj({ uppdrag, onTillbaka, onSkickaIn }) {
  const [bevisLäge, setBevisLäge] = useState(null);
  const [anteckningText, setAnteckningText] = useState("");
  const [fotoVald, setFotoVald] = useState(false);
  const [visaKlarAnimation, setVisaKlarAnimation] = useState(false);

  const metoder = BEVISMETODER[uppdrag.kategori] ?? ["anteckning"];
  const svårighetsFärg = { lätt:C.green, medel:C.gold, svårt:C.red }[uppdrag.svårighetsgrad] ?? C.gold;

  const hanteraTimerKlar = (varaktighet) => {
    setVisaKlarAnimation(true);
    setTimeout(() => onSkickaIn(uppdrag.id, { typ:"timer", varaktighet }), 1400);
  };
  const hanteraFotoKlar = () => {
    setVisaKlarAnimation(true);
    setTimeout(() => onSkickaIn(uppdrag.id, { typ:"foto" }), 1400);
  };
  const hanteraAnteckningKlar = () => {
    if (!anteckningText.trim()) return;
    setVisaKlarAnimation(true);
    setTimeout(() => onSkickaIn(uppdrag.id, { typ:"anteckning", text:anteckningText }), 1400);
  };

  if (visaKlarAnimation) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, padding:"0 24px" }}>
      <div style={{ fontSize:"5rem", animation:"float 1s ease-in-out infinite" }}>⭐</div>
      <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"2rem", color:C.text, textAlign:"center" }}>Bevis inskickat!</div>
      <div style={{ color:C.muted, fontSize:"0.9rem", textAlign:"center" }}>Väntar på förälderns godkännande…</div>
      <div style={{ display:"flex", gap:8, marginTop:8 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:C.purple, animation:`bounce 0.8s ease-in-out ${i*0.15}s infinite` }}/>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg, maxWidth:420, margin:"0 auto" }}>
      <div style={{ padding:"20px 20px 0", display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button onClick={onTillbaka} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"8px 14px", color:C.text, cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontSize:"1rem" }}>←</button>
        <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.2rem", color:C.text }}>Uppdragsdetaljer</div>
      </div>
      <div style={{ padding:"0 20px 40px" }}>
        <div style={{ background:`linear-gradient(135deg,${C.purpleFade},${C.surface})`, border:`1px solid ${C.purple}44`, borderRadius:24, padding:20, marginBottom:20 }}>
          <div style={{ display:"flex", gap:16, alignItems:"flex-start", marginBottom:16 }}>
            <div style={{ fontSize:"3.2rem", lineHeight:1 }}>{uppdrag.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.3rem", color:C.text, marginBottom:4 }}>{uppdrag.title}</div>
              <div style={{ color:C.muted, fontSize:"0.85rem", marginBottom:10, lineHeight:1.4 }}>{uppdrag.desc}</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <Pill color={C.gold}>🪙 {uppdrag.coins} mynt</Pill>
                <Pill color={svårighetsFärg}>{uppdrag.svårighetsgrad}</Pill>
                <Pill color={C.purple}>{uppdrag.kategori}</Pill>
              </div>
            </div>
          </div>
          <div style={{ background:"rgba(0,0,0,0.2)", borderRadius:14, padding:"10px 14px", fontSize:"0.78rem", color:C.muted, lineHeight:1.5 }}>
            💡 {uppdrag.kategori === "utomhus" && "Ta med dig mobilen utomhus och starta timern!"}
            {uppdrag.kategori === "träning" && "Räkna högt medan du hoppar — det gör det roligare!"}
            {uppdrag.kategori === "läsning" && "Hitta en bekväm plats och starta timern när du börjar läsa."}
            {uppdrag.kategori === "sysslor" && "Ta en bild på resultatet när du är klar!"}
            {uppdrag.kategori === "kreativt" && "Fotografera ditt konstverk som bevis!"}
          </div>
        </div>

        {uppdrag.status === "pending_approval" && (
          <div style={{ background:C.goldFade, border:`1px solid ${C.gold}44`, borderRadius:16, padding:16, textAlign:"center" }}>
            <div style={{ fontSize:"2rem", marginBottom:8 }}>⏳</div>
            <div style={{ fontFamily:"'Fredoka One',cursive", color:C.gold, fontSize:"1rem", marginBottom:4 }}>Väntar på godkännande</div>
            <div style={{ color:C.muted, fontSize:"0.78rem" }}>Inskickat {uppdrag.inskickatFör} — en förälder granskar snart!</div>
          </div>
        )}

        {uppdrag.status === "approved" && (
          <div style={{ background:C.greenFade, border:`1px solid ${C.green}44`, borderRadius:16, padding:16, textAlign:"center" }}>
            <div style={{ fontSize:"2rem", marginBottom:8 }}>✅</div>
            <div style={{ fontFamily:"'Fredoka One',cursive", color:C.green, fontSize:"1rem", marginBottom:4 }}>Uppdrag godkänt!</div>
            <div style={{ color:C.muted, fontSize:"0.78rem" }}>+{uppdrag.coins} mynt tilldelade 🪙</div>
          </div>
        )}

        {uppdrag.status === "assigned" && (
          <>
            {!bevisLäge && (
              <div>
                <div style={{ fontFamily:"'Fredoka One',cursive", color:C.muted, fontSize:"0.78rem", letterSpacing:"1px", textTransform:"uppercase", marginBottom:12 }}>
                  Hur vill du bevisa det?
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
                  {metoder.includes("timer") && (
                    <div onClick={() => setBevisLäge("timer")} style={{ display:"flex", alignItems:"center", gap:14, background:C.surface, border:`1px solid ${C.border}`, borderRadius:18, padding:16, cursor:"pointer" }}>
                      <div style={{ width:48, height:48, borderRadius:14, background:C.greenFade, border:`1px solid ${C.green}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.6rem" }}>⏱️</div>
                      <div>
                        <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"1rem" }}>Starta timer</div>
                        <div style={{ color:C.muted, fontSize:"0.75rem" }}>{uppdrag.timerMinuter} minuter — appen mäter tiden åt dig</div>
                      </div>
                    </div>
                  )}
                  {metoder.includes("foto") && (
                    <div onClick={() => setBevisLäge("foto")} style={{ display:"flex", alignItems:"center", gap:14, background:C.surface, border:`1px solid ${C.border}`, borderRadius:18, padding:16, cursor:"pointer" }}>
                      <div style={{ width:48, height:48, borderRadius:14, background:C.blueFade, border:`1px solid ${C.blue}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.6rem" }}>📸</div>
                      <div>
                        <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"1rem" }}>Ta ett foto</div>
                        <div style={{ color:C.muted, fontSize:"0.75rem" }}>Fotografera ditt bevis</div>
                      </div>
                    </div>
                  )}
                  {metoder.includes("anteckning") && (
                    <div onClick={() => setBevisLäge("anteckning")} style={{ display:"flex", alignItems:"center", gap:14, background:C.surface, border:`1px solid ${C.border}`, borderRadius:18, padding:16, cursor:"pointer" }}>
                      <div style={{ width:48, height:48, borderRadius:14, background:C.purpleFade, border:`1px solid ${C.purple}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.6rem" }}>✏️</div>
                      <div>
                        <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"1rem" }}>Skriv en anteckning</div>
                        <div style={{ color:C.muted, fontSize:"0.75rem" }}>Berätta vad du gjorde</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {bevisLäge === "timer" && uppdrag.timerMinuter && (
              <Kort>
                <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"1rem", marginBottom:4 }}>⏱️ Timer</div>
                <Timer minuter={uppdrag.timerMinuter} onKlar={hanteraTimerKlar} />
                <Knapp variant="ghost" onClick={() => setBevisLäge(null)} style={{ marginTop:12 }}>← Välj annat</Knapp>
              </Kort>
            )}

            {bevisLäge === "foto" && (
              <Kort>
                <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"1rem", marginBottom:16 }}>📸 Foto-bevis</div>
                <div onClick={() => setFotoVald(true)} style={{ border:`2px dashed ${fotoVald ? C.green : C.border}`, borderRadius:16, padding:32, textAlign:"center", cursor:"pointer", background:fotoVald ? C.greenFade : "transparent", marginBottom:16 }}>
                  <div style={{ fontSize:"2.5rem", marginBottom:8 }}>{fotoVald ? "✅" : "📷"}</div>
                  <div style={{ color:fotoVald ? C.green : C.muted, fontFamily:"'Fredoka One',cursive", fontSize:"0.9rem" }}>
                    {fotoVald ? "Foto valt!" : "Tryck för att välja foto"}
                  </div>
                </div>
                <Knapp variant="grön" disabled={!fotoVald} onClick={hanteraFotoKlar}>Skicka in foto ✓</Knapp>
                <Knapp variant="ghost" onClick={() => setBevisLäge(null)} style={{ marginTop:8 }}>← Välj annat</Knapp>
              </Kort>
            )}

            {bevisLäge === "anteckning" && (
              <Kort>
                <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"1rem", marginBottom:12 }}>✏️ Skriv ditt bevis</div>
                <textarea
                  value={anteckningText}
                  onChange={e => setAnteckningText(e.target.value)}
                  placeholder="Berätta vad du gjorde och hur det gick..."
                  style={{ width:"100%", background:"rgba(0,0,0,0.3)", border:`1px solid ${C.border}`, borderRadius:12, padding:12, color:C.text, fontFamily:"'Nunito',sans-serif", fontSize:"0.9rem", resize:"none", minHeight:100, outline:"none", boxSizing:"border-box", marginBottom:12 }}
                />
                <Knapp variant="grön" disabled={!anteckningText.trim()} onClick={hanteraAnteckningKlar}>Skicka in ✓</Knapp>
                <Knapp variant="ghost" onClick={() => setBevisLäge(null)} style={{ marginTop:8 }}>← Välj annat</Knapp>
              </Kort>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── SVG-KARAKTÄR ──────────────────────────────────────────────
function KaraktärSVG({ humör }) {
  const HUD="#f4c08a", HUD2="#e8a86a", HÅR="#6B3A1F", HÅR2="#8B4E28";
  const ÖGA="#4a9e6b", PUPIL="#1a3a28", LÄP="#d4706a", KLÄDER="#8B5E3C", KLÄDER2="#6B4020";

  const css = `
    @keyframes blink    {0%,92%,100%{transform:scaleY(1)}96%{transform:scaleY(0.08)}}
    @keyframes breathe  {0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
    @keyframes wobble   {0%,100%{transform:rotate(0deg)}25%{transform:rotate(-4deg)}75%{transform:rotate(4deg)}}
    @keyframes jump     {0%,100%{transform:translateY(0)}40%{transform:translateY(-22px)}60%{transform:translateY(-18px)}}
    @keyframes run      {0%,100%{transform:rotate(0deg) translateY(0)}30%{transform:rotate(-5deg) translateY(-6px)}70%{transform:rotate(5deg) translateY(-4px)}}
    @keyframes armSwing {0%,100%{transform:rotate(0deg)}50%{transform:rotate(12deg)}}
    @keyframes eyebrow  {0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}
    @keyframes star     {0%,100%{transform:scale(1) rotate(0deg)}50%{transform:scale(1.3) rotate(20deg)}}
    @keyframes float    {0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
  `;

  const Öga = ({ cx, cy, r=9, lookX=0, lookY=0 }) => (
    <g>
      <ellipse cx={cx} cy={cy} rx={r} ry={r*1.1} fill="white" />
      <circle cx={cx+lookX} cy={cy+lookY+1} r={r*0.6} fill={ÖGA} />
      <circle cx={cx+lookX} cy={cy+lookY+1} r={r*0.32} fill={PUPIL} />
      <circle cx={cx+lookX-2} cy={cy+lookY-2} r={r*0.14} fill="white" />
    </g>
  );
  const Näsa = ({cx,cy}) => <ellipse cx={cx} cy={cy} rx={4} ry={3} fill={HUD2} opacity="0.7"/>;
  const Kinder = ({cx,cy}) => <g opacity="0.45"><ellipse cx={cx-38} cy={cy} rx="10" ry="6" fill="#f08080"/><ellipse cx={cx+38} cy={cy} rx="10" ry="6" fill="#f08080"/></g>;

  const Mun = ({cx,cy,typ="glad"}) => {
    if (typ==="gäspar") return <g><ellipse cx={cx} cy={cy} rx={9} ry={11} fill="#2a0a0a"/><ellipse cx={cx} cy={cy+3} rx={7} ry={6} fill={LÄP} opacity="0.6"/></g>;
    if (typ==="litet_leende") return <path d={`M${cx-8} ${cy} Q${cx} ${cy+7} ${cx+8} ${cy}`} stroke={LÄP} strokeWidth="2.5" fill="none" strokeLinecap="round"/>;
    if (typ==="brett") return <g><path d={`M${cx-12} ${cy} Q${cx} ${cy+14} ${cx+12} ${cy}`} fill={LÄP}/><path d={`M${cx-10} ${cy+1} Q${cx} ${cy+11} ${cx+10} ${cy+1}`} fill="white" opacity="0.9"/></g>;
    if (typ==="superhapp") return <g><path d={`M${cx-14} ${cy-2} Q${cx} ${cy+18} ${cx+14} ${cy-2}`} fill={LÄP}/><path d={`M${cx-12} ${cy} Q${cx} ${cy+14} ${cx+12} ${cy}`} fill="white" opacity="0.9"/></g>;
    return <g><path d={`M${cx-10} ${cy} Q${cx} ${cy+11} ${cx+10} ${cy}`} fill={LÄP}/><path d={`M${cx-8} ${cy+1} Q${cx} ${cy+8} ${cx+8} ${cy+1}`} fill="white" opacity="0.85"/></g>;
  };

  const Hår = ({cx,cy,stil="normal"}) => {
    if (stil==="vildigt") return <g fill={HÅR}><ellipse cx={cx} cy={cy-4} rx={32} ry={20}/><ellipse cx={cx-20} cy={cy+5} rx={14} ry={10}/><ellipse cx={cx+20} cy={cy+5} rx={14} ry={10}/></g>;
    if (stil==="krans") return <g><ellipse cx={cx} cy={cy-4} rx={34} ry={22} fill={HÅR}/><circle cx={cx-28} cy={cy+8} r={7} fill="#22c55e"/><circle cx={cx+28} cy={cy+8} r={7} fill="#22c55e"/><circle cx={cx} cy={cy-24} r={6} fill="#f472b6"/></g>;
    return <g fill={HÅR}><ellipse cx={cx} cy={cy-4} rx={30} ry={18}/><ellipse cx={cx-18} cy={cy+6} rx={12} ry={8}/><ellipse cx={cx+18} cy={cy+6} rx={12} ry={8}/></g>;
  };

  const Löv = ({x,y,rotation=0,color="#3ddc84"}) => (
    <ellipse cx={x} cy={y} rx={8} ry={14} fill={color} transform={`rotate(${rotation} ${x} ${y})`} opacity="0.85"/>
  );

  if (humör==="trött") return (
    <svg width="140" height="200" viewBox="0 0 140 200" style={{overflow:"visible"}}>
      <style>{css}</style>
      <g style={{animation:"wobble 4s ease-in-out infinite", transformOrigin:"70px 150px"}}>
        <ellipse cx="70" cy="195" rx="30" ry="7" fill={HUD2} opacity="0.25"/>
        <rect x="42" y="155" width="20" height="38" rx="10" fill={HUD}/>
        <rect x="78" y="158" width="20" height="35" rx="10" fill={HUD}/>
        <ellipse cx="43" cy="176" rx="15" ry="7" fill={HUD2}/>
        <ellipse cx="97" cy="176" rx="15" ry="7" fill={HUD2}/>
        <path d="M30 108 Q70 120 110 108 L106 148 Q70 155 34 148 Z" fill={KLÄDER}/>
        <ellipse cx="70" cy="108" rx="32" ry="24" fill={HUD}/>
        <path d="M38 100 Q22 108 18 128" stroke={HUD} strokeWidth="17" fill="none" strokeLinecap="round"/>
        <circle cx="18" cy="130" r="9" fill={HUD}/>
        <path d="M102 100 Q118 108 122 128" stroke={HUD} strokeWidth="17" fill="none" strokeLinecap="round"/>
        <circle cx="122" cy="130" r="9" fill={HUD}/>
      </g>
      <g transform="rotate(-6 70 65)">
        <circle cx="70" cy="65" r="43" fill={HUD}/>
        <Hår cx={70} cy={36} stil="normal"/>
        <Öga cx={52} cy={63} r={11} lookX={2} lookY={-1}/>
        <Öga cx={88} cy={63} r={11} lookX={2} lookY={-1}/>
        <Näsa cx={70} cy={76}/>
        <Mun cx={70} cy={84} typ="gäspar"/>
        <Kinder cx={70} cy={73}/>
      </g>
    </svg>
  );

  if (humör==="nyfiken") return (
    <svg width="140" height="210" viewBox="0 0 140 210" style={{overflow:"visible"}}>
      <style>{css}</style>
      <g style={{animation:"breathe 3s ease-in-out infinite", transformOrigin:"70px 150px"}}>
        <ellipse cx="70" cy="204" rx="32" ry="8" fill={HUD2} opacity="0.28"/>
        <rect x="42" y="158" width="20" height="44" rx="10" fill={HUD}/>
        <rect x="78" y="158" width="20" height="44" rx="10" fill={HUD}/>
        <ellipse cx="43" cy="176" rx="15" ry="7" fill={HUD2}/>
        <ellipse cx="97" cy="176" rx="15" ry="7" fill={HUD2}/>
        <path d="M30 108 Q70 120 110 108 L106 148 Q70 155 34 148 Z" fill={KLÄDER}/>
        <ellipse cx="70" cy="108" rx="32" ry="24" fill={HUD}/>
        <path d="M38 100 Q22 108 18 128" stroke={HUD} strokeWidth="17" fill="none" strokeLinecap="round"/>
        <circle cx="18" cy="130" r="9" fill={HUD}/>
        <path d="M102 100 Q118 108 122 128" stroke={HUD} strokeWidth="17" fill="none" strokeLinecap="round"/>
        <circle cx="122" cy="130" r="9" fill={HUD}/>
      </g>
      <g transform="rotate(-6 70 65)">
        <circle cx="70" cy="65" r="43" fill={HUD}/>
        <Hår cx={70} cy={36} stil="normal"/>
        <Öga cx={52} cy={63} r={11} lookX={2} lookY={-1}/>
        <Öga cx={88} cy={63} r={11} lookX={2} lookY={-1}/>
        <path d="M40 50 Q52 44 63 50" stroke={HÅR} strokeWidth="3" fill="none" strokeLinecap="round" style={{animation:"eyebrow 2s ease-in-out infinite"}}/>
        <path d="M77 50 Q88 44 99 50" stroke={HÅR} strokeWidth="3" fill="none" strokeLinecap="round" style={{animation:"eyebrow 2s ease-in-out 0.3s infinite"}}/>
        <Näsa cx={70} cy={76}/>
        <Mun cx={70} cy={84} typ="litet_leende"/>
        <Kinder cx={70} cy={73}/>
      </g>
      <text x="108" y="38" fill="rgba(96,165,250,0.8)" fontSize="22" fontWeight="bold" fontFamily="sans-serif" style={{animation:"float 2.5s ease-in-out infinite"}}>?</text>
    </svg>
  );

  if (humör==="aktiv") return (
    <svg width="140" height="210" viewBox="0 0 140 210" style={{overflow:"visible"}}>
      <style>{css}</style>
      <g style={{animation:"breathe 2.5s ease-in-out infinite", transformOrigin:"70px 150px"}}>
        <ellipse cx="70" cy="204" rx="34" ry="8" fill={HUD2} opacity="0.3"/>
        <rect x="38" y="158" width="22" height="44" rx="11" fill={HUD}/>
        <rect x="80" y="158" width="22" height="44" rx="11" fill={HUD}/>
        <ellipse cx="49" cy="202" rx="16" ry="8" fill={HUD2}/>
        <ellipse cx="91" cy="202" rx="16" ry="8" fill={HUD2}/>
        <path d="M24 118 Q70 130 116 118 L112 162 Q70 170 28 162 Z" fill={KLÄDER}/>
        <ellipse cx="70" cy="116" rx="36" ry="28" fill={HUD}/>
        <path d="M34 112 Q16 130 14 158" stroke={HUD} strokeWidth="19" fill="none" strokeLinecap="round"/>
        <path d="M106 112 Q124 130 126 158" stroke={HUD} strokeWidth="19" fill="none" strokeLinecap="round"/>
        <circle cx="14" cy="161" r="10" fill={HUD}/>
        <circle cx="126" cy="161" r="10" fill={HUD}/>
        <Löv x={54} y={130} rotation={-20}/>
        <Löv x={86} y={134} rotation={15} color="#22c55e"/>
      </g>
      <circle cx="70" cy="62" r="46" fill={HUD}/>
      <Hår cx={70} cy={30} stil="krans"/>
      <Öga cx={51} cy={60} r={12}/>
      <Öga cx={89} cy={60} r={12}/>
      <path d="M40 46 Q51 40 62 46" stroke={HÅR} strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M78 46 Q89 40 100 46" stroke={HÅR} strokeWidth="3" fill="none" strokeLinecap="round"/>
      <Näsa cx={70} cy={72}/>
      <Mun cx={70} cy={82} typ="glad"/>
      <Kinder cx={70} cy={70}/>
    </svg>
  );

  if (humör==="energisk") return (
    <svg width="170" height="210" viewBox="0 0 170 210" style={{overflow:"visible"}}>
      <style>{css}</style>
      {[0,1,2].map(i => <line key={i} x1={12-i*14} y1={110+i*20} x2={34-i*14} y2={110+i*20} stroke="#f5c842" strokeWidth="3" strokeLinecap="round" opacity={0.5-i*0.15}/>)}
      <g style={{animation:"run 0.65s ease-in-out infinite", transformOrigin:"85px 150px"}}>
        <ellipse cx="85" cy="204" rx="38" ry="9" fill={HUD2} opacity="0.25"/>
        <rect x="52" y="150" width="22" height="48" rx="11" fill={HUD} transform="rotate(-28 63 174)"/>
        <rect x="84" y="148" width="22" height="48" rx="11" fill={HUD} transform="rotate(22 95 172)"/>
        <ellipse cx="42" cy="193" rx="16" ry="8" fill={HUD2} transform="rotate(-10 42 193)"/>
        <ellipse cx="110" cy="190" rx="16" ry="8" fill={HUD2} transform="rotate(12 110 190)"/>
        <path d="M40 118 Q85 130 130 118 L126 156 Q85 164 44 156 Z" fill={KLÄDER} transform="rotate(-5 85 137)"/>
        <ellipse cx="85" cy="116" rx="36" ry="28" fill={HUD} transform="rotate(-5 85 116)"/>
        <path d="M49 108 Q28 96 16 78" stroke={HUD} strokeWidth="19" fill="none" strokeLinecap="round" style={{animation:"armSwing 0.65s ease-in-out infinite"}}/>
        <circle cx="14" cy="75" r="10" fill={HUD}/>
        <path d="M120 108 Q142 100 152 88" stroke={HUD} strokeWidth="19" fill="none" strokeLinecap="round"/>
        <circle cx="154" cy="86" r="10" fill={HUD}/>
      </g>
      <g transform="rotate(-10 85 62)">
        <circle cx="85" cy="62" r="46" fill={HUD}/>
        <Hår cx={85} cy={30} stil="vildigt"/>
        <Öga cx={66} cy={60} r={12} lookX={3}/>
        <Öga cx={104} cy={60} r={12} lookX={3}/>
        <Näsa cx={85} cy={72}/>
        <Mun cx={85} cy={82} typ="brett"/>
        <Kinder cx={85} cy={72}/>
      </g>
    </svg>
  );

  if (humör==="euforisk") return (
    <svg width="180" height="230" viewBox="0 0 180 230" style={{overflow:"visible"}}>
      <style>{css}</style>
      {[0,40,80,120,160,200,240,280,320].map((grad,i) => (
        <line key={i}
          x1={90+Math.cos(grad*Math.PI/180)*52} y1={75+Math.sin(grad*Math.PI/180)*52}
          x2={90+Math.cos(grad*Math.PI/180)*90} y2={75+Math.sin(grad*Math.PI/180)*90}
          stroke="#f5c842" strokeWidth="3" strokeLinecap="round" opacity="0.35"
          style={{animation:`star ${1.4+i*0.15}s ease-in-out ${i*0.12}s infinite`}}/>
      ))}
      <g style={{animation:"jump 0.85s ease-in-out infinite", transformOrigin:"90px 170px"}}>
        <ellipse cx="90" cy="224" rx="40" ry="10" fill={HUD2} opacity="0.2"/>
        <rect x="50" y="160" width="22" height="52" rx="11" fill={HUD} transform="rotate(-35 61 186)"/>
        <rect x="108" y="160" width="22" height="52" rx="11" fill={HUD} transform="rotate(35 119 186)"/>
        <ellipse cx="32" cy="210" rx="17" ry="8" fill={HUD2} transform="rotate(-15 32 210)"/>
        <ellipse cx="148" cy="210" rx="17" ry="8" fill={HUD2} transform="rotate(15 148 210)"/>
        <path d="M46 118 Q90 132 134 118 L130 158 Q90 167 50 158 Z" fill={KLÄDER}/>
        <ellipse cx="90" cy="116" rx="38" ry="30" fill={HUD}/>
        <path d="M52 106 Q30 76 22 48" stroke={HUD} strokeWidth="20" fill="none" strokeLinecap="round"/>
        <path d="M128 106 Q150 76 158 48" stroke={HUD} strokeWidth="20" fill="none" strokeLinecap="round"/>
        <circle cx="21" cy="44" r="11" fill={HUD}/>
        <circle cx="159" cy="44" r="11" fill={HUD}/>
        <Löv x={62} y={128} rotation={-25}/>
        <Löv x={118} y={128} rotation={20} color="#22c55e"/>
      </g>
      <circle cx="90" cy="68" r="50" fill={HUD}/>
      <Hår cx={90} cy={32} stil="krans"/>
      <Öga cx={70} cy={65} r={14} lookY={-1}/>
      <Öga cx={110} cy={65} r={14} lookY={-1}/>
      <path d="M56 47 Q70 38 82 47" stroke={HÅR} strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M98 47 Q110 38 124 47" stroke={HÅR} strokeWidth="4" fill="none" strokeLinecap="round"/>
      <Näsa cx={90} cy={80}/>
      <Mun cx={90} cy={92} typ="superhapp"/>
      <Kinder cx={90} cy={78}/>
    </svg>
  );

  return null;
}

// ── KARAKTÄR-KORT (skog/nivå) ─────────────────────────────────
function Karaktär({ nivå, totaltKlara }) {
  const s = KARAKTÄR_STADIER[nivå] ?? KARAKTÄR_STADIER[0];
  const humör = s.humör;
  const nästaGräns = UPPDRAG_PER_NIVÅ[nivå + 1] ?? UPPDRAG_PER_NIVÅ[UPPDRAG_PER_NIVÅ.length - 1];
  const föregåendeGräns = UPPDRAG_PER_NIVÅ[nivå] ?? 0;
  const andel = nivå < 4
    ? Math.min(1, (totaltKlara - föregåendeGräns) / (nästaGräns - föregåendeGräns))
    : 1;

  return (
    <div style={{ borderRadius:20, overflow:"hidden", marginBottom:16, border:`1px solid ${C.border}` }}>
      <div style={{ background:`linear-gradient(180deg, ${s.himmel[0]}, ${s.himmel[1]})`, height:180, position:"relative", display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:40, background:s.mark, borderRadius:"50% 50% 0 0 / 30px 30px 0 0" }}/>
        <div style={{ position:"absolute", bottom:28, left:"50%", transform:"translateX(-50%)" }}>
          <KaraktärSVG humör={humör} />
        </div>
        <div style={{ position:"absolute", top:12, left:14, background:"rgba(0,0,0,0.45)", backdropFilter:"blur(6px)", borderRadius:20, padding:"4px 12px" }}>
          <span style={{ fontFamily:"'Fredoka One',cursive", color:s.accentFärg, fontSize:"0.72rem" }}>
            {{ trött:"😴 Seg", nyfiken:"👀 Nyfiken", aktiv:"😊 Aktiv", energisk:"🏃 Energisk", euforisk:"🤸 Naturhjälte" }[humör]}
          </span>
        </div>
        {humör==="euforisk" && ["🌟","✨","⭐","💫"].map((e,i) => (
          <div key={i} style={{ position:"absolute", top:`${8+i*12}%`, left:`${8+i*22}%`, fontSize:"0.9rem", animation:`sparkle ${1.5+i*0.4}s ease-in-out ${i*0.2}s infinite` }}>{e}</div>
        ))}
      </div>
      <div style={{ background:"rgba(10,15,10,0.85)", border:`1px solid ${C.border}`, borderTop:`1px solid ${s.accentFärg}33`, borderRadius:"0 0 20px 20px", padding:"12px 16px", backdropFilter:"blur(8px)" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:8 }}>
          <div>
            <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"0.9rem" }}>
              <span style={{ color:s.accentFärg }}>🌿 Din hjälte: </span>
              <span style={{ color:C.text }}>{s.namn}</span>
            </div>
            <div style={{ color:C.muted, fontSize:"0.7rem", marginTop:2 }}>{s.beskrivning}</div>
          </div>
          {nivå < 4 ? <div style={{ fontFamily:"'Fredoka One',cursive", color:C.gold, fontSize:"0.78rem", flexShrink:0, marginLeft:8 }}>Nivå {nivå+1}/5</div> : <Pill color={C.gold}>✨ Max!</Pill>}
        </div>
        {nivå < 4 ? (
          <>
            <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:8, height:8, overflow:"hidden", marginBottom:5 }}>
              <div style={{ height:"100%", width:`${andel*100}%`, background:`linear-gradient(90deg,${s.accentFärg},${s.accentFärg}aa)`, borderRadius:8, transition:"width 0.7s ease", boxShadow:`0 0 10px ${s.accentFärg}55` }}/>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.65rem", color:C.muted }}>
              <span>{totaltKlara} klarade uppdrag</span>
              <span>{nästaGräns - totaltKlara > 0 ? `💪 ${nästaGräns - totaltKlara} till nästa nivå` : "Nivå upp!"}</span>
            </div>
          </>
        ) : (
          <div style={{ fontSize:"0.72rem", color:s.accentFärg, textAlign:"center" }}>🏆 Naturhjälte på max-nivå — du är oslagbar!</div>
        )}
      </div>
    </div>
  );
}

// ── UPPDRAGSRAD ───────────────────────────────────────────────
function UppdragsRad({ uppdrag, onClick }) {
  const statusFärg = { assigned:C.purple, pending_approval:C.gold, approved:C.green, rejected:C.red }[uppdrag.status];
  const statusEtikett = { assigned:"Klar att starta →", pending_approval:"⏳ Väntar", approved:"✓ Klar", rejected:"✗ Nekad" }[uppdrag.status];
  const klickbar = ["assigned","pending_approval","approved"].includes(uppdrag.status);

  return (
    <div onClick={() => klickbar && onClick(uppdrag)} style={{
      display:"flex", alignItems:"center", gap:12,
      background:C.surface, border:`1px solid ${uppdrag.status==="assigned" ? C.border : statusFärg+"44"}`,
      borderRadius:16, padding:14, cursor:klickbar?"pointer":"default",
      opacity:uppdrag.status==="approved"?0.55:1, transition:"background 0.15s",
    }}
      onMouseEnter={e => klickbar && (e.currentTarget.style.background = C.surfaceHov)}
      onMouseLeave={e => (e.currentTarget.style.background = C.surface)}
    >
      <div style={{ fontSize:"1.8rem" }}>{uppdrag.icon}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"0.9rem" }}>{uppdrag.title}</div>
        <div style={{ color:C.muted, fontSize:"0.7rem", marginTop:2 }}>{uppdrag.desc}</div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
        <Pill color={C.gold}>🪙 {uppdrag.coins}</Pill>
        <span style={{ fontSize:"0.65rem", color:statusFärg, whiteSpace:"nowrap" }}>{statusEtikett}</span>
      </div>
    </div>
  );
}

// ── FÖRÄLDERGODKÄNNANDE (inline, från v3) ─────────────────────
function FörälderGodkännande({ uppdrag, onGodkänn, onNeka, onTillbaka }) {
  const [nekaId, setNekaId] = useState(null);
  const [nekNotering, setNekNotering] = useState("");
  const väntande = uppdrag.filter(u => u.status === "pending_approval");

  if (nekaId) return (
    <div style={{ minHeight:"100vh", background:C.bg, maxWidth:420, margin:"0 auto", padding:"20px" }}>
      <button onClick={() => { setNekaId(null); setNekNotering(""); }} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"8px 14px", color:C.text, cursor:"pointer", fontFamily:"'Nunito',sans-serif", marginBottom:20 }}>←</button>
      <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.2rem", color:C.text, marginBottom:16 }}>Ange anledning (valfritt)</div>
      <textarea value={nekNotering} onChange={e => setNekNotering(e.target.value)} placeholder='T.ex. "Försök igen imorgon! 💪"' style={{ width:"100%", background:"rgba(0,0,0,0.3)", border:`1px solid ${C.border}`, borderRadius:12, padding:12, color:C.text, fontFamily:"'Nunito',sans-serif", fontSize:"0.9rem", resize:"none", minHeight:80, outline:"none", boxSizing:"border-box", marginBottom:12 }}/>
      <Knapp variant="fara" onClick={() => { onNeka(nekaId, nekNotering); setNekaId(null); setNekNotering(""); }}>✗ Neka uppdrag</Knapp>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg, maxWidth:420, margin:"0 auto" }}>
      <div style={{ padding:"20px 20px 0", display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button onClick={onTillbaka} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"8px 14px", color:C.text, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>←</button>
        <div>
          <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.2rem", color:C.text }}>Granska uppdrag</div>
          <div style={{ color:C.muted, fontSize:"0.72rem" }}>{väntande.length} uppdrag väntar</div>
        </div>
      </div>
      <div style={{ padding:"0 20px 40px" }}>
        {väntande.length === 0 ? (
          <div style={{ textAlign:"center", padding:"48px 0" }}>
            <div style={{ fontSize:"3rem", marginBottom:12 }}>✅</div>
            <div style={{ fontFamily:"'Fredoka One',cursive", color:C.green, fontSize:"1.1rem" }}>Alla uppdrag granskade!</div>
          </div>
        ) : väntande.map(u => (
          <Kort key={u.id} style={{ marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
              <div style={{ fontSize:"2rem" }}>{u.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"0.95rem" }}>{u.title}</div>
                <div style={{ color:C.muted, fontSize:"0.72rem" }}>{u.desc} · {u.inskickatFör}</div>
              </div>
              <Pill color={C.gold}>🪙 {u.coins}</Pill>
            </div>
            {u.bevis && (
              <div style={{ background:"rgba(0,0,0,0.2)", borderRadius:12, padding:"10px 12px", marginBottom:12, fontSize:"0.78rem", color:C.muted }}>
                {u.bevis.typ === "timer" && `⏱️ Timer: ${u.bevis.varaktighet}`}
                {u.bevis.typ === "anteckning" && `✏️ "${u.bevis.text}"`}
                {u.bevis.typ === "foto" && "📸 Foto bifogat"}
              </div>
            )}
            <div style={{ display:"flex", gap:8 }}>
              <Knapp variant="grön" onClick={() => onGodkänn(u.id)} style={{ flex:1, padding:"12px" }}>✓ Godkänn (+{u.coins} 🪙)</Knapp>
              <Knapp variant="fara" onClick={() => setNekaId(u.id)} style={{ width:52, flexShrink:0, padding:"12px" }}>✗</Knapp>
            </div>
          </Kort>
        ))}
      </div>
    </div>
  );
}

// ── SKÄRMTID (barn) ───────────────────────────────────────────
function BarnSkärmtid({ mynt, skärmtidVal = SKÄRMTID_VAL, onBegär, onTillbaka, aktivSession }) {
  const [valdMinuter, setValdMinuter] = useState(30);
  const [valdApp, setValdApp] = useState("youtube");
  const [steg, setSteg] = useState("välj");
  const [sekKvar, setSekKvar] = useState(null);
  const timerRef = useRef(null);

  const val = SKÄRMTID_VAL.find(v => v.minuter === valdMinuter);
  const app = APPAR.find(a => a.id === valdApp);
  const harRåd = mynt >= val.mynt;

  useEffect(() => {
    if (aktivSession) {
      const kvar = Math.max(0, Math.floor((new Date(aktivSession.slutar) - Date.now()) / 1000));
      setSekKvar(kvar);
      timerRef.current = setInterval(() => {
        setSekKvar(s => { if (s <= 1) { clearInterval(timerRef.current); return 0; } return s - 1; });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [aktivSession]);

  const fmtTid = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  const andelKvar = aktivSession && sekKvar !== null ? sekKvar / (aktivSession.minuter * 60) : 0;

  if (aktivSession) return (
    <div style={{ minHeight:"100vh", background:C.bg, maxWidth:420, margin:"0 auto" }}>
      <div style={{ padding:"20px 20px 0", display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <button onClick={onTillbaka} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"8px 12px", color:C.text, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>←</button>
        <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.2rem", color:C.text }}>Aktiv skärmtid</div>
      </div>
      <div style={{ padding:"0 20px", textAlign:"center" }}>
        <div style={{ position:"relative", display:"inline-block", marginBottom:24 }}>
          <svg width="180" height="180" style={{ transform:"rotate(-90deg)" }}>
            <circle cx="90" cy="90" r="78" fill="none" stroke={C.border} strokeWidth="10"/>
            <circle cx="90" cy="90" r="78" fill="none" stroke={C.purple} strokeWidth="10"
              strokeDasharray={2*Math.PI*78} strokeDashoffset={(1-andelKvar)*2*Math.PI*78}
              strokeLinecap="round" style={{ transition:"stroke-dashoffset 1s linear" }}/>
          </svg>
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
            <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"2.8rem", color:C.text, lineHeight:1 }}>
              {sekKvar !== null ? fmtTid(sekKvar) : "--:--"}
            </div>
            <div style={{ color:C.muted, fontSize:"0.72rem", marginTop:4 }}>kvar</div>
          </div>
        </div>
        <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.3rem", color:C.text, marginBottom:6 }}>
          {aktivSession.app.ikon} {aktivSession.app.namn} är upplåst!
        </div>
        <div style={{ color:C.muted, fontSize:"0.82rem", marginBottom:24 }}>Du har {aktivSession.minuter} minuter. Njut!</div>
        <Knapp variant="ghost" onClick={onTillbaka}>← Tillbaka</Knapp>
      </div>
    </div>
  );

  if (steg === "bekräfta") return (
    <div style={{ minHeight:"100vh", background:C.bg, maxWidth:420, margin:"0 auto" }}>
      <div style={{ padding:"20px 20px 0", display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <button onClick={() => setSteg("välj")} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"8px 12px", color:C.text, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>←</button>
        <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.2rem", color:C.text }}>Be förälder godkänna</div>
      </div>
      <div style={{ padding:"0 20px 40px" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:"4rem", marginBottom:12, animation:"float 3s ease-in-out infinite" }}>🙋</div>
          <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.4rem", color:C.text, marginBottom:8 }}>Redo att fråga!</div>
          <div style={{ color:C.muted, fontSize:"0.85rem", lineHeight:1.6 }}>Visa den här skärmen för en förälder<br/>så kan de godkänna med ett tryck.</div>
        </div>
        <Kort glöd={C.purpleFade} style={{ marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <div style={{ width:44, height:44, borderRadius:"50%", background:C.purpleFade, border:`2px solid ${C.purple}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.4rem" }}>🦸</div>
            <div>
              <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"1rem" }}>Maja vill ha skärmtid</div>
              <div style={{ color:C.muted, fontSize:"0.72rem" }}>Begäran skickad nu</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginBottom:16 }}>
            {[{ ikon:app.ikon, label:app.namn },{ ikon:"⏱️", label:`${val.minuter} min` },{ ikon:"🪙", label:`${val.mynt} mynt`, color:C.gold }].map((x,i) => (
              <div key={i} style={{ flex:1, background:"rgba(0,0,0,0.2)", borderRadius:14, padding:"12px 10px", textAlign:"center" }}>
                <div style={{ fontSize:"1.6rem", marginBottom:4 }}>{x.ikon}</div>
                <div style={{ fontFamily:"'Fredoka One',cursive", color:x.color||C.text, fontSize:"0.82rem" }}>{x.label}</div>
              </div>
            ))}
          </div>
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:14 }}>
            <div style={{ color:C.muted, fontSize:"0.7rem", textAlign:"center", marginBottom:10 }}>👆 Förälder — tryck för att godkänna</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => onBegär({ app, minuter:val.minuter, mynt:val.mynt })} style={{ flex:1, background:`linear-gradient(135deg,${C.green},#22c55e)`, border:"none", borderRadius:14, padding:14, color:"#fff", fontFamily:"'Fredoka One',cursive", fontSize:"1rem", cursor:"pointer", boxShadow:`0 4px 16px ${C.greenFade}` }}>✓ Godkänn</button>
              <button onClick={() => setSteg("välj")} style={{ width:52, background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:14, color:C.muted, fontFamily:"'Fredoka One',cursive", fontSize:"1rem", cursor:"pointer" }}>✗</button>
            </div>
          </div>
        </Kort>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg, maxWidth:420, margin:"0 auto" }}>
      <div style={{ padding:"20px 20px 0", display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <button onClick={onTillbaka} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"8px 12px", color:C.text, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>←</button>
        <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.2rem", color:C.text }}>Lås upp skärmtid</div>
      </div>
      <div style={{ padding:"0 20px 40px" }}>
        <div style={{ fontFamily:"'Fredoka One',cursive", color:C.muted, fontSize:"0.78rem", letterSpacing:"1px", textTransform:"uppercase", marginBottom:12 }}>Välj app</div>
        <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
          {APPAR.map(a => (
            <div key={a.id} onClick={() => setValdApp(a.id)} style={{ borderRadius:14, padding:"10px 14px", cursor:"pointer", background:valdApp===a.id ? C.purpleFade : C.surface, border:`2px solid ${valdApp===a.id ? C.purple : C.border}`, display:"flex", alignItems:"center", gap:8, transition:"all 0.15s" }}>
              <span style={{ fontSize:"1.2rem" }}>{a.ikon}</span>
              <span style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"0.82rem" }}>{a.namn}</span>
            </div>
          ))}
        </div>
        <div style={{ fontFamily:"'Fredoka One',cursive", color:C.muted, fontSize:"0.78rem", letterSpacing:"1px", textTransform:"uppercase", marginBottom:12 }}>Hur länge?</div>
        <div style={{ display:"flex", gap:8, marginBottom:24 }}>
          {skärmtidVal.map(v => {
            const rå = mynt >= v.mynt;
            const vald = valdMinuter === v.minuter;
            return (
              <div key={v.minuter} onClick={() => setValdMinuter(v.minuter)} style={{ flex:1, borderRadius:16, padding:"14px 8px", textAlign:"center", cursor:"pointer", background:vald?C.purpleFade:C.surface, border:`2px solid ${vald?C.purple:C.border}`, opacity:rå?1:0.4, transition:"all 0.15s" }}>
                <div style={{ fontSize:"1.4rem", marginBottom:4 }}>{v.ikon}</div>
                <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"0.9rem" }}>{v.minuter} min</div>
                <div style={{ color:rå?C.gold:C.red, fontSize:"0.68rem", marginTop:3 }}>🪙 {v.mynt}</div>
              </div>
            );
          })}
        </div>
        <div style={{ background:harRåd?C.greenFade:C.redFade, border:`1px solid ${harRåd?C.green:C.red}44`, borderRadius:16, padding:14, marginBottom:20, display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontSize:"2rem" }}>{app.ikon}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"0.92rem" }}>{app.namn} i {val.minuter} minuter</div>
            <div style={{ color:C.muted, fontSize:"0.72rem", marginTop:2 }}>{harRåd ? `Du har tillräckligt — ${mynt-val.mynt} mynt kvar` : `Du saknar ${val.mynt-mynt} mynt — klara fler uppdrag!`}</div>
          </div>
          <div style={{ fontFamily:"'Fredoka One',cursive", color:harRåd?C.green:C.red, fontSize:"1rem" }}>🪙 {val.mynt}</div>
        </div>
        <Knapp variant={harRåd?"grön":"ghost"} disabled={!harRåd} onClick={() => setSteg("bekräfta")}>
          {harRåd ? "Fortsätt → Be förälder godkänna" : "Inte tillräckligt med mynt"}
        </Knapp>
      </div>
    </div>
  );
}

// ── FÖRÄLDERDASHBOARD (ny i v4) ───────────────────────────────
function FörälderDashboard({ uppdrag, mynt, skogNivå, totaltKlara, onGodkänn, onNeka, kidNamn, kidAvatar, profil, dagsgräns: dagsgränsInit = 90, onÅterställProfil, bonusar = [], setBonusar = () => {}, ekonomi = INITIAL_EKONOMI, setEkonomi = () => {}, synligITopplista = true, setSynligITopplista = () => {} }) {
  const [flik, setFlik] = useState("översikt");
  const [uppdragFilter, setUppdragFilter] = useState("väntar");
  const [gränsMin, setGränsMin] = useState(dagsgränsInit);
  const [appar, setAppar] = useState([
    { id:"minecraft", namn:"Minecraft",     ikon:"⛏️", mynt:80,  aktiv:true  },
    { id:"youtube",   namn:"YouTube Kids",  ikon:"📺", mynt:50,  aktiv:true  },
    { id:"roblox",    namn:"Roblox",        ikon:"🎮", mynt:100, aktiv:false },
  ]);
  const [notiser, setNotiser] = useState({ push:true, påminnelse:true, veckorapport:false, pin:true });

  const väntande = uppdrag.filter(u => u.status === "pending_approval");
  const godkända = uppdrag.filter(u => u.status === "approved");
  const nekade   = uppdrag.filter(u => u.status === "rejected");

  const dagData = [
    { dag:"Mån", mynt:90 },{ dag:"Tis", mynt:50 },{ dag:"Ons", mynt:130 },
    { dag:"Tor", mynt:70 },{ dag:"Fre", mynt:110 },{ dag:"Lör", mynt:80 },{ dag:"Sön", mynt:120 },
  ];
  const maxMynt = Math.max(...dagData.map(d => d.mynt));

  const flikar = [
    { id:"översikt",  label:"Översikt" },
    { id:"uppdrag",   label:"Granska" },
    { id:"bonusar",   label:"Bonusar" },
    { id:"skärmtid",  label:"Skärmtid" },
    { id:"profil",    label:"Barnprofil" },
  ];

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setFlik(id)} style={{
      padding:"10px 14px", borderRadius:"12px 12px 0 0",
      fontFamily:"'Fredoka One',cursive", fontSize:"0.8rem", cursor:"pointer",
      color: flik===id ? C.text : C.muted,
      background: flik===id ? C.surface : "transparent",
      border:"none", borderBottom: flik===id ? `2px solid ${C.purple}` : "2px solid transparent",
      transition:"all 0.15s", whiteSpace:"nowrap",
    }}>{label}{id==="uppdrag" && väntande.length > 0 && (
      <span style={{ marginLeft:6, background:C.gold, color:"#000", borderRadius:10, padding:"1px 6px", fontSize:"0.6rem" }}>{väntande.length}</span>
    )}</button>
  );

  const StatKort = ({ label, val, color, sub }) => (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:14 }}>
      <div style={{ fontSize:"0.65rem", color:C.muted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>{label}</div>
      <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.5rem", color }}>{val}</div>
      {sub && <div style={{ fontSize:"0.65rem", color:"rgba(240,240,240,0.3)", marginTop:3 }}>{sub}</div>}
    </div>
  );

  const Switch = ({ on, onToggle }) => (
    <div onClick={onToggle} style={{ width:44, height:24, borderRadius:12, background:on?C.purple:"rgba(255,255,255,0.15)", position:"relative", cursor:"pointer", transition:"background 0.2s", flexShrink:0 }}>
      <div style={{ position:"absolute", top:3, left:on?22:3, width:18, height:18, borderRadius:"50%", background:"white", transition:"left 0.2s" }}/>
    </div>
  );

  const UppdragKort = ({ u }) => {
    const [nekLäge, setNekLäge] = useState(false);
    const [nekText, setNekText] = useState("");
    return (
      <Kort style={{ marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
          <div style={{ fontSize:"2rem" }}>{u.icon}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"0.92rem" }}>{u.title}</div>
            <div style={{ color:C.muted, fontSize:"0.7rem" }}>{u.desc} · 🪙 {u.coins} · {u.inskickatFör}</div>
          </div>
          <Pill color={C.gold}>Väntar</Pill>
        </div>
        {u.bevis && (
          <div style={{ background:"rgba(0,0,0,0.2)", borderRadius:12, padding:"10px 12px", marginBottom:12, fontSize:"0.78rem", color:C.muted }}>
            {u.bevis.typ==="timer" && `⏱️ Timer: ${u.bevis.varaktighet}`}
            {u.bevis.typ==="anteckning" && `✏️ "${u.bevis.text}"`}
            {u.bevis.typ==="foto" && "📸 Foto bifogat"}
          </div>
        )}
        {nekLäge ? (
          <>
            <textarea value={nekText} onChange={e => setNekText(e.target.value)} placeholder='Valfri kommentar till barnet...' style={{ width:"100%", background:"rgba(0,0,0,0.3)", border:`1px solid ${C.border}`, borderRadius:12, padding:10, color:C.text, fontFamily:"'Nunito',sans-serif", fontSize:"0.82rem", resize:"none", minHeight:60, outline:"none", boxSizing:"border-box", marginBottom:8 }}/>
            <div style={{ display:"flex", gap:8 }}>
              <Knapp variant="fara" onClick={() => { onNeka(u.id, nekText); }} style={{ flex:1, padding:10 }}>✗ Neka</Knapp>
              <Knapp variant="ghost" onClick={() => setNekLäge(false)} style={{ width:52, padding:10 }}>↩</Knapp>
            </div>
          </>
        ) : (
          <div style={{ display:"flex", gap:8 }}>
            <Knapp variant="grön" onClick={() => onGodkänn(u.id)} style={{ flex:1, padding:10, fontSize:"0.88rem" }}>✓ Godkänn (+{u.coins} 🪙)</Knapp>
            <Knapp variant="fara" onClick={() => setNekLäge(true)} style={{ width:52, padding:10 }}>✗</Knapp>
          </div>
        )}
      </Kort>
    );
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, maxWidth:480, margin:"0 auto" }}>
      {/* Sidhuvud */}
      <div style={{ padding:"16px 20px 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.2rem", color:C.text }}>GrowQuest</div>
          <div style={{ fontSize:"0.65rem", color:C.muted, marginTop:2 }}>Föräldrapanel</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ fontSize:"0.72rem", color:C.muted }}>Inloggad som <span style={{ color:C.purple }}>Mamma</span></div>
          <div style={{ width:34, height:34, borderRadius:"50%", background:C.purpleFade, border:`2px solid ${C.purple}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem" }}>👩</div>
        </div>
      </div>

      {/* Flikar */}
      <div style={{ display:"flex", gap:2, padding:"12px 20px 0", borderBottom:`1px solid ${C.border}`, overflowX:"auto" }}>
        {flikar.map(f => <TabBtn key={f.id} id={f.id} label={f.label}/>)}
      </div>

      <div style={{ padding:"20px" }}>

        {/* ── ÖVERSIKT ── */}
        {flik==="översikt" && (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10, marginBottom:20 }}>
              <StatKort label="Mynt idag" val={`+120 🪙`} color={C.gold} sub={`Totalt: ${mynt} mynt`}/>
              <StatKort label="Uppdrag klara" val="3 / 6" color={C.green} sub={`${väntande.length} väntar granskning`}/>
              <StatKort label="Skärmtid idag" val="55 min" color={C.blue} sub="Gräns: 90 min/dag"/>
              <StatKort label="Streak" val="🔥 3" color="#f472b6" sub="dagar i rad"/>
            </div>

            <div style={{ fontFamily:"'Fredoka One',cursive", color:C.muted, fontSize:"0.72rem", letterSpacing:"1px", textTransform:"uppercase", marginBottom:10 }}>Aktivitetsflöde</div>
            <Kort style={{ marginBottom:16 }}>
              {[
                { dot:true, text:"Kockens Lärling skickades in", meta:`${kidNamn} · Timer 22 min · 5 min sedan`, pill:"Väntar", pillFärg:C.gold },
                { ikon:"✅", text:"Konstnärens Resa godkändes", meta:`${kidNamn} · Foto · 50 mynt · igår`, pill:"+50 🪙", pillFärg:C.green },
                { ikon:"📱", text:"Skärmtid — Minecraft godkänd", meta:`${kidNamn} · 30 min · 14:32`, pill:"Godkänd", pillFärg:C.purple },
                { ikon:"🏆", text:`${kidNamn} nådde nivå ${skogNivå}!`, meta:"Igår", pill:`Nivå ${skogNivå}`, pillFärg:C.gold },
              ].map((r,i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom: i<3?12:0 }}>
                  {r.dot
                    ? <div style={{ width:8, height:8, borderRadius:"50%", background:C.gold, flexShrink:0, marginTop:5 }}/>
                    : <div style={{ width:28, height:28, borderRadius:8, background:`${r.pillFärg}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.9rem", flexShrink:0 }}>{r.ikon}</div>
                  }
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:"0.82rem", color:C.text }}>{r.text}</div>
                    <div style={{ fontSize:"0.68rem", color:C.muted }}>{r.meta}</div>
                  </div>
                  <Pill color={r.pillFärg}>{r.pill}</Pill>
                </div>
              ))}
            </Kort>

            <div style={{ fontFamily:"'Fredoka One',cursive", color:C.muted, fontSize:"0.72rem", letterSpacing:"1px", textTransform:"uppercase", marginBottom:10 }}>Veckans mynt</div>
            <Kort>
              {dagData.map(d => (
                <div key={d.dag} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                  <span style={{ fontSize:"0.7rem", color:C.muted, width:28 }}>{d.dag}</span>
                  <div style={{ flex:1, background:"rgba(255,255,255,0.08)", borderRadius:8, height:8, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${Math.round(d.mynt/maxMynt*100)}%`, background:`linear-gradient(90deg,${C.purple},${C.gold})`, borderRadius:8 }}/>
                  </div>
                  <span style={{ fontSize:"0.68rem", color:"rgba(240,240,240,0.35)", width:40, textAlign:"right" }}>{d.mynt}🪙</span>
                </div>
              ))}
            </Kort>
          </>
        )}

        {/* ── GRANSKA UPPDRAG ── */}
        {flik==="uppdrag" && (
          <>
            <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
              {[["väntar",`Väntar (${väntande.length})`],["klara",`Godkända (${godkända.length})`],["nekade",`Nekade (${nekade.length})`]].map(([id,label]) => (
                <button key={id} onClick={() => setUppdragFilter(id)} style={{
                  padding:"6px 14px", borderRadius:20, fontSize:"0.75rem", fontWeight:700,
                  cursor:"pointer", border:`1px solid ${C.border}`,
                  background: uppdragFilter===id ? C.purpleFade : "transparent",
                  color: uppdragFilter===id ? C.purple : C.muted,
                  borderColor: uppdragFilter===id ? `${C.purple}44` : C.border,
                  transition:"all 0.15s",
                }}>{label}</button>
              ))}
            </div>

            {uppdragFilter==="väntar" && (
              väntande.length === 0
                ? <div style={{ textAlign:"center", padding:"48px 0" }}>
                    <div style={{ fontSize:"2.5rem", marginBottom:12 }}>✅</div>
                    <div style={{ fontFamily:"'Fredoka One',cursive", color:C.green }}>Inga uppdrag att granska!</div>
                  </div>
                : väntande.map(u => <UppdragKort key={u.id} u={u}/>)
            )}
            {uppdragFilter==="klara" && godkända.map(u => (
              <Kort key={u.id} style={{ marginBottom:10, opacity:0.7 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ fontSize:"1.8rem" }}>{u.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"0.88rem" }}>{u.title}</div>
                    <div style={{ color:C.muted, fontSize:"0.68rem" }}>{u.inskickatFör}</div>
                  </div>
                  <Pill color={C.green}>✓ Godkänd</Pill>
                </div>
              </Kort>
            ))}
            {uppdragFilter==="nekade" && nekade.map(u => (
              <Kort key={u.id} style={{ marginBottom:10, opacity:0.7 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ fontSize:"1.8rem" }}>{u.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"0.88rem" }}>{u.title}</div>
                    {u.nekNotering && <div style={{ color:C.muted, fontSize:"0.68rem", fontStyle:"italic" }}>"{u.nekNotering}"</div>}
                  </div>
                  <Pill color={C.red}>✗ Nekad</Pill>
                </div>
              </Kort>
            ))}
          </>
        )}

        {/* ── BONUSAR ── */}
        {flik==="bonusar" && (
          <>
            <div style={{ fontFamily:"'Fredoka One',cursive", color:C.muted, fontSize:"0.72rem", letterSpacing:"1px", textTransform:"uppercase", marginBottom:10 }}>Bonusar & belöningar</div>
            <BonusAdmin bonusar={bonusar} setBonusar={setBonusar} />

            <div style={{ fontFamily:"'Fredoka One',cursive", color:C.muted, fontSize:"0.72rem", letterSpacing:"1px", textTransform:"uppercase", marginBottom:10, marginTop:20 }}>Mynt → Pengar</div>
            <Kort>
              <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"0.92rem", marginBottom:4 }}>Utbetalningskurs</div>
              <div style={{ fontSize:"0.72rem", color:C.muted, marginBottom:16, lineHeight:1.5 }}>
                Bestäm hur mycket ett mynt är värt i riktiga pengar. Barnet ser kursen och räknar ut vad deras mynt är värda.
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <span style={{ fontSize:"0.78rem", color:C.muted }}>100 mynt =</span>
                <span style={{ fontFamily:"'Fredoka One',cursive", color:"#f472b6", fontSize:"1.3rem" }}>{ekonomi.kurs} kr</span>
              </div>
              <input type="range" min={1} max={20} step={0.5}
                value={ekonomi.kurs}
                onChange={e => setEkonomi(prev => ({...prev, kurs:parseFloat(e.target.value)}))}
                style={{ width:"100%", accentColor:"#f472b6", marginBottom:8 }}
              />
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.65rem", color:C.muted, marginBottom:16 }}>
                <span>1 kr / 100 mynt</span>
                <span>20 kr / 100 mynt</span>
              </div>
              <div style={{ background:"rgba(244,114,182,0.08)", border:"1px solid rgba(244,114,182,0.2)", borderRadius:12, padding:"10px 14px" }}>
                <div style={{ fontSize:"0.72rem", color:C.muted, marginBottom:6 }}>Exempel med nuvarande kurs</div>
                {[100, 250, 500].map(m => (
                  <div key={m} style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:"0.75rem", color:C.muted }}>{m} mynt</span>
                    <span style={{ fontFamily:"'Fredoka One',cursive", color:"#f472b6", fontSize:"0.78rem" }}>{(m/100*ekonomi.kurs).toFixed(2)} kr</span>
                  </div>
                ))}
              </div>
            </Kort>
          </>
        )}


        {flik==="skärmtid" && (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
              <StatKort label="Idag totalt" val="55 min" color={C.blue} sub="2 sessioner"/>
              <StatKort label="Dagsgräns" val={`${gränsMin} min`} color={C.purple} sub={`${gränsMin-55} min kvar`}/>
              <StatKort label="Veckans snitt" val="48 min" color={C.green} sub="per dag"/>
            </div>

            <div style={{ fontFamily:"'Fredoka One',cursive", color:C.muted, fontSize:"0.72rem", letterSpacing:"1px", textTransform:"uppercase", marginBottom:10 }}>Dagsgräns</div>
            <Kort style={{ marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ fontSize:"0.8rem", color:C.muted }}>55 av {gränsMin} minuter</span>
                <span style={{ fontFamily:"'Fredoka One',cursive", color:C.blue, fontSize:"0.88rem" }}>{Math.round(55/gränsMin*100)}%</span>
              </div>
              <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:8, height:8, overflow:"hidden", marginBottom:14 }}>
                <div style={{ height:"100%", width:`${Math.round(55/gränsMin*100)}%`, background:`linear-gradient(90deg,${C.blue},${C.purple})`, borderRadius:8, transition:"width 0.4s" }}/>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <Knapp variant="ghost" onClick={() => setGränsMin(g => Math.max(30, g-15))} style={{ flex:1, padding:"10px", fontSize:"0.8rem" }}>−15 min</Knapp>
                <span style={{ fontFamily:"'Fredoka One',cursive", color:C.purple, fontSize:"0.95rem", padding:"0 8px", whiteSpace:"nowrap" }}>{gränsMin} min</span>
                <Knapp variant="ghost" onClick={() => setGränsMin(g => Math.min(240, g+15))} style={{ flex:1, padding:"10px", fontSize:"0.8rem" }}>+15 min</Knapp>
              </div>
            </Kort>

            <div style={{ fontFamily:"'Fredoka One',cursive", color:C.muted, fontSize:"0.72rem", letterSpacing:"1px", textTransform:"uppercase", marginBottom:10 }}>Sessionshistorik</div>
            {[{ namn:"Minecraft", ikon:"⛏️", tid:"14:32–15:02", min:30, mynt:80 },{ namn:"YouTube Kids", ikon:"📺", tid:"11:10–11:35", min:25, mynt:50 }].map((s,i) => (
              <Kort key={i} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"0.88rem", color:C.text }}>{s.ikon} {s.namn}</div>
                    <div style={{ fontSize:"0.68rem", color:C.muted }}>Idag {s.tid} · 🪙 {s.mynt} mynt</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:"'Fredoka One',cursive", color:C.blue }}>{s.min} min</div>
                    <Pill color={C.green}>Godkänd</Pill>
                  </div>
                </div>
              </Kort>
            ))}

            <div style={{ fontFamily:"'Fredoka One',cursive", color:C.muted, fontSize:"0.72rem", letterSpacing:"1px", textTransform:"uppercase", marginBottom:10, marginTop:8 }}>Godkända appar</div>
            <Kort>
              {appar.map((a,i) => (
                <div key={a.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", borderBottom: i<appar.length-1 ? `1px solid ${C.border}` : "none" }}>
                  <div>
                    <div style={{ fontSize:"0.85rem", color:C.text }}>{a.ikon} {a.namn}</div>
                    <div style={{ fontSize:"0.68rem", color:C.muted }}>{a.mynt} mynt / 30 min</div>
                  </div>
                  <Switch on={a.aktiv} onToggle={() => setAppar(prev => prev.map(x => x.id===a.id ? {...x, aktiv:!x.aktiv} : x))}/>
                </div>
              ))}
              <div style={{ marginTop:12 }}>
                <Knapp variant="primary" style={{ padding:"10px", fontSize:"0.82rem" }}>+ Lägg till app</Knapp>
              </div>
            </Kort>
          </>
        )}

        {/* ── BARNPROFIL ── */}
        {flik==="profil" && (
          <>
            <Kort style={{ marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:16 }}>
                <div style={{ width:52, height:52, borderRadius:"50%", background:C.purpleFade, border:`2px solid ${C.purple}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.8rem" }}>{kidAvatar}</div>
                <div>
                  <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.2rem", color:C.text }}>{kidNamn}</div>
                  <div style={{ fontSize:"0.72rem", color:C.muted }}>8 år · Nivå {skogNivå} — {KARAKTÄR_STADIER[skogNivå]?.namn}</div>
                  <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap" }}>
                    <Pill color={C.purple}>🦕 Dinosaurier</Pill>
                    <Pill color={C.purple}>🎨 Konst</Pill>
                    <Pill color={C.purple}>🐾 Djur</Pill>
                  </div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                {[{ val:mynt, label:"Mynt totalt", color:C.gold },{ val:totaltKlara, label:"Uppdrag klara", color:C.green },{ val:"🔥 3", label:"Dagars streak", color:"#f472b6" }].map((s,i) => (
                  <div key={i} style={{ textAlign:"center", padding:10, background:"rgba(255,255,255,0.04)", borderRadius:10 }}>
                    <div style={{ fontFamily:"'Fredoka One',cursive", color:s.color, fontSize:"1.1rem" }}>{s.val}</div>
                    <div style={{ fontSize:"0.62rem", color:C.muted }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </Kort>

            <div style={{ fontFamily:"'Fredoka One',cursive", color:C.muted, fontSize:"0.72rem", letterSpacing:"1px", textTransform:"uppercase", marginBottom:10 }}>Startprofil</div>
            <Kort style={{ marginBottom:16 }}>
              {profil ? (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                    <div style={{ width:44, height:44, borderRadius:13, background:`${profil.färg}20`, border:`1px solid ${profil.färg}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.5rem", flexShrink:0 }}>
                      {profil.ikon}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:"'Fredoka One',cursive", color:profil.färg, fontSize:"0.95rem" }}>{profil.namn}</div>
                      <div style={{ fontSize:"0.7rem", color:C.muted, fontStyle:"italic", marginTop:2 }}>"{profil.tagline}"</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:14 }}>
                    {[profil.exempelUppdrag, profil.exempelSkärmtid, profil.exempelDagsgräns].map((ex, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:4, height:4, borderRadius:"50%", background:profil.färg, flexShrink:0 }}/>
                        <span style={{ fontSize:"0.75rem", color:`${profil.färg}bb` }}>{ex}</span>
                      </div>
                    ))}
                  </div>
                  <Knapp variant="ghost" onClick={onÅterställProfil} style={{ padding:"10px", fontSize:"0.8rem" }}>
                    ↩ Byt profil för {kidNamn}
                  </Knapp>
                </>
              ) : (
                <Knapp variant="primary" onClick={onÅterställProfil} style={{ padding:"10px", fontSize:"0.8rem" }}>
                  Välj startprofil för {kidNamn}
                </Knapp>
              )}
            </Kort>

            <div style={{ fontFamily:"'Fredoka One',cursive", color:C.muted, fontSize:"0.72rem", letterSpacing:"1px", textTransform:"uppercase", marginBottom:10 }}>Inställningar</div>
            <Kort>
              {[
                { label:"Push-notis vid inlämning", sub:"Notifiera dig direkt", key:"push" },
                { label:"Autopåminnelse till barn", sub:"Kl 16:00 varje dag", key:"påminnelse" },
                { label:"Veckorapport via e-post", sub:"Söndagar kl 20:00", key:"veckorapport" },
                { label:"PIN-skydd för föräldravyn", sub:"Barn kan inte se denna vy", key:"pin" },
              ].map((r,i,arr) => (
                <div key={r.key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", borderBottom:`1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontSize:"0.85rem", color:C.text }}>{r.label}</div>
                    <div style={{ fontSize:"0.68rem", color:C.muted }}>{r.sub}</div>
                  </div>
                  <Switch on={notiser[r.key]} onToggle={() => setNotiser(prev => ({...prev, [r.key]:!prev[r.key]}))}/>
                </div>
              ))}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0" }}>
                <div>
                  <div style={{ fontSize:"0.85rem", color:C.text }}>🏆 Visa i publik topplista</div>
                  <div style={{ fontSize:"0.68rem", color:C.muted }}>{kidNamn} syns bland superäventyrare</div>
                </div>
                <Switch on={synligITopplista} onToggle={() => setSynligITopplista(v => !v)}/>
              </div>
            </Kort>

            <div style={{ marginTop:12 }}>
              <Knapp variant="primary" style={{ padding:"12px", fontSize:"0.85rem" }}>+ Lägg till barn</Knapp>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

// ── BONUS-ADMIN (förälderns panel) ────────────────────────────
function BonusAdmin({ bonusar, setBonusar }) {
  const [skapar, setSkapar] = useState(false);
  const [ny, setNy] = useState({
    triggerTyp:"alla_uppdrag_klara", triggerVärde:null,
    ikon:"⭐", namn:"", belöningMynt:50,
  });

  const TRIGGER_ALTERNATIV = [
    { id:"alla_uppdrag_klara", label:"Alla dagens uppdrag klara", ikon:"✅", harVärde:false },
    { id:"mynt_milstolpe",     label:"Nå ett visst antal mynt",   ikon:"🪙", harVärde:true,  värdePlaceholder:"t.ex. 500" },
    { id:"streak",             label:"X dagars streak i rad",     ikon:"🔥", harVärde:true,  värdePlaceholder:"antal dagar" },
  ];

  const läggTill = () => {
    if (!ny.namn.trim()) return;
    setBonusar(prev => [...prev, { ...ny, id:Date.now(), aktiv:true, utlöst:false }]);
    setSkapar(false);
    setNy({ triggerTyp:"alla_uppdrag_klara", triggerVärde:null, ikon:"⭐", namn:"", belöningMynt:50 });
  };

  const triggerLabel = (b) => {
    if (b.triggerTyp === "alla_uppdrag_klara") return "Alla uppdrag klara";
    if (b.triggerTyp === "mynt_milstolpe")     return `${b.triggerVärde} mynt uppnådda`;
    if (b.triggerTyp === "streak")             return `${b.triggerVärde} dagars streak`;
    return "";
  };

  const valtTrigger = TRIGGER_ALTERNATIV.find(t => t.id === ny.triggerTyp);

  return (
    <div>
      {bonusar.length === 0 && !skapar && (
        <div style={{ textAlign:"center", padding:"32px 0", color:C.muted, fontSize:"0.82rem" }}>
          Inga bonusar skapade än
        </div>
      )}

      {bonusar.map(b => (
        <Kort key={b.id} style={{ marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ fontSize:"1.8rem", lineHeight:1, flexShrink:0 }}>{b.ikon}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"0.92rem" }}>{b.namn}</div>
                {b.utlöst && <Pill color={C.green}>Utlöst ✓</Pill>}
              </div>
              <div style={{ fontSize:"0.7rem", color:C.muted, marginBottom:6 }}>
                Trigger: {triggerLabel(b)}
              </div>
              <Pill color={C.gold}>+{b.belöningMynt} 🪙 bonus</Pill>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end" }}>
              <div
                onClick={() => setBonusar(prev => prev.map(x => x.id===b.id ? {...x, aktiv:!x.aktiv} : x))}
                style={{ width:40, height:22, borderRadius:11, background:b.aktiv?C.purple:"rgba(255,255,255,0.15)", position:"relative", cursor:"pointer", transition:"background 0.2s", flexShrink:0 }}
              >
                <div style={{ position:"absolute", top:2, left:b.aktiv?20:2, width:18, height:18, borderRadius:"50%", background:"white", transition:"left 0.2s" }}/>
              </div>
              <span
                onClick={() => setBonusar(prev => prev.filter(x => x.id !== b.id))}
                style={{ fontSize:"0.65rem", color:C.red, cursor:"pointer", opacity:0.7 }}
              >ta bort</span>
            </div>
          </div>
        </Kort>
      ))}

      {skapar ? (
        <Kort style={{ marginTop:4 }}>
          <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"0.92rem", marginBottom:14 }}>Ny bonus</div>

          <div style={{ fontSize:"0.68rem", color:C.muted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>När utlöses bonusen?</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:14 }}>
            {TRIGGER_ALTERNATIV.map(t => (
              <div key={t.id} onClick={() => setNy(n => ({...n, triggerTyp:t.id, triggerVärde:null}))} style={{
                display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
                background: ny.triggerTyp===t.id ? C.purpleFade : "rgba(0,0,0,0.2)",
                border:`1px solid ${ny.triggerTyp===t.id ? C.purple+"66" : C.border}`,
                borderRadius:12, cursor:"pointer", transition:"all 0.15s",
              }}>
                <span style={{ fontSize:"1rem" }}>{t.ikon}</span>
                <span style={{ fontSize:"0.8rem", color:C.text }}>{t.label}</span>
              </div>
            ))}
          </div>

          {valtTrigger?.harVärde && (
            <input
              type="number" placeholder={valtTrigger.värdePlaceholder}
              value={ny.triggerVärde ?? ""}
              onChange={e => setNy(n => ({...n, triggerVärde:parseInt(e.target.value)||null}))}
              style={{ width:"100%", background:"rgba(0,0,0,0.3)", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 12px", color:C.text, fontFamily:"'Nunito',sans-serif", fontSize:"0.9rem", outline:"none", boxSizing:"border-box", marginBottom:14 }}
            />
          )}

          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
            <input
              type="text" placeholder="Ikon (emoji)" value={ny.ikon}
              onChange={e => setNy(n => ({...n, ikon:e.target.value}))}
              style={{ width:58, background:"rgba(0,0,0,0.3)", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 8px", color:C.text, fontFamily:"'Nunito',sans-serif", fontSize:"1.1rem", outline:"none", textAlign:"center" }}
            />
            <input
              type="text" placeholder="Bonusnamn, t.ex. Perfekt dag!" value={ny.namn}
              onChange={e => setNy(n => ({...n, namn:e.target.value}))}
              style={{ flex:1, background:"rgba(0,0,0,0.3)", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 12px", color:C.text, fontFamily:"'Nunito',sans-serif", fontSize:"0.88rem", outline:"none", boxSizing:"border-box" }}
            />
          </div>

          <div style={{ fontSize:"0.68rem", color:C.muted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>Bonusmynt</div>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <input type="range" min={10} max={200} step={10} value={ny.belöningMynt}
              onChange={e => setNy(n => ({...n, belöningMynt:parseInt(e.target.value)}))}
              style={{ flex:1, accentColor:C.gold }}/>
            <span style={{ fontFamily:"'Fredoka One',cursive", color:C.gold, minWidth:64, textAlign:"right" }}>+{ny.belöningMynt} 🪙</span>
          </div>

          <div style={{ display:"flex", gap:8 }}>
            <Knapp variant="grön" onClick={läggTill} disabled={!ny.namn.trim()} style={{ flex:1, padding:"11px" }}>Spara bonus</Knapp>
            <Knapp variant="ghost" onClick={() => setSkapar(false)} style={{ width:52, padding:"11px" }}>✕</Knapp>
          </div>
        </Kort>
      ) : (
        <Knapp variant="primary" onClick={() => setSkapar(true)} style={{ marginTop:4, padding:"11px", fontSize:"0.85rem" }}>
          + Skapa ny bonus
        </Knapp>
      )}
    </div>
  );
}

// ── MYNT → PENGAR (barnets skärm, fast kurs) ──────────────────
function MyntEkonomi({ mynt, ekonomi, setEkonomi, onTillbaka, visaToast, onLösin }) {
  const [lösenMynt, setLösenMynt] = useState(100);
  const [bekräftar, setBekräftar] = useState(false);

  const kr = parseFloat((lösenMynt / 100 * ekonomi.kurs).toFixed(2));
  const harRåd = mynt >= lösenMynt;

  const hanteraLösen = () => {
    setEkonomi(prev => ({
      ...prev,
      historik: [
        { id:Date.now(), mynt:lösenMynt, kr, datum:"nu", beskrivning:"Väntar på betalning" },
        ...prev.historik,
      ],
    }));
    onLösin(lösenMynt);
    visaToast(`${lösenMynt} mynt lösta in — förälder Swishar ${kr} kr! 💸`, "#f472b6");
    setBekräftar(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, maxWidth:420, margin:"0 auto" }}>
      <div style={{ padding:"20px 20px 0", display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button onClick={onTillbaka} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"8px 12px", color:C.text, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>←</button>
        <div>
          <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.2rem", color:C.text }}>Lös in mynt</div>
          <div style={{ fontSize:"0.68rem", color:C.muted }}>{ekonomi.kurs} kr per 100 mynt</div>
        </div>
      </div>

      <div style={{ padding:"0 20px 40px" }}>
        {/* Mynt-saldo */}
        <div style={{ background:`linear-gradient(135deg,rgba(244,114,182,0.15),rgba(167,139,250,0.1))`, border:`1px solid rgba(244,114,182,0.3)`, borderRadius:20, padding:20, marginBottom:20, textAlign:"center" }}>
          <div style={{ fontSize:"0.7rem", color:C.muted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>Dina mynt</div>
          <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"3rem", color:C.gold, lineHeight:1 }}>🪙 {mynt}</div>
          <div style={{ fontSize:"0.72rem", color:"rgba(244,114,182,0.8)", marginTop:8 }}>
            = {(mynt / 100 * ekonomi.kurs).toFixed(2)} kr totalt
          </div>
        </div>

        {/* Väljare */}
        <Kort style={{ marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"0.95rem" }}>💸 Hur många mynt?</div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"'Fredoka One',cursive", color:"#f472b6", fontSize:"1.3rem", lineHeight:1 }}>{kr} kr</div>
              <div style={{ fontSize:"0.65rem", color:C.muted }}>{lösenMynt} mynt</div>
            </div>
          </div>

          <input type="range"
            min={50} max={Math.max(50, Math.min(mynt, 500))} step={50}
            value={Math.min(lösenMynt, Math.max(50, mynt))}
            onChange={e => setLösenMynt(parseInt(e.target.value))}
            style={{ width:"100%", accentColor:"#f472b6", marginBottom:10 }}
          />
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.68rem", color:C.muted, marginBottom:20 }}>
            <span>50 mynt = {(ekonomi.kurs * 0.5).toFixed(2)} kr</span>
            <span>{Math.min(mynt,500)} mynt = {(Math.min(mynt,500)/100*ekonomi.kurs).toFixed(2)} kr</span>
          </div>

          {bekräftar ? (
            <>
              <div style={{ background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)", borderRadius:14, padding:"14px", marginBottom:12, textAlign:"center" }}>
                <div style={{ fontFamily:"'Fredoka One',cursive", color:"#f472b6", fontSize:"1.1rem", marginBottom:4 }}>
                  {lösenMynt} mynt → {kr} kr
                </div>
                <div style={{ fontSize:"0.72rem", color:C.muted }}>Förälder betalar ut via Swish eller kontant</div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <Knapp variant="grön" onClick={hanteraLösen} style={{ flex:1, padding:"11px" }}>✓ Lös in!</Knapp>
                <Knapp variant="ghost" onClick={() => setBekräftar(false)} style={{ width:52, padding:"11px" }}>✕</Knapp>
              </div>
            </>
          ) : (
            <Knapp
              variant={harRåd ? "primary" : "ghost"}
              disabled={!harRåd}
              onClick={() => setBekräftar(true)}
            >
              {harRåd ? `Be om ${kr} kr →` : "Inte tillräckligt med mynt"}
            </Knapp>
          )}
        </Kort>

        {/* Historik */}
        {ekonomi.historik.length > 0 && (
          <>
            <div style={{ fontFamily:"'Fredoka One',cursive", color:C.muted, fontSize:"0.72rem", letterSpacing:"1px", textTransform:"uppercase", marginBottom:10 }}>Tidigare inlösningar</div>
            <Kort>
              {ekonomi.historik.map((h, i) => (
                <div key={h.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom: i < ekonomi.historik.length-1 ? `1px solid ${C.border}` : "none" }}>
                  <div style={{ width:34, height:34, borderRadius:10, background:"rgba(244,114,182,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem", flexShrink:0 }}>💸</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:"0.8rem", color:C.text }}>{h.beskrivning}</div>
                    <div style={{ fontSize:"0.68rem", color:C.muted }}>{h.datum}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:"'Fredoka One',cursive", color:C.gold, fontSize:"0.75rem" }}>−{h.mynt} 🪙</div>
                    <div style={{ fontFamily:"'Fredoka One',cursive", color:"#f472b6", fontSize:"0.82rem" }}>+{h.kr} kr</div>
                  </div>
                </div>
              ))}
            </Kort>
          </>
        )}
      </div>
    </div>
  );
}

// ── TOPPLISTA ─────────────────────────────────────────────────
function Topplista({ mynt, myntIdag, kidNamn, kidAvatar, synligITopplista, onTillbaka }) {
  const [lista, setLista] = useState(null);   // null = laddar
  const [flik, setFlik]   = useState("totalt"); // "totalt" | "idag"
  const [fel, setFel]     = useState(false);

  // Publicera och hämta topplistan via delad storage
  useEffect(() => {
    const publicera = async () => {
      try {
        if (synligITopplista) {
          await window.storage.set(
            `topplista:${kidNamn}`,
            JSON.stringify({ namn:kidNamn, avatar:kidAvatar, totalt:mynt, idag:myntIdag, uppdaterad: Date.now() }),
            true  // shared = true
          );
        }
        const keys = await window.storage.list("topplista:", true);
        const poster = await Promise.all(
          keys.keys.map(async k => {
            try {
              const res = await window.storage.get(k, true);
              return res ? JSON.parse(res.value) : null;
            } catch { return null; }
          })
        );
        setLista(poster.filter(Boolean).sort((a,b) => b.totalt - a.totalt));
      } catch {
        // Storage ej tillgänglig — visa exempeldata
        setFel(true);
        setLista([
          { namn:"Maja",   avatar:"🦸", totalt:mynt,  idag:myntIdag },
          { namn:"Linus",  avatar:"🧙", totalt:310,   idag:90 },
          { namn:"Stella", avatar:"🦊", totalt:280,   idag:130 },
          { namn:"Noah",   avatar:"🐉", totalt:195,   idag:60 },
          { namn:"Vera",   avatar:"🐼", totalt:150,   idag:40 },
        ]);
      }
    };
    publicera();
  }, [mynt, myntIdag, kidNamn, kidAvatar, synligITopplista]);

  const sorterad = lista
    ? [...lista].sort((a,b) => flik==="totalt" ? b.totalt-a.totalt : b.idag-a.idag)
    : [];

  const MEDALJER = ["🥇","🥈","🥉"];
  const NIVÅFÄRGER = [C.gold, "rgba(192,192,192,0.9)", "#cd7f32", C.muted, C.muted];

  const egnaRaden = sorterad.findIndex(p => p.namn === kidNamn);

  return (
    <div style={{ minHeight:"100vh", background:C.bg, maxWidth:420, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ padding:"20px 20px 0", display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button onClick={onTillbaka} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"8px 12px", color:C.text, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>←</button>
        <div>
          <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.2rem", color:C.text }}>Superäventyrare</div>
          <div style={{ fontSize:"0.68rem", color:C.muted }}>Vem samlar mest mynt?{fel ? " · exempeldata" : ""}</div>
        </div>
      </div>

      <div style={{ padding:"0 20px 40px" }}>

        {/* Flik-toggle */}
        <div style={{ display:"flex", gap:6, marginBottom:20, background:"rgba(255,255,255,0.05)", borderRadius:16, padding:4 }}>
          {[["totalt","🏆 Totalt","Mest mynt i skattkistan"],["idag","⚡ Idag","Mest mynt tjänade idag"]].map(([id,label,sub]) => (
            <div key={id} onClick={() => setFlik(id)} style={{
              flex:1, textAlign:"center", padding:"10px 8px", borderRadius:12, cursor:"pointer",
              background: flik===id ? C.purpleFade : "transparent",
              border: flik===id ? `1px solid ${C.purple}44` : "1px solid transparent",
              transition:"all 0.15s",
            }}>
              <div style={{ fontFamily:"'Fredoka One',cursive", color: flik===id ? C.purple : C.muted, fontSize:"0.85rem" }}>{label}</div>
              <div style={{ fontSize:"0.6rem", color:C.muted, marginTop:2 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Podium — topp 3 */}
        {lista === null ? (
          <div style={{ textAlign:"center", padding:"48px 0", color:C.muted, fontSize:"0.82rem" }}>Laddar topplistan…</div>
        ) : (
          <>
            {sorterad.length >= 3 && (
              <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"center", gap:8, marginBottom:24, padding:"0 8px" }}>
                {/* 2:a */}
                <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                  <div style={{ fontSize:"1.6rem" }}>{sorterad[1]?.avatar}</div>
                  <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"0.78rem", textAlign:"center" }}>{sorterad[1]?.namn}</div>
                  <div style={{ background:"rgba(192,192,192,0.15)", border:"1px solid rgba(192,192,192,0.3)", borderRadius:"10px 10px 0 0", width:"100%", height:70, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2 }}>
                    <div style={{ fontSize:"1.2rem" }}>🥈</div>
                    <div style={{ fontFamily:"'Fredoka One',cursive", color:"rgba(192,192,192,0.9)", fontSize:"0.78rem" }}>{flik==="totalt" ? sorterad[1]?.totalt : sorterad[1]?.idag} 🪙</div>
                  </div>
                </div>
                {/* 1:a */}
                <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                  <div style={{ fontSize:"2rem", animation:"float 2s ease-in-out infinite" }}>{sorterad[0]?.avatar}</div>
                  <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"0.82rem", textAlign:"center" }}>{sorterad[0]?.namn}</div>
                  <div style={{ background:C.goldFade, border:`1px solid ${C.gold}44`, borderRadius:"10px 10px 0 0", width:"100%", height:100, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2 }}>
                    <div style={{ fontSize:"1.5rem" }}>🥇</div>
                    <div style={{ fontFamily:"'Fredoka One',cursive", color:C.gold, fontSize:"0.88rem" }}>{flik==="totalt" ? sorterad[0]?.totalt : sorterad[0]?.idag} 🪙</div>
                  </div>
                </div>
                {/* 3:a */}
                <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                  <div style={{ fontSize:"1.6rem" }}>{sorterad[2]?.avatar}</div>
                  <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"0.78rem", textAlign:"center" }}>{sorterad[2]?.namn}</div>
                  <div style={{ background:"rgba(205,127,50,0.15)", border:"1px solid rgba(205,127,50,0.3)", borderRadius:"10px 10px 0 0", width:"100%", height:50, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2 }}>
                    <div style={{ fontSize:"1.1rem" }}>🥉</div>
                    <div style={{ fontFamily:"'Fredoka One',cursive", color:"#cd7f32", fontSize:"0.75rem" }}>{flik==="totalt" ? sorterad[2]?.totalt : sorterad[2]?.idag} 🪙</div>
                  </div>
                </div>
              </div>
            )}

            {/* Full lista */}
            <Kort style={{ marginBottom: egnaRaden >= 3 ? 12 : 0 }}>
              {sorterad.map((p, i) => {
                const ärJag = p.namn === kidNamn;
                const värde = flik==="totalt" ? p.totalt : p.idag;
                const max   = flik==="totalt" ? sorterad[0]?.totalt : sorterad[0]?.idag;
                return (
                  <div key={p.namn} style={{
                    display:"flex", alignItems:"center", gap:12,
                    borderBottom: i < sorterad.length-1 ? `1px solid ${C.border}` : "none",
                    background: ärJag ? `${C.purple}10` : "transparent",
                    borderRadius: ärJag ? 10 : 0,
                    padding: ärJag ? "10px 8px" : "10px 0",
                    margin: ärJag ? "0 -8px" : "0",
                  }}>
                    <div style={{ width:28, textAlign:"center", fontFamily:"'Fredoka One',cursive", color: NIVÅFÄRGER[i] ?? C.muted, fontSize: i<3 ? "1.1rem" : "0.82rem", flexShrink:0 }}>
                      {i < 3 ? MEDALJER[i] : `${i+1}.`}
                    </div>
                    <div style={{ fontSize:"1.4rem", flexShrink:0 }}>{p.avatar}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:"'Fredoka One',cursive", color: ärJag ? C.purple : C.text, fontSize:"0.88rem" }}>
                        {p.namn}{ärJag ? " (du)" : ""}
                      </div>
                      <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:4, height:4, marginTop:4, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${Math.round(värde/max*100)}%`, background: ärJag ? C.purple : NIVÅFÄRGER[i] ?? C.muted, borderRadius:4, transition:"width 0.5s" }}/>
                      </div>
                    </div>
                    <div style={{ fontFamily:"'Fredoka One',cursive", color: ärJag ? C.purple : NIVÅFÄRGER[i] ?? C.muted, fontSize:"0.9rem", flexShrink:0 }}>
                      {värde} 🪙
                    </div>
                  </div>
                );
              })}
            </Kort>

            {/* Din position om utanför topp 3 och inte visas */}
            {!synligITopplista && (
              <div style={{ marginTop:12, background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:14, padding:"12px 14px", textAlign:"center" }}>
                <div style={{ fontSize:"0.72rem", color:C.muted }}>Du är inte med i topplistan. Din förälder kan slå på det i inställningarna.</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── GLOBAL STILAR ─────────────────────────────────────────────
function GlobalaStilar() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700&display=swap');
      * { box-sizing:border-box; margin:0; padding:0; }
      body { background:#0d1117; }
      input,textarea { color-scheme:dark; }
      input::placeholder,textarea::placeholder { color:rgba(240,240,240,0.3); }
      @keyframes float      { 0%,100%{transform:translateY(0)}     50%{transform:translateY(-10px)} }
      @keyframes sunPulse   { 0%,100%{transform:scale(1)}          50%{transform:scale(1.12)} }
      @keyframes treeSway   { 0%,100%{transform:rotate(-2deg)}     50%{transform:rotate(2deg)} }
      @keyframes sparkle    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.4)} }
      @keyframes slideDown  { from{transform:translateY(-16px) translateX(-50%);opacity:0} to{transform:translateY(0) translateX(-50%);opacity:1} }
      @keyframes pulse      { 0%,100%{box-shadow:0 0 0 0 rgba(245,200,66,0.3)} 50%{box-shadow:0 0 0 8px rgba(245,200,66,0)} }
      @keyframes coinRise   { 0%{opacity:0;transform:translateY(0) scale(0.5)} 40%{opacity:1;transform:translateY(-60px) scale(1.3)} 100%{opacity:0;transform:translateY(-140px) scale(0.8)} }
      @keyframes bounce     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      ::-webkit-scrollbar { width:3px; }
      ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.15); border-radius:4px; }
    `}</style>
  );
}

// ── HUVUDAPP ──────────────────────────────────────────────────
export default function App() {
  const [devVy, setDevVy] = useState("barn");
  const [skärm, setSkärm] = useState("hem");
  const [valdtUppdrag, setValdtUppdrag] = useState(null);
  const [kidNamn] = useState("Maja");
  const [kidAvatar] = useState("🦸");
  const [mynt, setMynt] = useState(135);
  const [profil, setProfil] = useState(null);          // null = visa onboarding
  const [skärmtidKonfig, setSkärmtidKonfig] = useState(SKÄRMTID_VAL);
  const [dagsgräns, setDagsgräns] = useState(90);
  const [uppdrag, setUppdrag] = useState(INITIALA_UPPDRAG);
  const [bonusar, setBonusar] = useState(INITIALA_BONUSAR);
  const [ekonomi, setEkonomi] = useState(INITIAL_EKONOMI);
  const [synligITopplista, setSynligITopplista] = useState(true);
  const [myntIdag] = useState(120); // i riktig app: räknas från dagens godkännanden
  const initialKlara = INITIALA_UPPDRAG.filter(u => u.status === "approved").length;
  const initialNivå  = UPPDRAG_PER_NIVÅ.reduce((acc, gräns, i) => initialKlara >= gräns ? i : acc, 0);
  const [skogNivå, setSkogNivå]       = useState(initialNivå);
  const [totaltKlara, setTotaltKlara] = useState(initialKlara);
  const [toast, setToast] = useState(null);
  const [myntAnim, setMyntAnim] = useState(false);
  const [skärmtidBegäran, setSkärmtidBegäran] = useState(null);
  const [aktivSession, setAktivSession] = useState(null);

  // ── ONBOARDING ──────────────────────────────────────────────
  if (!profil) return (
    <>
      <GlobalaStilar />
      <OnboardingProfil onVälj={vald => {
        setProfil(vald);
        setUppdrag(tillämpaProfilPåUppdrag(INITIALA_UPPDRAG, vald.uppdragMultiplikator));
        setSkärmtidKonfig(tillämpaProfilPåSkärmtid(SKÄRMTID_VAL, vald.skärmtidMultiplikator));
        setDagsgräns(vald.dagsgränsMinuter);
        setMynt(Math.round(135 * vald.uppdragMultiplikator));
      }} />
    </>
  );

  const visaToast = (msg, färg = C.green) => {
    setToast({ msg, färg });
    setTimeout(() => setToast(null), 2800);
  };

  const öppnaUppdrag = (u) => { setValdtUppdrag(u); setSkärm("detalj"); };

  const hanteraSkickaIn = (id, bevis) => {
    setUppdrag(prev => prev.map(u => u.id===id ? {...u, status:"pending_approval", bevis, inskickatFör:"nyss"} : u));
    setSkärm("hem");
    visaToast("Uppdrag inskickat! Väntar på godkännande ⏳", C.gold);
  };

  const hanteraGodkänn = (id) => {
    const u = uppdrag.find(x => x.id===id);
    const nyaUppdrag = uppdrag.map(x => x.id===id ? {...x, status:"approved"} : x);
    setUppdrag(nyaUppdrag);
    setMynt(m => m + u.coins);
    setMyntAnim(true);
    setTimeout(() => setMyntAnim(false), 1800);
    visaToast(`+${u.coins} mynt tilldelade! 🪙`);
    const nyaKlara = nyaUppdrag.filter(x => x.status === "approved").length;
    setTotaltKlara(nyaKlara);
    const nyNivå = UPPDRAG_PER_NIVÅ.reduce((acc, gräns, i) => nyaKlara >= gräns ? i : acc, 0);
    if (nyNivå > skogNivå) {
      setSkogNivå(nyNivå);
      setTimeout(() => visaToast("🌿 Din skog har vuxit till en ny nivå!", C.green), 500);
    }
  };

  const hanteraNeka = (id, notering) => {
    setUppdrag(prev => prev.map(x => x.id===id ? {...x, status:"rejected", nekNotering:notering} : x));
    visaToast("Uppdrag nekat", C.red);
  };

  const hanteraSkärmtidBegäran = (begäran) => {
    setSkärmtidBegäran(begäran);
    setSkärm("förälderNotis");
  };

  const hanteraSkärmtidGodkänn = () => {
    const slutar = new Date(Date.now() + skärmtidBegäran.minuter * 60 * 1000);
    setMynt(m => m - skärmtidBegäran.mynt);
    setAktivSession({ ...skärmtidBegäran, slutar: slutar.toISOString() });
    setSkärmtidBegäran(null);
    setSkärm("skärmtid");
    visaToast(`🔓 ${skärmtidBegäran.minuter} min ${skärmtidBegäran.app.namn} upplåst!`);
  };

  const hanteraSkärmtidNeka = () => {
    setSkärmtidBegäran(null);
    setSkärm("hem");
    visaToast("Skärmtid nekad", C.red);
  };

  const väntandeAntal = uppdrag.filter(u => u.status === "pending_approval").length;
  const synkatValt = valdtUppdrag ? uppdrag.find(u => u.id===valdtUppdrag.id) ?? valdtUppdrag : null;

  // ── TOPPLISTA (barn) ──────────────────────────────────────
  if (skärm === "topplista") return (
    <><GlobalaStilar/><DevToggle vy={devVy} setVy={vy => { setDevVy(vy); setSkärm("hem"); }}/>
    <Topplista
      mynt={mynt}
      myntIdag={myntIdag}
      kidNamn={kidNamn}
      kidAvatar={kidAvatar}
      synligITopplista={synligITopplista}
      onTillbaka={() => setSkärm("hem")}
    /></>
  );

  // ── FÖRÄLDERVY ────────────────────────────────────────────
  if (devVy === "förälder") return (
    <>
      <GlobalaStilar />
      <DevToggle vy={devVy} setVy={vy => { setDevVy(vy); setSkärm("hem"); }} />
      <FörälderDashboard
        uppdrag={uppdrag}
        mynt={mynt}
        skogNivå={skogNivå}
        totaltKlara={totaltKlara}
        onGodkänn={hanteraGodkänn}
        onNeka={hanteraNeka}
        kidNamn={kidNamn}
        kidAvatar={kidAvatar}
        profil={profil}
        dagsgräns={dagsgräns}
        onÅterställProfil={() => setProfil(null)}
        bonusar={bonusar}
        setBonusar={setBonusar}
        ekonomi={ekonomi}
        setEkonomi={setEkonomi}
        synligITopplista={synligITopplista}
        setSynligITopplista={setSynligITopplista}
      />
    </>
  );

  // ── LÖS IN MYNT (barn) ────────────────────────────────────
  if (skärm === "lösin") return (
    <><GlobalaStilar/><DevToggle vy={devVy} setVy={vy => { setDevVy(vy); setSkärm("hem"); }}/>
    <MyntEkonomi
      mynt={mynt}
      ekonomi={ekonomi}
      setEkonomi={setEkonomi}
      onTillbaka={() => setSkärm("hem")}
      visaToast={visaToast}
      onLösin={belopp => setMynt(m => m - belopp)}
    /></>
  );

  // ── BARNVY: sub-skärmar ───────────────────────────────────
  if (skärm==="skärmtid") return (
    <><GlobalaStilar/><DevToggle vy={devVy} setVy={vy => { setDevVy(vy); setSkärm("hem"); }}/>
    <BarnSkärmtid mynt={mynt} skärmtidVal={skärmtidKonfig} onBegär={hanteraSkärmtidBegäran} onTillbaka={() => setSkärm("hem")} aktivSession={aktivSession}/></>
  );

  if (skärm==="förälderNotis" && skärmtidBegäran) return (
    <><GlobalaStilar/><DevToggle vy={devVy} setVy={vy => { setDevVy(vy); setSkärm("hem"); }}/>
    <div style={{ minHeight:"100vh", background:C.bg, maxWidth:420, margin:"0 auto" }}>
      <div style={{ padding:"20px 20px 0", display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button onClick={() => setSkärm("skärmtid")} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"8px 12px", color:C.text, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>←</button>
        <div>
          <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.2rem", color:C.text }}>Skärmtidsbegäran</div>
          <div style={{ color:C.muted, fontSize:"0.72rem" }}>{kidNamn} vill ha skärmtid</div>
        </div>
      </div>
      <div style={{ padding:"0 20px 40px" }}>
        <Kort glöd={C.greenFade} style={{ marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:`linear-gradient(135deg,${C.green},#16a34a)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem" }}>🌱</div>
            <div>
              <div style={{ color:C.text, fontSize:"0.82rem", fontWeight:700 }}>GrowQuest</div>
              <div style={{ color:C.muted, fontSize:"0.65rem" }}>nu</div>
            </div>
          </div>
          <div style={{ color:C.text, fontSize:"0.88rem", marginBottom:4, fontWeight:600 }}>{kidNamn} vill ha skärmtid 🙋</div>
          <div style={{ color:C.muted, fontSize:"0.78rem", marginBottom:14 }}>{skärmtidBegäran.app.namn} · {skärmtidBegäran.minuter} minuter · 🪙 {skärmtidBegäran.mynt} mynt</div>
          <div style={{ display:"flex", gap:8 }}>
            <Knapp variant="grön" onClick={hanteraSkärmtidGodkänn} style={{ flex:1, padding:"10px" }}>✓ Godkänn</Knapp>
            <Knapp variant="fara" onClick={hanteraSkärmtidNeka} style={{ width:52, padding:"10px" }}>✗</Knapp>
          </div>
        </Kort>
        <Kort>
          <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"0.95rem", marginBottom:12 }}>📊 {kidNamn}s aktivitet idag</div>
          {[["Klarade uppdrag","3 av 6","✅"],["Intjänade mynt",`${mynt} mynt`,"🪙"],["Skärmtid idag","45 min","📱"]].map(([e,v,i]) => (
            <div key={e} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}><span>{i}</span><span style={{ color:C.muted, fontSize:"0.8rem" }}>{e}</span></div>
              <span style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"0.85rem" }}>{v}</span>
            </div>
          ))}
        </Kort>
      </div>
    </div></>
  );

  if (skärm==="detalj" && synkatValt) return (
    <><GlobalaStilar/><DevToggle vy={devVy} setVy={vy => { setDevVy(vy); setSkärm("hem"); }}/>
    <UppdragsDetalj uppdrag={synkatValt} onTillbaka={() => setSkärm("hem")} onSkickaIn={hanteraSkickaIn}/></>
  );

  if (skärm==="godkännande") return (
    <><GlobalaStilar/><DevToggle vy={devVy} setVy={vy => { setDevVy(vy); setSkärm("hem"); }}/>
    <FörälderGodkännande uppdrag={uppdrag} onGodkänn={hanteraGodkänn} onNeka={hanteraNeka} onTillbaka={() => setSkärm("hem")}/></>
  );

  // ── BARNETS HEMSKÄRM ──────────────────────────────────────
  return (
    <>
      <GlobalaStilar />
      <DevToggle vy={devVy} setVy={vy => { setDevVy(vy); setSkärm("hem"); }} />
      <div style={{ minHeight:"100vh", background:C.bg, maxWidth:420, margin:"0 auto", padding:"0 0 60px" }}>

        {toast && (
          <div style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", background:toast.färg, color:"#fff", borderRadius:20, padding:"10px 20px", fontFamily:"'Fredoka One',cursive", fontSize:"0.88rem", zIndex:200, whiteSpace:"nowrap", animation:"slideDown 0.3s ease", boxShadow:`0 4px 20px ${toast.färg}66` }}>
            {toast.msg}
          </div>
        )}

        {myntAnim && (
          <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:150 }}>
            {[...Array(10)].map((_,i) => (
              <div key={i} style={{ position:"absolute", left:`${25+Math.random()*50}%`, top:`${20+Math.random()*40}%`, fontSize:`${1+Math.random()*1.2}rem`, animation:`coinRise 1.6s ease-out forwards`, animationDelay:`${Math.random()*0.5}s`, opacity:0 }}>🪙</div>
            ))}
          </div>
        )}

        <div style={{ padding:"20px 20px 0", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div>
            <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.5rem", color:C.text }}>GrowQuest</div>
            <div style={{ color:C.muted, fontSize:"0.72rem" }}>🔥 3 dagars streak · Hej, {kidNamn}!</div>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <div style={{ background:C.goldFade, border:`1px solid ${C.gold}55`, borderRadius:20, padding:"6px 14px", fontFamily:"'Fredoka One',cursive", color:C.gold }}>
              🪙 {mynt}
            </div>
            <div style={{ width:38, height:38, borderRadius:"50%", background:C.purpleFade, border:`2px solid ${C.purple}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.2rem" }}>
              {kidAvatar}
            </div>
          </div>
        </div>

        <div style={{ padding:"0 20px" }}>
          <Karaktär nivå={skogNivå} totaltKlara={totaltKlara} />

          <div onClick={() => setSkärm("skärmtid")} style={{
            background:`linear-gradient(135deg,rgba(96,165,250,0.15),rgba(139,92,250,0.1))`,
            border:`1.5px solid ${C.blue}44`, borderRadius:18, padding:"14px 16px",
            display:"flex", alignItems:"center", gap:12, marginBottom:10, cursor:"pointer",
          }}>
            <div style={{ fontSize:"2rem" }}>📱</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"0.95rem" }}>Lås upp skärmtid</div>
              <div style={{ color:C.muted, fontSize:"0.72rem" }}>Du har 🪙 {mynt} mynt · 30 min kostar 80 mynt</div>
            </div>
            <div style={{ fontFamily:"'Fredoka One',cursive", color:C.blue, fontSize:"0.82rem" }}>→</div>
          </div>

          <div onClick={() => setSkärm("lösin")} style={{
            background:`linear-gradient(135deg,rgba(244,114,182,0.12),rgba(167,139,250,0.08))`,
            border:`1.5px solid rgba(244,114,182,0.3)`, borderRadius:18, padding:"14px 16px",
            display:"flex", alignItems:"center", gap:12, marginBottom:10, cursor:"pointer",
          }}>
            <div style={{ fontSize:"2rem" }}>💸</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"0.95rem" }}>Lös in mynt</div>
              <div style={{ color:C.muted, fontSize:"0.72rem" }}>Byt mynt mot pengar eller se din spargris</div>
            </div>
            <div style={{ fontFamily:"'Fredoka One',cursive", color:"#f472b6", fontSize:"0.82rem" }}>→</div>
          </div>

          <div onClick={() => setSkärm("topplista")} style={{
            background:`linear-gradient(135deg,rgba(245,200,66,0.12),rgba(245,200,66,0.05))`,
            border:`1.5px solid ${C.gold}44`, borderRadius:18, padding:"14px 16px",
            display:"flex", alignItems:"center", gap:12, marginBottom:16, cursor:"pointer",
          }}>
            <div style={{ fontSize:"2rem" }}>🏆</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Fredoka One',cursive", color:C.text, fontSize:"0.95rem" }}>Superäventyrare</div>
              <div style={{ color:C.muted, fontSize:"0.72rem" }}>Se vem som samlat mest mynt idag</div>
            </div>
            <div style={{ fontFamily:"'Fredoka One',cursive", color:C.gold, fontSize:"0.82rem" }}>→</div>
          </div>

          {aktivSession && (
            <div onClick={() => setSkärm("skärmtid")} style={{
              background:`linear-gradient(135deg,${C.purpleFade},rgba(139,92,250,0.08))`,
              border:`1.5px solid ${C.purple}55`, borderRadius:16, padding:"12px 16px",
              display:"flex", alignItems:"center", gap:12, marginBottom:16, cursor:"pointer",
              animation:"pulse 2.5s ease-in-out infinite"
            }}>
              <div style={{ fontSize:"1.6rem" }}>🔓</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Fredoka One',cursive", color:C.purple, fontSize:"0.9rem" }}>{aktivSession.app.namn} är upplåst just nu</div>
                <div style={{ color:C.muted, fontSize:"0.7rem" }}>Tryck för att se tid kvar →</div>
              </div>
            </div>
          )}

          <div style={{ fontFamily:"'Fredoka One',cursive", color:C.muted, fontSize:"0.78rem", letterSpacing:"1px", textTransform:"uppercase", marginBottom:10 }}>Dagens Uppdrag</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {uppdrag.map(u => <UppdragsRad key={u.id} uppdrag={u} onClick={öppnaUppdrag}/>)}
          </div>
        </div>
      </div>
    </>
  );
}