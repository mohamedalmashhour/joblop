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
  cancelCta: string;
  cancelTitle: string;
  cancelFreeBody: string;
  cancelLateBody: string;
  cancelConfirm: string;
  cancelKeep: string;
  cancelledNotice: string;
  cancelledSuspendedNotice: string;
  cancelStarted: string;
  // Who cancelled a shift (same words as the website schedule). Never the internal reason text.
  cancelledBy: Readonly<Record<"joblop" | "employer" | "worker", string>>;
  // "Report my hours" (a shift worked with no check-in): same words as the website schedule.
  reportCta: string;
  /** Contains {deadline}: shown on the card of a finished shift with no check-in. */
  reportDeadlineNotice: string;
  /** Contains {deadline}. */
  reportIntro: string;
  reportArrival: string;
  reportDeparture: string;
  reportReason: string;
  reportSubmit: string;
  reportClose: string;
  reportWaiting: string;
  reportSentNotice: string;
  reportRejected: string;
  reportErrTimes: string;
  reportErrEndBeforeStart: string;
  reportErrFuture: string;
  reportErrReason: string;
  reportErrClosed: string;
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
  longTermNoClockIn: "Long-term job: the employer pays you directly, so there is no check-in or timesheet on Joblop.",
  cancelCta: "Cancel this shift",
  cancelTitle: "Cancel this shift?",
  cancelFreeBody: "The shift starts in more than 24 hours, so cancelling is free. It leaves your schedule and goes back on the job board for another worker. The employer and Joblop are told.",
  cancelLateBody: "The shift starts in less than 24 hours. If you cancel now, your account is suspended for 7 days (Joblop's rule for late cancellations) and you get an email about it. The shift leaves your schedule and goes back on the job board. The employer and Joblop are told.",
  cancelConfirm: "Yes, cancel the shift",
  cancelKeep: "Keep my shift",
  cancelledNotice: "Your shift is cancelled. The employer and Joblop have been told.",
  cancelledSuspendedNotice: "Your shift is cancelled. Your account is suspended for 7 days; check your email.",
  cancelStarted: "This shift has already started, so it can't be cancelled here. Contact Joblop.",
  cancelledBy: { joblop: "Cancelled by Joblop", employer: "Cancelled by the employer", worker: "You cancelled this shift" },
  reportCta: "Report my hours",
  reportDeadlineNotice: "No check-in recorded. You have until {deadline} to report your hours. After that, this shift will not be recorded or paid.",
  reportIntro: "You worked this shift but didn't check in? Tell Joblop when you arrived and when you left. Joblop checks it before your hours count. You can do this until {deadline}.",
  reportArrival: "Arrival time",
  reportDeparture: "Departure time",
  reportReason: "Why didn't you check in? (short reason)",
  reportSubmit: "Send my hours",
  reportClose: "Not now",
  reportWaiting: "Waiting for Joblop to approve",
  reportSentNotice: "Your hours were sent. Joblop will check them and let you know.",
  reportRejected: "Joblop did not accept the hours you reported. Check your email.",
  reportErrTimes: "Enter your arrival and departure times.",
  reportErrEndBeforeStart: "The departure time must be after the arrival time.",
  reportErrFuture: "The departure time can't be in the future.",
  reportErrReason: "Write a short reason (at least 3 characters).",
  reportErrClosed: "Hours can no longer be reported for this shift. Contact Joblop."
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
  longTermNoClockIn: "Emploi de longue durée : l'employeur vous paie directement, donc pas de pointage ni de feuille de temps sur Joblop.",
  cancelCta: "Annuler ce quart",
  cancelTitle: "Annuler ce quart?",
  cancelFreeBody: "Le quart commence dans plus de 24 heures : l'annulation est gratuite. Il sort de votre horaire et retourne au tableau des emplois pour un autre travailleur. L'employeur et Joblop sont avisés.",
  cancelLateBody: "Le quart commence dans moins de 24 heures. Si vous annulez maintenant, votre compte est suspendu 7 jours (règle de Joblop pour les annulations tardives) et vous recevez un courriel à ce sujet. Le quart sort de votre horaire et retourne au tableau des emplois. L'employeur et Joblop sont avisés.",
  cancelConfirm: "Oui, annuler le quart",
  cancelKeep: "Garder mon quart",
  cancelledNotice: "Votre quart est annulé. L'employeur et Joblop ont été avisés.",
  cancelledSuspendedNotice: "Votre quart est annulé. Votre compte est suspendu 7 jours; consultez vos courriels.",
  cancelStarted: "Ce quart a déjà commencé : il ne peut plus être annulé ici. Contactez Joblop.",
  cancelledBy: { joblop: "Annulé par Joblop", employer: "Annulé par l’employeur", worker: "Vous avez annulé ce quart" },
  reportCta: "Déclarer mes heures",
  reportDeadlineNotice: "Aucun pointage enregistré. Vous avez jusqu'au {deadline} pour déclarer vos heures. Après, ce quart ne sera ni enregistré ni payé.",
  reportIntro: "Vous avez travaillé ce quart sans pointer? Indiquez à Joblop l'heure de votre arrivée et de votre départ. Joblop vérifie avant que vos heures comptent. Vous pouvez le faire jusqu'au {deadline}.",
  reportArrival: "Heure d'arrivée",
  reportDeparture: "Heure de départ",
  reportReason: "Pourquoi n'avez-vous pas pointé? (courte raison)",
  reportSubmit: "Envoyer mes heures",
  reportClose: "Pas maintenant",
  reportWaiting: "En attente de l'approbation de Joblop",
  reportSentNotice: "Vos heures ont été envoyées. Joblop va les vérifier et vous tenir au courant.",
  reportRejected: "Joblop n'a pas accepté les heures déclarées. Consultez vos courriels.",
  reportErrTimes: "Indiquez votre heure d'arrivée et votre heure de départ.",
  reportErrEndBeforeStart: "L'heure de départ doit être après l'heure d'arrivée.",
  reportErrFuture: "L'heure de départ ne peut pas être dans le futur.",
  reportErrReason: "Écrivez une courte raison (au moins 3 caractères).",
  reportErrClosed: "Il n'est plus possible de déclarer des heures pour ce quart. Contactez Joblop."
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
  longTermNoClockIn: "وظيفة طويلة: يدفع لك صاحب العمل مباشرة، لذا لا يوجد تسجيل حضور أو ورقة دوام على Joblop.",
  cancelCta: "إلغاء هذه المناوبة",
  cancelTitle: "هل تريد إلغاء هذه المناوبة؟",
  cancelFreeBody: "تبدأ المناوبة بعد أكثر من 24 ساعة، لذلك الإلغاء مجاني. تُحذف من جدولك وتعود إلى لوحة الوظائف لعامل آخر. يتم إبلاغ صاحب العمل وJoblop.",
  cancelLateBody: "تبدأ المناوبة خلال أقل من 24 ساعة. إذا ألغيت الآن، يُعلَّق حسابك لمدة 7 أيام (قاعدة Joblop للإلغاء المتأخر) وتصلك رسالة بريد إلكتروني بذلك. تُحذف المناوبة من جدولك وتعود إلى لوحة الوظائف. يتم إبلاغ صاحب العمل وJoblop.",
  cancelConfirm: "نعم، ألغِ المناوبة",
  cancelKeep: "أبقِ مناوبتي",
  cancelledNotice: "تم إلغاء مناوبتك. تم إبلاغ صاحب العمل وJoblop.",
  cancelledSuspendedNotice: "تم إلغاء مناوبتك. حسابك معلَّق لمدة 7 أيام؛ راجع بريدك الإلكتروني.",
  cancelStarted: "بدأت هذه المناوبة بالفعل، لذا لا يمكن إلغاؤها من هنا. تواصل مع Joblop.",
  cancelledBy: { joblop: "ألغتها Joblop", employer: "ألغاها صاحب العمل", worker: "لقد ألغيت هذه المناوبة" },
  reportCta: "أبلغ عن ساعاتي",
  reportDeadlineNotice: "لم يُسجَّل أي حضور. أمامك حتى {deadline} للإبلاغ عن ساعاتك. بعد ذلك لن تُسجَّل هذه المناوبة ولن تُدفع.",
  reportIntro: "عملت في هذه المناوبة ولم تسجّل دخولك؟ أخبر Joblop بوقت وصولك ووقت مغادرتك. تتحقق Joblop من ذلك قبل احتساب ساعاتك. يمكنك فعل ذلك حتى {deadline}.",
  reportArrival: "وقت الوصول",
  reportDeparture: "وقت المغادرة",
  reportReason: "لماذا لم تسجّل دخولك؟ (سبب قصير)",
  reportSubmit: "أرسل ساعاتي",
  reportClose: "ليس الآن",
  reportWaiting: "بانتظار موافقة Joblop",
  reportSentNotice: "تم إرسال ساعاتك. ستتحقق Joblop منها وتُعلمك.",
  reportRejected: "لم تقبل Joblop الساعات التي أبلغت عنها. راجع بريدك الإلكتروني.",
  reportErrTimes: "أدخل وقت وصولك ووقت مغادرتك.",
  reportErrEndBeforeStart: "يجب أن يكون وقت المغادرة بعد وقت الوصول.",
  reportErrFuture: "لا يمكن أن يكون وقت المغادرة في المستقبل.",
  reportErrReason: "اكتب سببًا قصيرًا (3 أحرف على الأقل).",
  reportErrClosed: "لم يعد بالإمكان الإبلاغ عن ساعات لهذه المناوبة. تواصل مع Joblop."
};

const BY_LOCALE: Record<Locale, AttendanceCopy> = { en, fr, ar };

/** Schedule copy for a locale (falls back to English). */
export function attendanceCopyFor(locale: Locale): AttendanceCopy {
  return BY_LOCALE[locale] ?? en;
}

/** English copy, kept for any non-localized caller / tests. */
export const attendanceCopy = en;

/** A booked shift the worker may still cancel themselves (not started, not a long-term listing). */
export function canCancelShift(record: { status: string; clockInAllowed?: boolean }): boolean {
  return record.status === "pending_start" && record.clockInAllowed !== false;
}

// ── Check in / Check out box (same rules as the website's ShiftCheckIn) ──

export const CHECK_IN_OPENS_MINUTES_BEFORE_START = 30;

export type CheckInView =
  | Readonly<{ kind: "opens_later"; opensAt: string }>
  | Readonly<{ kind: "check_in" }>
  | Readonly<{ kind: "checked_in"; inAt: string }>
  | Readonly<{ kind: "done"; inAt: string; outAt: string }>
  | Readonly<{ kind: "none" }>;

/** What the box shows for this shift now: check-in opens 30 minutes before the start. */
export function checkInView(
  record: { status: string; scheduledStartAt: string; checkInAt: string | null; checkOutAt: string | null; clockInAllowed?: boolean },
  now: number = Date.now()
): CheckInView {
  if (record.clockInAllowed === false || record.status === "cancelled" || record.status === "missed") return { kind: "none" };
  if (record.checkInAt && record.checkOutAt) return { kind: "done", inAt: record.checkInAt, outAt: record.checkOutAt };
  if (record.checkInAt) return { kind: "checked_in", inAt: record.checkInAt };
  if (record.status !== "pending_start") return { kind: "none" };
  const opensAt = new Date(new Date(record.scheduledStartAt).getTime() - CHECK_IN_OPENS_MINUTES_BEFORE_START * 60_000);
  return now >= opensAt.getTime() ? { kind: "check_in" } : { kind: "opens_later", opensAt: opensAt.toISOString() };
}

const INTL_LOCALE: Record<Locale, string> = { en: "en-CA", fr: "fr-CA", ar: "ar" };

/** A time of day in Toronto time, in the worker's language (e.g. "7:30 a.m."). */
export function torontoClock(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleTimeString(INTL_LOCALE[locale] ?? "en-CA", { hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" });
}

/** A day in Toronto time, in the worker's language (e.g. "Thursday, February 11"). */
export function torontoDay(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(INTL_LOCALE[locale] ?? "en-CA", { weekday: "long", month: "long", day: "numeric", timeZone: "America/Toronto" });
}

/** True when cancelling now is a late cancellation (less than 24 h before the start): 7-day suspension. */
export function isLateCancellation(scheduledStartAt: string, now: number = Date.now()): boolean {
  return new Date(scheduledStartAt).getTime() - now < 24 * 3_600_000;
}

// ── "Report my hours" (same rules as the website schedule card) ──

const SHIFT_ZONE = "America/Toronto";

export type ReportHoursView = "form" | "waiting" | "rejected" | null;

/** What the card shows for "Report my hours", from the API's fields (the API decides). */
export function reportHoursView(
  record: Readonly<{ canReportHours?: boolean; reportHoursUntil?: string | null; hoursReport?: Readonly<{ status: string }> | null; clockInAllowed?: boolean }>,
  now: number = Date.now()
): ReportHoursView {
  if (record.clockInAllowed === false) return null;
  if (record.hoursReport?.status === "pending") return "waiting";
  const open = record.canReportHours === true && (!record.reportHoursUntil || now <= new Date(record.reportHoursUntil).getTime());
  if (open) return "form";
  if (record.hoursReport?.status === "rejected") return "rejected";
  return null;
}

/** "HH:MM" (24 h) of an instant on Québec time, the starting value of the time fields. */
export function shiftClock(iso: string, timeZone: string = SHIFT_ZONE): string {
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: timeZone || SHIFT_ZONE, hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch {
    return new Date(iso).toISOString().slice(11, 16);
  }
}

const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Accepts "8:05" or "08:05" and returns "08:05"; null when it is not a time. */
export function normalizeClock(value: string): string | null {
  const trimmed = value.trim();
  const padded = /^\d:\d\d$/.test(trimmed) ? `0${trimmed}` : trimmed;
  return CLOCK.test(padded) ? padded : null;
}

export type ReportErrorKey = "reportErrTimes" | "reportErrEndBeforeStart" | "reportErrFuture" | "reportErrReason" | "reportErrClosed" | "reportWaiting";

/** The checks the form makes before sending (the API checks them all again). */
export function reportInputError(arrival: string, departure: string, reason: string): ReportErrorKey | null {
  const a = normalizeClock(arrival);
  const d = normalizeClock(departure);
  if (!a || !d) return "reportErrTimes";
  if (d <= a) return "reportErrEndBeforeStart";
  if (reason.trim().length < 3) return "reportErrReason";
  return null;
}

/** The message for a report the API refused (its `reason`). */
export function reportRefusalKey(reason: string | null | undefined): ReportErrorKey {
  if (reason === "end_before_start") return "reportErrEndBeforeStart";
  if (reason === "in_future") return "reportErrFuture";
  if (reason === "reason_required") return "reportErrReason";
  if (reason === "invalid_time") return "reportErrTimes";
  if (reason === "already_pending") return "reportWaiting";
  return "reportErrClosed";
}

/** The report deadline on Québec time, for the form's intro line. */
export function formatReportDeadline(iso: string, locale: Locale): string {
  const intl = locale === "en" ? "en-CA" : locale === "fr" ? "fr-CA" : "ar-u-nu-latn";
  try {
    return new Intl.DateTimeFormat(intl, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: SHIFT_ZONE }).format(new Date(iso));
  } catch {
    return iso;
  }
}
