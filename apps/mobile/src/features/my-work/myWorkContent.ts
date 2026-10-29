// Pure labels + copy for the worker's "My Shifts" screen (their real applications + confirmed
// assignments). UI-free so the status mapping is unit-tested without React Native. Trilingual
// (EN / FR / AR) — the label/tone functions take an optional locale and default to English so
// existing callers and tests keep working.

import type { Locale } from "../../i18n/strings";

export type BadgeTone = "neutral" | "success" | "warning" | "danger";

const INTEREST_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    submitted: "Submitted",
    under_review: "Under review",
    shortlisted: "Shortlisted",
    not_selected: "Not selected",
    withdrawn: "Withdrawn",
    offer_created: "Offer sent to you",
    offer_accepted: "Offer accepted"
  },
  fr: {
    submitted: "Envoyée",
    under_review: "En examen",
    shortlisted: "Présélectionné",
    not_selected: "Non retenu",
    withdrawn: "Retirée",
    offer_created: "Offre qui vous a été envoyée",
    offer_accepted: "Offre acceptée"
  },
  ar: {
    submitted: "تم الإرسال",
    under_review: "قيد المراجعة",
    shortlisted: "ضمن القائمة المختصرة",
    not_selected: "لم يتم الاختيار",
    withdrawn: "تم السحب",
    offer_created: "عرض مُرسَل إليك",
    offer_accepted: "تم قبول العرض"
  }
};

const INTEREST_TONES: Record<string, BadgeTone> = {
  submitted: "neutral",
  under_review: "neutral",
  shortlisted: "success",
  not_selected: "danger",
  withdrawn: "warning",
  offer_created: "success",
  offer_accepted: "success"
};

export function interestStatusLabel(status: string, locale: Locale = "en"): string {
  return INTEREST_LABELS[locale]?.[status] ?? INTEREST_LABELS.en[status] ?? status;
}

export function interestStatusTone(status: string): BadgeTone {
  return INTEREST_TONES[status] ?? "neutral";
}

const ASSIGNMENT_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    pending_validation: "Pending",
    confirmed: "Confirmed",
    worker_acknowledged: "Acknowledged",
    ready_for_attendance: "Ready to start",
    in_attendance_window: "In progress",
    attendance_handoff: "Wrapping up",
    worker_withdrawn: "Withdrawn",
    employer_cancelled: "Cancelled",
    platform_cancelled: "Cancelled",
    replacement_required: "Needs replacement",
    expired_before_start: "Expired",
    closed: "Closed"
  },
  fr: {
    pending_validation: "En attente",
    confirmed: "Confirmé",
    worker_acknowledged: "Pris en compte",
    ready_for_attendance: "Prêt à commencer",
    in_attendance_window: "En cours",
    attendance_handoff: "Finalisation",
    worker_withdrawn: "Retiré",
    employer_cancelled: "Annulé",
    platform_cancelled: "Annulé",
    replacement_required: "Remplacement requis",
    expired_before_start: "Expiré",
    closed: "Terminé"
  },
  ar: {
    pending_validation: "قيد الانتظار",
    confirmed: "مؤكَّد",
    worker_acknowledged: "تم الإقرار",
    ready_for_attendance: "جاهز للبدء",
    in_attendance_window: "جارٍ التنفيذ",
    attendance_handoff: "قيد الإنهاء",
    worker_withdrawn: "تم السحب",
    employer_cancelled: "أُلغي",
    platform_cancelled: "أُلغي",
    replacement_required: "يحتاج إلى بديل",
    expired_before_start: "منتهي الصلاحية",
    closed: "مغلق"
  }
};

const ASSIGNMENT_TONES: Record<string, BadgeTone> = {
  pending_validation: "neutral",
  confirmed: "success",
  worker_acknowledged: "success",
  ready_for_attendance: "success",
  in_attendance_window: "success",
  attendance_handoff: "neutral",
  worker_withdrawn: "warning",
  employer_cancelled: "danger",
  platform_cancelled: "danger",
  replacement_required: "warning",
  expired_before_start: "danger",
  closed: "neutral"
};

export function assignmentStatusLabel(status: string, locale: Locale = "en"): string {
  return ASSIGNMENT_LABELS[locale]?.[status] ?? ASSIGNMENT_LABELS.en[status] ?? status;
}

export function assignmentStatusTone(status: string): BadgeTone {
  return ASSIGNMENT_TONES[status] ?? "neutral";
}

export type MyWorkCopy = Readonly<{
  title: string;
  intro: string;
  signInRequired: string;
  applicationsTitle: string;
  applicationsEmpty: string;
  assignmentsTitle: string;
  assignmentsEmpty: string;
  loadError: string;
  offerSentNote: string;
  scheduleCta: string;
  timesheetsCta: string;
  loadingApplications: string;
  loadingAssignments: string;
  applicationsEmptyBody: string;
  assignmentsEmptyBody: string;
  signInRequiredTitle: string;
  errorTitle: string;
  openShiftFallback: string;
}>;

const en: MyWorkCopy = {
  title: "My shifts",
  intro: "Your applications to open shifts and the shifts you've been confirmed for. This reflects real activity on your account; it never guarantees an assignment.",
  signInRequired: "Sign in to see your applications and confirmed shifts.",
  applicationsTitle: "My applications",
  applicationsEmpty: "You haven't applied to any open shifts yet.",
  assignmentsTitle: "My confirmed shifts",
  assignmentsEmpty: "You have no confirmed shifts yet.",
  loadError: "This could not be loaded right now.",
  offerSentNote: "An offer linked to this application is waiting in your Calendar.",
  scheduleCta: "View my schedule & check in",
  timesheetsCta: "Review my timesheets",
  loadingApplications: "Loading applications",
  loadingAssignments: "Loading confirmed shifts",
  applicationsEmptyBody: "Browse open shifts in the Available tab.",
  assignmentsEmptyBody: "Accepted offers become confirmed shifts here.",
  signInRequiredTitle: "Sign in required",
  errorTitle: "Something went wrong",
  openShiftFallback: "Open shift"
};

const fr: MyWorkCopy = {
  title: "Mes quarts",
  intro: "Vos candidatures aux quarts ouverts et les quarts pour lesquels vous avez été confirmé. Ceci reflète l'activité réelle de votre compte; cela ne garantit jamais une affectation.",
  signInRequired: "Connectez-vous pour voir vos candidatures et vos quarts confirmés.",
  applicationsTitle: "Mes candidatures",
  applicationsEmpty: "Vous n'avez encore postulé à aucun quart ouvert.",
  assignmentsTitle: "Mes quarts confirmés",
  assignmentsEmpty: "Vous n'avez encore aucun quart confirmé.",
  loadError: "Impossible de charger ceci pour le moment.",
  offerSentNote: "Une offre liée à cette candidature vous attend dans votre calendrier.",
  scheduleCta: "Voir mon horaire et enregistrer l'arrivée",
  timesheetsCta: "Examiner mes feuilles de temps",
  loadingApplications: "Chargement des candidatures",
  loadingAssignments: "Chargement des quarts confirmés",
  applicationsEmptyBody: "Parcourez les quarts ouverts dans l'onglet Disponibles.",
  assignmentsEmptyBody: "Les offres acceptées deviennent des quarts confirmés ici.",
  signInRequiredTitle: "Connexion requise",
  errorTitle: "Une erreur s'est produite",
  openShiftFallback: "Quart ouvert"
};

const ar: MyWorkCopy = {
  title: "فرص عملي",
  intro: "طلباتك على فرص العمل المتاحة والفرص التي تم تأكيدك لها. هذا يعكس نشاطك الفعلي على حسابك؛ وهو لا يضمن التعيين.",
  signInRequired: "سجّل الدخول لرؤية طلباتك وفرص عملك المؤكَّدة.",
  applicationsTitle: "طلباتي",
  applicationsEmpty: "لم تتقدّم إلى أي فرصة عمل متاحة بعد.",
  assignmentsTitle: "فرص عملي المؤكَّدة",
  assignmentsEmpty: "ليست لديك أي فرصة عمل مؤكَّدة بعد.",
  loadError: "تعذّر تحميل هذا الآن.",
  offerSentNote: "هناك عرض مرتبط بهذا الطلب بانتظارك في التقويم.",
  scheduleCta: "عرض جدولي وتسجيل الوصول",
  timesheetsCta: "مراجعة كشوف دوامي",
  loadingApplications: "جارٍ تحميل الطلبات",
  loadingAssignments: "جارٍ تحميل الفرص المؤكَّدة",
  applicationsEmptyBody: "تصفّح فرص العمل المتاحة في تبويب «المتاحة».",
  assignmentsEmptyBody: "تتحوّل العروض المقبولة إلى فرص عمل مؤكَّدة هنا.",
  signInRequiredTitle: "تسجيل الدخول مطلوب",
  errorTitle: "حدث خطأ ما",
  openShiftFallback: "فرصة عمل متاحة"
};

const BY_LOCALE: Record<Locale, MyWorkCopy> = { en, fr, ar };

/** My Shifts copy for a locale (falls back to English). */
export function myWorkCopyFor(locale: Locale): MyWorkCopy {
  return BY_LOCALE[locale] ?? en;
}

/** English copy, kept for any non-localized caller / tests. */
export const myWorkCopy = en;
