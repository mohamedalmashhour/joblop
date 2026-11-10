import type { PageText } from "./i18n/pageTextCore";

// Copy for the staff home page, in English, French (Québec) and Arabic.

export type HomeTile = { href: string; title: string; detail: string };

export type HomeCopy = {
  eyebrow: string;
  title: string;
  lede: string;
  loading: string;
  signedOutTitle: string;
  signedOutBody: string;
  signIn: string;
  error: string;
  groupDaily: string;
  groupMoney: string;
  groupPeople: string;
  daily: readonly HomeTile[];
  money: readonly HomeTile[];
  people: readonly HomeTile[];
};

export const homeText: PageText<HomeCopy> = {
  en: {
    eyebrow: "Joblop staff",
    title: "Staff home",
    lede: "Start here each day: review new requests, fill open shifts, then check hours and money.",
    loading: "Checking your sign-in…",
    signedOutTitle: "Staff sign-in",
    signedOutBody: "This area is for Joblop staff only. Sign in with your staff account to continue.",
    signIn: "Sign in",
    error: "We couldn't check your sign-in. Reload the page to try again.",
    groupDaily: "Every day",
    groupMoney: "Hours and money",
    groupPeople: "Companies and people",
    daily: [
      { href: "/orders", title: "Order review", detail: "New employer requests waiting for approval." },
      { href: "/unfilled-shifts", title: "Unfilled shifts", detail: "Approved shifts that still need a worker." },
      { href: "/calendar", title: "Request calendar", detail: "All requests by day." },
      { href: "/contact-desk", title: "Contact desk", detail: "Messages from employers and workers." }
    ],
    money: [
      { href: "/timesheets", title: "Timesheets", detail: "Worked hours to check." },
      { href: "/invoices", title: "Invoices", detail: "Issue invoices and mark them paid." },
      { href: "/payroll", title: "Payroll", detail: "Worker pay for worked hours." },
      { href: "/payouts", title: "Worker payouts", detail: "Payments sent to workers." },
      { href: "/late-cancellations", title: "Late cancellations", detail: "Cancellations less than 24 hours before the start." }
    ],
    people: [
      { href: "/contracts", title: "Employer contracts", detail: "Rates for each role, per company." },
      { href: "/verification", title: "Verification", detail: "Company and worker checks." },
      { href: "/hr", title: "Workers", detail: "Worker files and documents." }
    ]
  },
  fr: {
    eyebrow: "Équipe Joblop",
    title: "Accueil du personnel",
    lede: "Commencez ici chaque jour : révisez les nouvelles demandes, pourvoyez les quarts ouverts, puis vérifiez les heures et l'argent.",
    loading: "Vérification de votre connexion…",
    signedOutTitle: "Connexion du personnel",
    signedOutBody: "Cet espace est réservé au personnel de Joblop. Connectez-vous avec votre compte du personnel pour continuer.",
    signIn: "Se connecter",
    error: "Impossible de vérifier votre connexion. Rechargez la page pour réessayer.",
    groupDaily: "Chaque jour",
    groupMoney: "Heures et argent",
    groupPeople: "Entreprises et personnes",
    daily: [
      { href: "/orders", title: "Révision des commandes", detail: "Nouvelles demandes d'employeurs à approuver." },
      { href: "/unfilled-shifts", title: "Quarts non pourvus", detail: "Quarts approuvés qui attendent encore un travailleur." },
      { href: "/calendar", title: "Calendrier des demandes", detail: "Toutes les demandes par jour." },
      { href: "/contact-desk", title: "Service à la clientèle", detail: "Messages des employeurs et des travailleurs." }
    ],
    money: [
      { href: "/timesheets", title: "Feuilles de temps", detail: "Heures travaillées à vérifier." },
      { href: "/invoices", title: "Factures", detail: "Émettre les factures et les marquer payées." },
      { href: "/payroll", title: "Paie", detail: "Paie des travailleurs pour les heures travaillées." },
      { href: "/payouts", title: "Versements aux travailleurs", detail: "Paiements envoyés aux travailleurs." },
      { href: "/late-cancellations", title: "Annulations tardives", detail: "Annulations moins de 24 heures avant le début." }
    ],
    people: [
      { href: "/contracts", title: "Contrats employeurs", detail: "Taux par poste, pour chaque entreprise." },
      { href: "/verification", title: "Vérification", detail: "Vérification des entreprises et des travailleurs." },
      { href: "/hr", title: "Travailleurs", detail: "Dossiers et documents des travailleurs." }
    ]
  },
  ar: {
    eyebrow: "فريق Joblop",
    title: "الصفحة الرئيسية للفريق",
    lede: "ابدأ من هنا كل يوم: راجع الطلبات الجديدة، واملأ المناوبات المفتوحة، ثم تحقق من الساعات والمال.",
    loading: "جارٍ التحقق من تسجيل دخولك…",
    signedOutTitle: "تسجيل دخول الفريق",
    signedOutBody: "هذه المنطقة مخصّصة لفريق Joblop فقط. سجّل الدخول بحساب الفريق للمتابعة.",
    signIn: "تسجيل الدخول",
    error: "تعذّر التحقق من تسجيل دخولك. أعد تحميل الصفحة للمحاولة مجددًا.",
    groupDaily: "كل يوم",
    groupMoney: "الساعات والمال",
    groupPeople: "الشركات والأشخاص",
    daily: [
      { href: "/orders", title: "مراجعة الطلبات", detail: "طلبات أصحاب العمل الجديدة بانتظار الموافقة." },
      { href: "/unfilled-shifts", title: "مناوبات غير مشغولة", detail: "مناوبات موافق عليها ما زالت تحتاج عاملًا." },
      { href: "/calendar", title: "تقويم الطلبات", detail: "كل الطلبات حسب اليوم." },
      { href: "/contact-desk", title: "مكتب التواصل", detail: "رسائل أصحاب العمل والعمّال." }
    ],
    money: [
      { href: "/timesheets", title: "جداول الساعات", detail: "ساعات العمل التي تحتاج تحققًا." },
      { href: "/invoices", title: "الفواتير", detail: "إصدار الفواتير وتعليمها كمدفوعة." },
      { href: "/payroll", title: "الرواتب", detail: "أجور العمّال عن ساعات العمل." },
      { href: "/payouts", title: "مدفوعات العمّال", detail: "المبالغ المرسلة إلى العمّال." },
      { href: "/late-cancellations", title: "الإلغاءات المتأخرة", detail: "إلغاءات قبل أقل من 24 ساعة من البداية." }
    ],
    people: [
      { href: "/contracts", title: "عقود أصحاب العمل", detail: "الأسعار لكل وظيفة، لكل شركة." },
      { href: "/verification", title: "التحقق", detail: "التحقق من الشركات والعمّال." },
      { href: "/hr", title: "العمّال", detail: "ملفات العمّال ووثائقهم." }
    ]
  }
};
