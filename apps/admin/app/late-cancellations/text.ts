import type { PageText } from "../i18n/pageTextCore";

// Copy for the Late cancellations page, in English, French (Québec) and Arabic.

export type LateCancellationsCopy = {
  eyebrow: string;
  title: string;
  lede: string;
  loading: string;
  denied: string;
  error: string;
  empty: string;
  colCompany: string;
  colJob: string;
  colShift: string;
  colCancelled: string;
  colWorker: string;
  colCharge: string;
  colInvoice: string;
  colFollowUp: string;
  hoursBefore: string;
  noInvoice: string;
  followUpPending: string;
};

export const lateCancellationsText: PageText<LateCancellationsCopy> = {
  en: {
    eyebrow: "Finance & payroll",
    title: "Late cancellations",
    lede: "Employer cancellations made less than 24 hours before the start. Each row is one confirmed worker; the employer is billed 6 hours for them on a draft invoice. Joblop keeps the charge: no pay goes to the worker automatically. Contact the worker and decide case by case.",
    loading: "Loading late cancellations…",
    denied: "Staff access is required.",
    error: "The list could not be loaded. Try again.",
    empty: "No late cancellations yet.",
    colCompany: "Employer",
    colJob: "Job",
    colShift: "Shift start",
    colCancelled: "Cancelled",
    colWorker: "Confirmed worker",
    colCharge: "Charge (before taxes)",
    colInvoice: "Invoice",
    colFollowUp: "Worker follow-up",
    hoursBefore: "{h} h before",
    noInvoice: "Not created",
    followUpPending: "To review with the worker"
  },
  fr: {
    eyebrow: "Finances et paie",
    title: "Annulations tardives",
    lede: "Annulations faites par un employeur moins de 24 heures avant le début. Chaque ligne correspond à un travailleur confirmé; 6 heures sont facturées à l’employeur pour lui sur une facture brouillon. Joblop conserve les frais : aucune paie n’est versée automatiquement au travailleur. Communiquez avec le travailleur et décidez au cas par cas.",
    loading: "Chargement des annulations tardives…",
    denied: "Un accès du personnel est requis.",
    error: "La liste n’a pas pu être chargée. Réessayez.",
    empty: "Aucune annulation tardive pour l’instant.",
    colCompany: "Employeur",
    colJob: "Emploi",
    colShift: "Début du quart",
    colCancelled: "Annulé",
    colWorker: "Travailleur confirmé",
    colCharge: "Frais (avant taxes)",
    colInvoice: "Facture",
    colFollowUp: "Suivi du travailleur",
    hoursBefore: "{h} h avant",
    noInvoice: "Non créée",
    followUpPending: "À examiner avec le travailleur"
  },
  ar: {
    eyebrow: "المالية والرواتب",
    title: "الإلغاءات المتأخرة",
    lede: "إلغاءات أصحاب العمل قبل أقل من 24 ساعة من البدء. كل سطر عامل مؤكَّد واحد، وتُحتسب على صاحب العمل 6 ساعات عنه في فاتورة مسودة. تحتفظ جوب‑لوب بالرسوم ولا يُدفع للعامل شيء تلقائياً. تواصل مع العامل وقرّر لكل حالة على حدة.",
    loading: "جارٍ تحميل الإلغاءات المتأخرة…",
    denied: "يلزم وصول الموظفين.",
    error: "تعذّر تحميل القائمة. حاول مرة أخرى.",
    empty: "لا توجد إلغاءات متأخرة بعد.",
    colCompany: "صاحب العمل",
    colJob: "الوظيفة",
    colShift: "بداية المناوبة",
    colCancelled: "أُلغيت",
    colWorker: "العامل المؤكَّد",
    colCharge: "الرسوم (قبل الضرائب)",
    colInvoice: "الفاتورة",
    colFollowUp: "متابعة العامل",
    hoursBefore: "قبل {h} ساعة",
    noInvoice: "لم تُنشأ",
    followUpPending: "للمراجعة مع العامل"
  }
};
