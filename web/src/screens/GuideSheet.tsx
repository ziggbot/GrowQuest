import { C } from "../design/tokens";
import { Kort } from "../design/components";
import { Sheet } from "./Sheet";

// Welcome / parent guide. Same copy spirit as the onboarding hero on
// ProfilePickerScreen but more actionable: how the loop works and how
// to keep the kid engaged in real life rather than screens.

// The six dopamine "deposits" the missions are designed around — vary
// these and the child gets a healthy, sustainable dopamine hit that
// lowers the pull of the screen.
const DOPAMIN: { titel: string; text: string }[] = [
  { titel: "Rörelse", text: "Fysisk aktivitet ger ett naturligt dopaminpåslag och gör barnet piggt och fokuserat." },
  { titel: "Upptäcka", text: "Att upptäcka något nytt väcker nyfikenhet och lust att lära sig mer." },
  { titel: "Utmaning", text: "Dopamin ökar när barnet kämpar med och klarar av något svårt." },
  { titel: "Kontakt", text: "Positiv kontakt med andra aktiverar hjärnans belöningssystem." },
  { titel: "Skapa", text: "Att skapa något själv ger känslan av att lyckas och uttrycka sina idéer." },
  { titel: "Fantasi", text: "Fantasilek stimulerar hjärnan genom spänning, kreativitet och nya idéer." }
];

export function GuideSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Så funkar Rise" onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <Kort>
          <div style={{ fontSize: 26, marginBottom: 4 }}>🌳</div>
          <h3 style={{ margin: "0 0 6px", color: C.text, fontSize: 16 }}>
            En motivationsapp, inte en stoppapp
          </h3>
          <p style={{ color: C.muted, fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            Barn rör på sig, hjälper till och skapar — och förtjänar därigenom sin skärmtid.
            1 mynt = 1 minut. Du sätter reglerna, barnet bygger vanor.
          </p>
        </Kort>

        <Kort>
          <h3 style={{ margin: "0 0 6px", color: C.text, fontSize: 14, fontWeight: 800 }}>
            Tanken bakom
          </h3>
          <p style={{ color: C.muted, fontSize: 13, margin: "0 0 8px", lineHeight: 1.55 }}>
            Rise vänder på skärmtiden: i stället för att slentrianmässigt sätta sig med mobilen
            blir den en <strong style={{ color: C.text }}>aktiv handling</strong> — något barnet
            förtjänar och väljer, inom regler ni satt tillsammans. Regelbaserad och medveten
            användning, inte autopilot.
          </p>
          <p style={{ color: C.muted, fontSize: 13, margin: 0, lineHeight: 1.55 }}>
            Idén bygger på att fylla barnets <strong style={{ color: C.text }}>dopaminkonto</strong>{" "}
            med riktiga upplevelser <em>innan</em> suget efter skärm — och konflikten — hinner
            börja. Uppdragen är designade för att ge dopamin på ett sunt sätt, så att behovet av
            skärmen helt enkelt blir mindre.
          </p>
        </Kort>

        <Kort>
          <h3 style={{ margin: "0 0 4px", color: C.gold, fontSize: 14, fontWeight: 800 }}>
            6 sätt att fylla på dopaminkontot
          </h3>
          <p style={{ color: C.muted, fontSize: 12, margin: "0 0 12px", lineHeight: 1.45 }}>
            Variera uppdragen mellan dessa — tillsammans ger de ett naturligt och hållbart
            dopaminpåslag.
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {DOPAMIN.map((d, i) => (
              <div key={d.titel} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div
                  style={{
                    flexShrink: 0,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: C.text,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 800,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 1
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>{d.titel}</div>
                  <p style={{ color: C.muted, fontSize: 12, margin: "1px 0 0", lineHeight: 1.4 }}>
                    {d.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Kort>

        <Kort>
          <h3 style={{ margin: "0 0 8px", color: C.text, fontSize: 14, fontWeight: 800 }}>
            Loopen i tre steg
          </h3>
          <ol style={{ margin: 0, paddingLeft: 18, color: C.text, fontSize: 13, lineHeight: 1.6 }}>
            <li>
              <strong>Du planerar uppdrag</strong> — använd mallarna eller skriv egna.
            </li>
            <li>
              <strong>Barnet utför och skickar in</strong> (gärna med ett foto-bevis).
            </li>
            <li>
              <strong>Du godkänner i Att-granska-inboxen</strong> → mynt utdelas, regn av mynt
              över skärmen, barnet kan växla till skärmtid eller pengar.
            </li>
          </ol>
        </Kort>

        <Kort>
          <h3 style={{ margin: "0 0 8px", color: C.gold, fontSize: 14, fontWeight: 800 }}>
            Topp 3 för att motivera ditt barn
          </h3>
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>
                1. Variera uppdragen
              </div>
              <p style={{ color: C.muted, fontSize: 12, margin: "2px 0 0", lineHeight: 1.45 }}>
                Mixa rörelse, kreativitet och hjälp hemma. Mallarna är sorterade per ålder —
                "bädda sängen" tappar kraft fort, "cykla en runda" eller "ring mormor" gör
                inte det.
              </p>
            </div>
            <div>
              <div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>
                2. Använd sparmål
              </div>
              <p style={{ color: C.muted, fontSize: 12, margin: "0 0 0", lineHeight: 1.45 }}>
                Lägg upp ett mål barnet vill ha — en leksak, ett spel, en utflykt. Långsiktig
                belöning slår omedelbar skärmtid när det gäller att förändra vanor.
              </p>
            </div>
            <div>
              <div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>
                3. Fira streaken
              </div>
              <p style={{ color: C.muted, fontSize: 12, margin: "0 0 0", lineHeight: 1.45 }}>
                Barnet ser 🔥-streak på sin vy. Sju dagar i rad → 50 🪙 bonus automatiskt.
                Kommentera streaken högt — beröm för konsekvens slår beröm för enstaka
                prestationer.
              </p>
            </div>
          </div>
        </Kort>

        <Kort>
          <h3 style={{ margin: "0 0 6px", color: C.text, fontSize: 14, fontWeight: 800 }}>
            Bra att veta
          </h3>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              color: C.muted,
              fontSize: 12,
              lineHeight: 1.6
            }}
          >
            <li>
              <strong style={{ color: C.text }}>Skärmtid &amp; ekonomi</strong>: max skärmtid/dag,
              kräv ett uppdrag idag och mynt-utgång ställer du in per barn under{" "}
              <strong style={{ color: C.text }}>Hantera</strong>.
            </li>
            <li>
              <strong style={{ color: C.text }}>Skapa uppdrag</strong>: klicka{" "}
              <strong style={{ color: C.text }}>+ Planera uppdrag</strong> i dagens-vyn.
            </li>
            <li>
              <strong style={{ color: C.text }}>Hantera barn</strong>: foto, ålder, gränser,
              eget mejl-inlogg — under barnets Hantera-knapp i Inställningar.
            </li>
            <li>
              <strong style={{ color: C.text }}>Notiser</strong>: slå på i Inställningar för
              att få popup när barnet skickar in eller begär skärmtid.
            </li>
          </ul>
        </Kort>
      </div>
    </Sheet>
  );
}
