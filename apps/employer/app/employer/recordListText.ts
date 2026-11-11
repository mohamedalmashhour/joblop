// Plain words (en / fr-CA / ar) for the employer's working lists: the request calendar states, and
// the Assigned workers, Attendance and Timesheets pages. No rates or Joblop share appear here.
import type { Trilingual } from "../i18n/localText";

type ListText = Readonly<{
  loading: string;
  loadingBody: string;
  signInTitle: string;
  signInBody: string;
  goToSignIn: string;
  chooseCompanyTitle: string;
  chooseCompanyBody: string;
  openCalendar: string;
  emptyTitle: string;
  emptyBody: string;
  emptyAction: string;
  unavailableTitle: string;
  changedTitle: string;
  errorTitle: string;
  errorBody: string;
  retry: string;
  backAction: string;
  pageEyebrow: string;
  pageTitle: string;
  pageLede: string;
  sectionEyebrow: string;
  sectionTitle: string;
}>;

const shared = {
  en: {
    loadingBody: "This takes a moment.",
    goToSignIn: "Go to sign in",
    chooseCompanyTitle: "Choose your company first",
    openCalendar: "Open the request calendar",
    errorBody: "Please try again in a moment.",
    retry: "Try again"
  },
  fr: {
    loadingBody: "Un instant.",
    goToSignIn: "Se connecter",
    chooseCompanyTitle: "Choisissez d'abord votre entreprise",
    openCalendar: "Ouvrir le calendrier des demandes",
    errorBody: "Veuillez réessayer dans un moment.",
    retry: "Réessayer"
  },
  ar: {
    loadingBody: "لحظة من فضلك.",
    goToSignIn: "تسجيل الدخول",
    chooseCompanyTitle: "اختر شركتك أولًا",
    openCalendar: "افتح تقويم الطلبات",
    errorBody: "يرجى المحاولة مرة أخرى بعد قليل.",
    retry: "حاول مرة أخرى"
  }
} as const;

export const assignmentsText: Trilingual<ListText> = {
  en: {
    ...shared.en,
    loading: "Loading your assigned workers…",
    signInTitle: "Please sign in",
    signInBody: "Sign in to see the workers assigned to your shifts.",
    chooseCompanyBody: "Pick your company on the request calendar, then come back here.",
    emptyTitle: "No assigned workers yet",
    emptyBody: "When Joblop assigns a worker to one of your shifts, it shows here.",
    emptyAction: "See my requests",
    unavailableTitle: "We can't reach your assigned workers right now",
    changedTitle: "This list was just updated",
    errorTitle: "Your assigned workers could not be loaded",
    backAction: "Back to the request calendar",
    pageEyebrow: "Assigned workers",
    pageTitle: "The workers assigned to your shifts",
    pageLede: "Each confirmed worker, with the shift date, time and place.",
    sectionEyebrow: "Assigned workers",
    sectionTitle: "Who is coming, and when"
  },
  fr: {
    ...shared.fr,
    loading: "Chargement de vos travailleurs assignés…",
    signInTitle: "Veuillez vous connecter",
    signInBody: "Connectez-vous pour voir les travailleurs assignés à vos quarts.",
    chooseCompanyBody: "Choisissez votre entreprise dans le calendrier des demandes, puis revenez ici.",
    emptyTitle: "Aucun travailleur assigné pour l'instant",
    emptyBody: "Quand Joblop assigne un travailleur à l'un de vos quarts, il s'affiche ici.",
    emptyAction: "Voir mes demandes",
    unavailableTitle: "Nous ne pouvons pas joindre vos travailleurs assignés pour le moment",
    changedTitle: "Cette liste vient d'être mise à jour",
    errorTitle: "Vos travailleurs assignés n'ont pas pu être chargés",
    backAction: "Retour au calendrier des demandes",
    pageEyebrow: "Travailleurs assignés",
    pageTitle: "Les travailleurs assignés à vos quarts",
    pageLede: "Chaque travailleur confirmé, avec la date, l'heure et le lieu du quart.",
    sectionEyebrow: "Travailleurs assignés",
    sectionTitle: "Qui vient, et quand"
  },
  ar: {
    ...shared.ar,
    loading: "جارٍ تحميل العمال المعيّنين…",
    signInTitle: "يرجى تسجيل الدخول",
    signInBody: "سجّل الدخول لرؤية العمال المعيّنين لمناوباتك.",
    chooseCompanyBody: "اختر شركتك من تقويم الطلبات، ثم عد إلى هنا.",
    emptyTitle: "لا يوجد عمال معيّنون بعد",
    emptyBody: "عندما تعيّن Joblop عاملًا لإحدى مناوباتك، يظهر هنا.",
    emptyAction: "عرض طلباتي",
    unavailableTitle: "لا يمكننا الوصول إلى العمال المعيّنين الآن",
    changedTitle: "تم تحديث هذه القائمة للتو",
    errorTitle: "تعذّر تحميل العمال المعيّنين",
    backAction: "العودة إلى تقويم الطلبات",
    pageEyebrow: "العمال المعيّنون",
    pageTitle: "العمال المعيّنون لمناوباتك",
    pageLede: "كل عامل مؤكَّد، مع تاريخ المناوبة ووقتها ومكانها.",
    sectionEyebrow: "العمال المعيّنون",
    sectionTitle: "من سيأتي، ومتى"
  }
};

export const attendanceText: Trilingual<ListText & Readonly<{ checkedIn: string; problem: string }>> = {
  en: {
    ...shared.en,
    loading: "Loading attendance…",
    signInTitle: "Please sign in",
    signInBody: "Sign in to see who arrived for your shifts.",
    chooseCompanyBody: "Pick your company on the request calendar, then come back here.",
    emptyTitle: "No attendance yet",
    emptyBody: "Arrival and departure times show here once a worker starts a shift.",
    emptyAction: "See assigned workers",
    unavailableTitle: "We can't reach attendance right now",
    changedTitle: "Attendance was just updated",
    errorTitle: "Attendance could not be loaded",
    backAction: "Back to assigned workers",
    pageEyebrow: "Attendance",
    pageTitle: "Who arrived for your shifts",
    pageLede: "Arrival and departure times for each confirmed shift.",
    sectionEyebrow: "Attendance",
    sectionTitle: "Arrivals and departures",
    checkedIn: "Arrived {in} · left {out}",
    problem: "Problem reported: {issue}"
  },
  fr: {
    ...shared.fr,
    loading: "Chargement des présences…",
    signInTitle: "Veuillez vous connecter",
    signInBody: "Connectez-vous pour voir qui est arrivé à vos quarts.",
    chooseCompanyBody: "Choisissez votre entreprise dans le calendrier des demandes, puis revenez ici.",
    emptyTitle: "Aucune présence pour l'instant",
    emptyBody: "Les heures d'arrivée et de départ s'affichent ici dès qu'un travailleur commence un quart.",
    emptyAction: "Voir les travailleurs assignés",
    unavailableTitle: "Nous ne pouvons pas joindre les présences pour le moment",
    changedTitle: "Les présences viennent d'être mises à jour",
    errorTitle: "Les présences n'ont pas pu être chargées",
    backAction: "Retour aux travailleurs assignés",
    pageEyebrow: "Présences",
    pageTitle: "Qui est arrivé à vos quarts",
    pageLede: "Les heures d'arrivée et de départ pour chaque quart confirmé.",
    sectionEyebrow: "Présences",
    sectionTitle: "Arrivées et départs",
    checkedIn: "Arrivé à {in} · parti à {out}",
    problem: "Problème signalé : {issue}"
  },
  ar: {
    ...shared.ar,
    loading: "جارٍ تحميل الحضور…",
    signInTitle: "يرجى تسجيل الدخول",
    signInBody: "سجّل الدخول لرؤية من حضر إلى مناوباتك.",
    chooseCompanyBody: "اختر شركتك من تقويم الطلبات، ثم عد إلى هنا.",
    emptyTitle: "لا يوجد حضور بعد",
    emptyBody: "تظهر أوقات الوصول والمغادرة هنا عندما يبدأ العامل مناوبته.",
    emptyAction: "عرض العمال المعيّنين",
    unavailableTitle: "لا يمكننا الوصول إلى سجل الحضور الآن",
    changedTitle: "تم تحديث الحضور للتو",
    errorTitle: "تعذّر تحميل الحضور",
    backAction: "العودة إلى العمال المعيّنين",
    pageEyebrow: "الحضور",
    pageTitle: "من حضر إلى مناوباتك",
    pageLede: "أوقات الوصول والمغادرة لكل مناوبة مؤكَّدة.",
    sectionEyebrow: "الحضور",
    sectionTitle: "الوصول والمغادرة",
    checkedIn: "وصل {in} · غادر {out}",
    problem: "مشكلة مُبلَّغ عنها: {issue}"
  }
};

type TimesheetExtra = Readonly<{
  totals: string;
  reviews: string;
  problem: string;
  changed: string;
  actionFailed: string;
  disputeReason: string;
  submitting: string;
  submitDispute: string;
  cancel: string;
  confirming: string;
  confirm: string;
  dispute: string;
}>;

export const timesheetsText: Trilingual<ListText & TimesheetExtra> = {
  en: {
    ...shared.en,
    loading: "Loading timesheets…",
    signInTitle: "Please sign in",
    signInBody: "Sign in to see the hours for your shifts.",
    chooseCompanyBody: "Pick your company on the request calendar, then come back here.",
    emptyTitle: "No timesheets yet",
    emptyBody: "After a shift ends, its hours show here for you to confirm.",
    emptyAction: "See attendance",
    unavailableTitle: "We can't reach your timesheets right now",
    changedTitle: "Your timesheets were just updated",
    errorTitle: "Your timesheets could not be loaded",
    backAction: "Back to attendance",
    pageEyebrow: "Timesheets",
    pageTitle: "Confirm the hours for your finished shifts",
    pageLede: "Check each shift's hours. Confirm them, or tell us what is wrong.",
    sectionEyebrow: "Timesheets",
    sectionTitle: "Hours to check",
    totals: "Hours worked {worked} · hours billed {billed} · break {break}",
    reviews: "Worker: {worker} · you: {employer} · Joblop: {platform}",
    problem: "Problem: {issue}",
    changed: "This timesheet changed. Loading the latest version.",
    actionFailed: "That did not work. Please try again.",
    disputeReason: "What is wrong with these hours?",
    submitting: "Sending…",
    submitDispute: "Send to Joblop",
    cancel: "Cancel",
    confirming: "Confirming…",
    confirm: "Confirm these hours",
    dispute: "Something is wrong"
  },
  fr: {
    ...shared.fr,
    loading: "Chargement des feuilles de temps…",
    signInTitle: "Veuillez vous connecter",
    signInBody: "Connectez-vous pour voir les heures de vos quarts.",
    chooseCompanyBody: "Choisissez votre entreprise dans le calendrier des demandes, puis revenez ici.",
    emptyTitle: "Aucune feuille de temps pour l'instant",
    emptyBody: "Après la fin d'un quart, ses heures s'affichent ici pour que vous les confirmiez.",
    emptyAction: "Voir les présences",
    unavailableTitle: "Nous ne pouvons pas joindre vos feuilles de temps pour le moment",
    changedTitle: "Vos feuilles de temps viennent d'être mises à jour",
    errorTitle: "Vos feuilles de temps n'ont pas pu être chargées",
    backAction: "Retour aux présences",
    pageEyebrow: "Feuilles de temps",
    pageTitle: "Confirmez les heures de vos quarts terminés",
    pageLede: "Vérifiez les heures de chaque quart. Confirmez-les, ou dites-nous ce qui ne va pas.",
    sectionEyebrow: "Feuilles de temps",
    sectionTitle: "Heures à vérifier",
    totals: "Heures travaillées {worked} · heures facturées {billed} · pause {break}",
    reviews: "Travailleur : {worker} · vous : {employer} · Joblop : {platform}",
    problem: "Problème : {issue}",
    changed: "Cette feuille de temps a changé. Chargement de la dernière version.",
    actionFailed: "Cela n'a pas fonctionné. Veuillez réessayer.",
    disputeReason: "Qu'est-ce qui ne va pas avec ces heures?",
    submitting: "Envoi…",
    submitDispute: "Envoyer à Joblop",
    cancel: "Annuler",
    confirming: "Confirmation…",
    confirm: "Confirmer ces heures",
    dispute: "Quelque chose ne va pas"
  },
  ar: {
    ...shared.ar,
    loading: "جارٍ تحميل سجلات الدوام…",
    signInTitle: "يرجى تسجيل الدخول",
    signInBody: "سجّل الدخول لرؤية ساعات مناوباتك.",
    chooseCompanyBody: "اختر شركتك من تقويم الطلبات، ثم عد إلى هنا.",
    emptyTitle: "لا توجد سجلات دوام بعد",
    emptyBody: "بعد انتهاء المناوبة، تظهر ساعاتها هنا لتؤكّدها.",
    emptyAction: "عرض الحضور",
    unavailableTitle: "لا يمكننا الوصول إلى سجلات الدوام الآن",
    changedTitle: "تم تحديث سجلات الدوام للتو",
    errorTitle: "تعذّر تحميل سجلات الدوام",
    backAction: "العودة إلى الحضور",
    pageEyebrow: "سجلات الدوام",
    pageTitle: "أكّد ساعات مناوباتك المنتهية",
    pageLede: "راجع ساعات كل مناوبة. أكّدها، أو أخبرنا بما هو خطأ.",
    sectionEyebrow: "سجلات الدوام",
    sectionTitle: "ساعات للمراجعة",
    totals: "ساعات العمل {worked} · الساعات المفوترة {billed} · الاستراحة {break}",
    reviews: "العامل: {worker} · أنت: {employer} · Joblop: {platform}",
    problem: "مشكلة: {issue}",
    changed: "تغيّر سجل الدوام هذا. جارٍ تحميل أحدث نسخة.",
    actionFailed: "لم ينجح ذلك. يرجى المحاولة مرة أخرى.",
    disputeReason: "ما الخطأ في هذه الساعات؟",
    submitting: "جارٍ الإرسال…",
    submitDispute: "إرسال إلى Joblop",
    cancel: "إلغاء",
    confirming: "جارٍ التأكيد…",
    confirm: "تأكيد هذه الساعات",
    dispute: "هناك خطأ"
  }
};

/** Request calendar words that are not in the shared dictionary yet. */
export const calendarStateText = {
  en: {
    loading: "Loading your request calendar…",
    loadingBody: "This takes a moment.",
    emptyTitle: "No requests yet",
    emptyBody: "Create your first request and Joblop will start finding workers.",
    create: "Request workers",
    unavailableTitle: "We can't reach your calendar right now",
    changedTitle: "Your calendar was just updated",
    errorTitle: "Your calendar could not be loaded",
    errorBody: "Please try again in a moment.",
    partialTitle: "Some requests could not be shown",
    partialBody: "Try again to load the rest.",
    retry: "Try again",
    viewCalendar: "Calendar",
    viewList: "List",
    signInTitle: "Please sign in",
    signInBody: "Sign in to see your request calendar.",
    signIn: "Sign in",
    chooseTitle: "Choose your company",
    chooseBody: "Your account is linked to more than one company. Pick the one you want to work with.",
    chooseFailed: "That company could not be opened. Please try again.",
    chooseUnavailable: "We can't open your company right now. Please try again.",
    setupTitle: "Set up your company",
    setupBody: "You are signed in. Add your company details to start requesting workers.",
    setupAction: "Set up my company",
    unavailable: "Not available"
  },
  fr: {
    loading: "Chargement de votre calendrier des demandes…",
    loadingBody: "Un instant.",
    emptyTitle: "Aucune demande pour l'instant",
    emptyBody: "Créez votre première demande et Joblop commencera à trouver des travailleurs.",
    create: "Demander des travailleurs",
    unavailableTitle: "Nous ne pouvons pas joindre votre calendrier pour le moment",
    changedTitle: "Votre calendrier vient d'être mis à jour",
    errorTitle: "Votre calendrier n'a pas pu être chargé",
    errorBody: "Veuillez réessayer dans un moment.",
    partialTitle: "Certaines demandes n'ont pas pu être affichées",
    partialBody: "Réessayez pour charger le reste.",
    retry: "Réessayer",
    viewCalendar: "Calendrier",
    viewList: "Liste",
    signInTitle: "Veuillez vous connecter",
    signInBody: "Connectez-vous pour voir votre calendrier des demandes.",
    signIn: "Se connecter",
    chooseTitle: "Choisissez votre entreprise",
    chooseBody: "Votre compte est lié à plus d'une entreprise. Choisissez celle avec laquelle vous voulez travailler.",
    chooseFailed: "Cette entreprise n'a pas pu être ouverte. Veuillez réessayer.",
    chooseUnavailable: "Nous ne pouvons pas ouvrir votre entreprise pour le moment. Veuillez réessayer.",
    setupTitle: "Configurez votre entreprise",
    setupBody: "Vous êtes connecté. Ajoutez les renseignements de votre entreprise pour commencer à demander des travailleurs.",
    setupAction: "Configurer mon entreprise",
    unavailable: "Non disponible"
  },
  ar: {
    loading: "جارٍ تحميل تقويم طلباتك…",
    loadingBody: "لحظة من فضلك.",
    emptyTitle: "لا توجد طلبات بعد",
    emptyBody: "أنشئ طلبك الأول وستبدأ Joblop في إيجاد العمال.",
    create: "اطلب عمالًا",
    unavailableTitle: "لا يمكننا الوصول إلى تقويمك الآن",
    changedTitle: "تم تحديث تقويمك للتو",
    errorTitle: "تعذّر تحميل تقويمك",
    errorBody: "يرجى المحاولة مرة أخرى بعد قليل.",
    partialTitle: "تعذّر عرض بعض الطلبات",
    partialBody: "حاول مرة أخرى لتحميل الباقي.",
    retry: "حاول مرة أخرى",
    viewCalendar: "التقويم",
    viewList: "القائمة",
    signInTitle: "يرجى تسجيل الدخول",
    signInBody: "سجّل الدخول لرؤية تقويم طلباتك.",
    signIn: "تسجيل الدخول",
    chooseTitle: "اختر شركتك",
    chooseBody: "حسابك مرتبط بأكثر من شركة. اختر الشركة التي تريد العمل بها.",
    chooseFailed: "تعذّر فتح هذه الشركة. يرجى المحاولة مرة أخرى.",
    chooseUnavailable: "لا يمكننا فتح شركتك الآن. يرجى المحاولة مرة أخرى.",
    setupTitle: "أعدّ شركتك",
    setupBody: "أنت مسجّل الدخول. أضف بيانات شركتك لتبدأ بطلب العمال.",
    setupAction: "إعداد شركتي",
    unavailable: "غير متاح"
  }
} as const satisfies Trilingual<Readonly<Record<string, string>>>;

export const assignmentStatusLabels: Trilingual<Readonly<Record<string, string>>> = {
  en: {
    pending_validation: "Being checked",
    confirmed: "Confirmed",
    worker_acknowledged: "Worker confirmed",
    ready_for_attendance: "Ready to start",
    in_attendance_window: "Shift in progress",
    attendance_handoff: "Shift finished",
    worker_withdrawn: "Worker cancelled",
    employer_cancelled: "You cancelled",
    platform_cancelled: "Cancelled by Joblop",
    replacement_required: "Finding a replacement",
    expired_before_start: "Not filled in time",
    closed: "Closed"
  },
  fr: {
    pending_validation: "En vérification",
    confirmed: "Confirmé",
    worker_acknowledged: "Confirmé par le travailleur",
    ready_for_attendance: "Prêt à commencer",
    in_attendance_window: "Quart en cours",
    attendance_handoff: "Quart terminé",
    worker_withdrawn: "Annulé par le travailleur",
    employer_cancelled: "Annulé par vous",
    platform_cancelled: "Annulé par Joblop",
    replacement_required: "Remplaçant recherché",
    expired_before_start: "Non comblé à temps",
    closed: "Fermé"
  },
  ar: {
    pending_validation: "قيد التحقق",
    confirmed: "مؤكَّد",
    worker_acknowledged: "أكّده العامل",
    ready_for_attendance: "جاهز للبدء",
    in_attendance_window: "المناوبة جارية",
    attendance_handoff: "انتهت المناوبة",
    worker_withdrawn: "ألغاه العامل",
    employer_cancelled: "ألغيته أنت",
    platform_cancelled: "ألغته Joblop",
    replacement_required: "نبحث عن بديل",
    expired_before_start: "لم يُشغَل في الوقت",
    closed: "مغلق"
  }
};

export const attendanceStatusLabels: Trilingual<Readonly<Record<string, string>>> = {
  en: { pending_start: "Not started", checked_in: "Arrived", checked_out: "Left", completed: "Completed", missed: "Did not come", cancelled: "Cancelled", exception: "Problem reported" },
  fr: { pending_start: "Pas commencé", checked_in: "Arrivé", checked_out: "Parti", completed: "Terminé", missed: "Absent", cancelled: "Annulé", exception: "Problème signalé" },
  ar: { pending_start: "لم يبدأ", checked_in: "وصل", checked_out: "غادر", completed: "مكتمل", missed: "لم يحضر", cancelled: "ملغى", exception: "مشكلة مُبلَّغ عنها" }
};

export const timesheetStatusLabels: Trilingual<Readonly<Record<string, string>>> = {
  en: { draft: "Being prepared", calculation_pending: "Being prepared", review_required: "Being checked", worker_review: "Waiting for the worker", employer_review: "Waiting for you", platform_review: "Being checked by Joblop", approved: "Approved", locked: "Final", rejected: "Rejected", correction_required: "Being corrected", cancelled: "Cancelled" },
  fr: { draft: "En préparation", calculation_pending: "En préparation", review_required: "En vérification", worker_review: "En attente du travailleur", employer_review: "En attente de vous", platform_review: "En vérification par Joblop", approved: "Approuvée", locked: "Finale", rejected: "Refusée", correction_required: "En correction", cancelled: "Annulée" },
  ar: { draft: "قيد الإعداد", calculation_pending: "قيد الإعداد", review_required: "قيد التحقق", worker_review: "بانتظار العامل", employer_review: "بانتظارك", platform_review: "قيد التحقق من Joblop", approved: "معتمد", locked: "نهائي", rejected: "مرفوض", correction_required: "قيد التصحيح", cancelled: "ملغى" }
};

export const reviewStatusLabels: Trilingual<Readonly<Record<string, string>>> = {
  en: { not_started: "not yet", pending: "waiting", in_review: "checking", confirmed: "confirmed", approved: "approved", disputed: "disputed", rejected: "rejected", not_required: "not needed" },
  fr: { not_started: "pas encore", pending: "en attente", in_review: "en vérification", confirmed: "confirmé", approved: "approuvé", disputed: "contesté", rejected: "refusé", not_required: "non requis" },
  ar: { not_started: "ليس بعد", pending: "بالانتظار", in_review: "قيد المراجعة", confirmed: "مؤكَّد", approved: "معتمد", disputed: "معترض عليه", rejected: "مرفوض", not_required: "غير مطلوب" }
};
