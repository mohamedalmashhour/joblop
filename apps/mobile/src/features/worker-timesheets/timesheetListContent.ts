// Pure labels + review gating for the worker's real timesheet list. UI-free so the mapping is
// unit-tested without React Native. The backend stays authoritative — it enforces the state machine
// and rejects a review action that isn't allowed; this only decides which buttons to offer.
// Trilingual (EN / FR / AR); the label function takes an optional locale and defaults to English so
// existing callers and tests keep working.

import type { Locale } from "../../i18n/strings";

export type BadgeTone = "neutral" | "success" | "warning" | "danger";

const LABELS: Record<Locale, Record<string, string>> = {
  en: {
    draft: "Draft",
    calculation_pending: "Calculating",
    review_required: "Review required",
    worker_review: "Your review",
    employer_review: "Employer review",
    platform_review: "Platform review",
    approved: "Approved",
    locked: "Finalised",
    rejected: "Rejected",
    correction_required: "Correction needed",
    cancelled: "Cancelled"
  },
  fr: {
    draft: "Brouillon",
    calculation_pending: "Calcul en cours",
    review_required: "Examen requis",
    worker_review: "Votre examen",
    employer_review: "Examen de l'employeur",
    platform_review: "Examen de la plateforme",
    approved: "Approuvée",
    locked: "Finalisée",
    rejected: "Rejetée",
    correction_required: "Correction nécessaire",
    cancelled: "Annulée"
  },
  ar: {
    draft: "مسودة",
    calculation_pending: "جارٍ الحساب",
    review_required: "المراجعة مطلوبة",
    worker_review: "مراجعتك",
    employer_review: "مراجعة صاحب العمل",
    platform_review: "مراجعة المنصّة",
    approved: "معتمَد",
    locked: "نهائي",
    rejected: "مرفوض",
    correction_required: "يحتاج إلى تصحيح",
    cancelled: "مُلغى"
  }
};

const TONES: Record<string, BadgeTone> = {
  draft: "neutral",
  calculation_pending: "neutral",
  review_required: "warning",
  worker_review: "warning",
  employer_review: "neutral",
  platform_review: "neutral",
  approved: "success",
  locked: "success",
  rejected: "danger",
  correction_required: "warning",
  cancelled: "danger"
};

export function timesheetStatusLabel(status: string, locale: Locale = "en"): string {
  return LABELS[locale]?.[status] ?? LABELS.en[status] ?? status;
}

export function timesheetStatusTone(status: string): BadgeTone {
  return TONES[status] ?? "neutral";
}

/** The worker can confirm/dispute only while the timesheet is awaiting THEIR review. */
export function canWorkerReview(status: string): boolean {
  return status === "worker_review";
}

/** Payable time as "6h 30m" from minutes; "—" when not yet computed. */
export function formatMinutes(minutes: number | null): string {
  if (minutes === null || minutes < 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export type TimesheetCopy = Readonly<{
  title: string;
  intro: string;
  signInRequired: string;
  empty: string;
  loadError: string;
  payableLabel: string;
  confirmCta: string;
  disputeCta: string;
  disputeReasonLabel: string;
  disputeReasonPlaceholder: string;
  conflict: string;
  invalid: string;
  actionError: string;
  back: string;
  loadingTimesheets: string;
  emptyBody: string;
  signInRequiredTitle: string;
  errorTitle: string;
}>;

const en: TimesheetCopy = {
  title: "My timesheets",
  intro: "The recorded time for your shifts. When a timesheet is awaiting your review, confirm it if it's right or dispute it if something's wrong. This never calculates payroll or pays you.",
  signInRequired: "Sign in to review your timesheets.",
  empty: "You have no timesheets yet.",
  loadError: "Your timesheets could not be loaded right now.",
  payableLabel: "Payable time",
  confirmCta: "Confirm time",
  disputeCta: "Dispute",
  disputeReasonLabel: "What's wrong?",
  disputeReasonPlaceholder: "Briefly describe the issue",
  conflict: "That couldn't be done — the timesheet may have moved on. Pull to refresh.",
  invalid: "Add a short reason to dispute.",
  actionError: "That couldn't be completed right now.",
  back: "Back",
  loadingTimesheets: "Loading your timesheets",
  emptyBody: "Timesheets appear after you work a shift.",
  signInRequiredTitle: "Sign in required",
  errorTitle: "Something went wrong"
};

const fr: TimesheetCopy = {
  title: "Mes feuilles de temps",
  intro: "Le temps enregistré pour vos quarts. Quand une feuille de temps attend votre examen, confirmez-la si elle est exacte ou contestez-la si quelque chose ne va pas. Ceci ne calcule jamais la paie et ne vous paie pas.",
  signInRequired: "Connectez-vous pour examiner vos feuilles de temps.",
  empty: "Vous n'avez encore aucune feuille de temps.",
  loadError: "Impossible de charger vos feuilles de temps pour le moment.",
  payableLabel: "Temps payable",
  confirmCta: "Confirmer le temps",
  disputeCta: "Contester",
  disputeReasonLabel: "Qu'est-ce qui ne va pas?",
  disputeReasonPlaceholder: "Décrivez brièvement le problème",
  conflict: "Action impossible — la feuille de temps a peut-être évolué. Tirez pour rafraîchir.",
  invalid: "Ajoutez une courte raison pour contester.",
  actionError: "Action impossible à compléter pour le moment.",
  back: "Retour",
  loadingTimesheets: "Chargement de vos feuilles de temps",
  emptyBody: "Les feuilles de temps apparaissent après avoir travaillé un quart.",
  signInRequiredTitle: "Connexion requise",
  errorTitle: "Une erreur s'est produite"
};

const ar: TimesheetCopy = {
  title: "كشوف دوامي",
  intro: "الوقت المسجَّل لفرص عملك. عندما ينتظر كشف الدوام مراجعتك، أكّده إذا كان صحيحًا أو اعترض عليه إذا كان هناك خطأ. هذا لا يحسب الرواتب ولا يدفع لك.",
  signInRequired: "سجّل الدخول لمراجعة كشوف دوامك.",
  empty: "ليست لديك أي كشوف دوام بعد.",
  loadError: "تعذّر تحميل كشوف دوامك الآن.",
  payableLabel: "الوقت المستحقّ",
  confirmCta: "تأكيد الوقت",
  disputeCta: "اعتراض",
  disputeReasonLabel: "ما المشكلة؟",
  disputeReasonPlaceholder: "صِف المشكلة باختصار",
  conflict: "تعذّر تنفيذ ذلك — ربما تغيّرت حالة كشف الدوام. اسحب للتحديث.",
  invalid: "أضِف سببًا موجزًا للاعتراض.",
  actionError: "تعذّر إتمام ذلك الآن.",
  back: "رجوع",
  loadingTimesheets: "جارٍ تحميل كشوف دوامك",
  emptyBody: "تظهر كشوف الدوام بعد أن تعمل في فرصة.",
  signInRequiredTitle: "تسجيل الدخول مطلوب",
  errorTitle: "حدث خطأ ما"
};

const BY_LOCALE: Record<Locale, TimesheetCopy> = { en, fr, ar };

/** Timesheet-list copy for a locale (falls back to English). */
export function timesheetCopyFor(locale: Locale): TimesheetCopy {
  return BY_LOCALE[locale] ?? en;
}

/** English copy, kept for any non-localized caller / tests. */
export const timesheetCopy = en;
