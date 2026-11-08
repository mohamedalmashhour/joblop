// Pure labels + action gating for the worker's real attendance schedule. UI-free so the status and
// check-in/out gating are unit-tested without React Native. The backend remains authoritative — it
// enforces the attendance-window policy and rejects an out-of-window action; this only decides which
// button to offer, from the record's own timestamps. Trilingual (EN / FR / AR); the label function
// takes an optional locale and defaults to English so existing callers and tests keep working.

import type { Locale } from "../../i18n/strings";

export type BadgeTone = "neutral" | "success" | "warning" | "danger";

const LABELS: Record<Locale, Record<string, string>> = {
  en: {
    pending_start: "Not started",
    checked_in: "Checked in",
    checked_out: "Checked out",
    completed: "Completed",
    missed: "Missed",
    cancelled: "Cancelled",
    exception: "Needs review"
  },
  fr: {
    pending_start: "Pas commencé",
    checked_in: "Arrivée enregistrée",
    checked_out: "Départ enregistré",
    completed: "Terminé",
    missed: "Manqué",
    cancelled: "Annulé",
    exception: "À examiner"
  },
  ar: {
    pending_start: "لم يبدأ",
    checked_in: "تم تسجيل الوصول",
    checked_out: "تم تسجيل الانصراف",
    completed: "مكتمل",
    missed: "فائت",
    cancelled: "أُلغي",
    exception: "يحتاج إلى مراجعة"
  }
};

const TONES: Record<string, BadgeTone> = {
  pending_start: "neutral",
  checked_in: "success",
  checked_out: "success",
  completed: "success",
  missed: "danger",
  cancelled: "danger",
  exception: "warning"
};

export function attendanceStatusLabel(status: string, locale: Locale = "en"): string {
  return LABELS[locale]?.[status] ?? LABELS.en[status] ?? status;
}

export function attendanceStatusTone(status: string): BadgeTone {
  return TONES[status] ?? "neutral";
}

export type AttendanceAction = "check_in" | "check_out" | "none";

/** Which action the worker can take, from the record's timestamps. A terminal record offers none. */
export function attendanceAction(record: {
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  clockInAllowed?: boolean;
}): AttendanceAction {
  // Long-term job (employer plans flag): the employer pays directly, Joblop keeps no check-in.
  if (record.clockInAllowed === false) return "none";
  if (record.status === "cancelled" || record.status === "missed" || record.status === "completed") return "none";
  if (record.checkInAt === null) return "check_in";
  if (record.checkOutAt === null) return "check_out";
  return "none";
}

export type AttendanceCopy = Readonly<{
  title: string;
  intro: string;
  signInRequired: string;
  empty: string;
  loadError: string;
  checkInCta: string;
  checkOutCta: string;
  conflict: string;
  denied: string;
  actionError: string;
  back: string;
  loadingSchedule: string;
  emptyBody: string;
  signInRequiredTitle: string;
  errorTitle: string;
  longTermNoClockIn: string;
}>;

const en: AttendanceCopy = {
  title: "My schedule",
  intro: "Your upcoming and recent shifts. Check in when you arrive and check out when you finish — your check-in/out times feed your timesheet.",
  signInRequired: "Sign in to see your schedule and check in to shifts.",
  empty: "You have no scheduled shifts yet.",
  loadError: "Your schedule could not be loaded right now.",
  checkInCta: "Check in",
  checkOutCta: "Check out",
  conflict: "That couldn't be done right now — your shift may be outside its check-in window. Pull to refresh.",
  denied: "Sign in required.",
  actionError: "That couldn't be completed right now.",
  back: "Back",
  loadingSchedule: "Loading your schedule",
  emptyBody: "Confirmed shifts appear here.",
  signInRequiredTitle: "Sign in required",
  errorTitle: "Something went wrong",
  longTermNoClockIn: "Long-term job: the employer pays you directly, so there is no check-in or timesheet on Joblop."
};

const fr: AttendanceCopy = {
  title: "Mon horaire",
  intro: "Vos quarts à venir et récents. Enregistrez votre arrivée quand vous arrivez et votre départ quand vous terminez — vos heures d'arrivée/départ alimentent votre feuille de temps.",
  signInRequired: "Connectez-vous pour voir votre horaire et enregistrer votre arrivée aux quarts.",
  empty: "Vous n'avez encore aucun quart planifié.",
  loadError: "Impossible de charger votre horaire pour le moment.",
  checkInCta: "Enregistrer l'arrivée",
  checkOutCta: "Enregistrer le départ",
  conflict: "Action impossible pour le moment — votre quart est peut-être hors de sa fenêtre d'arrivée. Tirez pour rafraîchir.",
  denied: "Connexion requise.",
  actionError: "Action impossible à compléter pour le moment.",
  back: "Retour",
  loadingSchedule: "Chargement de votre horaire",
  emptyBody: "Les quarts confirmés apparaissent ici.",
  signInRequiredTitle: "Connexion requise",
  errorTitle: "Une erreur s'est produite",
  longTermNoClockIn: "Emploi de longue durée : l'employeur vous paie directement, donc pas de pointage ni de feuille de temps sur Joblop."
};

const ar: AttendanceCopy = {
  title: "جدولي",
  intro: "فرص عملك القادمة والأخيرة. سجّل وصولك عند الحضور وانصرافك عند الانتهاء — تُغذّي أوقات وصولك وانصرافك كشف الدوام الخاص بك.",
  signInRequired: "سجّل الدخول لرؤية جدولك وتسجيل الوصول إلى فرص العمل.",
  empty: "ليست لديك أي فرصة عمل مجدوَلة بعد.",
  loadError: "تعذّر تحميل جدولك الآن.",
  checkInCta: "تسجيل الوصول",
  checkOutCta: "تسجيل الانصراف",
  conflict: "تعذّر تنفيذ ذلك الآن — قد تكون فرصتك خارج نافذة تسجيل الوصول. اسحب للتحديث.",
  denied: "تسجيل الدخول مطلوب.",
  actionError: "تعذّر إتمام ذلك الآن.",
  back: "رجوع",
  loadingSchedule: "جارٍ تحميل جدولك",
  emptyBody: "تظهر فرص العمل المؤكَّدة هنا.",
  signInRequiredTitle: "تسجيل الدخول مطلوب",
  errorTitle: "حدث خطأ ما",
  longTermNoClockIn: "وظيفة طويلة: يدفع لك صاحب العمل مباشرة، لذا لا يوجد تسجيل حضور أو ورقة دوام على Joblop."
};

const BY_LOCALE: Record<Locale, AttendanceCopy> = { en, fr, ar };

/** Schedule copy for a locale (falls back to English). */
export function attendanceCopyFor(locale: Locale): AttendanceCopy {
  return BY_LOCALE[locale] ?? en;
}

/** English copy, kept for any non-localized caller / tests. */
export const attendanceCopy = en;
