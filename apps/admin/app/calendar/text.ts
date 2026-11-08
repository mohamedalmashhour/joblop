import type { PageText } from "../i18n/pageTextCore";

// Staff calendar copy (English, Québec French, Arabic). The persisted review panel, the
// request page and the assignment page keep their copy beside the component (see those files).

const en = {
  page: {
    eyebrow: "Joblop / Administration",
    title: "Review calendar",
    lede: "Authenticated client requests in one governed review queue. Opening a request does not approve, publish, assign, notify, or execute payment.",
    persistedBoundary:
      "Persisted review actions use current version tokens and explicit human confirmation. No fixture review controls are mixed into authoritative records."
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
    loadingTitle: "Loading review calendar",
    loadingMessage: "Checking platform authorization.",
    emptyTitle: "No persisted requests",
    emptyMessage: "The governed review queue is empty.",
    unavailableTitle: "Review calendar unavailable",
    errorTitle: "Review calendar could not be loaded",
    noFixtureMessage: "No fixture requests are substituted for persisted records.",
    partialTitle: "Some reviews could not be shown",
    partialMessage:
      "The records below passed the administrator privacy whitelist. Retry to check for the remaining records.",
    organizationReference: (id: string) => `Organization reference: ${id}`,
    openDetail: "Open review detail",
    sessionMessage: "Authenticated administrator calendar session.",
    sessionClearFailed: "Session could not be cleared. Try again.",
    signingOut: "Signing out…",
    switchAccount: "Switch administrator account",
    signInRequiredTitle: "Administrator sign-in required",
    signInRequiredMessage: "Sign in with your staff mobile number and a texted code.",
    signIn: "Sign in",
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
    creatingMessage: "Creating the persisted dispatch review.",
    authRequired: "Administrator authorization is required.",
    conflict: "A dispatch review changed or may already exist. Checking the current record.",
    notConfirmed: "Creation did not return a confirmed result. Checking for an existing review.",
    created: "Dispatch review created. No worker has been contacted or assigned.",
    unknown: "The create result is unknown. Checking for an existing review before retry.",
    checking: "Checking for an existing persisted dispatch review…",
    deniedAccess: "Administrator authorization is required to access dispatch.",
    unavailable: "Dispatch review is unavailable. No fixture record is substituted.",
    retry: "Retry dispatch check",
    exists: "Dispatch review already exists.",
    state: "State:",
    priority: "Priority:",
    required: "Required:",
    stillRequested: "Still requested:",
    open: "Open dispatch review",
    none: "No dispatch review exists. Creating one opens an operational review only; it does not contact or assign workers.",
    priorityLabel: "Dispatch priority",
    priorities: { normal: "Normal", urgent: "Urgent", emergency: "Emergency" },
    // Inline priority words (English shows the code as-is).
    priorityNames: { normal: "normal", urgent: "urgent", emergency: "emergency" } as Record<string, string>,
    create: "Create dispatch review",
    confirmTitle: "Confirm dispatch handoff",
    confirmCopy: (priority: string) =>
      `Create one ${priority} dispatch review for this approved request. This does not contact, shortlist, offer work to, or assign any worker.`,
    cancel: "Cancel",
    creating: "Creating…",
    confirm: "Confirm creation"
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
    lede: "Les demandes authentifiées des clients, dans une seule file de révision encadrée. Ouvrir une demande ne l’approuve pas, ne la publie pas, ne l’attribue pas, n’envoie aucun avis et n’effectue aucun paiement.",
    persistedBoundary:
      "Les actions de révision enregistrées utilisent le jeton de version actuel et une confirmation humaine explicite. Aucun contrôle de révision fictif n’est mêlé aux dossiers officiels."
  },
  boundaries: [
    "Les conditions financières du client et celles de l’offre au travailleur restent séparées.",
    "L’état du mode de paiement n’inclut jamais de numéro de carte, de compte, de jeton ou de secret du fournisseur.",
    "Les contrôles de révision ne modifient que l’état fictif local.",
    "L’IA ne peut pas approuver, publier, attribuer, modifier un tarif ni envoyer d’avis.",
    "Le calendrier ne peut pas effectuer la paie ni de paiement."
  ],
  panel: {
    loadingTitle: "Chargement du calendrier de révision",
    loadingMessage: "Vérification de l’autorisation sur la plateforme.",
    emptyTitle: "Aucune demande enregistrée",
    emptyMessage: "La file de révision est vide.",
    unavailableTitle: "Calendrier de révision non disponible",
    errorTitle: "Impossible de charger le calendrier de révision",
    noFixtureMessage: "Aucune demande fictive ne remplace les dossiers enregistrés.",
    partialTitle: "Certaines révisions n’ont pas pu être affichées",
    partialMessage:
      "Les dossiers ci-dessous respectent les règles de confidentialité des administrateurs. Réessayez pour vérifier les dossiers restants.",
    organizationReference: (id: string) => `Référence de l’organisation : ${id}`,
    openDetail: "Ouvrir le détail de la révision",
    sessionMessage: "Session de calendrier administrateur authentifiée.",
    sessionClearFailed: "Impossible de fermer la session. Réessayez.",
    signingOut: "Déconnexion…",
    switchAccount: "Changer de compte administrateur",
    signInRequiredTitle: "Connexion administrateur requise",
    signInRequiredMessage:
      "Connectez-vous avec votre numéro de cellulaire du personnel et un code reçu par texto.",
    signIn: "Se connecter",
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
    creatingMessage: "Création de la révision de répartition.",
    authRequired: "Une autorisation d’administrateur est requise.",
    conflict:
      "Une révision de répartition a changé ou existe peut-être déjà. Vérification du dossier actuel.",
    notConfirmed:
      "La création n’a pas été confirmée. Vérification d’une révision existante.",
    created: "Révision de répartition créée. Aucun travailleur n’a été contacté ni attribué.",
    unknown:
      "Le résultat de la création est inconnu. Vérification d’une révision existante avant de réessayer.",
    checking: "Vérification d’une révision de répartition existante…",
    deniedAccess: "Une autorisation d’administrateur est requise pour accéder à la répartition.",
    unavailable:
      "La révision de répartition n’est pas disponible. Aucun dossier fictif ne la remplace.",
    retry: "Revérifier la répartition",
    exists: "Une révision de répartition existe déjà.",
    state: "État :",
    priority: "Priorité :",
    required: "Requis :",
    stillRequested: "Encore demandés :",
    open: "Ouvrir la révision de répartition",
    none: "Aucune révision de répartition n’existe. En créer une ouvre seulement une révision opérationnelle; aucun travailleur n’est contacté ni attribué.",
    priorityLabel: "Priorité de répartition",
    priorities: { normal: "Normale", urgent: "Urgente", emergency: "Urgence" },
    priorityNames: { normal: "normale", urgent: "urgente", emergency: "urgence" },
    create: "Créer une révision de répartition",
    confirmTitle: "Confirmer le transfert à la répartition",
    confirmCopy: (priority: string) =>
      `Créer une révision de répartition (priorité : ${priority}) pour cette demande approuvée. Aucun travailleur n’est contacté, présélectionné, sollicité ni attribué.`,
    cancel: "Annuler",
    creating: "Création…",
    confirm: "Confirmer la création"
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
    lede: "طلبات العملاء الموثّقة في قائمة مراجعة واحدة منظّمة. فتح الطلب لا يعني الموافقة عليه أو نشره أو إسناده أو إرسال إشعار أو تنفيذ أي دفعة.",
    persistedBoundary:
      "تستخدم إجراءات المراجعة المحفوظة رمز الإصدار الحالي وتأكيدًا بشريًا صريحًا. لا تُخلط أي أدوات مراجعة تجريبية بالسجلات الرسمية."
  },
  boundaries: [
    "تبقى الشروط المالية للعميل منفصلة عن الشروط المالية لعرض العامل.",
    "لا تتضمن جاهزية الدفع أبدًا أرقام البطاقات أو الحسابات أو الرموز أو أسرار مزوّد الخدمة.",
    "أدوات المراجعة تحدّث الحالة التجريبية المحلية فقط.",
    "لا يمكن للذكاء الاصطناعي الموافقة أو النشر أو الإسناد أو تعديل السعر أو إرسال الإشعارات.",
    "لا يمكن للتقويم تنفيذ الرواتب أو المدفوعات."
  ],
  panel: {
    loadingTitle: "جارٍ تحميل تقويم المراجعة",
    loadingMessage: "جارٍ التحقق من الصلاحية على المنصة.",
    emptyTitle: "لا توجد طلبات محفوظة",
    emptyMessage: "قائمة المراجعة فارغة.",
    unavailableTitle: "تقويم المراجعة غير متاح",
    errorTitle: "تعذّر تحميل تقويم المراجعة",
    noFixtureMessage: "لا تُستبدل السجلات المحفوظة بأي طلبات تجريبية.",
    partialTitle: "تعذّر عرض بعض المراجعات",
    partialMessage:
      "السجلات أدناه اجتازت قواعد الخصوصية الخاصة بالمسؤولين. أعد المحاولة للتحقق من بقية السجلات.",
    organizationReference: (id: string) => `مرجع المؤسسة: ${id}`,
    openDetail: "فتح تفاصيل المراجعة",
    sessionMessage: "جلسة تقويم مسؤول موثّقة.",
    sessionClearFailed: "تعذّر إنهاء الجلسة. حاول مرة أخرى.",
    signingOut: "جارٍ تسجيل الخروج…",
    switchAccount: "تبديل حساب المسؤول",
    signInRequiredTitle: "يلزم تسجيل دخول المسؤول",
    signInRequiredMessage: "سجّل الدخول برقم هاتفك المحمول المسجّل لدى الموظفين ورمز يصلك برسالة نصية.",
    signIn: "تسجيل الدخول",
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
    creatingMessage: "جارٍ إنشاء مراجعة التوزيع.",
    authRequired: "تلزم صلاحية المسؤول.",
    conflict: "تغيّرت مراجعة التوزيع أو ربما توجد بالفعل. جارٍ التحقق من السجل الحالي.",
    notConfirmed: "لم يُؤكَّد الإنشاء. جارٍ التحقق من وجود مراجعة سابقة.",
    created: "تم إنشاء مراجعة التوزيع. لم يتم التواصل مع أي عامل أو إسناد العمل إليه.",
    unknown: "نتيجة الإنشاء غير معروفة. جارٍ التحقق من وجود مراجعة سابقة قبل إعادة المحاولة.",
    checking: "جارٍ التحقق من وجود مراجعة توزيع محفوظة…",
    deniedAccess: "تلزم صلاحية المسؤول للوصول إلى التوزيع.",
    unavailable: "مراجعة التوزيع غير متاحة. لا يُستبدل السجل بأي سجل تجريبي.",
    retry: "إعادة التحقق من التوزيع",
    exists: "مراجعة التوزيع موجودة بالفعل.",
    state: "الحالة:",
    priority: "الأولوية:",
    required: "المطلوب:",
    stillRequested: "المتبقي:",
    open: "فتح مراجعة التوزيع",
    none: "لا توجد مراجعة توزيع. إنشاء مراجعة يفتح مراجعة تشغيلية فقط، ولا يتواصل مع العمال أو يسند إليهم العمل.",
    priorityLabel: "أولوية التوزيع",
    priorities: { normal: "عادية", urgent: "عاجلة", emergency: "طارئة" },
    priorityNames: { normal: "عادية", urgent: "عاجلة", emergency: "طارئة" },
    create: "إنشاء مراجعة توزيع",
    confirmTitle: "تأكيد التسليم إلى التوزيع",
    confirmCopy: (priority: string) =>
      `إنشاء مراجعة توزيع واحدة (الأولوية: ${priority}) لهذا الطلب الموافق عليه. لن يتم التواصل مع أي عامل أو إدراجه في قائمة مختصرة أو عرض العمل عليه أو إسناده إليه.`,
    cancel: "إلغاء",
    creating: "جارٍ الإنشاء…",
    confirm: "تأكيد الإنشاء"
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
