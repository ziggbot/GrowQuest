# Prompt: bygg en landningssida för Rise

Klistra in allt nedanför (från och med "PROMPT START") i Claude. Det är skrivet
för att ge en färdig, responsiv marknadsföringssida som matchar appens syfte och
design. Justera valfritt innan du skickar.

---

## PROMPT START

Du är en senior frontend- och varumärkesdesigner. Bygg en **landningssida (one-page
marketing site)** för en app som heter **Rise**. Leverera en **enda, responsiv,
fristående HTML-fil med inbäddad CSS** (ingen extern CSS/JS utöver Google Fonts).
Mobile-first, snabb, tillgänglig (WCAG AA-kontrast, semantisk HTML, alt-texter).
All synlig text ska vara på **svenska**.

### Om Rise (syfte och vision)
Rise är en familjeapp som gör skärmtid till något barnet **förtjänar genom
aktivitet**, istället för att slentrianmässigt sätta sig med mobilen. Barn utför
uppdrag i verkligheten — rörelse, hjälpa till hemma, skapa, upptäcka — och tjänar
**mynt**. 1 mynt = 1 minut skärmtid. Föräldern sätter reglerna per barn; barnet
bygger vanan. Tanken bygger på att fylla barnets "dopaminkonto" med riktiga
upplevelser *innan* skärmsuget och konflikterna börjar, så att behovet av skärmen
naturligt minskar. Positionering: en **motivationsapp som främjar aktivitet och
medveten, aktiv skärmanvändning** — inte en bestraffande spärr-app. Håll tonen
varm, uppmuntrande, lekfull men trovärdig (föräldrar är målgruppen som fattar
beslutet, barn är de som ska tycka det är kul).

### Varumärke
- **Namn:** Rise. **Tagline:** "Time to rise" (får användas som hero-rubrik).
- **Symbol/motiv:** soluppgång — en sol som stiger över en horisont, med ljusstrålar.
  Sekundärt motiv: frodig djungel/natur (appen har en djungelbakgrund).
- **Röst:** kort, konkret, positiv svenska. Korta meningar. Inga emojis i brödtext
  (enstaka i features är ok). Undvik formuleringar i stil med "inte en app som
  stoppar skärmtid" — beskriv vad appen ÄR, inte vad den inte är.

### Visuell design (matcha appen exakt)
**Soluppgångs-tema för hero/sektionsbakgrunder:**
- Himmelsgradient (mörk gryning → varm soluppgång):
  `linear-gradient(180deg, #0a1a3a 0%, #1d3461 35%, #b65b3b 75%, #f7c873 100%)`
- Soldisk (radiell): `radial-gradient(circle at 35% 35%, #fff4cc 0%, #ffd76a 45%, #f0a040 100%)`
  med mjukt sken (box-shadow i varm gul). Lägg gärna 6–8 tunna ljusstrålar runt solen.

**Ljust UI-tema (kort, sektioner, "produkt"-känsla) — appens palett:**
- Bakgrund/varm grädde: `#fff4dc`. Kortyta: `#ffffff`, hover `#fff8e8`.
- Kanter: `rgba(36,58,82,0.10)`. Mjuk skugga: `0 6px 18px rgba(140,100,60,0.12)`.
- Accentfärger: guld `#f5b400` (primär), grön `#2bb673`, cyan `#1ec0d6`,
  lila `#7a6bd6`, röd `#ff6464`.
- Text: navy `#243a52`, mjuk `#3b5673`, dämpad `#5d7491`.

**Form och typografi:**
- Rundade hörn (kort ~18px, knappar ~14px), generösa mellanrum, mjuka skuggor —
  vänligt och taktilt, inte kantigt/corporate.
- Rubriker: en varm, något geometrisk sans-serif med tyngd (t.ex. Poppins eller
  Nunito från Google Fonts), feta vikter (800–900). Brödtext: samma familj,
  400–600. Wordmarket "Rise" gärna i versaler (RISE) i hero.
- Primär knapp: fylld guld `#f5b400`, vit text, rundad, mjuk skugga.
  Sekundär: vit/transparent med guldkant.

**Mikrointeraktioner (CSS):** lugna fade/slide-in när sektioner scrollas in;
en subtil "soluppgång" i hero (solen glider upp + strålar tonar in) vid sidladdning.
Inget pråligt — det ska kännas mjukt och morgonpigget.

### Sidstruktur (sektioner, uppifrån och ner)
1. **Hero** — soluppgångsgradient som bakgrund, stigande sol med strålar.
   Rubrik "RISE", underrubrik "Time to rise", en mening: *"Appen som gör att barn
   vill röra på sig, hjälpa till och skapa — och förtjänar sin skärmtid."*
   Två CTA-knappar: "Kom igång" (primär) och "Så funkar det" (scrollar ner).
2. **Problem → lösning** — kort: skärmen på autopilot vs. aktiv, medveten användning.
   En rad: *"1 mynt = 1 minut skärmtid. Du sätter reglerna per barn — de bygger vanan."*
3. **Så funkar det (3 steg)** — Planera uppdrag → Barnet utför och skickar in
   (gärna med foto) → Du godkänner, mynt delas ut, barnet växlar till skärmtid,
   sparmål eller pengar.
4. **6 sätt att fylla på dopaminkontot** — sex kort med ikon/siffra och kort text:
   Rörelse, Upptäcka, Utmaning, Kontakt, Skapa, Fantasi. (Rörelse ger naturligt
   dopaminpåslag; Upptäcka väcker nyfikenhet; Utmaning belönar att klara av;
   Kontakt aktiverar belöningssystemet; Skapa ger känslan av att lyckas; Fantasi
   stimulerar genom kreativitet.) Numrerade cirklar 01–06.
5. **Funktioner** — per-barn-regler (skärmtid, ekonomi), sparmål, uppdrag med
   foto-bevis, mynt-ekonomi, valbar global topplista, notiser. Korta feature-kort.
6. **För föräldrar / trygghet** — familjen äger sin data, ingen reklam, data säljs
   aldrig, varje familj är isolerad, GDPR (radera barn när som helst), topplista
   avstängd som standard.
7. **Avslutande CTA** — soluppgångsband igen, "Dags att rise?" + e-post-fält för
   väntelista (bara visuellt/attrapp; ingen riktig backend) eller "Öppna appen".
8. **Footer** — Rise, länkar till Integritetspolicy och Användarvillkor, kontakt
   `peter.gbg.andersson@gmail.com`, © 2026.

### Tekniska krav
- En `index.html`-fil, allt inline. Google Fonts via `<link>`.
- Responsiv: ser bra ut på 360px mobil upp till bred desktop. Använd CSS Grid/Flex.
- Inga riktiga formulärsubmits/backend — knappar och fält får vara attrapper.
- Lägg platshållare (kommenterade) där appens skärmdumpar/ikon kan in senare.
- Ren, kommenterad kod. Inga ramverk om det inte behövs.

### Undvik
- Mörkt/corporate-tech-utseende, hårda kanter, neon, stockfoto-känsla.
- Negativa formuleringar om skärmtid; håll det motiverande.
- Att avvika från paletten ovan.

Leverera den färdiga `index.html` som en artifact jag kan förhandsgranska direkt.

## PROMPT SLUT
