// The JobScanner demo ("search once → JobScanner scans the market → ranked matches → apply free")
// and the "How Joblop works" movie frame, in EN / FR / AR. The worker website (browse/JobScannerDemo,
// HowItWorksMovie) and the phone app's signed-out screen play it with these same words.

export const JOB_SCANNER_DEMO_STEP_MS = [2000, 2600, 2600, 2400] as const;

export const JOB_SCANNER_DEMO = {
  en: {
    steps: ["Search once", "JobScanner scans the market", "Best matches, ranked", "Apply — free"],
    typed: "Nurse", scanning: "Scanning partner feeds across Canada…",
    chips: ["Care homes", "Restaurants", "Agencies", "Boards"],
    ranked: "Ranked for you", apply: "Apply — free", applied: "✓ Applied — free", urgent: "Urgent",
    play: "Play", pause: "Pause", replay: "Replay", watch: "Watch how it works",
    jobs: [
      { role: "Nurse", area: "Laval, QC", pay: "$36/h", urgent: true },
      { role: "Nurse", area: "Montréal, QC", pay: "$34/h", urgent: false },
      { role: "Nurse", area: "Gatineau, QC", pay: "$33/h", urgent: false }
    ]
  },
  fr: {
    steps: ["Cherchez une fois", "JobScanner analyse le marché", "Meilleures offres, classées", "Postulez — gratuit"],
    typed: "Infirmière", scanning: "Analyse des fils partenaires au Canada…",
    chips: ["Résidences", "Restaurants", "Agences", "Babillards"],
    ranked: "Classé pour vous", apply: "Postuler — gratuit", applied: "✓ Postulé — gratuit", urgent: "Urgent",
    play: "Lecture", pause: "Pause", replay: "Rejouer", watch: "Voir comment ça marche",
    jobs: [
      { role: "Infirmière", area: "Laval, QC", pay: "36 $/h", urgent: true },
      { role: "Infirmière", area: "Montréal, QC", pay: "34 $/h", urgent: false },
      { role: "Infirmière", area: "Gatineau, QC", pay: "33 $/h", urgent: false }
    ]
  },
  ar: {
    steps: ["ابحث مرة واحدة", "JobScanner يمسح السوق", "أفضل التطابقات، مرتّبة", "تقدّم — مجانًا"],
    typed: "ممرضة", scanning: "يمسح مصادر الشركاء عبر كندا…",
    chips: ["دور رعاية", "مطاعم", "وكالات", "لوحات وظائف"],
    ranked: "مرتّبة لك", apply: "تقدّم — مجانًا", applied: "✓ تم التقديم — مجانًا", urgent: "عاجل",
    play: "تشغيل", pause: "إيقاف", replay: "إعادة", watch: "شاهد كيف يعمل",
    jobs: [
      { role: "ممرضة", area: "لافال، كيبيك", pay: "36$/س", urgent: true },
      { role: "ممرضة", area: "مونتريال، كيبيك", pay: "34$/س", urgent: false },
      { role: "ممرضة", area: "غاتينو، كيبيك", pay: "33$/س", urgent: false }
    ]
  }
} as const;

export const HOW_IT_WORKS_MOVIE_COPY = {
  en: { eyebrow: "SEE IT IN ACTION", title: "How Joblop works", sub: "One search — the whole market scanned and ranked for you, then apply free." },
  fr: { eyebrow: "VOIR EN ACTION", title: "Comment fonctionne Joblop", sub: "Une seule recherche — tout le marché analysé et classé pour vous, puis postulez gratuitement." },
  ar: { eyebrow: "شاهدها وهي تعمل", title: "كيف يعمل جوب‑لوب", sub: "بحث واحد، والسوق كله يُفحص ويُرتّب من أجلك — ثم تتقدّم مجانًا." }
} as const;
