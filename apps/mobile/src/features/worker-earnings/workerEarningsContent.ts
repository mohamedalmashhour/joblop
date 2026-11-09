import type { Locale } from "../../i18n/strings";

export type WorkerEarningsCopy = Readonly<{
  badge: string;
  title: string;
  intro: string;
  fromAccountTitle: string;
  loadingLedger: string;
  toPayTitle: string;
  toPayNote: string;
  paidTitle: string;
  paidNote: string;
  payableSummaryTitle: string;
  back: string;
  contactSupport: string;
  supportNote: string;
  denied: string;
  error: string;
  unavailable: string;
  empty: string;
}>;

const enCopy: WorkerEarningsCopy = {
  badge: "My pay",
  title: "Earnings",
  intro:
    "Your pay for the shifts you worked.",
  fromAccountTitle: "From your account",
  loadingLedger: "Loading your payout ledger…",
  toPayTitle: "To pay",
  toPayNote: "Confirmed and awaiting transfer.",
  paidTitle: "Paid",
  paidNote: "Already sent to your account.",
  payableSummaryTitle: "Payable summary",
  back: "Back",
  contactSupport: "Contact support",
  supportNote:
    "Payments are released automatically about two weeks after a shift. A dispute pauses the payment until it is resolved.",
  denied: "Sign in to see the amounts registered in your account.",
  error: "Your payout ledger could not be loaded right now.",
  unavailable: "The payout service is not available right now.",
  empty: "No payouts registered to your account yet."
};

const frCopy: WorkerEarningsCopy = {
  badge: "Ma paie",
  title: "Revenus",
  intro:
    "Votre paie pour les quarts que vous avez travaillés.",
  fromAccountTitle: "Depuis votre compte",
  loadingLedger: "Chargement de votre registre de versements…",
  toPayTitle: "À payer",
  toPayNote: "Confirmé et en attente de virement.",
  paidTitle: "Payé",
  paidNote: "Déjà envoyé à votre compte.",
  payableSummaryTitle: "Résumé payable",
  back: "Retour",
  contactSupport: "Contacter le soutien",
  supportNote:
    "Les paiements sont versés automatiquement environ deux semaines après un quart. Un litige met le paiement en pause jusqu'à sa résolution.",
  denied: "Connectez-vous pour voir les montants enregistrés sur votre compte.",
  error: "Impossible de charger votre registre de versements pour le moment.",
  unavailable: "Le service de versements n'est pas disponible pour le moment.",
  empty: "Aucun versement enregistré sur votre compte pour l'instant."
};

const arCopy: WorkerEarningsCopy = {
  badge: "مستحقاتي",
  title: "الأرباح",
  intro:
    "أجرك عن المناوبات التي عملتها.",
  fromAccountTitle: "من حسابك",
  loadingLedger: "جارٍ تحميل سجلّ مدفوعاتك…",
  toPayTitle: "مستحقّ الدفع",
  toPayNote: "مؤكَّد وبانتظار التحويل.",
  paidTitle: "مدفوع",
  paidNote: "تم إرساله إلى حسابك بالفعل.",
  payableSummaryTitle: "ملخّص المستحقّات",
  back: "رجوع",
  contactSupport: "التواصل مع الدعم",
  supportNote:
    "تُصرف المدفوعات تلقائيًا بعد نحو أسبوعين من المناوبة. يوقف النزاع الدفعة مؤقتًا حتى يُحلّ.",
  denied: "سجّل الدخول لرؤية المبالغ المسجَّلة في حسابك.",
  error: "تعذّر تحميل سجلّ مدفوعاتك الآن.",
  unavailable: "خدمة المدفوعات غير متاحة حاليًا.",
  empty: "لا توجد مدفوعات مسجَّلة في حسابك بعد."
};

const EARNINGS_BY_LOCALE: Record<Locale, WorkerEarningsCopy> = { en: enCopy, fr: frCopy, ar: arCopy };

/** Worker-facing Earnings copy for a locale (falls back to English). */
export function workerEarningsCopyFor(locale: Locale): WorkerEarningsCopy {
  return EARNINGS_BY_LOCALE[locale] ?? enCopy;
}

export const workerEarningsStatusModel = [
  "Estimated amount — fixture only",
  "Approved-hours handoff — fixture only",
  "Payroll status unavailable",
  "Payment provider unavailable",
  "Verified settlement unavailable"
] as const;

export const workerEarningsRows = [
  {
    amount: "$96.50",
    label: "Approved hours",
    note: "Derived from approved timesheet fixture"
  },
  {
    amount: "$12.00",
    label: "Premiums",
    note: "Worker-facing summary only"
  },
  {
    amount: "$0.00",
    label: "Travel allowance",
    note: "No approved allowance in this fixture"
  },
  {
    amount: "$108.50",
    label: "Estimated worker-facing amount",
    note: "Not net pay, a guaranteed payout, or verified settlement"
  }
] as const;

export const workerEarningsBoundaries = [
  "Earnings estimate != final payable",
  "Approved-hours handoff != payroll calculation",
  "Payroll status unavailable != paid",
  "Payment provider unavailable != settlement",
  "Worker payable != employer invoice"
] as const;

export const workerEarningsPrivacyRules = [
  "No employer billing or platform margin is shown",
  "No bank account or payment destination values are displayed",
  "No SIN or tax identifier values are displayed",
  "No deductions or net pay are calculated or displayed",
  "No payroll or payment-provider secrets are exposed",
  "Sensitive payment destination data remains masked"
] as const;

export function getWorkerEarningsFixtureDisclosure() {
  return [
    "Fixture-backed earnings only",
    "No payroll engine is connected",
    "No payment provider is connected",
    "No payout is simulated or guaranteed",
    "No verified settlement evidence is available"
  ] as const;
}
