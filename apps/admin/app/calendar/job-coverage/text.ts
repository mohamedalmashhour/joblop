import type { PageText } from "../../i18n/pageTextCore";

// Copy for the staff coverage calendar (/calendar/coverage).

const en = {
  eyebrow: "Joblop / Operations",
  title: "Coverage calendar",
  lede: "Every job on one calendar: open, partly filled or full, how many places are left, who accepted, and the pay. Act early on jobs that still need workers.",
  loading: "Loading the coverage calendar.",
  denied: "Your session has ended or this account has no HR access.",
  error: "The coverage calendar could not be reached.",
  previous: "Previous month",
  next: "Next month",
  today: "Today",
  legendTitle: "Legend",
  coverage: {
    full: "Full",
    partly_filled: "Partly filled",
    open: "Open, no worker yet",
    not_open: "Not open (awaiting review)"
  } as Readonly<Record<string, string>>,
  weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  dayJobs: (count: number) => (count === 1 ? "1 job" : `${count} jobs`),
  moreJobs: (count: number) => `+${count} more`,
  selectDay: "Choose a day to see its jobs.",
  noJobs: "No jobs on this day.",
  needsWorkers: "Needs workers",
  needsWorkersSummary: (count: number) =>
    count === 1 ? "1 job starting within 48 hours still needs workers." : `${count} jobs starting within 48 hours still need workers.`,
  employerFallback: "Employer not set",
  places: (taken: number, asked: number) => `${taken} / ${asked} places taken`,
  placesLeft: (left: number) => (left === 1 ? "1 place left" : `${left} places left`),
  workers: "Accepted workers",
  noWorkers: "No worker has accepted yet.",
  workerPay: "Worker pay",
  employerRate: "Employer rate",
  perHour: "per hour",
  notSet: "not set",
  openJob: "Open job"
};

export type CoverageText = typeof en;

const fr: CoverageText = {
  eyebrow: "Joblop / Opérations",
  title: "Calendrier de couverture",
  lede: "Tous les postes sur un seul calendrier : ouverts, partiellement pourvus ou complets, les places restantes, les travailleurs qui ont accepté et la rémunération. Agissez tôt pour les postes qui manquent encore de travailleurs.",
  loading: "Chargement du calendrier de couverture.",
  denied: "Votre session a pris fin ou ce compte n’a pas d’accès RH.",
  error: "Le calendrier de couverture est inaccessible.",
  previous: "Mois précédent",
  next: "Mois suivant",
  today: "Aujourd’hui",
  legendTitle: "Légende",
  coverage: {
    full: "Complet",
    partly_filled: "Partiellement pourvu",
    open: "Ouvert, aucun travailleur",
    not_open: "Non ouvert (en attente de révision)"
  },
  weekdays: ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"],
  dayJobs: (count) => (count <= 1 ? `${count} poste` : `${count} postes`),
  moreJobs: (count) => `+${count} de plus`,
  selectDay: "Choisissez un jour pour voir ses postes.",
  noJobs: "Aucun poste ce jour-là.",
  needsWorkers: "Travailleurs requis",
  needsWorkersSummary: (count) =>
    count === 1
      ? "1 poste qui commence dans les 48 heures manque encore de travailleurs."
      : `${count} postes qui commencent dans les 48 heures manquent encore de travailleurs.`,
  employerFallback: "Employeur non indiqué",
  places: (taken, asked) => `${taken} / ${asked} places pourvues`,
  placesLeft: (left) => (left <= 1 ? `${left} place restante` : `${left} places restantes`),
  workers: "Travailleurs ayant accepté",
  noWorkers: "Aucun travailleur n’a encore accepté.",
  workerPay: "Paie du travailleur",
  employerRate: "Tarif employeur",
  perHour: "par heure",
  notSet: "non défini",
  openJob: "Ouvrir le poste"
};

const ar: CoverageText = {
  eyebrow: "Joblop / العمليات",
  title: "تقويم التغطية",
  lede: "كل الوظائف في تقويم واحد: مفتوحة أو مشغولة جزئيًا أو مكتملة، وعدد الأماكن المتبقية، ومن قبِل من العمال، والأجر. تصرّف مبكرًا مع الوظائف التي ما زالت تحتاج إلى عمال.",
  loading: "جارٍ تحميل تقويم التغطية.",
  denied: "انتهت جلستك أو لا يملك هذا الحساب صلاحية الموارد البشرية.",
  error: "تعذّر الوصول إلى تقويم التغطية.",
  previous: "الشهر السابق",
  next: "الشهر التالي",
  today: "اليوم",
  legendTitle: "دليل الألوان",
  coverage: {
    full: "مكتملة",
    partly_filled: "مشغولة جزئيًا",
    open: "مفتوحة، بلا عامل بعد",
    not_open: "غير مفتوحة (بانتظار المراجعة)"
  },
  weekdays: ["الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"],
  dayJobs: (count) => `${count} وظيفة`,
  moreJobs: (count) => `+${count} أخرى`,
  selectDay: "اختر يومًا لعرض وظائفه.",
  noJobs: "لا وظائف في هذا اليوم.",
  needsWorkers: "تحتاج إلى عمال",
  needsWorkersSummary: (count) => `${count} وظيفة تبدأ خلال 48 ساعة ما زالت تحتاج إلى عمال.`,
  employerFallback: "صاحب العمل غير محدد",
  places: (taken, asked) => `${taken} / ${asked} أماكن مشغولة`,
  placesLeft: (left) => `${left} أماكن متبقية`,
  workers: "العمال الذين قبلوا",
  noWorkers: "لم يقبل أي عامل بعد.",
  workerPay: "أجر العامل",
  employerRate: "سعر صاحب العمل",
  perHour: "في الساعة",
  notSet: "غير محدد",
  openJob: "فتح الوظيفة"
};

export const coverageText = { en, fr, ar } satisfies PageText<CoverageText>;
