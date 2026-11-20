import type { PageText } from "../i18n/pageTextCore";

// Copy for the Verification queue page, in English, French (Québec) and Arabic. Filter and decision
// codes sent to the API stay in the panel; only the labels shown to staff are translated here, keyed by
// those codes (unknown status codes fall back to the code).

type VerificationCopy = {
  eyebrow: string;
  title: string;
  lede: string;
  filtersLabel: string;
  filters: Readonly<Record<string, string>>;
  decisions: Readonly<Record<string, string>>;
  statusLabel: Readonly<Record<string, string>>;
  authRequired: string;
  decisionFailed: string;
  loading: string;
  unavailable: string;
  retry: string;
  empty: string;
  employer: string;
  worker: string;
  requested: (when: string) => string;
};

const en: VerificationCopy = {
  eyebrow: "Joblop / Verification",
  title: "Verification queue",
  lede:
    "Governed trust decisions for workers and employers. Every decision is audited. Badges and eligibility read these states — never an account, contract, or payment.",
  filtersLabel: "Verification filters",
  filters: {
    "pending,review,review_required": "Needs action",
    pending: "Pending",
    "review,review_required": "Review required",
    "verified,business_verified": "Verified",
    expired: "Expiring/expired",
    "rejected,suspended": "Rejected/suspended",
    all: "All"
  },
  decisions: {
    verified: "Verify",
    review: "Mark review",
    rejected: "Reject",
    business_verified: "Verify business",
    review_required: "Mark review",
    suspended: "Suspend"
  },
  statusLabel: {
    pending: "pending",
    review: "review",
    review_required: "review required",
    verified: "verified",
    business_verified: "business verified",
    expired: "expired",
    rejected: "rejected",
    suspended: "suspended"
  },
  authRequired: "Administrator authorization is required.",
  decisionFailed: "That decision could not be recorded.",
  loading: "Loading verification queue…",
  unavailable: "Verification queue is unavailable.",
  retry: "Retry",
  empty: "Nothing in this view.",
  employer: "Employer",
  worker: "Worker",
  requested: (when) => `requested ${when}`
};

const fr: VerificationCopy = {
  eyebrow: "Joblop / Vérification",
  title: "File de vérification",
  lede:
    "Décisions de confiance encadrées pour les travailleurs et les employeurs. Chaque décision est consignée. Les badges et l’admissibilité se fondent sur ces états — jamais sur un compte, un contrat ou un paiement.",
  filtersLabel: "Filtres de vérification",
  filters: {
    "pending,review,review_required": "Action requise",
    pending: "En attente",
    "review,review_required": "Révision requise",
    "verified,business_verified": "Vérifiés",
    expired: "Bientôt expirés/expirés",
    "rejected,suspended": "Refusés/suspendus",
    all: "Tous"
  },
  decisions: {
    verified: "Vérifier",
    review: "Mettre en révision",
    rejected: "Refuser",
    business_verified: "Vérifier l’entreprise",
    review_required: "Mettre en révision",
    suspended: "Suspendre"
  },
  statusLabel: {
    pending: "en attente",
    review: "en révision",
    review_required: "révision requise",
    verified: "vérifié",
    business_verified: "entreprise vérifiée",
    expired: "expiré",
    rejected: "refusé",
    suspended: "suspendu"
  },
  authRequired: "Une autorisation d’administrateur est requise.",
  decisionFailed: "Cette décision n’a pas pu être enregistrée.",
  loading: "Chargement de la file de vérification…",
  unavailable: "La file de vérification n’est pas disponible.",
  retry: "Réessayer",
  empty: "Rien dans cette vue.",
  employer: "Employeur",
  worker: "Travailleur",
  requested: (when) => `demandé le ${when}`
};

const ar: VerificationCopy = {
  eyebrow: "Joblop / التحقق",
  title: "قائمة التحقق",
  lede:
    "قرارات ثقة منظَّمة للعمّال وأصحاب العمل. كل قرار يُسجَّل للتدقيق. الشارات والأهلية تعتمد على هذه الحالات — وليس على حساب أو عقد أو دفعة.",
  filtersLabel: "عوامل تصفية التحقق",
  filters: {
    "pending,review,review_required": "بحاجة إلى إجراء",
    pending: "قيد الانتظار",
    "review,review_required": "مطلوب مراجعة",
    "verified,business_verified": "تم التحقق",
    expired: "قارب على الانتهاء/منتهٍ",
    "rejected,suspended": "مرفوض/موقوف",
    all: "الكل"
  },
  decisions: {
    verified: "تحقّق",
    review: "وضع للمراجعة",
    rejected: "رفض",
    business_verified: "تحقّق من النشاط التجاري",
    review_required: "وضع للمراجعة",
    suspended: "إيقاف"
  },
  statusLabel: {
    pending: "قيد الانتظار",
    review: "قيد المراجعة",
    review_required: "مطلوب مراجعة",
    verified: "تم التحقق",
    business_verified: "تم التحقق من النشاط التجاري",
    expired: "منتهٍ",
    rejected: "مرفوض",
    suspended: "موقوف"
  },
  authRequired: "مطلوب تفويض مسؤول.",
  decisionFailed: "تعذّر تسجيل هذا القرار.",
  loading: "جارٍ تحميل قائمة التحقق…",
  unavailable: "قائمة التحقق غير متاحة.",
  retry: "إعادة المحاولة",
  empty: "لا شيء في هذا العرض.",
  employer: "صاحب العمل",
  worker: "عامل",
  requested: (when) => `طُلب في ${when}`
};

export const verificationText: PageText<VerificationCopy> = { en, fr, ar };
