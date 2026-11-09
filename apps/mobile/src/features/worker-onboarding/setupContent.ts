// Pure copy + helpers for the real worker setup (pay-channel classification election). UI-free so the
// choice explanations and agreement selection are unit-tested without React Native.

import type { Locale } from "../../i18n/strings";

export type Classification = "employee" | "contractor";

export const classificationOptions: readonly Readonly<{ id: Classification; title: string; summary: string; detail: string }>[] = [
  {
    id: "employee",
    title: "Employee",
    summary: "Paid through payroll (T4).",
    detail: "Source deductions (tax, QPP, EI, QPIP) are withheld and remitted for you; you get a T4 and employee protections. You're paid net."
  },
  {
    id: "contractor",
    title: "Independent contractor",
    summary: "Paid your gross fee (T4A).",
    detail: "You're paid gross and you handle your own taxes and remittances; you get a T4A. If GST/QST-registered, you can declare it later."
  }
];

/** The current signed agreement version for the chosen channel, from the server-provided versions. */
export function agreementVersionFor(classification: Classification, versions: Readonly<{ employee: string; contractor: string }>): string {
  return classification === "employee" ? versions.employee : versions.contractor;
}

export function classificationLabel(classification: string): string {
  return classification === "employee" ? "Employee (T4)" : classification === "contractor" ? "Independent contractor (T4A)" : classification;
}

export const setupCopy = {
  title: "Get set up",
  intro: "Before you can apply to shifts and receive offers, choose how you'll be paid and sign the matching agreement. This is a legal election — it's recorded and signed, and it doesn't calculate or move any money.",
  signInRequired: "Sign in to set up your pay channel.",
  loadError: "Your setup status could not be loaded right now.",
  chooseCta: "Choose how you'll be paid",
  acceptPrefix: "I have read and accept the",
  acceptSuffix: "agreement",
  submitCta: "Confirm & sign",
  successTitle: "You're set up",
  alreadyNote: "You can apply to open shifts and receive offers.",
  staleNote: "The agreement was updated. Reload and accept the current version.",
  invalidNote: "Choose a pay channel and accept its agreement to continue.",
  deniedNote: "Sign in required.",
  submitError: "Your election couldn't be submitted right now."
} as const;

// ── Trilingual setup words (the website's onboarding page, apps/worker/app/onboarding) ──

export type SetupCopy = Readonly<{
  title: string;
  intro: string;
  back: string;
  loading: string;
  signInRequired: string;
  loadError: string;
  chooseCta: string;
  employeeTitle: string;
  employeeSummary: string;
  contractorTitle: string;
  contractorSummary: string;
  acceptEmployee: string;
  acceptContractor: string;
  submitCta: string;
  submitting: string;
  successTitle: string;
  setUpAs: string;
  alreadyNote: string;
  staleNote: string;
  invalidNote: string;
  submitError: string;
  selected: string;
  done: string;
}>;

const SETUP_COPY: Readonly<Record<Locale, SetupCopy>> = {
  en: {
    title: "Set up your worker profile",
    intro: "Choose your work type and sign the agreement. You can update your details and documents later in your HR Profile.",
    back: "Back",
    loading: "Loading…",
    signInRequired: "Sign in to set up your pay channel.",
    loadError: "Your setup status could not be loaded right now.",
    chooseCta: "1. Work type",
    employeeTitle: "Employee",
    employeeSummary: "payroll with deductions, T4 slip.",
    contractorTitle: "Self-employed",
    contractorSummary: "paid gross, no deductions, T4A slip.",
    acceptEmployee: "I accept and sign my employment agreement.",
    acceptContractor: "I accept and sign my self-employed work agreement.",
    submitCta: "Finish setup",
    submitting: "Setting up…",
    successTitle: "You're set up",
    setUpAs: "Your work type: {type}",
    alreadyNote: "You can apply to open shifts and receive offers.",
    staleNote: "The agreement was updated. Reload and accept the current version.",
    invalidNote: "You must accept the agreement to continue.",
    submitError: "Couldn't record your work type. Please try again.",
    selected: "Selected",
    done: "Done"
  },
  fr: {
    title: "Configurez votre profil de travailleur",
    intro: "Choisissez votre type de travail et signez l'entente. Vous pourrez mettre à jour vos informations et documents plus tard dans votre Profil RH.",
    back: "Retour",
    loading: "Chargement…",
    signInRequired: "Connectez-vous pour choisir votre mode de paie.",
    loadError: "Impossible de charger votre configuration pour le moment.",
    chooseCta: "1. Type de travail",
    employeeTitle: "Employé",
    employeeSummary: "paie avec retenues, relevé T4.",
    contractorTitle: "Travailleur autonome",
    contractorSummary: "payé brut sans retenues, relevé T4A.",
    acceptEmployee: "J'accepte et je signe mon contrat de travail.",
    acceptContractor: "J'accepte et je signe mon entente de travailleur autonome.",
    submitCta: "Terminer la configuration",
    submitting: "Enregistrement…",
    successTitle: "Votre profil est configuré",
    setUpAs: "Votre type de travail : {type}",
    alreadyNote: "Vous pouvez postuler aux quarts ouverts et recevoir des offres.",
    staleNote: "L'entente a été mise à jour. Rechargez et acceptez la version actuelle.",
    invalidNote: "Vous devez accepter l'entente pour continuer.",
    submitError: "Impossible d'enregistrer votre type de travail. Réessayez.",
    selected: "Choisi",
    done: "Terminé"
  },
  ar: {
    title: "أكمل إعداد حساب العامل",
    intro: "اختر نوع عملك ووقّع الاتفاقية. يمكنك تحديث بياناتك ومستنداتك لاحقًا من ملف الموارد البشرية.",
    back: "رجوع",
    loading: "جارٍ التحميل…",
    signInRequired: "سجّل الدخول لاختيار طريقة الدفع.",
    loadError: "تعذّر تحميل حالة الإعداد الآن.",
    chooseCta: "١. نوع العمل",
    employeeTitle: "موظف",
    employeeSummary: "رواتب مع استقطاعات، نموذج T4.",
    contractorTitle: "عامل مستقل",
    contractorSummary: "يُدفع بالكامل دون استقطاعات، نموذج T4A.",
    acceptEmployee: "أوافق على عقد عملي وأوقّعه.",
    acceptContractor: "أوافق على اتفاقية العمل المستقل الخاصة بي وأوقّعها.",
    submitCta: "أكمل الإعداد",
    submitting: "جارٍ الحفظ…",
    successTitle: "اكتمل إعدادك",
    setUpAs: "نوع عملك: {type}",
    alreadyNote: "يمكنك التقديم على المناوبات المتاحة وتلقي العروض.",
    staleNote: "تم تحديث الاتفاقية. أعد التحميل واقبل النسخة الحالية.",
    invalidNote: "يجب قبول الاتفاقية للمتابعة.",
    submitError: "تعذّر تسجيل اختيار نوع العمل. حاول مجددًا.",
    selected: "تم الاختيار",
    done: "تم"
  }
};

export function setupCopyFor(locale: Locale): SetupCopy {
  return SETUP_COPY[locale] ?? SETUP_COPY.en;
}
