// tips.ts — fun, encouraging copy shown on the mission detail screen.
// Picked by keyword match against the mission title + description.

export interface MissionTips {
  intro: string;
  tips: string[];
  cheer: string;
  emoji: string;
}

const KEYWORDS: Array<{ match: RegExp; tips: MissionTips }> = [
  {
    match: /läs|bok|kapitel/i,
    tips: {
      intro: "Dags att utforska en ny värld! 📚",
      tips: [
        "Hitta en lugn plats utan distraktioner.",
        "Läs högt för dig själv om det blir tråkigt — det väcker hjärnan!",
        "Sätt en timer så du vet när du är klar."
      ],
      cheer: "Heja heja! Varje sida tar dig längre.",
      emoji: "📚"
    }
  },
  {
    match: /hopp|spring|löp|promenad|utomhus|cykl|gym|träna|aktiv/i,
    tips: {
      intro: "Kroppen vill röra på sig — och det här fixar du! 💪",
      tips: [
        "Räkna högt medan du gör det — det blir både roligare och lättare.",
        "Ta gärna med en vän eller en hund.",
        "Stretcha lite efteråt så musklerna blir glada."
      ],
      cheer: "Du är snabbare än du tror!",
      emoji: "🏃"
    }
  },
  {
    match: /diska|städa|bädda|tvätta|plocka|ordna|sopa|damm/i,
    tips: {
      intro: "Att hjälpa till hemma är superviktigt! 🦸",
      tips: [
        "Sätt på lite musik — sysslor blir roligare med ljud.",
        "Tävla mot dig själv: kan du göra det snabbare än senast?",
        "Ta en bild på resultatet när du är klar — visa upp för förälder!"
      ],
      cheer: "Familjen är så glad när du hjälper till.",
      emoji: "🧹"
    }
  },
  {
    match: /rita|måla|konst|kreativ|skapa|pyssel|bygg/i,
    tips: {
      intro: "Konstnären kallar — låt fantasin flöda! 🎨",
      tips: [
        "Det finns inget rätt eller fel — bara att skapa.",
        "Prova en färg eller form du sällan väljer.",
        "Visa upp ditt konstverk för någon när du är klar!"
      ],
      cheer: "Världen behöver din fantasi.",
      emoji: "🎨"
    }
  },
  {
    match: /kock|laga|baka|mat|ingrediens|recept/i,
    tips: {
      intro: "Kockmästaren stiger fram! 🍳",
      tips: [
        "Tvätta händerna ordentligt först.",
        "Smaka under tiden — kockar gör alltid det.",
        "Glöm inte städa upp efter dig — då räknas det dubbelt!"
      ],
      cheer: "Den som lagar maten är hjälten.",
      emoji: "🍳"
    }
  },
  {
    match: /natur|växt|djur|fågel|sten|löv/i,
    tips: {
      intro: "Naturutforskaren är på äventyr! 🌿",
      tips: [
        "Använd alla sinnen — lukta, lyssna, känn.",
        "Ta bilder eller skissa det du hittar.",
        "Räkna gärna fler saker än uppdraget kräver — extra poäng i ditt huvud."
      ],
      cheer: "Världen är full av små underverk.",
      emoji: "🌿"
    }
  }
];

const FALLBACK: MissionTips = {
  intro: "Du klarar det här! ⭐",
  tips: [
    "Ta det i din egen takt — kvalitet före hastighet.",
    "Ta en kort paus om det känns tungt och kom tillbaka.",
    "Varje uppdrag du klarar gör din karaktär starkare!"
  ],
  cheer: "Heja heja! Du fixar det.",
  emoji: "🎯"
};

export function tipsFor(title: string, description?: string | null): MissionTips {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  return KEYWORDS.find((k) => k.match.test(text))?.tips ?? FALLBACK;
}
