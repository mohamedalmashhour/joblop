import type { PageText } from "../i18n/pageTextCore";

// Copy for the Unfilled shifts page, in English, French (Québec) and Arabic.

export type UnfilledShiftsCopy = {
  eyebrow: string;
  title: string;
  lede: string;
  loading: string;
  denied: string;
  error: string;
  empty: string;
  colJob: string;
  colEmployer: string;
  colStart: string;
  colFilled: string;
  colWarnings: string;
  hoursLeft: string;
  warned: string;
  notEmailed: string;
  open: string;
};

export const unfilledShiftsText: PageText<UnfilledShiftsCopy> = {
  en: {
    eyebrow: "Operations",
    title: "Unfilled shifts",
    lede: "Approved short-term shifts that start within 24 hours and still have open places. Staff get one email when less than 24 hours remain and another when less than 4 hours remain. Consider a bonus, contact workers directly, or tell the employer.",
    loading: "Loading unfilled shifts…",
    denied: "Staff access is required.",
    error: "The list could not be loaded. Try again.",
    empty: "No unfilled shift starts in the next 24 hours.",
    colJob: "Job",
    colEmployer: "Employer",
    colStart: "Start",
    colFilled: "Filled",
    colWarnings: "Warnings sent",
    hoursLeft: "in {h} h",
    warned: "under {t} h",
    notEmailed: "email not sent yet",
    open: "Open request"
  },
  fr: {
    eyebrow: "Opérations",
    title: "Quarts non pourvus",
    lede: "Quarts à court terme approuvés qui commencent dans les 24 prochaines heures et qui ont encore des places libres. Le personnel reçoit un courriel quand il reste moins de 24 heures, et un autre quand il reste moins de 4 heures. Envisagez une prime, contactez des travailleurs directement ou avisez l’employeur.",
    loading: "Chargement des quarts non pourvus…",
    denied: "Un accès du personnel est requis.",
    error: "La liste n’a pas pu être chargée. Réessayez.",
    empty: "Aucun quart non pourvu ne commence dans les 24 prochaines heures.",
    colJob: "Emploi",
    colEmployer: "Employeur",
    colStart: "Début",
    colFilled: "Pourvus",
    colWarnings: "Alertes envoyées",
    hoursLeft: "dans {h} h",
    warned: "moins de {t} h",
    notEmailed: "courriel pas encore envoyé",
    open: "Ouvrir la demande"
  },
  ar: {
    eyebrow: "العمليات",
    title: "مناوبات غير مشغولة",
    lede: "مناوبات قصيرة الأمد معتمدة تبدأ خلال 24 ساعة وما زالت فيها أماكن شاغرة. يتلقى الموظفون رسالة عندما يتبقى أقل من 24 ساعة، وأخرى عندما يتبقى أقل من 4 ساعات. فكّر في مكافأة، أو تواصل مع العمال مباشرة، أو أبلغ صاحب العمل.",
    loading: "جارٍ تحميل المناوبات غير المشغولة…",
    denied: "يلزم وصول الموظفين.",
    error: "تعذّر تحميل القائمة. حاول مرة أخرى.",
    empty: "لا توجد مناوبة غير مشغولة تبدأ خلال الـ24 ساعة القادمة.",
    colJob: "الوظيفة",
    colEmployer: "صاحب العمل",
    colStart: "البداية",
    colFilled: "المشغول",
    colWarnings: "التنبيهات المرسلة",
    hoursLeft: "خلال {h} ساعة",
    warned: "أقل من {t} ساعة",
    notEmailed: "لم تُرسل الرسالة بعد",
    open: "افتح الطلب"
  }
};
