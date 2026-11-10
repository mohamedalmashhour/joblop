import type { PageText } from "../i18n/pageTextCore";

// Staff calendar copy (English, Québec French, Arabic). The persisted review panel, the
// request page and the assignment page keep their copy beside the component (see those files).

const en = {
  page: {
    eyebrow: "Joblop / Administration",
    title: "Review calendar",
    lede: "All employer requests waiting for review. Opening a request changes nothing.",
    persistedBoundary:
      "Approving or rejecting a request always asks you to confirm first."
  },
  // Same order as adminCalendarBoundaries in adminCalendarContent.ts.
  boundaries: [
    "Client economics and worker-offer economics remain separate.",
    "Payment readiness never includes raw card, account, token, or provider secrets.",
    "Review controls update local fixture state only.",
    "AI cannot approve, publish, assign, reprice, or notify.",
    "The calendar cannot execute payroll or payment."
  ],
  panel: {
    loadingTitle: "Loading requests",
    loadingMessage: "One moment…",
    emptyTitle: "No requests waiting",
    emptyMessage: "There are no employer requests to review right now.",
    unavailableTitle: "Requests can't be shown right now",
    errorTitle: "Requests could not be loaded",
    noFixtureMessage: "Reload the page or press Retry.",
    partialTitle: "Some requests could not be shown",
    partialMessage: "The requests below loaded. Press Retry to try the others again.",
    companyUnknown: "Company not shown",
    workersAndHours: (workers: number, hours: string) =>
      `${workers} worker${workers === 1 ? "" : "s"} × ${hours} h`,
    openDetail: "Open request",
    sessionMessage: "You're signed in.",
    signedInAs: (name: string) => `Signed in as ${name}`,
    sessionClearFailed: "Could not sign out. Try again.",
    signingOut: "Signing out…",
    switchAccount: "Sign out",
    retry: "Retry"
  },
  month: {
    weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    // Intl locale used for the month title.
    dateLocale: "en-CA",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    more: (n: number) => `+${n} more`,
    showLess: "Show less"
  },
  lifecyclePage: {
    eyebrow: "Joblop / Administration",
    title: "Lifecycle calendar",
    lede: "A month view of every non-draft request across organizations, placed on its shift date and coloured by status — from submission through to closure. Unlike the review calendar, which shows only the intake queue, this spans the whole lifecycle. Read only: opening a request does not approve, publish, assign, notify, or execute payment."
  },
  lifecycle: {
    title: "Lifecycle calendar",
    help: "Every non-draft request across organizations, placed on its shift date and coloured by status — from submission through to closure. Read only.",
    readOnly: "Read only",
    loading: "Loading lifecycle calendar…",
    denied: "An authenticated administrator session is required.",
    error: "The lifecycle calendar could not be loaded.",
    legend: {
      submitted: "Submitted",
      underReview: "Under review",
      published: "Published",
      assigned: "Assigned / in progress",
      completed: "Completed",
      cancelled: "Cancelled"
    }
  },
  dispatch: {
    creatingMessage: "Creating the worker list…",
    authRequired: "Please sign in again.",
    conflict: "Something changed. Checking the latest version.",
    notConfirmed: "We couldn't confirm it was created. Checking again.",
    created: "Worker list created. No worker has been contacted yet.",
    unknown: "We don't know if it was created. Checking before you try again.",
    checking: "Checking the worker list…",
    deniedAccess: "Please sign in again.",
    unavailable: "The worker list can't be shown right now.",
    retry: "Retry",
    exists: "The worker list for this job is ready.",
    open: "Open the worker list",
    none: "No worker list yet. Create one to pick workers yourself. Nobody is contacted until you send an offer.",
    priorityLabel: "Priority",
    priorities: { normal: "Normal", urgent: "Urgent", emergency: "Emergency" },
    // Inline priority words (English shows the code as-is).
    priorityNames: { normal: "normal", urgent: "urgent", emergency: "emergency" } as Record<string, string>,
    create: "Create worker list",
    confirmTitle: "Create the worker list?",
    confirmCopy: (priority: string) =>
      `Create a worker list (${priority} priority) for this approved job. Nobody is contacted until you send an offer.`,
    cancel: "Cancel",
    creating: "Creating…",
    confirm: "Create"
  },
  fixtureReview: {
    noAction: "No fixture action selected",
    eyebrow: "Joblop / Connected calendar",
    title: "Review staffing request",
    lede: "Review readiness and separated economics before choosing a non-persistent fixture action.",
    back: "Back to admin calendar",
    requiredReview: "Required review",
    mapPlaceholder: "Map placeholder · no map provider connected",
    economicsSeparation: "Economics separation",
    clientEconomics: "Client economics",
    billRate: "Bill rate: $45.00 CAD / hour",
    terms: (version: string) => `Terms: ${version}`,
    workerEconomics: "Worker-offer economics",
    workerWage: "Worker wage: $30.00 CAD / hour",
    transportation: "Transportation compensation: $5.00 CAD",
    localControls: "Local review controls",
    decisionPreview: "Decision preview",
    selectedLocally: (action: string) => `${action} selected locally — not saved, published, or executed`,
    actions: {
      approve: "approve",
      reject: "reject",
      return: "return",
      publish: "publish",
      pause: "pause",
      cancel: "cancel",
      reprice: "reprice"
    },
    openAssignment: "Open operational assignment visibility",
    aiFixture: "AI advisory fixture",
    evidence: "Evidence:",
    uncertainty: "Uncertainty:",
    requiredDecision: "Required decision:"
  }
};

const fr: typeof en = {
  page: {
    eyebrow: "Joblop / Administration",
    title: "Calendrier de révision",
    lede: "Toutes les demandes des employeurs en attente de révision. Ouvrir une demande ne change rien.",
    persistedBoundary:
      "Approuver ou refuser une demande vous demande toujours de confirmer d’abord."
  },
  boundaries: [
    "Les conditions financières du client et celles de l’offre au travailleur restent séparées.",
    "L’état du mode de paiement n’inclut jamais de numéro de carte, de compte, de jeton ou de secret du fournisseur.",
    "Les contrôles de révision ne modifient que l’état fictif local.",
    "L’IA ne peut pas approuver, publier, attribuer, modifier un tarif ni envoyer d’avis.",
    "Le calendrier ne peut pas effectuer la paie ni de paiement."
  ],
  panel: {
    loadingTitle: "Chargement des demandes",
    loadingMessage: "Un instant…",
    emptyTitle: "Aucune demande en attente",
    emptyMessage: "Aucune demande d’employeur à réviser pour le moment.",
    unavailableTitle: "Les demandes ne peuvent pas être affichées pour le moment",
    errorTitle: "Impossible de charger les demandes",
    noFixtureMessage: "Rechargez la page ou appuyez sur Réessayer.",
    partialTitle: "Certaines demandes n’ont pas pu être affichées",
    partialMessage: "Les demandes ci-dessous sont chargées. Appuyez sur Réessayer pour charger les autres.",
    companyUnknown: "Entreprise non affichée",
    workersAndHours: (workers: number, hours: string) =>
      `${workers} travailleur${workers > 1 ? "s" : ""} × ${hours} h`,
    openDetail: "Ouvrir la demande",
    sessionMessage: "Vous êtes connecté.",
    signedInAs: (name: string) => `Connecté en tant que ${name}`,
    sessionClearFailed: "Impossible de vous déconnecter. Réessayez.",
    signingOut: "Déconnexion…",
    switchAccount: "Se déconnecter",
    retry: "Réessayer"
  },
  month: {
    weekdays: ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."],
    dateLocale: "fr-CA",
    previousMonth: "Mois précédent",
    nextMonth: "Mois suivant",
    more: (n: number) => `+${n} de plus`,
    showLess: "Afficher moins"
  },
  lifecyclePage: {
    eyebrow: "Joblop / Administration",
    title: "Calendrier du cycle de vie",
    lede: "Une vue mensuelle de toutes les demandes (sauf les brouillons) de toutes les organisations, placées à la date du quart de travail et colorées selon leur statut, de la soumission jusqu’à la fermeture. Contrairement au calendrier de révision, qui ne montre que la file d’accueil, celui-ci couvre tout le cycle de vie. Lecture seule : ouvrir une demande ne l’approuve pas, ne la publie pas, ne l’attribue pas, n’envoie aucun avis et n’effectue aucun paiement."
  },
  lifecycle: {
    title: "Calendrier du cycle de vie",
    help: "Toutes les demandes (sauf les brouillons) de toutes les organisations, placées à la date du quart de travail et colorées selon leur statut, de la soumission jusqu’à la fermeture. Lecture seule.",
    readOnly: "Lecture seule",
    loading: "Chargement du calendrier du cycle de vie…",
    denied: "Une session administrateur authentifiée est requise.",
    error: "Impossible de charger le calendrier du cycle de vie.",
    legend: {
      submitted: "Soumise",
      underReview: "En révision",
      published: "Publiée",
      assigned: "Attribuée / en cours",
      completed: "Terminée",
      cancelled: "Annulée"
    }
  },
  dispatch: {
    creatingMessage: "Création de la liste de travailleurs…",
    authRequired: "Veuillez vous reconnecter.",
    conflict: "Quelque chose a changé. Vérification de la dernière version.",
    notConfirmed: "Impossible de confirmer la création. Nouvelle vérification.",
    created: "Liste de travailleurs créée. Aucun travailleur n’a encore été contacté.",
    unknown: "Nous ne savons pas si la liste a été créée. Vérification avant de réessayer.",
    checking: "Vérification de la liste de travailleurs…",
    deniedAccess: "Veuillez vous reconnecter.",
    unavailable: "La liste de travailleurs ne peut pas être affichée pour le moment.",
    retry: "Réessayer",
    exists: "La liste de travailleurs pour cet emploi est prête.",
    open: "Ouvrir la liste de travailleurs",
    none: "Pas encore de liste de travailleurs. Créez-en une pour choisir vous-même. Personne n’est contacté avant que vous envoyiez une offre.",
    priorityLabel: "Priorité",
    priorities: { normal: "Normale", urgent: "Urgente", emergency: "Urgence" },
    priorityNames: { normal: "normale", urgent: "urgente", emergency: "urgence" },
    create: "Créer la liste de travailleurs",
    confirmTitle: "Créer la liste de travailleurs?",
    confirmCopy: (priority: string) =>
      `Créer une liste de travailleurs (priorité ${priority}) pour cet emploi approuvé. Personne n’est contacté avant que vous envoyiez une offre.`,
    cancel: "Annuler",
    creating: "Création…",
    confirm: "Créer"
  },
  fixtureReview: {
    noAction: "Aucune action fictive choisie",
    eyebrow: "Joblop / Calendrier connecté",
    title: "Réviser la demande de personnel",
    lede: "Vérifiez l’état de préparation et les conditions financières séparées avant de choisir une action fictive non enregistrée.",
    back: "Retour au calendrier administrateur",
    requiredReview: "Révision requise",
    mapPlaceholder: "Espace réservé à la carte · aucun fournisseur de cartes connecté",
    economicsSeparation: "Séparation des conditions financières",
    clientEconomics: "Conditions financières du client",
    billRate: "Taux facturé : 45,00 $ CA / heure",
    terms: (version: string) => `Conditions : ${version}`,
    workerEconomics: "Conditions de l’offre au travailleur",
    workerWage: "Salaire du travailleur : 30,00 $ CA / heure",
    transportation: "Indemnité de transport : 5,00 $ CA",
    localControls: "Contrôles de révision locaux",
    decisionPreview: "Aperçu de la décision",
    selectedLocally: (action: string) =>
      `${action} choisi localement — non enregistré, publié ni exécuté`,
    actions: {
      approve: "approuver",
      reject: "refuser",
      return: "retourner",
      publish: "publier",
      pause: "suspendre",
      cancel: "annuler",
      reprice: "modifier le tarif"
    },
    openAssignment: "Voir l’état opérationnel de l’attribution",
    aiFixture: "Conseil de l’IA (fictif)",
    evidence: "Éléments :",
    uncertainty: "Incertitude :",
    requiredDecision: "Décision requise :"
  }
};

const ar: typeof en = {
  page: {
    eyebrow: "Joblop / الإدارة",
    title: "تقويم المراجعة",
    lede: "كل طلبات أصحاب العمل التي تنتظر المراجعة. فتح الطلب لا يغيّر شيئًا.",
    persistedBoundary:
      "الموافقة على الطلب أو رفضه تطلب منك التأكيد أولًا دائمًا."
  },
  boundaries: [
    "تبقى الشروط المالية للعميل منفصلة عن الشروط المالية لعرض العامل.",
    "لا تتضمن جاهزية الدفع أبدًا أرقام البطاقات أو الحسابات أو الرموز أو أسرار مزوّد الخدمة.",
    "أدوات المراجعة تحدّث الحالة التجريبية المحلية فقط.",
    "لا يمكن للذكاء الاصطناعي الموافقة أو النشر أو الإسناد أو تعديل السعر أو إرسال الإشعارات.",
    "لا يمكن للتقويم تنفيذ الرواتب أو المدفوعات."
  ],
  panel: {
    loadingTitle: "جارٍ تحميل الطلبات",
    loadingMessage: "لحظة من فضلك…",
    emptyTitle: "لا توجد طلبات بالانتظار",
    emptyMessage: "لا توجد طلبات من أصحاب العمل لمراجعتها الآن.",
    unavailableTitle: "تعذّر عرض الطلبات الآن",
    errorTitle: "تعذّر تحميل الطلبات",
    noFixtureMessage: "أعد تحميل الصفحة أو اضغط «إعادة المحاولة».",
    partialTitle: "تعذّر عرض بعض الطلبات",
    partialMessage: "تم تحميل الطلبات أدناه. اضغط «إعادة المحاولة» لتحميل البقية.",
    companyUnknown: "اسم الشركة غير متاح",
    workersAndHours: (workers: number, hours: string) => `${workers} عامل × ${hours} ساعة`,
    openDetail: "فتح الطلب",
    sessionMessage: "أنت مسجّل الدخول.",
    signedInAs: (name: string) => `مسجّل الدخول باسم ${name}`,
    sessionClearFailed: "تعذّر تسجيل الخروج. حاول مرة أخرى.",
    signingOut: "جارٍ تسجيل الخروج…",
    switchAccount: "تسجيل الخروج",
    retry: "إعادة المحاولة"
  },
  month: {
    weekdays: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
    dateLocale: "ar-u-nu-latn",
    previousMonth: "الشهر السابق",
    nextMonth: "الشهر التالي",
    more: (n: number) => `+${n} أخرى`,
    showLess: "عرض أقل"
  },
  lifecyclePage: {
    eyebrow: "Joblop / الإدارة",
    title: "تقويم دورة الحياة",
    lede: "عرض شهري لكل الطلبات غير المسودّة في جميع المؤسسات، موضوعة في تاريخ المناوبة وملوّنة حسب الحالة، من التقديم حتى الإغلاق. على عكس تقويم المراجعة الذي يعرض قائمة الاستقبال فقط، يغطي هذا التقويم دورة الحياة كاملة. للقراءة فقط: فتح الطلب لا يعني الموافقة عليه أو نشره أو إسناده أو إرسال إشعار أو تنفيذ أي دفعة."
  },
  lifecycle: {
    title: "تقويم دورة الحياة",
    help: "كل الطلبات غير المسودّة في جميع المؤسسات، موضوعة في تاريخ المناوبة وملوّنة حسب الحالة، من التقديم حتى الإغلاق. للقراءة فقط.",
    readOnly: "للقراءة فقط",
    loading: "جارٍ تحميل تقويم دورة الحياة…",
    denied: "تلزم جلسة مسؤول موثّقة.",
    error: "تعذّر تحميل تقويم دورة الحياة.",
    legend: {
      submitted: "مُقدَّم",
      underReview: "قيد المراجعة",
      published: "منشور",
      assigned: "مُسنَد / قيد التنفيذ",
      completed: "مكتمل",
      cancelled: "ملغى"
    }
  },
  dispatch: {
    creatingMessage: "جارٍ إنشاء قائمة العمّال…",
    authRequired: "يُرجى تسجيل الدخول مرة أخرى.",
    conflict: "تغيّر شيء ما. جارٍ التحقق من أحدث نسخة.",
    notConfirmed: "تعذّر تأكيد الإنشاء. جارٍ التحقق مرة أخرى.",
    created: "تم إنشاء قائمة العمّال. لم يتم التواصل مع أي عامل بعد.",
    unknown: "لا نعرف إن تم الإنشاء. جارٍ التحقق قبل إعادة المحاولة.",
    checking: "جارٍ التحقق من قائمة العمّال…",
    deniedAccess: "يُرجى تسجيل الدخول مرة أخرى.",
    unavailable: "تعذّر عرض قائمة العمّال الآن.",
    retry: "إعادة المحاولة",
    exists: "قائمة العمّال لهذه الوظيفة جاهزة.",
    open: "فتح قائمة العمّال",
    none: "لا توجد قائمة عمّال بعد. أنشئ واحدة لتختار العمّال بنفسك. لا يتم التواصل مع أحد قبل أن ترسل عرضًا.",
    priorityLabel: "الأولوية",
    priorities: { normal: "عادية", urgent: "عاجلة", emergency: "طارئة" },
    priorityNames: { normal: "عادية", urgent: "عاجلة", emergency: "طارئة" },
    create: "إنشاء قائمة العمّال",
    confirmTitle: "إنشاء قائمة العمّال؟",
    confirmCopy: (priority: string) =>
      `إنشاء قائمة عمّال (الأولوية: ${priority}) لهذه الوظيفة الموافق عليها. لا يتم التواصل مع أحد قبل أن ترسل عرضًا.`,
    cancel: "إلغاء",
    creating: "جارٍ الإنشاء…",
    confirm: "إنشاء"
  },
  fixtureReview: {
    noAction: "لم يتم اختيار أي إجراء تجريبي",
    eyebrow: "Joblop / التقويم المتصل",
    title: "مراجعة طلب التوظيف",
    lede: "راجع الجاهزية والشروط المالية المنفصلة قبل اختيار إجراء تجريبي غير محفوظ.",
    back: "العودة إلى تقويم الإدارة",
    requiredReview: "المراجعة المطلوبة",
    mapPlaceholder: "مكان مخصص للخريطة · لا يوجد مزوّد خرائط متصل",
    economicsSeparation: "فصل الشروط المالية",
    clientEconomics: "الشروط المالية للعميل",
    billRate: "سعر الفوترة: 45.00 دولار كندي / ساعة",
    terms: (version: string) => `الشروط: ${version}`,
    workerEconomics: "الشروط المالية لعرض العامل",
    workerWage: "أجر العامل: 30.00 دولار كندي / ساعة",
    transportation: "تعويض التنقل: 5.00 دولار كندي",
    localControls: "أدوات المراجعة المحلية",
    decisionPreview: "معاينة القرار",
    selectedLocally: (action: string) => `تم اختيار «${action}» محليًا — لم يُحفظ أو يُنشر أو يُنفَّذ`,
    actions: {
      approve: "موافقة",
      reject: "رفض",
      return: "إعادة",
      publish: "نشر",
      pause: "إيقاف مؤقت",
      cancel: "إلغاء",
      reprice: "تعديل السعر"
    },
    openAssignment: "عرض الحالة التشغيلية للإسناد",
    aiFixture: "استشارة تجريبية من الذكاء الاصطناعي",
    evidence: "الأدلة:",
    uncertainty: "عدم اليقين:",
    requiredDecision: "القرار المطلوب:"
  }
};

export const calendarText = { en, fr, ar } satisfies PageText<typeof en>;
