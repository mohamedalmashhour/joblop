import type { PageText } from "../i18n/pageTextCore";

// Copy for the Employer plan orders page (plan and long-term listing e-transfers), in English, French
// (Québec) and Arabic. Amounts, references and company names are shown as they are.

export type PlanOrdersCopy = {
  eyebrow: string;
  title: string;
  lede: string;
  tabOpen: string;
  tabDone: string;
  plansHeading: string;
  listingsHeading: string;
  loading: string;
  denied: string;
  off: string;
  error: string;
  emptyOpen: string;
  emptyDone: string;
  colReference: string;
  colCompany: string;
  colPlan: string;
  colJob: string;
  colAmount: string;
  colMethod: string;
  colStatus: string;
  colCreated: string;
  colClaimed: string;
  colClosed: string;
  colInterac: string;
  colReceived: string;
  colReceipt: string;
  colActions: string;
  methodEtransfer: string;
  methodCard: string;
  firstMonthHalf: string;
  status: Readonly<Record<string, string>>;
  canceledByEmployer: string;
  rejectedByStaff: string;
  confirm: string;
  reject: string;
  closeRefund: string;
  confirmPayment: string;
  cancel: string;
  interacLabel: string;
  interacHint: string;
  receivedLabel: string;
  receivedHint: string;
  confirmedPlan: string;
  confirmedListing: string;
  rejected: string;
  closed: string;
  failed: string;
  errors: Readonly<Record<string, string>>;
  question: (amount: string, company: string, card: boolean) => string;
};

const en: PlanOrdersCopy = {
  eyebrow: "Joblop / Administration",
  title: "Employer plan orders",
  lede:
    "Confirm employer fees paid by Interac e-transfer: short-term plans (Shift Pro, Shift Business) and long-term job listings (C$99/month paid in advance, first month 50% off). Amounts include GST + QST. Confirm only after the e-transfer arrived at billing@joblop.com for the total shown, with the short code (for example JL-7F3K2) in the message. Type the Interac reference and the amount you received. Confirming a plan starts it for one month; confirming a listing shows that job to workers for one more month. A receipt is emailed to the company.",
  tabOpen: "Waiting",
  tabDone: "Done",
  plansHeading: "Plans",
  listingsHeading: "Long-term job listings",
  loading: "Loading orders.",
  denied: "Administrator access required.",
  off: "Employer plans are switched off.",
  error: "The orders could not be loaded.",
  emptyOpen: "Nothing waiting.",
  emptyDone: "No confirmed, rejected or canceled orders yet.",
  colReference: "Code",
  colCompany: "Company",
  colPlan: "Plan",
  colJob: "Job",
  colAmount: "Amount",
  colMethod: "Method",
  colStatus: "Status",
  colCreated: "Created",
  colClaimed: "Said sent",
  colClosed: "Closed",
  colInterac: "Interac reference",
  colReceived: "Received",
  colReceipt: "Receipt",
  colActions: "Actions",
  methodEtransfer: "Interac e-transfer",
  methodCard: "Card (test)",
  firstMonthHalf: "first month 50% off",
  status: {
    pending_payment: "Waiting for payment",
    payment_claimed: "Employer says sent",
    paid: "Confirmed",
    canceled: "Canceled",
    refund_check: "Canceled by employer — check refund"
  },
  canceledByEmployer: "Canceled by employer",
  rejectedByStaff: "Rejected by staff",
  confirm: "Confirm",
  reject: "Reject",
  closeRefund: "Refund checked — close",
  confirmPayment: "Confirm payment",
  cancel: "Cancel",
  interacLabel: "Interac reference",
  interacHint: "From the bank deposit (optional)",
  receivedLabel: "Amount received",
  receivedHint: "For example 56.92",
  confirmedPlan: "Payment confirmed. The plan is on and the receipt was sent.",
  confirmedListing: "Payment confirmed. The job is listed for one more month and the receipt was sent.",
  rejected: "Order rejected.",
  closed: "Order closed.",
  failed: "That did not work. Reload and try again.",
  errors: {
    RWOS_ORDER_CANCELED_BY_EMPLOYER: "Canceled by employer. Do not confirm: check whether the money arrived and send it back.",
    RWOS_ORDER_DISCOUNT_ALREADY_USED: "Discount already used. Ask the employer for the difference or reject.",
    RWOS_ORDER_AMOUNT_SHORT: "Less than the total arrived. Ask the employer for the difference or reject.",
    RWOS_ORDER_AMOUNT_INVALID: "Type the amount received like 56.92.",
    RWOS_ORDER_NOT_PENDING: "This order is no longer waiting. Reload the page."
  },
  question: (amount, company, card) =>
    card ? `Confirm the card payment of ${amount} for ${company}?` : `Confirm you received ${amount} by Interac for ${company}?`
};

const fr: PlanOrdersCopy = {
  eyebrow: "Joblop / Administration",
  title: "Commandes de forfaits employeurs",
  lede:
    "Confirmez les frais payés par virement Interac : forfaits courte durée (Shift Pro, Shift Business) et annonces d’emplois de longue durée (99 $/mois payés d’avance, premier mois à 50 %). Les montants incluent la TPS et la TVQ. Confirmez seulement quand le virement est arrivé à billing@joblop.com pour le total affiché, avec le code court (par exemple JL-7F3K2) dans le message. Inscrivez la référence Interac et le montant reçu. Confirmer un forfait le démarre pour un mois; confirmer une annonce montre l’emploi aux travailleurs un mois de plus. Un reçu est envoyé à l’entreprise.",
  tabOpen: "En attente",
  tabDone: "Terminées",
  plansHeading: "Forfaits",
  listingsHeading: "Annonces d’emplois de longue durée",
  loading: "Chargement des commandes.",
  denied: "Accès administrateur requis.",
  off: "Les forfaits employeurs sont désactivés.",
  error: "Les commandes n’ont pas pu être chargées.",
  emptyOpen: "Rien en attente.",
  emptyDone: "Aucune commande confirmée, refusée ou annulée pour l’instant.",
  colReference: "Code",
  colCompany: "Entreprise",
  colPlan: "Forfait",
  colJob: "Emploi",
  colAmount: "Montant",
  colMethod: "Mode",
  colStatus: "Statut",
  colCreated: "Créée",
  colClaimed: "Dit envoyé",
  colClosed: "Fermée",
  colInterac: "Référence Interac",
  colReceived: "Reçu",
  colReceipt: "Reçu n°",
  colActions: "Actions",
  methodEtransfer: "Virement Interac",
  methodCard: "Carte (test)",
  firstMonthHalf: "premier mois à 50 %",
  status: {
    pending_payment: "En attente du paiement",
    payment_claimed: "L’employeur dit l’avoir envoyé",
    paid: "Confirmée",
    canceled: "Annulée",
    refund_check: "Annulée par l’employeur — vérifier le remboursement"
  },
  canceledByEmployer: "Annulée par l’employeur",
  rejectedByStaff: "Refusée par l’équipe",
  confirm: "Confirmer",
  reject: "Refuser",
  closeRefund: "Remboursement vérifié — fermer",
  confirmPayment: "Confirmer le paiement",
  cancel: "Annuler",
  interacLabel: "Référence Interac",
  interacHint: "Du dépôt bancaire (facultatif)",
  receivedLabel: "Montant reçu",
  receivedHint: "Par exemple 56.92",
  confirmedPlan: "Paiement confirmé. Le forfait est actif et le reçu a été envoyé.",
  confirmedListing: "Paiement confirmé. L’emploi est affiché un mois de plus et le reçu a été envoyé.",
  rejected: "Commande refusée.",
  closed: "Commande fermée.",
  failed: "Cela n’a pas fonctionné. Rechargez la page et réessayez.",
  errors: {
    RWOS_ORDER_CANCELED_BY_EMPLOYER: "Annulée par l’employeur. Ne confirmez pas : vérifiez si l’argent est arrivé et renvoyez-le.",
    RWOS_ORDER_DISCOUNT_ALREADY_USED: "Rabais déjà utilisé. Demandez la différence à l’employeur ou refusez.",
    RWOS_ORDER_AMOUNT_SHORT: "Moins que le total est arrivé. Demandez la différence à l’employeur ou refusez.",
    RWOS_ORDER_AMOUNT_INVALID: "Inscrivez le montant reçu comme 56.92.",
    RWOS_ORDER_NOT_PENDING: "Cette commande n’est plus en attente. Rechargez la page."
  },
  question: (amount, company, card) =>
    card ? `Confirmer le paiement par carte de ${amount} pour ${company}?` : `Confirmez-vous avoir reçu ${amount} par Interac de ${company}?`
};

const ar: PlanOrdersCopy = {
  eyebrow: "Joblop / الإدارة",
  title: "طلبات باقات أصحاب العمل",
  lede:
    "أكّد الرسوم المدفوعة بتحويل Interac: باقات الوظائف القصيرة (Shift Pro وShift Business) وإعلانات الوظائف الطويلة (99 دولارًا شهريًا مقدّمًا، والشهر الأول بنصف السعر). المبالغ تشمل GST وQST. لا تؤكّد إلا بعد وصول التحويل إلى billing@joblop.com بالمبلغ الإجمالي المعروض ومعه الرمز القصير (مثل JL-7F3K2) في الرسالة. اكتب مرجع Interac والمبلغ الذي وصلك. تأكيد الباقة يشغّلها لمدة شهر، وتأكيد الإعلان يعرض الوظيفة للعمّال شهرًا إضافيًا. يُرسل إيصال إلى الشركة.",
  tabOpen: "بانتظار المراجعة",
  tabDone: "منتهية",
  plansHeading: "الباقات",
  listingsHeading: "إعلانات الوظائف الطويلة",
  loading: "جارٍ تحميل الطلبات.",
  denied: "يلزم دخول المسؤول.",
  off: "باقات أصحاب العمل متوقفة.",
  error: "تعذّر تحميل الطلبات.",
  emptyOpen: "لا شيء بانتظار المراجعة.",
  emptyDone: "لا توجد طلبات مؤكدة أو مرفوضة أو ملغاة بعد.",
  colReference: "الرمز",
  colCompany: "الشركة",
  colPlan: "الباقة",
  colJob: "الوظيفة",
  colAmount: "المبلغ",
  colMethod: "طريقة الدفع",
  colStatus: "الحالة",
  colCreated: "أُنشئ",
  colClaimed: "قال إنه أرسل",
  colClosed: "أُغلق",
  colInterac: "مرجع Interac",
  colReceived: "المبلغ الواصل",
  colReceipt: "الإيصال",
  colActions: "إجراءات",
  methodEtransfer: "تحويل Interac",
  methodCard: "بطاقة (تجريبية)",
  firstMonthHalf: "الشهر الأول بنصف السعر",
  status: {
    pending_payment: "بانتظار الدفع",
    payment_claimed: "صاحب العمل يقول إنه أرسل",
    paid: "مؤكَّد",
    canceled: "ملغى",
    refund_check: "ألغاه صاحب العمل — تحقّق من الاسترداد"
  },
  canceledByEmployer: "ألغاه صاحب العمل",
  rejectedByStaff: "رفضه الفريق",
  confirm: "تأكيد",
  reject: "رفض",
  closeRefund: "تم التحقق من الاسترداد — إغلاق",
  confirmPayment: "تأكيد الدفع",
  cancel: "إلغاء",
  interacLabel: "مرجع Interac",
  interacHint: "من الإيداع البنكي (اختياري)",
  receivedLabel: "المبلغ الواصل",
  receivedHint: "مثلًا 56.92",
  confirmedPlan: "تم تأكيد الدفع. الباقة فعّالة وأُرسل الإيصال.",
  confirmedListing: "تم تأكيد الدفع. الوظيفة معروضة شهرًا إضافيًا وأُرسل الإيصال.",
  rejected: "تم رفض الطلب.",
  closed: "تم إغلاق الطلب.",
  failed: "لم ينجح ذلك. أعد تحميل الصفحة وحاول مجددًا.",
  errors: {
    RWOS_ORDER_CANCELED_BY_EMPLOYER: "ألغاه صاحب العمل. لا تؤكّد: تحقّق إن كان المال قد وصل وأعده.",
    RWOS_ORDER_DISCOUNT_ALREADY_USED: "الخصم مستخدم من قبل. اطلب الفرق من صاحب العمل أو ارفض.",
    RWOS_ORDER_AMOUNT_SHORT: "وصل أقل من المبلغ الإجمالي. اطلب الفرق من صاحب العمل أو ارفض.",
    RWOS_ORDER_AMOUNT_INVALID: "اكتب المبلغ الواصل هكذا: 56.92.",
    RWOS_ORDER_NOT_PENDING: "لم يعد هذا الطلب بانتظار المراجعة. أعد تحميل الصفحة."
  },
  question: (amount, company, card) =>
    card ? `تأكيد الدفع بالبطاقة بمبلغ ${amount} لشركة ${company}؟` : `هل تؤكّد استلام ${amount} عبر Interac من ${company}؟`
};

export const planOrdersText: PageText<PlanOrdersCopy> = { en, fr, ar };
