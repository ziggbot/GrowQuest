import { useNavigate } from "react-router-dom";
import { C } from "../design/tokens";
import { Kort, ScreenContainer } from "../design/components";
import { BackButton } from "../design/BackButton";

// Public legal pages — reachable without auth (linked from AuthScreen
// and Settings). GDPR + App Store both require these to exist before
// real users / beta testers touch the app. Plain Swedish, no lawyer
// boilerplate; honest about what we actually collect and store.

const UPDATED = "13 juni 2026";
const CONTACT = "peter.gbg.andersson@gmail.com";

export function PrivacyScreen() {
  const nav = useNavigate();
  return (
    <ScreenContainer>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BackButton onClick={() => nav(-1)} />
          <h2 style={{ margin: 0, color: C.text }}>Integritetspolicy</h2>
        </div>
        <Kort>
          <Doc>
            <P muted>Senast uppdaterad: {UPDATED}</P>

            <H>Kort sammanfattning</H>
            <P>
              Rise är en familjeapp för uppdrag, mynt och skärmtid. Vi samlar bara in det
              som behövs för att appen ska fungera, säljer aldrig data, och visar aldrig
              annonser. En förälder styr all data om sina barn.
            </P>

            <H>Vad vi samlar in</H>
            <UL
              items={[
                "Förälderns e-postadress (för inloggning).",
                "Barnets smeknamn, ålderskategori, valbar profilbild och valbar e-post (om barnet ska ha eget inlogg).",
                "Uppdrag, inskickningar med valfria foton och kommentarer, mynt-saldon och historik, sparmål samt begäran om skärmtid/pengar.",
                "Teknisk grunddata som krävs för inloggning och drift (t.ex. tidsstämplar)."
              ]}
            />

            <H>Hur data lagras</H>
            <P>
              Data lagras hos vår databasleverantör Supabase (EU-region) och webbappen levereras
              via Vercel. Varje familj är logiskt isolerad — andra familjer kan aldrig se er
              data. Foton lagras i er familjs eget databasutrymme.
            </P>

            <H>Global topplista</H>
            <P>
              Ett barns mynt visas i den globala topplistan endast om föräldern aktivt slår på
              det per barn (avstängt som standard). Du kan stänga av det när som helst i
              Inställningar.
            </P>

            <H>Dina rättigheter (GDPR)</H>
            <UL
              items={[
                "Radera ett barn helt: Inställningar → Hantera barn → Radera barnet permanent. Det tar bort all data om barnet.",
                "Få ut eller rätta data: hör av dig så hjälper vi dig.",
                "Återkalla samtycke (t.ex. topplista) när som helst i appen."
              ]}
            />

            <H>Barns integritet</H>
            <P>
              Appen är gjord för familjebruk under förälders kontroll. En förälder skapar och
              administrerar barnens profiler och kan när som helst radera dem.
            </P>

            <H>Kontakt</H>
            <P>
              Frågor eller begäran om dina rättigheter:{" "}
              <a href={`mailto:${CONTACT}`} style={{ color: C.gold }}>
                {CONTACT}
              </a>
            </P>
          </Doc>
        </Kort>
      </div>
    </ScreenContainer>
  );
}

export function TermsScreen() {
  const nav = useNavigate();
  return (
    <ScreenContainer>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BackButton onClick={() => nav(-1)} />
          <h2 style={{ margin: 0, color: C.text }}>Användarvillkor</h2>
        </div>
        <Kort>
          <Doc>
            <P muted>Senast uppdaterad: {UPDATED}</P>

            <H>Om tjänsten</H>
            <P>
              Rise hjälper familjer att motivera barn till aktivitet genom uppdrag som ger
              mynt, vilka kan växlas mot skärmtid, sparmål eller (efter förälderns godkännande)
              pengar. Appen är ett verktyg mellan dig och ditt barn — den hanterar inga riktiga
              betalningar; utbetalningar sker manuellt mellan förälder och barn.
            </P>

            <H>Beta</H>
            <P>
              Appen är under aktiv utveckling och tillhandahålls i befintligt skick under
              testperioden. Funktioner kan ändras och enstaka fel kan förekomma. Spara inte
              data du inte har råd att förlora.
            </P>

            <H>Ditt ansvar</H>
            <UL
              items={[
                "Du ansvarar för ditt konto och för barnens profiler du skapar.",
                "Använd bara appen för din egen familj.",
                "Lägg inte upp olämpligt innehåll i foton, namn eller kommentarer.",
                "All faktisk växling av mynt till pengar sker mellan dig och ditt barn — Rise är inte part i det."
              ]}
            />

            <H>Ansvarsbegränsning</H>
            <P>
              Tjänsten levereras utan garantier under beta. Vi ansvarar inte för förlorad data
              eller indirekta skador som uppstår vid användning.
            </P>

            <H>Avsluta</H>
            <P>
              Du kan när som helst sluta använda appen och radera barnens data via Inställningar.
              Vill du radera ditt föräldrakonto helt, hör av dig till{" "}
              <a href={`mailto:${CONTACT}`} style={{ color: C.gold }}>
                {CONTACT}
              </a>
              .
            </P>
          </Doc>
        </Kort>
      </div>
    </ScreenContainer>
  );
}

function Doc({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gap: 10, lineHeight: 1.55 }}>{children}</div>;
}
function H({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ margin: "8px 0 0", color: C.text, fontSize: 15, fontWeight: 800 }}>{children}</h3>
  );
}
function P({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <p style={{ margin: 0, color: muted ? C.muted : C.text, fontSize: 13 }}>{children}</p>
  );
}
function UL({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 18, color: C.text, fontSize: 13, lineHeight: 1.6 }}>
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}
