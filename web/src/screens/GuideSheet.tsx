import { C } from "../design/tokens";
import { Kort } from "../design/components";
import { Sheet } from "./Sheet";

// Welcome / parent guide. Same copy spirit as the onboarding hero on
// ProfilePickerScreen but more actionable: how the loop works and how
// to keep the kid engaged in real life rather than screens.

export function GuideSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Så funkar GrowQuest" onClose={onClose}>
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
              <strong style={{ color: C.text }}>Inställningar → Ekonomi</strong>: max
              skärmtid/dag, kräv ett uppdrag idag, mynt-utgång.
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
