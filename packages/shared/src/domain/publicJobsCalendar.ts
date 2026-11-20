// The signed-out front door (worker website and phone app), owner's words: "the searcher sees the
// landing page with the job calendar which is available, then JobScanner; if he is interested he
// opens an account." Refined: the Joblop logo first, then the "How Joblop works" animation. Both apps read the section order, the words and the calendar grouping from
// here, so the phone app always copies the website.
//
// The calendar shows Joblop's open jobs (GET /public/jobs/calendar, the same openJobWhere rule as
// every other worker list). Only public-safe fields: role, city and province, time, places left and
// the worker's own pay. Never the address, the employer, the employer rate or Joblop's share.

/** The signed-out sections, top to bottom. The website and the app render exactly this order. */
// landing = the Joblop logo and the hero; howitworks = the 4-step "How Joblop works" animation.
export const SIGNED_OUT_SECTIONS = ["landing", "howitworks", "calendar", "jobscanner", "signup"] as const;
export type SignedOutSection = (typeof SIGNED_OUT_SECTIONS)[number];

/** Québec time: a job's day is the day it starts on at the worksite, whatever the visitor's clock. */
export const PUBLIC_CALENDAR_TIME_ZONE = "America/Toronto";

/** One open job on the public calendar (exactly the fields the API sends). */
export type PublicCalendarJob = Readonly<{
  jobCode: string;
  role: string;
  city: string | null;
  province: string | null;
  areaLabel: string;
  startAt: string;
  endAt: string;
  timezone: string | null;
  placesLeft: number;
  /** The worker's own hourly pay in cents (null for a long-term listing or when not shared). */
  workerRateMinor: number | null;
  currency: string | null;
  /** Long-term listing only: the employer's pay offer, paid directly by the employer. */
  payOffered?: unknown;
}>;

/** The fields a public calendar job may carry. Anything else in an answer is a privacy bug. */
export const PUBLIC_CALENDAR_JOB_FIELDS = [
  "jobCode",
  "role",
  "city",
  "province",
  "areaLabel",
  "startAt",
  "endAt",
  "timezone",
  "placesLeft",
  "workerRateMinor",
  "currency",
  "payOffered"
] as const;

/** "YYYY-MM-DD" of an instant in a time zone (the device's local day if the zone is unknown). */
export function calendarDayKey(instant: string | Date, timeZone: string | null = PUBLIC_CALENDAR_TIME_ZONE): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  if (!Number.isFinite(date.getTime())) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || PUBLIC_CALENDAR_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const key = `${get("year")}-${get("month")}-${get("day")}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return key;
  } catch {
    /* no time-zone data: fall back to the local day */
  }
  return localDayKey(date);
}

/** Local "YYYY-MM-DD" of a date. */
export function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Bucket open jobs by the day they start on (worksite time), each day sorted by start time. Jobs with
 * no place left are dropped: they cannot be taken, so they never show on the calendar.
 */
export function groupPublicJobsByDay(jobs: readonly PublicCalendarJob[]): Map<string, PublicCalendarJob[]> {
  const byDay = new Map<string, PublicCalendarJob[]>();
  for (const job of jobs) {
    if (!(job.placesLeft > 0)) continue;
    const key = calendarDayKey(job.startAt, job.timezone);
    if (!key) continue;
    const list = byDay.get(key) ?? [];
    list.push(job);
    byDay.set(key, list);
  }
  for (const list of byDay.values()) list.sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  return byDay;
}

/** How many open jobs each day has (what a day cell shows). */
export function countPublicJobsByDay(jobs: readonly PublicCalendarJob[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [day, list] of groupPublicJobsByDay(jobs)) counts.set(day, list.length);
  return counts;
}

export type PublicCalendarCell = Readonly<{ key: string; day: number; inMonth: boolean }>;

/** Six Sunday-started weeks covering `month` (0-11) of `year`. Pure date arithmetic, no time zone. */
export function publicCalendarWeeks(year: number, month: number): PublicCalendarCell[][] {
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const weeks: PublicCalendarCell[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: PublicCalendarCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(Date.UTC(year, month, 1 - firstWeekday + w * 7 + d));
      const key = `${date.getUTCFullYear()}-${`${date.getUTCMonth() + 1}`.padStart(2, "0")}-${`${date.getUTCDate()}`.padStart(2, "0")}`;
      week.push({ key, day: date.getUTCDate(), inMonth: date.getUTCMonth() === month });
    }
    weeks.push(week);
  }
  return weeks;
}

/** The month (year, 0-11) that today is in, in Québec time. */
export function currentCalendarMonth(now: Date = new Date()): { year: number; month: number } {
  const key = calendarDayKey(now);
  const [y, m] = key.split("-").map(Number);
  return { year: y ?? now.getFullYear(), month: (m ?? now.getMonth() + 1) - 1 };
}

/** Move (year, month) by `delta` months. */
export function shiftCalendarMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

/** The request window for a month: from its first day to the first day of the next (a day of slack each side). */
export function publicCalendarWindow(year: number, month: number): { from: string; to: string } {
  const from = new Date(Date.UTC(year, month, 1) - 86_400_000);
  const to = new Date(Date.UTC(year, month + 1, 1) + 86_400_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export type PublicLandingLang = "en" | "fr" | "ar";

export function publicLandingLang(locale: string | null | undefined): PublicLandingLang {
  const value = (locale ?? "").toLowerCase();
  if (value.startsWith("ar")) return "ar";
  if (value.startsWith("fr")) return "fr";
  return "en";
}

/** Intl locale for dates and money in each language. */
export function publicLandingIntlLocale(lang: PublicLandingLang): string {
  return lang === "ar" ? "ar" : lang === "fr" ? "fr-CA" : "en-CA";
}

/** "Mon Year" title, e.g. "November 2026" / "novembre 2026" / "نوفمبر 2026". */
export function publicCalendarMonthTitle(year: number, month: number, lang: PublicLandingLang): string {
  try {
    return new Intl.DateTimeFormat(publicLandingIntlLocale(lang), { month: "long", year: "numeric", timeZone: "UTC" }).format(
      new Date(Date.UTC(year, month, 15))
    );
  } catch {
    return `${year}-${`${month + 1}`.padStart(2, "0")}`;
  }
}

/** Seven short weekday names, Sunday first. */
export function publicCalendarWeekdays(lang: PublicLandingLang): string[] {
  try {
    const fmt = new Intl.DateTimeFormat(publicLandingIntlLocale(lang), { weekday: "short", timeZone: "UTC" });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2023, 0, 1 + i))));
  } catch {
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  }
}

/** "Friday, November 20" for a day key. */
export function publicCalendarDayTitle(key: string, lang: PublicLandingLang): string {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return key;
  try {
    return new Intl.DateTimeFormat(publicLandingIntlLocale(lang), { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(
      new Date(Date.UTC(y, m - 1, d, 12))
    );
  } catch {
    return key;
  }
}

/** Start–end time at the worksite, e.g. "8:00 a.m. – 4:00 p.m.". */
export function publicCalendarJobTime(job: Pick<PublicCalendarJob, "startAt" | "endAt" | "timezone">, lang: PublicLandingLang): string {
  const start = new Date(job.startAt);
  const end = new Date(job.endAt);
  if (!Number.isFinite(start.getTime())) return "";
  try {
    const fmt = new Intl.DateTimeFormat(publicLandingIntlLocale(lang), {
      hour: "numeric",
      minute: "2-digit",
      timeZone: job.timezone || PUBLIC_CALENDAR_TIME_ZONE
    });
    return Number.isFinite(end.getTime()) ? `${fmt.format(start)} – ${fmt.format(end)}` : fmt.format(start);
  } catch {
    const hm = (d: Date) => `${d.getHours()}:${`${d.getMinutes()}`.padStart(2, "0")}`;
    return Number.isFinite(end.getTime()) ? `${hm(start)} – ${hm(end)}` : hm(start);
  }
}

/** The words of the signed-out front door, the same on the website and in the app. */
export const PUBLIC_LANDING_COPY = {
  en: {
    calendarEyebrow: "Available jobs",
    calendarTitle: "Open Joblop jobs this month",
    calendarSub: "Tap a day to see its jobs. No account needed to look.",
    prevMonth: "Previous month",
    nextMonth: "Next month",
    loading: "Loading the calendar…",
    loadError: "The calendar could not load. Try again in a moment.",
    retry: "Try again",
    empty: "New jobs are added every day. Create a free account to get alerts.",
    dayJobsOne: "1 open job",
    dayJobsMany: "{n} open jobs",
    pickDay: "Pick a day with a gold number to see its jobs.",
    noJobsThatDay: "No open jobs that day. Try another day.",
    placesOne: "1 place left",
    placesMany: "{n} places left",
    payPending: "Hourly pay: confirmed before you're offered the shift",
    paidByEmployer: "paid directly by the employer",
    employerPaysDirectly: "Pay set and paid directly by the employer",
    seeJob: "See the job",
    scannerEyebrow: "JobScanner",
    scannerTitle: "Search every job in one place",
    scannerSub: "Joblop jobs plus partner job boards. Type the work you want and where.",
    ctaTitle: "Interested? Create your free account",
    ctaSub: "It takes one minute. Take shifts, get alerts for new jobs and get paid for every hour.",
    createAccount: "Create your free account",
    signIn: "Sign in",
    pause: "Pause",
    play: "Play",
    replay: "Replay"
  },
  fr: {
    calendarEyebrow: "Emplois disponibles",
    calendarTitle: "Emplois Joblop ouverts ce mois-ci",
    calendarSub: "Touchez un jour pour voir ses emplois. Pas besoin de compte pour regarder.",
    prevMonth: "Mois précédent",
    nextMonth: "Mois suivant",
    loading: "Chargement du calendrier…",
    loadError: "Le calendrier n'a pas pu se charger. Réessayez dans un instant.",
    retry: "Réessayer",
    empty: "De nouveaux emplois sont ajoutés chaque jour. Créez un compte gratuit pour recevoir des alertes.",
    dayJobsOne: "1 emploi ouvert",
    dayJobsMany: "{n} emplois ouverts",
    pickDay: "Choisissez un jour avec un chiffre doré pour voir ses emplois.",
    noJobsThatDay: "Aucun emploi ouvert ce jour-là. Essayez un autre jour.",
    placesOne: "1 place restante",
    placesMany: "{n} places restantes",
    payPending: "Salaire horaire : confirmé avant qu'on vous offre le quart",
    paidByEmployer: "payé directement par l'employeur",
    employerPaysDirectly: "Salaire fixé et payé directement par l'employeur",
    seeJob: "Voir l'emploi",
    scannerEyebrow: "JobScanner",
    scannerTitle: "Cherchez tous les emplois au même endroit",
    scannerSub: "Les emplois Joblop et ceux des sites d'emploi partenaires. Tapez le travail voulu et l'endroit.",
    ctaTitle: "Intéressé? Créez votre compte gratuit",
    ctaSub: "Ça prend une minute. Prenez des quarts, recevez des alertes pour les nouveaux emplois et soyez payé pour chaque heure.",
    createAccount: "Créez votre compte gratuit",
    signIn: "Se connecter",
    pause: "Pause",
    play: "Lecture",
    replay: "Rejouer"
  },
  ar: {
    calendarEyebrow: "الوظائف المتاحة",
    calendarTitle: "وظائف Joblop المفتوحة هذا الشهر",
    calendarSub: "اضغط على يوم لرؤية وظائفه. لا تحتاج إلى حساب للتصفّح.",
    prevMonth: "الشهر السابق",
    nextMonth: "الشهر التالي",
    loading: "جارٍ تحميل التقويم…",
    loadError: "تعذّر تحميل التقويم. حاول مرة أخرى بعد قليل.",
    retry: "حاول مرة أخرى",
    empty: "تُضاف وظائف جديدة كل يوم. أنشئ حسابًا مجانيًا لتصلك التنبيهات.",
    dayJobsOne: "وظيفة واحدة مفتوحة",
    dayJobsMany: "{n} وظائف مفتوحة",
    pickDay: "اختر يومًا عليه رقم ذهبي لرؤية وظائفه.",
    noJobsThatDay: "لا توجد وظائف مفتوحة في ذلك اليوم. جرّب يومًا آخر.",
    placesOne: "بقي مكان واحد",
    placesMany: "بقي {n} أماكن",
    payPending: "الأجر بالساعة: يُؤكَّد قبل أن تُعرض عليك المناوبة",
    paidByEmployer: "يدفعه صاحب العمل مباشرة",
    employerPaysDirectly: "يحدد صاحب العمل الأجر ويدفعه مباشرة",
    seeJob: "عرض الوظيفة",
    scannerEyebrow: "JobScanner",
    scannerTitle: "ابحث في كل الوظائف في مكان واحد",
    scannerSub: "وظائف Joblop ووظائف مواقع التوظيف الشريكة. اكتب العمل الذي تريده وأين.",
    ctaTitle: "مهتم؟ أنشئ حسابك المجاني",
    ctaSub: "يستغرق دقيقة واحدة. خذ مناوبات، واحصل على تنبيهات بالوظائف الجديدة، واحصل على أجر عن كل ساعة.",
    createAccount: "أنشئ حسابك المجاني",
    signIn: "تسجيل الدخول",
    pause: "إيقاف",
    play: "تشغيل",
    replay: "إعادة"
  }
} as const satisfies Record<PublicLandingLang, Record<string, string>>;

export type PublicLandingCopy = (typeof PUBLIC_LANDING_COPY)["en"];

/** Pick the one/many template and fill {n}. */
export function publicCountLabel(count: number, one: string, many: string): string {
  return count === 1 ? one : many.replace("{n}", String(count));
}
