// Mobile i18n dictionaries. English, French (QC), and Arabic. Arabic drives right-to-left layout.
// Keys are grouped; add new screens' copy here and read them with useT()/t().

export const LOCALES = ["en", "fr", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const localeLabel: Record<Locale, string> = { en: "English", fr: "Français", ar: "العربية" };

/** Arabic is the only RTL locale here. */
export function isRtlLocale(locale: Locale): boolean {
  return locale === "ar";
}

type Dict = Readonly<Record<string, string>>;

const en: Dict = {
  "brand.tagline": "Workforce marketplace",
  "nav.home": "Home",
  "nav.available": "Available",
  "nav.myShifts": "My Shifts",
  "nav.calendar": "Calendar",
  "nav.earnings": "Earnings",
  "nav.signOut": "Sign out",
  "nav.language": "Language",
  "home.title": "Welcome to JobLop",
  "home.intro": "Your worker home. Browse open shifts, track your applications, check in to work, and see your earnings — all in one place.",
  "home.signedOut": "Sign in to apply to shifts, check in, and see your earnings.",
  "home.available.label": "Browse open shifts",
  "home.available.desc": "Find and apply to open shifts near you.",
  "home.myShifts.label": "My shifts & applications",
  "home.myShifts.desc": "Track what you've applied to and your confirmed shifts.",
  "home.calendar.label": "My calendar",
  "home.calendar.desc": "See offers waiting for your response.",
  "home.earnings.label": "My earnings",
  "home.earnings.desc": "What's registered to your account and what's been paid.",
  "home.onboarding.label": "Get set up",
  "home.onboarding.desc": "Complete your worker profile to receive offers."
};

const fr: Dict = {
  "brand.tagline": "Place de marché de main-d'œuvre",
  "nav.home": "Accueil",
  "nav.available": "Disponibles",
  "nav.myShifts": "Mes quarts",
  "nav.calendar": "Calendrier",
  "nav.earnings": "Gains",
  "nav.signOut": "Se déconnecter",
  "nav.language": "Langue",
  "home.title": "Bienvenue sur JobLop",
  "home.intro": "Votre accueil travailleur. Parcourez les quarts ouverts, suivez vos candidatures, pointez au travail et consultez vos gains — au même endroit.",
  "home.signedOut": "Connectez-vous pour postuler, pointer et voir vos gains.",
  "home.available.label": "Parcourir les quarts ouverts",
  "home.available.desc": "Trouvez des quarts ouverts près de vous et postulez.",
  "home.myShifts.label": "Mes quarts et candidatures",
  "home.myShifts.desc": "Suivez vos candidatures et vos quarts confirmés.",
  "home.calendar.label": "Mon calendrier",
  "home.calendar.desc": "Voyez les offres en attente de votre réponse.",
  "home.earnings.label": "Mes gains",
  "home.earnings.desc": "Ce qui est enregistré à votre compte et ce qui a été payé.",
  "home.onboarding.label": "Configurer mon profil",
  "home.onboarding.desc": "Complétez votre profil travailleur pour recevoir des offres."
};

const ar: Dict = {
  "brand.tagline": "سوق القوى العاملة",
  "nav.home": "الرئيسية",
  "nav.available": "المتاحة",
  "nav.myShifts": "فرص عملي",
  "nav.calendar": "التقويم",
  "nav.earnings": "الأرباح",
  "nav.signOut": "تسجيل الخروج",
  "nav.language": "اللغة",
  "home.title": "مرحبًا بك في JobLop",
  "home.intro": "صفحتك الرئيسية كعامل. تصفّح فرص العمل المتاحة، وتابع طلباتك، وسجّل حضورك، واطّلع على أرباحك — كل ذلك في مكان واحد.",
  "home.signedOut": "سجّل الدخول للتقديم على فرص العمل وتسجيل الحضور والاطّلاع على أرباحك.",
  "home.available.label": "تصفّح فرص العمل المتاحة",
  "home.available.desc": "ابحث عن فرص العمل المتاحة القريبة منك وقدّم عليها.",
  "home.myShifts.label": "فرص عملي وطلباتي",
  "home.myShifts.desc": "تابع ما قدّمت عليه وفرص عملك المؤكدة.",
  "home.calendar.label": "تقويمي",
  "home.calendar.desc": "اطّلع على العروض التي تنتظر ردّك.",
  "home.earnings.label": "أرباحي",
  "home.earnings.desc": "ما هو مُسجَّل في حسابك وما تم دفعه.",
  "home.onboarding.label": "إعداد الملف",
  "home.onboarding.desc": "أكمل ملفك كعامل لتلقّي العروض."
};

export const dictionaries: Record<Locale, Dict> = { en, fr, ar };

/** Translate a key for a locale, falling back to English then the key itself. */
export function translate(locale: Locale, key: string): string {
  return dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
}
