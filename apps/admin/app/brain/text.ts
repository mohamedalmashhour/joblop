import type { PageText } from "../i18n/pageTextCore";

// Copy for the Joblop Brain page, in English, French (Québec) and Arabic.

export type BrainCopy = {
  eyebrow: string;
  title: string;
  lede: string;
  loading: string;
  error: string;
  actionFailed: string;
  modeHeading: string;
  modeNames: Record<"off" | "watch" | "live", string>;
  modeHelp: Record<"off" | "watch" | "live", string>;
  killSwitch: string;
  current: string;
  actorMissing: string;
  switchesHeading: string;
  switchesHelp: string;
  on: string;
  off: string;
  switchNames: Record<string, string>;
  ruleNames: Record<string, string>;
  issuesHeading: string;
  issuesEmpty: string;
  recommended: string;
  personNeeded: string;
  doIt: string;
  close: string;
  severity: Record<"info" | "warning" | "urgent", string>;
  logHeading: string;
  logEmpty: string;
  colWhen: string;
  colWhat: string;
  colWhy: string;
  colResult: string;
  colUndo: string;
  byBrain: string;
  byStaff: string;
  watchOnly: string;
  undo: string;
  status: Record<"running" | "done" | "skipped" | "failed" | "simulated" | "undone", string>;
  summaryHeading: string;
  found: string;
  done: string;
  simulated: string;
  failed: string;
  openNow: string;
  needsPeople: string;
  nothing: string;
};

export const brainText: PageText<BrainCopy> = {
  en: {
    eyebrow: "Operations",
    title: "Joblop Brain",
    lede: "The brain checks the platform every few minutes, finds problems and, where you allow it, fixes them. It never charges, settles or pays money, and never decides legal entitlements. Everything it does is logged here.",
    loading: "Loading the brain…",
    error: "The brain could not be loaded. Try again.",
    actionFailed: "That did not work. Refresh and try again.",
    modeHeading: "Master switch",
    modeNames: { off: "Off", watch: "Watch only", live: "Live" },
    modeHelp: {
      off: "Kill switch: the brain only lists problems. Nothing is done on its own.",
      watch: "The brain writes down what it would have done, and does nothing. Use it to check it is right.",
      live: "The brain acts on its own, only where the action's switch below is on."
    },
    killSwitch: "Stop everything",
    current: "Now",
    actorMissing: "No brain staff account is set (BRAIN_ACTOR_USER_ID). Approvals and bonus offers will be skipped until it is set.",
    switchesHeading: "What the brain may do on its own",
    switchesHelp: "Each switch starts off. In Live mode, only the actions switched on run on their own, each with a daily limit.",
    on: "On",
    off: "Off",
    switchNames: {
      resend_failed_message: "Re-send a failed email or text",
      remind_worker_check_in: "Text a worker who has not checked in",
      remind_employer_timesheet: "Email an employer to confirm hours",
      offer_employer_bonus: "Offer the employer a bonus for an unfilled job",
      auto_approve_request: "Approve a request that passes every check",
      auto_approve_timesheet: "Approve hours with check-in, check-out and no problems",
      daily_summary_email: "Daily summary email to staff"
    },
    ruleNames: {
      job_unfilled_soon: "Job starting soon with open places",
      worker_not_checked_in: "Worker not checked in",
      delivery_failed: "Email or text failed",
      request_waiting_review: "Request waiting for review",
      timesheet_unconfirmed: "Hours not confirmed by employer",
      timesheet_ready: "Hours ready to approve",
      invoice_overdue: "Overdue invoice",
      job_missing_info: "Job missing information"
    },
    issuesHeading: "Open problems",
    issuesEmpty: "No open problems.",
    recommended: "Suggested",
    personNeeded: "A person must handle this.",
    doIt: "Do it",
    close: "Close",
    severity: { info: "Info", warning: "Warning", urgent: "Urgent" },
    logHeading: "What the brain did",
    logEmpty: "Nothing yet.",
    colWhen: "When",
    colWhat: "What",
    colWhy: "Why",
    colResult: "Result",
    colUndo: "Undo",
    byBrain: "by the brain",
    byStaff: "by staff",
    watchOnly: "watch only",
    undo: "Undo",
    status: { running: "Running", done: "Done", skipped: "Skipped", failed: "Failed", simulated: "Would have done", undone: "Undone" },
    summaryHeading: "Last 24 hours",
    found: "Found",
    done: "Done",
    simulated: "Would have done",
    failed: "Failed",
    openNow: "Open now",
    needsPeople: "Need a person",
    nothing: "Nothing"
  },
  fr: {
    eyebrow: "Opérations",
    title: "Cerveau Joblop",
    lede: "Le cerveau vérifie la plateforme toutes les quelques minutes, trouve les problèmes et, là où vous le permettez, les règle. Il ne facture, ne règle et ne paie jamais d’argent, et ne décide jamais de droits légaux. Tout ce qu’il fait est noté ici.",
    loading: "Chargement du cerveau…",
    error: "Le cerveau n’a pas pu être chargé. Réessayez.",
    actionFailed: "Cela n’a pas fonctionné. Actualisez et réessayez.",
    modeHeading: "Interrupteur principal",
    modeNames: { off: "Arrêté", watch: "Observation seulement", live: "Actif" },
    modeHelp: {
      off: "Arrêt d’urgence : le cerveau ne fait que lister les problèmes. Rien n’est fait seul.",
      watch: "Le cerveau note ce qu’il aurait fait, et ne fait rien. Servez-vous-en pour vérifier qu’il a raison.",
      live: "Le cerveau agit seul, seulement là où l’interrupteur de l’action ci-dessous est allumé."
    },
    killSwitch: "Tout arrêter",
    current: "Maintenant",
    actorMissing: "Aucun compte du personnel n’est défini pour le cerveau (BRAIN_ACTOR_USER_ID). Les approbations et les offres de prime seront ignorées tant qu’il ne l’est pas.",
    switchesHeading: "Ce que le cerveau peut faire seul",
    switchesHelp: "Chaque interrupteur est éteint au départ. En mode Actif, seules les actions allumées s’exécutent seules, chacune avec une limite par jour.",
    on: "Allumé",
    off: "Éteint",
    switchNames: {
      resend_failed_message: "Renvoyer un courriel ou texto non envoyé",
      remind_worker_check_in: "Texter un travailleur qui n’a pas fait son arrivée",
      remind_employer_timesheet: "Écrire à un employeur pour confirmer les heures",
      offer_employer_bonus: "Proposer une prime à l’employeur pour une mission non pourvue",
      auto_approve_request: "Approuver une demande qui passe toutes les vérifications",
      auto_approve_timesheet: "Approuver des heures avec arrivée, départ et aucun problème",
      daily_summary_email: "Résumé quotidien par courriel au personnel"
    },
    ruleNames: {
      job_unfilled_soon: "Mission bientôt, places libres",
      worker_not_checked_in: "Travailleur sans arrivée",
      delivery_failed: "Courriel ou texto non envoyé",
      request_waiting_review: "Demande en attente de révision",
      timesheet_unconfirmed: "Heures non confirmées par l’employeur",
      timesheet_ready: "Heures prêtes à approuver",
      invoice_overdue: "Facture en retard",
      job_missing_info: "Mission avec informations manquantes"
    },
    issuesHeading: "Problèmes ouverts",
    issuesEmpty: "Aucun problème ouvert.",
    recommended: "Suggestion",
    personNeeded: "Une personne doit s’en occuper.",
    doIt: "Le faire",
    close: "Fermer",
    severity: { info: "Info", warning: "Attention", urgent: "Urgent" },
    logHeading: "Ce que le cerveau a fait",
    logEmpty: "Rien pour l’instant.",
    colWhen: "Quand",
    colWhat: "Quoi",
    colWhy: "Pourquoi",
    colResult: "Résultat",
    colUndo: "Annuler",
    byBrain: "par le cerveau",
    byStaff: "par le personnel",
    watchOnly: "observation seulement",
    undo: "Annuler",
    status: { running: "En cours", done: "Fait", skipped: "Ignoré", failed: "Échoué", simulated: "Aurait fait", undone: "Annulé" },
    summaryHeading: "Dernières 24 heures",
    found: "Trouvé",
    done: "Fait",
    simulated: "Aurait fait",
    failed: "Échoué",
    openNow: "Ouverts",
    needsPeople: "Demandent une personne",
    nothing: "Rien"
  },
  ar: {
    eyebrow: "العمليات",
    title: "عقل Joblop",
    lede: "يفحص العقل المنصة كل بضع دقائق، ويجد المشكلات، ويصلحها حيث تسمح له. لا يفرض رسومًا ولا يسوّي ولا يدفع أي مال أبدًا، ولا يقرر الحقوق القانونية. كل ما يفعله مسجّل هنا.",
    loading: "جارٍ تحميل العقل…",
    error: "تعذّر تحميل العقل. حاول مرة أخرى.",
    actionFailed: "لم ينجح ذلك. حدّث الصفحة وحاول مرة أخرى.",
    modeHeading: "المفتاح الرئيسي",
    modeNames: { off: "متوقف", watch: "مراقبة فقط", live: "يعمل" },
    modeHelp: {
      off: "مفتاح الإيقاف: العقل يعرض المشكلات فقط. لا يُنفَّذ شيء تلقائيًا.",
      watch: "يسجّل العقل ما كان سيفعله، ولا يفعل شيئًا. استخدمه للتحقق من دقته.",
      live: "يعمل العقل وحده، فقط حيث يكون مفتاح الإجراء أدناه مفعّلًا."
    },
    killSwitch: "أوقف كل شيء",
    current: "الآن",
    actorMissing: "لم يُحدَّد حساب موظف للعقل (BRAIN_ACTOR_USER_ID). ستُتخطّى الموافقات وعروض المكافآت حتى يُحدَّد.",
    switchesHeading: "ما يمكن للعقل فعله وحده",
    switchesHelp: "كل مفتاح يبدأ متوقفًا. في وضع التشغيل، تعمل الإجراءات المفعّلة فقط وحدها، ولكل منها حد يومي.",
    on: "مفعّل",
    off: "متوقف",
    switchNames: {
      resend_failed_message: "إعادة إرسال بريد أو رسالة نصية فشلت",
      remind_worker_check_in: "مراسلة عامل لم يسجّل وصوله",
      remind_employer_timesheet: "مراسلة صاحب عمل لتأكيد الساعات",
      offer_employer_bonus: "عرض مكافأة على صاحب العمل لوظيفة غير مشغولة",
      auto_approve_request: "الموافقة على طلب يجتاز كل الفحوص",
      auto_approve_timesheet: "الموافقة على ساعات فيها وصول ومغادرة وبلا مشكلات",
      daily_summary_email: "ملخص يومي بالبريد للموظفين"
    },
    ruleNames: {
      job_unfilled_soon: "وظيفة تبدأ قريبًا وفيها أماكن شاغرة",
      worker_not_checked_in: "عامل لم يسجّل وصوله",
      delivery_failed: "بريد أو رسالة نصية فشلت",
      request_waiting_review: "طلب ينتظر المراجعة",
      timesheet_unconfirmed: "ساعات لم يؤكدها صاحب العمل",
      timesheet_ready: "ساعات جاهزة للموافقة",
      invoice_overdue: "فاتورة متأخرة",
      job_missing_info: "وظيفة تنقصها معلومات"
    },
    issuesHeading: "المشكلات المفتوحة",
    issuesEmpty: "لا توجد مشكلات مفتوحة.",
    recommended: "المقترح",
    personNeeded: "يجب أن يتولى شخص هذا الأمر.",
    doIt: "نفّذ",
    close: "أغلق",
    severity: { info: "معلومة", warning: "تنبيه", urgent: "عاجل" },
    logHeading: "ما فعله العقل",
    logEmpty: "لا شيء بعد.",
    colWhen: "متى",
    colWhat: "ماذا",
    colWhy: "لماذا",
    colResult: "النتيجة",
    colUndo: "تراجع",
    byBrain: "بواسطة العقل",
    byStaff: "بواسطة الموظفين",
    watchOnly: "مراقبة فقط",
    undo: "تراجع",
    status: { running: "قيد التنفيذ", done: "تم", skipped: "تُخطّي", failed: "فشل", simulated: "كان سيفعل", undone: "أُلغي" },
    summaryHeading: "آخر 24 ساعة",
    found: "وُجد",
    done: "تم",
    simulated: "كان سيفعل",
    failed: "فشل",
    openNow: "مفتوحة الآن",
    needsPeople: "تحتاج شخصًا",
    nothing: "لا شيء"
  }
};
