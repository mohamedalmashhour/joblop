import type { PageText } from "../i18n/pageTextCore";

// Copy for the Employer contracts page, in English, French (Québec) and Arabic.

const en = {
  eyebrow: "Joblop / Finance",
  title: "Employer contracts",
  lede:
    "Set what an employer pays per hour for each role. The employer then reviews and signs it, and " +
    "can only request workers for roles priced here. Publishing replaces the current rate card, so " +
    "the employer must sign again. Jobs already approved keep their rate.",
  employer: "Employer",
  chooseEmployer: "Choose employer…",
  denied: "Your session has ended or this account has no access.",
  loading: "Loading the rate card.",
  loadError: "The rate card could not be loaded.",
  publishing: "Publishing the rate card.",
  publishFailed: "The rate card was not published. Nothing changed. Check the rates and try again.",
  published: "Rate card published. The employer can now review and sign it.",
  publishUnconfirmed: "The rate card could not be confirmed. Refresh to check before trying again.",
  currentContract: (version: string, signed: boolean) =>
    `Current contract ${version}, ${signed ? "signed by the employer" : "waiting for the employer to sign"}.`,
  noContract: "No contract yet. This employer cannot request workers until one is published and signed.",
  perHour: (role: string) => `${role} ($ per hour)`,
  notOffered: "Not offered",
  fixRates: (roles: string) => `Fix these rates: ${roles}.`,
  rolesPriced: (count: number) => `Roles priced: ${count}. Blank roles are left off the contract.`,
  publishingButton: "Publishing…",
  publishButton: "Publish rate card"
};

type ContractsCopy = typeof en;

const fr: ContractsCopy = {
  eyebrow: "Joblop / Finances",
  title: "Contrats employeurs",
  lede:
    "Fixez le tarif horaire que l’employeur paie pour chaque poste. L’employeur le révise et le signe ensuite, " +
    "et ne peut demander des travailleurs que pour les postes tarifés ici. Publier remplace la grille tarifaire " +
    "actuelle, alors l’employeur doit signer de nouveau. Les emplois déjà approuvés gardent leur tarif.",
  employer: "Employeur",
  chooseEmployer: "Choisir un employeur…",
  denied: "Votre session a pris fin ou ce compte n’a pas accès.",
  loading: "Chargement de la grille tarifaire.",
  loadError: "La grille tarifaire n’a pas pu être chargée.",
  publishing: "Publication de la grille tarifaire.",
  publishFailed: "La grille tarifaire n’a pas été publiée. Rien n’a changé. Vérifiez les tarifs et réessayez.",
  published: "Grille tarifaire publiée. L’employeur peut maintenant la réviser et la signer.",
  publishUnconfirmed: "La grille tarifaire n’a pas pu être confirmée. Actualisez pour vérifier avant de réessayer.",
  currentContract: (version: string, signed: boolean) =>
    `Contrat actuel ${version}, ${signed ? "signé par l’employeur" : "en attente de la signature de l’employeur"}.`,
  noContract:
    "Aucun contrat pour l’instant. Cet employeur ne peut pas demander de travailleurs tant qu’un contrat n’est pas publié et signé.",
  perHour: (role: string) => `${role} ($ l’heure)`,
  notOffered: "Non offert",
  fixRates: (roles: string) => `Corrigez ces tarifs : ${roles}.`,
  rolesPriced: (count: number) => `Postes tarifés : ${count}. Les postes laissés vides ne figurent pas au contrat.`,
  publishingButton: "Publication…",
  publishButton: "Publier la grille tarifaire"
};

const ar: ContractsCopy = {
  eyebrow: "Joblop / المالية",
  title: "عقود أصحاب العمل",
  lede:
    "حدّد ما يدفعه صاحب العمل في الساعة لكل وظيفة. يراجع صاحب العمل العقد ثم يوقّعه، ولا يمكنه طلب عمّال " +
    "إلا للوظائف المسعّرة هنا. النشر يستبدل جدول الأسعار الحالي، لذا يجب على صاحب العمل التوقيع من جديد. " +
    "الوظائف المعتمدة مسبقًا تحتفظ بسعرها.",
  employer: "صاحب العمل",
  chooseEmployer: "اختر صاحب العمل…",
  denied: "انتهت جلستك أو أن هذا الحساب لا يملك صلاحية الوصول.",
  loading: "جارٍ تحميل جدول الأسعار.",
  loadError: "تعذّر تحميل جدول الأسعار.",
  publishing: "جارٍ نشر جدول الأسعار.",
  publishFailed: "لم يُنشر جدول الأسعار. لم يتغيّر شيء. تحقّق من الأسعار وحاول مرة أخرى.",
  published: "نُشر جدول الأسعار. يمكن لصاحب العمل الآن مراجعته وتوقيعه.",
  publishUnconfirmed: "تعذّر تأكيد جدول الأسعار. حدّث الصفحة للتحقق قبل المحاولة مرة أخرى.",
  currentContract: (version: string, signed: boolean) =>
    `العقد الحالي ${version}، ${signed ? "وقّعه صاحب العمل" : "بانتظار توقيع صاحب العمل"}.`,
  noContract: "لا يوجد عقد بعد. لا يمكن لصاحب العمل هذا طلب عمّال حتى يُنشر عقد ويُوقَّع.",
  perHour: (role: string) => `${role} (دولار في الساعة)`,
  notOffered: "غير متاح",
  fixRates: (roles: string) => `صحّح هذه الأسعار: ${roles}.`,
  rolesPriced: (count: number) => `الوظائف المسعّرة: ${count}. الوظائف الفارغة لا تُدرج في العقد.`,
  publishingButton: "جارٍ النشر…",
  publishButton: "نشر جدول الأسعار"
};

export const contractsText: PageText<ContractsCopy> = { en, fr, ar };
