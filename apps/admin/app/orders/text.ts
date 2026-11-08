import type { PageText } from "../i18n/pageTextCore";

// Copy for the Order review pages (list and one order), in English, French (Québec) and Arabic.
// Status and reason codes from the API stay as they are; only the label shown to staff is translated
// (unknown codes fall back to the code).

type OrdersCopy = {
  eyebrow: string;
  title: string;
  lede: string;
  detailLede: string;
  statusLabel: Readonly<Record<string, string>>;
  // List page
  listLoading: string;
  listDenied: string;
  listError: string;
  listEmpty: string;
  scanPending: (orders: number, lines: number) => string;
  scanClear: string;
  scanNote: string;
  orderMeta: (orderNumber: string, lines: number, pending: number) => string;
  reviewOrder: string;
  // One order
  reasonText: Readonly<Record<string, string>>;
  reasonTooShort: string;
  marginRange: string;
  applying: string;
  roleChanged: string;
  transitionFailed: string;
  approvingAll: string;
  batchFailed: string;
  batchSummary: (approved: number, escalated: number, skipped: number) => string;
  escalateReasonTooShort: string;
  escalating: string;
  escalationOpen: string;
  escalationFailed: string;
  escalationRaised: string;
  orderLoading: string;
  orderDenied: string;
  orderError: string;
  org: string;
  perks: (perks: string) => string;
  approveAll: string;
  aiEscalate: string;
  aiApprove: string;
  infoRequested: (reason: string) => string;
  beginReview: string;
  marginPercent: string;
  approveForDispatch: string;
  reasonLabel: string;
  requestInformation: string;
  escalateToOwner: string;
  backToOrders: string;
};

const en: OrdersCopy = {
  eyebrow: "Joblop / Administration",
  title: "Order review",
  lede:
    "Orders awaiting review, grouped so every role line in one employer submission is seen " +
    "together. Opening an order does not approve, publish, assign, notify, or execute payment.",
  detailLede:
    "Review each role line. Begin review, then approve for dispatch with a margin (default 20%) " +
    "or request information. Approving captures the immutable pricing snapshot for that role.",
  statusLabel: {
    draft: "draft",
    submitted: "submitted",
    admin_review: "admin review",
    partially_approved: "partially approved",
    approved: "approved",
    information_required: "information required",
    approved_for_dispatch: "approved for dispatch",
    cancelled: "cancelled",
    expired: "expired",
    archived: "archived"
  },
  listLoading: "Loading the order-review queue.",
  listDenied: "Administrator access required. Sign in with an authorized platform account.",
  listError: "The order-review queue could not be reached.",
  listEmpty: "No orders are awaiting review.",
  scanPending: (orders, lines) =>
    `AI scan (advisory): ${orders} order(s) · ${lines} job line(s) awaiting review`,
  scanClear: "AI scan (advisory): all orders reviewed — nothing pending",
  scanNote: "Advisory only — a human admin prices and approves each job line.",
  orderMeta: (orderNumber, lines, pending) => `${orderNumber} · ${lines} role line(s) · ${pending} awaiting action`,
  reviewOrder: "Review order",
  reasonText: {
    standard: "Standard role",
    urgent_premium: "Urgent — +$5/hr premium applies",
    immediate_urgency: "Emergency (immediate) — owner review",
    high_headcount: "Large headcount — owner review"
  },
  reasonTooShort: "Enter a clear reason of at least four characters.",
  marginRange: "Margin must be between 0 and 90 percent.",
  applying: "Applying the governed intake transition.",
  roleChanged: "This role changed. Reloading the latest.",
  transitionFailed: "The transition could not be applied.",
  approvingAll: "Approving the AI-recommended roles.",
  batchFailed: "The batch approval could not be applied.",
  batchSummary: (approved, escalated, skipped) => `Approved ${approved}, escalated ${escalated}, skipped ${skipped}.`,
  escalateReasonTooShort: "Enter a reason (4+ characters) to escalate.",
  escalating: "Raising an owner escalation.",
  escalationOpen: "This role already has an open escalation.",
  escalationFailed: "The escalation could not be raised.",
  escalationRaised: "Escalation raised for the owners.",
  orderLoading: "Loading the order.",
  orderDenied: "Administrator access required.",
  orderError: "This order could not be reached.",
  org: "org",
  perks: (perks) => `Perks: ${perks}`,
  approveAll: "Approve all recommended roles",
  aiEscalate: "AI manager: escalate to owners",
  aiApprove: "AI manager: approve",
  infoRequested: (reason) => `Info requested: ${reason}`,
  beginReview: "Begin review",
  marginPercent: "Margin %",
  approveForDispatch: "Approve for dispatch",
  reasonLabel: "Reason (to request info)",
  requestInformation: "Request information",
  escalateToOwner: "Escalate to owner",
  backToOrders: "Back to order review"
};

const fr: OrdersCopy = {
  eyebrow: "Joblop / Administration",
  title: "Révision des commandes",
  lede:
    "Commandes en attente de révision, regroupées pour que chaque ligne de poste d’une même demande d’employeur " +
    "soit vue ensemble. Ouvrir une commande n’approuve, ne publie, n’assigne, n’avise et ne paie rien.",
  detailLede:
    "Révisez chaque ligne de poste. Commencez la révision, puis approuvez pour l’affectation avec une marge " +
    "(20 % par défaut) ou demandez des renseignements. L’approbation fige le prix de ce poste de façon définitive.",
  statusLabel: {
    draft: "brouillon",
    submitted: "soumise",
    admin_review: "en révision",
    partially_approved: "partiellement approuvée",
    approved: "approuvée",
    information_required: "renseignements requis",
    approved_for_dispatch: "approuvée pour l’affectation",
    cancelled: "annulée",
    expired: "expirée",
    archived: "archivée"
  },
  listLoading: "Chargement de la file de révision des commandes.",
  listDenied: "Accès administrateur requis. Connectez-vous avec un compte de plateforme autorisé.",
  listError: "La file de révision des commandes est injoignable.",
  listEmpty: "Aucune commande n’attend de révision.",
  scanPending: (orders, lines) =>
    `Analyse IA (indicative) : ${orders} commande(s) · ${lines} ligne(s) d’emploi en attente de révision`,
  scanClear: "Analyse IA (indicative) : toutes les commandes sont révisées — rien en attente",
  scanNote: "À titre indicatif seulement — un administrateur fixe le prix et approuve chaque ligne d’emploi.",
  orderMeta: (orderNumber, lines, pending) =>
    `${orderNumber} · ${lines} ligne(s) de poste · ${pending} en attente d’une action`,
  reviewOrder: "Réviser la commande",
  reasonText: {
    standard: "Poste standard",
    urgent_premium: "Urgent — prime de 5 $/h applicable",
    immediate_urgency: "Urgence (immédiate) — révision par les propriétaires",
    high_headcount: "Effectif important — révision par les propriétaires"
  },
  reasonTooShort: "Entrez une raison claire d’au moins quatre caractères.",
  marginRange: "La marge doit être entre 0 et 90 pour cent.",
  applying: "Application de la transition d’admission encadrée.",
  roleChanged: "Ce poste a changé. Rechargement de la dernière version.",
  transitionFailed: "La transition n’a pas pu être appliquée.",
  approvingAll: "Approbation des postes recommandés par l’IA.",
  batchFailed: "L’approbation groupée n’a pas pu être appliquée.",
  batchSummary: (approved, escalated, skipped) =>
    `Approuvés : ${approved}, transmis : ${escalated}, ignorés : ${skipped}.`,
  escalateReasonTooShort: "Entrez une raison (4 caractères ou plus) pour transmettre aux propriétaires.",
  escalating: "Transmission aux propriétaires.",
  escalationOpen: "Ce poste a déjà une transmission ouverte.",
  escalationFailed: "La transmission n’a pas pu être faite.",
  escalationRaised: "Dossier transmis aux propriétaires.",
  orderLoading: "Chargement de la commande.",
  orderDenied: "Accès administrateur requis.",
  orderError: "Cette commande est injoignable.",
  org: "org.",
  perks: (perks) => `Avantages : ${perks}`,
  approveAll: "Approuver tous les postes recommandés",
  aiEscalate: "Gestionnaire IA : transmettre aux propriétaires",
  aiApprove: "Gestionnaire IA : approuver",
  infoRequested: (reason) => `Renseignements demandés : ${reason}`,
  beginReview: "Commencer la révision",
  marginPercent: "Marge %",
  approveForDispatch: "Approuver pour l’affectation",
  reasonLabel: "Raison (pour demander des renseignements)",
  requestInformation: "Demander des renseignements",
  escalateToOwner: "Transmettre au propriétaire",
  backToOrders: "Retour à la révision des commandes"
};

const ar: OrdersCopy = {
  eyebrow: "Joblop / الإدارة",
  title: "مراجعة الطلبات",
  lede:
    "الطلبات بانتظار المراجعة، مجمّعة بحيث تظهر كل بنود الوظائف في طلب صاحب العمل الواحد معًا. " +
    "فتح الطلب لا يعتمده ولا ينشره ولا يسنده ولا يرسل إشعارًا ولا ينفّذ أي دفعة.",
  detailLede:
    "راجع كل بند وظيفة. ابدأ المراجعة، ثم اعتمده للإرسال مع هامش ربح (20% افتراضيًا) أو اطلب معلومات. " +
    "الاعتماد يثبّت تسعير تلك الوظيفة بشكل نهائي.",
  statusLabel: {
    draft: "مسودة",
    submitted: "مُقدَّم",
    admin_review: "قيد المراجعة",
    partially_approved: "معتمد جزئيًا",
    approved: "معتمد",
    information_required: "مطلوب معلومات",
    approved_for_dispatch: "معتمد للإرسال",
    cancelled: "ملغى",
    expired: "منتهي الصلاحية",
    archived: "مؤرشف"
  },
  listLoading: "جارٍ تحميل قائمة مراجعة الطلبات.",
  listDenied: "مطلوب صلاحية مسؤول. سجّل الدخول بحساب منصة مُصرَّح له.",
  listError: "تعذّر الوصول إلى قائمة مراجعة الطلبات.",
  listEmpty: "لا توجد طلبات بانتظار المراجعة.",
  scanPending: (orders, lines) =>
    `فحص الذكاء الاصطناعي (استشاري): ${orders} طلب · ${lines} بند وظيفة بانتظار المراجعة`,
  scanClear: "فحص الذكاء الاصطناعي (استشاري): تمت مراجعة كل الطلبات — لا شيء معلّق",
  scanNote: "استشاري فقط — مسؤول بشري يسعّر كل بند وظيفة ويعتمده.",
  orderMeta: (orderNumber, lines, pending) => `${orderNumber} · ${lines} بند وظيفة · ${pending} بانتظار إجراء`,
  reviewOrder: "مراجعة الطلب",
  reasonText: {
    standard: "وظيفة عادية",
    urgent_premium: "عاجل — تُطبَّق علاوة 5 دولارات في الساعة",
    immediate_urgency: "طارئ (فوري) — مراجعة المالكين",
    high_headcount: "عدد كبير من العمّال — مراجعة المالكين"
  },
  reasonTooShort: "أدخل سببًا واضحًا من أربعة أحرف على الأقل.",
  marginRange: "يجب أن يكون الهامش بين 0 و90 بالمئة.",
  applying: "جارٍ تطبيق انتقال الاستقبال المنظَّم.",
  roleChanged: "تغيّرت هذه الوظيفة. جارٍ تحميل أحدث نسخة.",
  transitionFailed: "تعذّر تطبيق الانتقال.",
  approvingAll: "جارٍ اعتماد الوظائف التي أوصى بها الذكاء الاصطناعي.",
  batchFailed: "تعذّر تطبيق الاعتماد الجماعي.",
  batchSummary: (approved, escalated, skipped) =>
    `اعتُمد ${approved}، وأُحيل ${escalated}، وتُخطّي ${skipped}.`,
  escalateReasonTooShort: "أدخل سببًا (4 أحرف أو أكثر) للإحالة.",
  escalating: "جارٍ رفع إحالة إلى المالكين.",
  escalationOpen: "لهذه الوظيفة إحالة مفتوحة بالفعل.",
  escalationFailed: "تعذّر رفع الإحالة.",
  escalationRaised: "رُفعت الإحالة إلى المالكين.",
  orderLoading: "جارٍ تحميل الطلب.",
  orderDenied: "مطلوب صلاحية مسؤول.",
  orderError: "تعذّر الوصول إلى هذا الطلب.",
  org: "المؤسسة",
  perks: (perks) => `المزايا: ${perks}`,
  approveAll: "اعتماد كل الوظائف الموصى بها",
  aiEscalate: "مدير الذكاء الاصطناعي: إحالة إلى المالكين",
  aiApprove: "مدير الذكاء الاصطناعي: اعتماد",
  infoRequested: (reason) => `معلومات مطلوبة: ${reason}`,
  beginReview: "بدء المراجعة",
  marginPercent: "الهامش %",
  approveForDispatch: "اعتماد للإرسال",
  reasonLabel: "السبب (لطلب معلومات)",
  requestInformation: "طلب معلومات",
  escalateToOwner: "إحالة إلى المالك",
  backToOrders: "العودة إلى مراجعة الطلبات"
};

export const ordersText: PageText<OrdersCopy> = { en, fr, ar };
