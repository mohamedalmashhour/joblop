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
  /** One plain sentence under a switch (when it runs, what it does). Optional per key. */
  switchHelp: Record<string, string>;
  /** One plain sentence under a problem type. Optional per key. */
  ruleHelp: Record<string, string>;
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
  byUser: string;
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
      "assistant": "Assistant in Contact Joblop (master switch)",
      "assistant.worker": "Assistant for workers",
      "assistant.employer": "Assistant for employers",
      "assistant.staff": "Assistant for staff",
      "assistant.worker.claim_job": "Worker: claim an open job (after Confirm)",
      "assistant.worker.cancel_shift": "Worker: cancel their shift (after Confirm)",
      "assistant.worker.confirm_shift": "Worker: confirm their shift (after Confirm)",
      "assistant.employer.create_draft": "Employer: create a draft request (after Confirm)",
      "assistant.employer.submit_draft": "Employer: submit a draft (after Confirm)",
      "assistant.employer.confirm_timesheet": "Employer: confirm hours (after Confirm)",
      "assistant.employer.duplicate_request": "Employer: copy a request (after Confirm)",
      "assistant.staff.brain_do_it": "Staff: run a Brain action (after Confirm)",
      "assistant.staff.approve_request": "Staff: approve a request (after Confirm)",
      "assistant.staff.approve_timesheet": "Staff: approve a timesheet (after Confirm)",

      resend_failed_message: "Re-send a failed email or text",
      remind_worker_check_in: "Text a worker who has not checked in",
      remind_employer_timesheet: "Email an employer to confirm hours",
      offer_employer_bonus: "Offer the employer a bonus for an unfilled job",
      auto_approve_request: "Approve a request that passes every check",
      auto_approve_timesheet: "Approve hours with check-in, check-out and no problems",
      daily_summary_email: "Daily summary email to staff",
      notify_worker_report_hours: "Tell a worker with no check-in to report their hours (12 h)",
      close_unreported_shift: "Close a shift with no hours reported in time (employer told)",
      "remind_worker_timesheet": "Remind a worker to confirm their hours (email, or text without email)",
      "assistant.claim_open_job": "Assistant: a worker claimed a job",
      "assistant.cancel_my_shift": "Assistant: a worker cancelled a shift",
      "assistant.confirm_shift": "Assistant: a worker confirmed a shift",
      "assistant.create_draft_request": "Assistant: an employer created a draft request",
      "assistant.submit_draft": "Assistant: an employer sent a request",
      "assistant.confirm_timesheet": "Assistant: an employer confirmed hours",
      "assistant.duplicate_request": "Assistant: an employer copied a request",
      "assistant.brain_do_it": "Assistant: staff ran a Brain action",
      "assistant.approve_request": "Assistant: staff approved a request",
      "assistant.approve_timesheet": "Assistant: staff approved hours"
    },
    ruleNames: {
      assistant: "Assistant proposal",
      job_unfilled_soon: "Job starting soon with open places",
      worker_not_checked_in: "Worker not checked in",
      delivery_failed: "Email or text failed",
      request_waiting_review: "Request waiting for review",
      timesheet_unconfirmed: "Hours not confirmed (worker or employer)",
      timesheet_ready: "Hours ready to approve",
      invoice_overdue: "Overdue invoice",
      job_missing_info: "Job missing information",
      "hours_not_prepared": "Shift ended, no hours prepared",
      hours_not_reported: "No check-in: worker has 12 h to report hours",
      shift_not_recorded: "Not recorded: no hours reported in time"
    },
    switchHelp: {
      "remind_worker_timesheet": "24 h after the shift, if the worker has not confirmed their hours. The employer is asked only after the worker confirms.",
      "remind_worker_check_in": "10 min after the start. The employer also gets one short email saying the worker has not checked in yet and Joblop is on it.",
      "offer_employer_bonus": "Only for jobs on the job board, and never again after the employer said no.",
      notify_worker_report_hours: "Right after a shift ends with no check-in: one email and text with the deadline (end + 12 h, Eastern time) and a link to the shift. One last reminder 2 h before the deadline. Never twice.",
      close_unreported_shift: "After the 12 h with no report: the shift is marked missed (not recorded, no timesheet, no invoice) and the employer gets one email. Staff can still enter the hours in Timesheets."
    },
    ruleHelp: {
      "job_unfilled_soon": "Raised 24 h before the start. At 4 h the same problem is updated and marked urgent; it is not closed and reopened.",
      "worker_not_checked_in": "Stays open until the worker checks in or staff close it. If the worker could not be texted, it shows as needing a person.",
      "timesheet_unconfirmed": "24 h after the shift: first the worker is reminded, then the employer once the worker has confirmed.",
      "hours_not_prepared": "The shift ended over 2 h ago and no timesheet exists yet. A person must check it.",
      hours_not_reported: "The shift ended with no check-in. The worker can report the hours until 12 h after the end; otherwise it is not recorded.",
      shift_not_recorded: "The 12 h passed with no hours reported: no hours, no pay, no invoice unless staff enter the hours."
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
    byUser: "by the person (Confirm)",
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
      "assistant": "Assistant dans Contacter Joblop (interrupteur principal)",
      "assistant.worker": "Assistant pour les travailleurs",
      "assistant.employer": "Assistant pour les employeurs",
      "assistant.staff": "Assistant pour le personnel",
      "assistant.worker.claim_job": "Travailleur : prendre une mission ouverte (après Confirmer)",
      "assistant.worker.cancel_shift": "Travailleur : annuler son quart (après Confirmer)",
      "assistant.worker.confirm_shift": "Travailleur : confirmer son quart (après Confirmer)",
      "assistant.employer.create_draft": "Employeur : créer un brouillon de demande (après Confirmer)",
      "assistant.employer.submit_draft": "Employeur : soumettre un brouillon (après Confirmer)",
      "assistant.employer.confirm_timesheet": "Employeur : confirmer des heures (après Confirmer)",
      "assistant.employer.duplicate_request": "Employeur : copier une demande (après Confirmer)",
      "assistant.staff.brain_do_it": "Personnel : lancer une action du cerveau (après Confirmer)",
      "assistant.staff.approve_request": "Personnel : approuver une demande (après Confirmer)",
      "assistant.staff.approve_timesheet": "Personnel : approuver une feuille de temps (après Confirmer)",

      resend_failed_message: "Renvoyer un courriel ou texto non envoyé",
      remind_worker_check_in: "Texter un travailleur qui n’a pas fait son arrivée",
      remind_employer_timesheet: "Écrire à un employeur pour confirmer les heures",
      offer_employer_bonus: "Proposer une prime à l’employeur pour une mission non pourvue",
      auto_approve_request: "Approuver une demande qui passe toutes les vérifications",
      auto_approve_timesheet: "Approuver des heures avec arrivée, départ et aucun problème",
      daily_summary_email: "Résumé quotidien par courriel au personnel",
      notify_worker_report_hours: "Aviser un travailleur sans pointage de déclarer ses heures (12 h)",
      close_unreported_shift: "Fermer un quart sans heures déclarées à temps (employeur avisé)",
      "remind_worker_timesheet": "Rappeler à un travailleur de confirmer ses heures (courriel, ou texto sans courriel)",
      "assistant.claim_open_job": "Assistant : un travailleur a pris un emploi",
      "assistant.cancel_my_shift": "Assistant : un travailleur a annulé un quart",
      "assistant.confirm_shift": "Assistant : un travailleur a confirmé un quart",
      "assistant.create_draft_request": "Assistant : un employeur a créé un brouillon de demande",
      "assistant.submit_draft": "Assistant : un employeur a envoyé une demande",
      "assistant.confirm_timesheet": "Assistant : un employeur a confirmé des heures",
      "assistant.duplicate_request": "Assistant : un employeur a copié une demande",
      "assistant.brain_do_it": "Assistant : le personnel a lancé une action du cerveau",
      "assistant.approve_request": "Assistant : le personnel a approuvé une demande",
      "assistant.approve_timesheet": "Assistant : le personnel a approuvé des heures"
    },
    ruleNames: {
      assistant: "Proposition de l'assistant",
      job_unfilled_soon: "Mission bientôt, places libres",
      worker_not_checked_in: "Travailleur sans arrivée",
      delivery_failed: "Courriel ou texto non envoyé",
      request_waiting_review: "Demande en attente de révision",
      timesheet_unconfirmed: "Heures non confirmées (travailleur ou employeur)",
      timesheet_ready: "Heures prêtes à approuver",
      invoice_overdue: "Facture en retard",
      job_missing_info: "Mission avec informations manquantes",
      "hours_not_prepared": "Quart terminé, heures non préparées",
      hours_not_reported: "Sans pointage : le travailleur a 12 h pour déclarer ses heures",
      shift_not_recorded: "Non enregistré : aucune heure déclarée à temps"
    },
    switchHelp: {
      "remind_worker_timesheet": "24 h après le quart, si le travailleur n’a pas confirmé ses heures. L’employeur n’est sollicité qu’après la confirmation du travailleur.",
      "remind_worker_check_in": "10 min après le début. L’employeur reçoit aussi un court courriel : le travailleur n’est pas encore arrivé et Joblop s’en occupe.",
      "offer_employer_bonus": "Seulement pour les emplois sur le babillard, et plus jamais après un refus de l’employeur.",
      notify_worker_report_hours: "Dès la fin d’un quart sans pointage : un courriel et un texto avec la limite (fin + 12 h, heure de l’Est) et un lien vers le quart. Un dernier rappel 2 h avant la limite. Jamais deux fois.",
      close_unreported_shift: "Après les 12 h sans déclaration : le quart est marqué manqué (non enregistré, sans feuille de temps ni facture) et l’employeur reçoit un courriel. Le personnel peut encore saisir les heures dans Feuilles de temps."
    },
    ruleHelp: {
      "job_unfilled_soon": "Signalé 24 h avant le début. À 4 h, le même problème est mis à jour et marqué urgent; il n’est pas fermé puis rouvert.",
      "worker_not_checked_in": "Reste ouvert jusqu’à l’arrivée du travailleur ou sa fermeture par le personnel. Si le texto n’a pas pu partir, il est marqué « une personne doit s’en occuper ».",
      "timesheet_unconfirmed": "24 h après le quart : d’abord un rappel au travailleur, puis à l’employeur une fois que le travailleur a confirmé.",
      "hours_not_prepared": "Le quart est terminé depuis plus de 2 h et aucune feuille de temps n’existe encore. Une personne doit vérifier.",
      hours_not_reported: "Le quart s’est terminé sans pointage. Le travailleur peut déclarer ses heures jusqu’à 12 h après la fin; sinon, il n’est pas enregistré.",
      shift_not_recorded: "Les 12 h sont passées sans déclaration : aucune heure, aucune paie, aucune facture, sauf si le personnel saisit les heures."
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
    byUser: "par la personne (Confirmer)",
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
      "assistant": "المساعد في تواصل مع Joblop (المفتاح الرئيسي)",
      "assistant.worker": "المساعد للعمال",
      "assistant.employer": "المساعد لأصحاب العمل",
      "assistant.staff": "المساعد للموظفين",
      "assistant.worker.claim_job": "العامل: أخذ وظيفة مفتوحة (بعد التأكيد)",
      "assistant.worker.cancel_shift": "العامل: إلغاء مناوبته (بعد التأكيد)",
      "assistant.worker.confirm_shift": "العامل: تأكيد مناوبته (بعد التأكيد)",
      "assistant.employer.create_draft": "صاحب العمل: إنشاء مسودة طلب (بعد التأكيد)",
      "assistant.employer.submit_draft": "صاحب العمل: إرسال مسودة (بعد التأكيد)",
      "assistant.employer.confirm_timesheet": "صاحب العمل: تأكيد الساعات (بعد التأكيد)",
      "assistant.employer.duplicate_request": "صاحب العمل: نسخ طلب (بعد التأكيد)",
      "assistant.staff.brain_do_it": "الموظفون: تنفيذ إجراء العقل (بعد التأكيد)",
      "assistant.staff.approve_request": "الموظفون: اعتماد طلب (بعد التأكيد)",
      "assistant.staff.approve_timesheet": "الموظفون: اعتماد ورقة وقت (بعد التأكيد)",

      resend_failed_message: "إعادة إرسال بريد أو رسالة نصية فشلت",
      remind_worker_check_in: "مراسلة عامل لم يسجّل وصوله",
      remind_employer_timesheet: "مراسلة صاحب عمل لتأكيد الساعات",
      offer_employer_bonus: "عرض مكافأة على صاحب العمل لوظيفة غير مشغولة",
      auto_approve_request: "الموافقة على طلب يجتاز كل الفحوص",
      auto_approve_timesheet: "الموافقة على ساعات فيها وصول ومغادرة وبلا مشكلات",
      daily_summary_email: "ملخص يومي بالبريد للموظفين",
      notify_worker_report_hours: "إبلاغ عامل دون تسجيل وصول بالإبلاغ عن ساعاته (12 ساعة)",
      close_unreported_shift: "إغلاق مناوبة لم يُبلَغ عن ساعاتها في الوقت المحدد (يُبلَّغ صاحب العمل)",
      "remind_worker_timesheet": "تذكير العامل بتأكيد ساعاته (بريد، أو رسالة نصية إن لم يكن لديه بريد)",
      "assistant.claim_open_job": "المساعد: عامل أخذ وظيفة",
      "assistant.cancel_my_shift": "المساعد: عامل ألغى مناوبة",
      "assistant.confirm_shift": "المساعد: عامل أكّد مناوبة",
      "assistant.create_draft_request": "المساعد: صاحب عمل أنشأ مسودة طلب",
      "assistant.submit_draft": "المساعد: صاحب عمل أرسل طلبًا",
      "assistant.confirm_timesheet": "المساعد: صاحب عمل أكّد ساعات",
      "assistant.duplicate_request": "المساعد: صاحب عمل نسخ طلبًا",
      "assistant.brain_do_it": "المساعد: الموظفون شغّلوا إجراءً من العقل",
      "assistant.approve_request": "المساعد: الموظفون وافقوا على طلب",
      "assistant.approve_timesheet": "المساعد: الموظفون وافقوا على ساعات"
    },
    ruleNames: {
      assistant: "اقتراح المساعد",
      job_unfilled_soon: "وظيفة تبدأ قريبًا وفيها أماكن شاغرة",
      worker_not_checked_in: "عامل لم يسجّل وصوله",
      delivery_failed: "بريد أو رسالة نصية فشلت",
      request_waiting_review: "طلب ينتظر المراجعة",
      timesheet_unconfirmed: "ساعات غير مؤكدة (العامل أو صاحب العمل)",
      timesheet_ready: "ساعات جاهزة للموافقة",
      invoice_overdue: "فاتورة متأخرة",
      job_missing_info: "وظيفة تنقصها معلومات",
      "hours_not_prepared": "انتهت المناوبة دون تحضير الساعات",
      hours_not_reported: "دون تسجيل وصول: أمام العامل 12 ساعة للإبلاغ عن ساعاته",
      shift_not_recorded: "غير مسجّلة: لم يُبلَغ عن أي ساعات في الوقت المحدد"
    },
    switchHelp: {
      "remind_worker_timesheet": "بعد 24 ساعة من المناوبة إذا لم يؤكد العامل ساعاته. لا يُطلب من صاحب العمل التأكيد إلا بعد تأكيد العامل.",
      "remind_worker_check_in": "بعد 10 دقائق من البدء. ويتلقى صاحب العمل أيضًا بريدًا قصيرًا يفيد بأن العامل لم يسجّل وصوله بعد وأن Joblop تتابع الأمر.",
      "offer_employer_bonus": "فقط للوظائف المنشورة على لوحة الوظائف، ولا يُعاد العرض بعد رفض صاحب العمل.",
      notify_worker_report_hours: "فور انتهاء مناوبة دون تسجيل وصول: بريد ورسالة نصية بالمهلة (النهاية + 12 ساعة، توقيت الشرق) ورابط إلى المناوبة. تذكير أخير قبل المهلة بساعتين. لا يُرسل مرتين.",
      close_unreported_shift: "بعد مرور 12 ساعة دون بلاغ: تُعلَّم المناوبة كغائبة (غير مسجّلة، دون سجل دوام أو فاتورة) ويتلقى صاحب العمل بريدًا واحدًا. يمكن للفريق إدخال الساعات في كشوف الساعات."
    },
    ruleHelp: {
      "job_unfilled_soon": "يُرفع قبل 24 ساعة من البدء. عند 4 ساعات تُحدَّث المشكلة نفسها وتُعلَّم عاجلة، ولا تُغلق ثم تُفتح من جديد.",
      "worker_not_checked_in": "تبقى مفتوحة حتى يسجّل العامل وصوله أو يغلقها الموظفون. إذا تعذّر إرسال رسالة للعامل، تظهر على أنها تحتاج إلى شخص.",
      "timesheet_unconfirmed": "بعد 24 ساعة من المناوبة: يُذكَّر العامل أولًا، ثم صاحب العمل بعد أن يؤكد العامل.",
      "hours_not_prepared": "انتهت المناوبة منذ أكثر من ساعتين ولا يوجد سجل دوام بعد. يجب أن يتحقق شخص من ذلك.",
      hours_not_reported: "انتهت المناوبة دون تسجيل وصول. يمكن للعامل الإبلاغ عن ساعاته حتى 12 ساعة بعد النهاية؛ وإلا فلن تُسجَّل.",
      shift_not_recorded: "مرّت 12 ساعة دون الإبلاغ عن ساعات: لا ساعات ولا أجر ولا فاتورة، إلا إذا أدخل الفريق الساعات."
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
    byUser: "من الشخص (تأكيد)",
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
