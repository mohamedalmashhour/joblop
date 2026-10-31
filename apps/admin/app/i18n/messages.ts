// Admin-console message catalogue — shell chrome, navigation labels, and group headings.
// en-CA is the source of truth; fr-CA MUST stay at full parity (Bill 96). Arabic is Partial with
// en-CA fallback. Deep data-table copy inside individual pages is out of scope here.
import type { AdminLocale } from "./config";

export const en = {
  "lang.switchTo": "Switch to {language}",
  "shell.skip": "Skip to main content",
  "shell.brandTitle": "Administration",
  "shell.brandSub": "governed operations",
  "shell.sessionContext":
    "Secure administration workspace · authority is verified before persisted data is shown",
  "shell.brandHomeAria": "JobLop administration home",
  "shell.navAria": "Administration navigation",

  // Navigation items
  "nav.calendar": "Request calendar",
  "nav.orders": "Order review",
  "nav.dispatches": "Dispatch reviews",
  "nav.marketWages": "Market wages",
  "nav.escalations": "Owner escalations",
  "nav.verification": "Verification",
  "nav.hr": "HR",
  "nav.payroll": "Payroll",

  // Navigation group headings
  "group.Operations": "Operations",
  "group.Directory": "Directory",
  "group.Finance & payroll": "Finance & payroll",
  "group.People & trust": "People & trust",
  "group.Governance & compliance": "Governance & compliance",
  "group.Platform": "Platform",
  "group.More": "More",

  // Page navigator
  "page.back": "Back",
  "page.next": "Next"
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Readonly<Record<MessageKey, string>>;

export const fr: Messages = {
  "lang.switchTo": "Passer à {language}",
  "shell.skip": "Aller au contenu principal",
  "shell.brandTitle": "Administration",
  "shell.brandSub": "opérations encadrées",
  "shell.sessionContext":
    "Espace d'administration sécurisé · l'autorité est vérifiée avant l'affichage des données persistées",
  "shell.brandHomeAria": "Accueil de l'administration JobLop",
  "shell.navAria": "Navigation de l'administration",

  "nav.calendar": "Calendrier des demandes",
  "nav.orders": "Révision des commandes",
  "nav.dispatches": "Révisions de répartition",
  "nav.marketWages": "Salaires du marché",
  "nav.escalations": "Escalades du propriétaire",
  "nav.verification": "Vérification",
  "nav.hr": "RH",
  "nav.payroll": "Paie",

  "group.Operations": "Opérations",
  "group.Directory": "Répertoire",
  "group.Finance & payroll": "Finances et paie",
  "group.People & trust": "Personnes et confiance",
  "group.Governance & compliance": "Gouvernance et conformité",
  "group.Platform": "Plateforme",
  "group.More": "Autres",

  "page.back": "Précédent",
  "page.next": "Suivant"
};

// Arabic (RTL). Partial — missing keys fall back to en-CA at render time.
export const ar: Partial<Messages> = {
  "lang.switchTo": "التبديل إلى {language}",
  "shell.skip": "تخطَّ إلى المحتوى الرئيسي",
  "shell.brandTitle": "الإدارة",
  "shell.brandSub": "عمليات محكومة",
  "shell.sessionContext":
    "مساحة إدارة آمنة · يُتحقَّق من الصلاحية قبل عرض البيانات المحفوظة",
  "shell.brandHomeAria": "الصفحة الرئيسية لإدارة JobLop",
  "shell.navAria": "تنقّل الإدارة",

  "nav.calendar": "تقويم الطلبات",
  "nav.orders": "مراجعة الطلبات",
  "nav.dispatches": "مراجعات التوزيع",
  "nav.marketWages": "أجور السوق",
  "nav.escalations": "تصعيدات المالك",
  "nav.verification": "التحقّق",
  "nav.hr": "الموارد البشرية",
  "nav.payroll": "الرواتب",

  "group.Operations": "العمليات",
  "group.Directory": "الدليل",
  "group.Finance & payroll": "المالية والرواتب",
  "group.People & trust": "الأشخاص والثقة",
  "group.Governance & compliance": "الحوكمة والامتثال",
  "group.Platform": "المنصّة",
  "group.More": "أخرى",

  "page.back": "السابق",
  "page.next": "التالي"
};

export const dictionaries: Readonly<Record<AdminLocale, Partial<Messages>>> = {
  "en-CA": en,
  "fr-CA": fr,
  ar
};
