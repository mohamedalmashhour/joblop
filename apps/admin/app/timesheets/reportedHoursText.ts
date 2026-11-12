import type { PageText } from "../i18n/pageTextCore";

// Copy for the "Reported hours" section of the Timesheets page (and the staff "Enter hours" override),
// in English, French (Québec) and Arabic. Times are always Eastern (Québec) time.

export type ReportedHoursCopy = {
  title: string;
  lede: string;
  loading: string;
  empty: string;
  unnamedWorker: string;
  scheduled: string;
  reported: string;
  workerReason: string;
  sent: string;
  arrival: string;
  departure: string;
  approve: string;
  rejectPlaceholder: string;
  reject: string;
  approved: string;
  rejected: string;
  changed: string;
  failed: string;
  overrideTitle: string;
  overrideLede: string;
  overrideEmpty: string;
  windowOpen: string;
  windowClosed: string;
  overrideReasonPlaceholder: string;
  overrideSubmit: string;
  overrideDone: string;
};

export const reportedHoursText: PageText<ReportedHoursCopy> = {
  en: {
    title: "Reported hours ({count})",
    lede: "Shifts worked with no check-in, reported by the worker within 12 hours of the end. Check the times with the employer if needed, edit them, then approve or reject.",
    loading: "Loading…",
    empty: "No worker is waiting for reported hours to be approved.",
    unnamedWorker: "Unnamed worker",
    scheduled: "scheduled {from}–{to} (Eastern time)",
    reported: "Reported:",
    workerReason: "Worker's reason:",
    sent: "Sent {when}",
    arrival: "Arrival",
    departure: "Departure",
    approve: "Approve hours",
    rejectPlaceholder: "Reason for rejecting (the worker sees this)",
    reject: "Reject",
    approved: "Hours approved. The timesheet is prepared and goes to the worker to confirm.",
    rejected: "Report rejected. The worker has been told.",
    changed: "This report or shift changed (already decided, or the shift was cancelled). The list has been refreshed.",
    failed: "That could not be done. Check the times: departure after arrival, on the shift day, not in the future.",
    overrideTitle: "Enter hours for a shift ({count})",
    overrideLede: "Finished shifts in the last 14 days with no check-in and no report. After the 12-hour window the worker can no longer report, and the shift is not recorded unless staff enter the hours here. A reason is required and kept in the audit log.",
    overrideEmpty: "No finished shift is missing its hours.",
    windowOpen: "The worker can still report until {when}.",
    windowClosed: "Worker window closed at {when}: not recorded unless staff enter the hours.",
    overrideReasonPlaceholder: "Reason (required, e.g. confirmed with the farm manager)",
    overrideSubmit: "Enter hours",
    overrideDone: "Hours entered. The timesheet is prepared and goes to the worker to confirm."
  },
  fr: {
    title: "Heures déclarées ({count})",
    lede: "Quarts travaillés sans pointage, déclarés par le travailleur dans les 12 heures suivant la fin. Vérifiez les heures avec l'employeur au besoin, modifiez-les, puis approuvez ou refusez.",
    loading: "Chargement…",
    empty: "Aucun travailleur n'attend l'approbation d'heures déclarées.",
    unnamedWorker: "Travailleur sans nom",
    scheduled: "prévu {from}–{to} (heure de l'Est)",
    reported: "Déclaré :",
    workerReason: "Raison du travailleur :",
    sent: "Envoyé le {when}",
    arrival: "Arrivée",
    departure: "Départ",
    approve: "Approuver les heures",
    rejectPlaceholder: "Raison du refus (le travailleur la voit)",
    reject: "Refuser",
    approved: "Heures approuvées. La feuille de temps est préparée et envoyée au travailleur pour confirmation.",
    rejected: "Déclaration refusée. Le travailleur a été avisé.",
    changed: "Cette déclaration ou ce quart a changé (déjà traité, ou quart annulé). La liste a été actualisée.",
    failed: "Impossible. Vérifiez les heures : départ après l'arrivée, le jour du quart, pas dans le futur.",
    overrideTitle: "Saisir les heures d'un quart ({count})",
    overrideLede: "Quarts terminés depuis 14 jours, sans pointage ni déclaration. Après le délai de 12 heures, le travailleur ne peut plus déclarer et le quart n'est pas enregistré, sauf si le personnel saisit les heures ici. Une raison est obligatoire et conservée dans le journal d'audit.",
    overrideEmpty: "Aucun quart terminé n'attend ses heures.",
    windowOpen: "Le travailleur peut encore déclarer jusqu'au {when}.",
    windowClosed: "Délai du travailleur terminé le {when} : non enregistré sauf saisie par le personnel.",
    overrideReasonPlaceholder: "Raison (obligatoire, p. ex. confirmé avec le gérant de la ferme)",
    overrideSubmit: "Saisir les heures",
    overrideDone: "Heures saisies. La feuille de temps est préparée et envoyée au travailleur pour confirmation."
  },
  ar: {
    title: "الساعات المُبلغ عنها ({count})",
    lede: "مناوبات عُمل فيها دون تسجيل حضور، أبلغ عنها العامل خلال 12 ساعة من نهايتها. تحقّق من الأوقات مع صاحب العمل عند الحاجة، وعدّلها، ثم وافق أو ارفض.",
    loading: "جارٍ التحميل…",
    empty: "لا يوجد عامل بانتظار الموافقة على ساعات مُبلغ عنها.",
    unnamedWorker: "عامل بلا اسم",
    scheduled: "المقرر {from}–{to} (توقيت الشرق)",
    reported: "المُبلغ عنه:",
    workerReason: "سبب العامل:",
    sent: "أُرسل في {when}",
    arrival: "الوصول",
    departure: "المغادرة",
    approve: "الموافقة على الساعات",
    rejectPlaceholder: "سبب الرفض (يراه العامل)",
    reject: "رفض",
    approved: "تمت الموافقة على الساعات. أُعدّ كشف الساعات وأُرسل إلى العامل لتأكيده.",
    rejected: "رُفض البلاغ. تم إبلاغ العامل.",
    changed: "تغيّر هذا البلاغ أو هذه المناوبة (سبق البتّ فيه أو أُلغيت المناوبة). تم تحديث القائمة.",
    failed: "تعذّر ذلك. تحقّق من الأوقات: المغادرة بعد الوصول، في يوم المناوبة، وليست في المستقبل.",
    overrideTitle: "إدخال ساعات مناوبة ({count})",
    overrideLede: "مناوبات انتهت خلال آخر 14 يومًا دون تسجيل حضور ودون بلاغ. بعد مهلة الـ12 ساعة لا يستطيع العامل الإبلاغ، ولا تُسجَّل المناوبة إلا إذا أدخل الفريق الساعات هنا. السبب مطلوب ويُحفظ في سجل التدقيق.",
    overrideEmpty: "لا توجد مناوبة منتهية تنقصها الساعات.",
    windowOpen: "لا يزال بإمكان العامل الإبلاغ حتى {when}.",
    windowClosed: "انتهت مهلة العامل في {when}: لا تُسجَّل إلا إذا أدخل الفريق الساعات.",
    overrideReasonPlaceholder: "السبب (مطلوب، مثلًا: تم التأكد مع مدير المزرعة)",
    overrideSubmit: "إدخال الساعات",
    overrideDone: "أُدخلت الساعات. أُعدّ كشف الساعات وأُرسل إلى العامل لتأكيده."
  }
};

/** Fill {name} placeholders. */
export function fill(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
