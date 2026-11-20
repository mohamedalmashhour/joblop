// Public /pricing copy (EN/FR/AR). Plain words, real prices, no hidden fees.
// Owner rule: never state the size of Joblop's service fee ("includes Joblop's service fee" is fine)
// and never mention the worker's rate.
//
// Facts used here come from code:
// - Urgent fee +15% / immediate +30% of the hourly rate, per billed hour:
//   packages/shared/src/domain/variableClientPricing.ts (URGENT_/IMMEDIATE_CLIENT_SURCHARGE_PPM),
//   applied in apps/api/src/requestPricingSnapshot.ts and billed in apps/api/src/invoiceFromTimesheet.ts.
// - Urgent/immediate jobs also add C$5.00 per billed hour (stated without saying who receives it):
//   packages/shared/src/domain/platformPricing.ts (URGENT_HOURLY_PREMIUM_MINOR = 500).
// - Paid plans halve the urgent fee: packages/shared/src/domain/employerPlan.ts (urgentSurchargeFactorPpm).
// - Travel beyond 25 km of greater Montréal: C$0.25/km + C$25/h driving time, both ways
//   (variableClientPricing.ts distanceSurchargeMinor).
// - 6-hour minimum per shift: invoiceFromTimesheet.ts billableHours.
import type { EmployerLocale } from "../i18n/config";

export type PricingPlanCard = Readonly<{ name: string; price: string; points: readonly string[] }>;

export type PricingCopy = Readonly<{
  nav: Readonly<{ home: string; howItWorks: string; pricing: string; plans: string; faq: string; contact: string; signIn: string; terms: string; privacy: string }>;
  eyebrow: string;
  title: string;
  lede: string;
  shortTitle: string;
  shortIntro: string;
  shortPoints: readonly string[];
  plansTitle: string;
  plansIntro: string;
  plans: readonly PricingPlanCard[];
  plansLink: string;
  longTitle: string;
  longIntro: string;
  longPoints: readonly string[];
  payTitle: string;
  payPoints: readonly string[];
  cancelTitle: string;
  cancelPoints: readonly string[];
  ctaTitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  footerFaq: string;
}>;

const en: PricingCopy = {
  nav: { home: "Home", howItWorks: "How it works", pricing: "Pricing", plans: "Plans", faq: "FAQ", contact: "Contact", signIn: "Sign in", terms: "Terms", privacy: "Privacy" },
  eyebrow: "Pricing",
  title: "Simple prices. No hidden fees.",
  lede: "Short shifts are billed by the hour. Long-term jobs are a monthly listing. Taxes are shown on top of every price.",
  shortTitle: "Short-term shifts (up to 4 weeks)",
  shortIntro: "You pay the hourly rate in your contract with Joblop. Joblop's service fee is already included in that rate.",
  shortPoints: [
    "Each shift is billed for at least 6 hours, even if the worker works less.",
    "Urgent request: an urgent fee of 15% of your hourly rate, for each billed hour.",
    "Immediate request: an urgent fee of 30% of your hourly rate, for each billed hour.",
    "Urgent and immediate shifts also cost C$5.00 more per billed hour.",
    "Worksite more than 25 km from greater Montréal: a travel charge of C$0.25 per km plus driving time at C$25 an hour, counted both ways.",
    "GST (5%) and QST (9.975%) are added to the total.",
    "We email you an invoice after the work is done."
  ],
  plansTitle: "Optional plans for short-term shifts",
  plansIntro: "Pay per shift with no plan, or pick a monthly plan to save on every hour. Try any plan free for 14 days.",
  plans: [
    { name: "Shift Pro", price: "C$49 / month + taxes", points: ["5% off every hour", "Urgent fee at half price", "14-day free trial"] },
    { name: "Shift Business", price: "C$149 / month + taxes", points: ["8% off every hour", "Urgent fee at half price", "14-day free trial"] }
  ],
  plansLink: "See plans and savings",
  longTitle: "Long-term jobs (contract over 4 weeks)",
  longIntro: "You hire the worker and pay them directly. Joblop charges only the monthly listing.",
  longPoints: [
    "C$99 per job listing per month + taxes, paid in advance.",
    "Your first 2 weeks are free, once per company.",
    "After that, your first paid month is 50% off.",
    "No hourly billing, timesheets or invoices from Joblop for these jobs."
  ],
  payTitle: "How you pay",
  payPoints: [
    "Pay by Interac e-transfer. We show you the amount with taxes and where to send it.",
    "Card payments are coming soon."
  ],
  cancelTitle: "Canceling",
  cancelPoints: [
    "Plans and listings: canceling stops the next month. Months already paid are not refunded.",
    "A shift can be canceled at no charge 24 hours or more before it starts. Later than that, each confirmed worker is billed 6 hours."
  ],
  ctaTitle: "Ready to request workers?",
  ctaPrimary: "Sign in",
  ctaSecondary: "Contact us",
  footerFaq: "Questions? Read the FAQ"
};

const fr: PricingCopy = {
  nav: { home: "Accueil", howItWorks: "Comment ça marche", pricing: "Tarifs", plans: "Forfaits", faq: "FAQ", contact: "Contact", signIn: "Se connecter", terms: "Conditions", privacy: "Confidentialité" },
  eyebrow: "Tarifs",
  title: "Des prix simples. Aucuns frais cachés.",
  lede: "Les quarts courts sont facturés à l'heure. Les emplois à long terme sont une annonce mensuelle. Les taxes s'ajoutent à chaque prix.",
  shortTitle: "Quarts à court terme (jusqu'à 4 semaines)",
  shortIntro: "Vous payez le tarif horaire prévu dans votre contrat avec Joblop. Les frais de service de Joblop sont déjà inclus dans ce tarif.",
  shortPoints: [
    "Chaque quart est facturé au moins 6 heures, même si le travailleur travaille moins.",
    "Demande urgente : des frais d'urgence de 15 % de votre tarif horaire, pour chaque heure facturée.",
    "Demande immédiate : des frais d'urgence de 30 % de votre tarif horaire, pour chaque heure facturée.",
    "Les quarts urgents et immédiats coûtent aussi 5,00 $ CA de plus par heure facturée.",
    "Lieu de travail à plus de 25 km du Grand Montréal : des frais de déplacement de 0,25 $ CA par km plus le temps de route à 25 $ CA l'heure, aller et retour.",
    "La TPS (5 %) et la TVQ (9,975 %) s'ajoutent au total.",
    "Nous vous envoyons la facture par courriel une fois le travail fait."
  ],
  plansTitle: "Forfaits optionnels pour les quarts à court terme",
  plansIntro: "Payez au quart sans forfait, ou choisissez un forfait mensuel pour économiser sur chaque heure. Essayez un forfait gratuitement pendant 14 jours.",
  plans: [
    { name: "Shift Pro", price: "49 $ CA / mois + taxes", points: ["5 % de rabais sur chaque heure", "Frais d'urgence à moitié prix", "Essai gratuit de 14 jours"] },
    { name: "Shift Business", price: "149 $ CA / mois + taxes", points: ["8 % de rabais sur chaque heure", "Frais d'urgence à moitié prix", "Essai gratuit de 14 jours"] }
  ],
  plansLink: "Voir les forfaits et les économies",
  longTitle: "Emplois à long terme (contrat de plus de 4 semaines)",
  longIntro: "Vous embauchez le travailleur et le payez directement. Joblop facture seulement l'annonce mensuelle.",
  longPoints: [
    "99 $ CA par annonce d'emploi par mois + taxes, payé d'avance.",
    "Vos 2 premières semaines sont gratuites, une fois par entreprise.",
    "Ensuite, votre premier mois payé est à 50 % de rabais.",
    "Aucune facturation à l'heure, feuille de temps ou facture de Joblop pour ces emplois."
  ],
  payTitle: "Comment payer",
  payPoints: [
    "Payez par virement Interac. Nous vous montrons le montant avec les taxes et où l'envoyer.",
    "Le paiement par carte arrive bientôt."
  ],
  cancelTitle: "Annulation",
  cancelPoints: [
    "Forfaits et annonces : l'annulation arrête le mois suivant. Les mois déjà payés ne sont pas remboursés.",
    "Un quart peut être annulé sans frais 24 heures ou plus avant son début. Plus tard, 6 heures sont facturées pour chaque travailleur confirmé."
  ],
  ctaTitle: "Prêt à demander des travailleurs?",
  ctaPrimary: "Se connecter",
  ctaSecondary: "Nous joindre",
  footerFaq: "Des questions? Lisez la FAQ"
};

const ar: PricingCopy = {
  nav: { home: "الرئيسية", howItWorks: "كيف يعمل", pricing: "الأسعار", plans: "الباقات", faq: "الأسئلة الشائعة", contact: "اتصل بنا", signIn: "تسجيل الدخول", terms: "الشروط", privacy: "الخصوصية" },
  eyebrow: "الأسعار",
  title: "أسعار بسيطة. بلا رسوم مخفية.",
  lede: "المناوبات القصيرة تُحسب بالساعة. الوظائف طويلة الأمد إعلان شهري. تُضاف الضرائب فوق كل سعر.",
  shortTitle: "مناوبات قصيرة الأمد (حتى 4 أسابيع)",
  shortIntro: "تدفع التعرفة بالساعة المذكورة في عقدك مع Joblop. رسوم خدمة Joblop مشمولة في هذه التعرفة.",
  shortPoints: [
    "تُحسب كل مناوبة 6 ساعات على الأقل، حتى لو عمل العامل أقل.",
    "طلب عاجل: رسوم استعجال قدرها 15% من تعرفتك بالساعة، عن كل ساعة محسوبة.",
    "طلب فوري: رسوم استعجال قدرها 30% من تعرفتك بالساعة، عن كل ساعة محسوبة.",
    "المناوبات العاجلة والفورية تكلّف أيضًا 5.00 دولار كندي إضافية عن كل ساعة محسوبة.",
    "مكان عمل يبعد أكثر من 25 كم عن مونتريال الكبرى: رسوم تنقّل قدرها 0.25 دولار كندي لكل كم مع وقت القيادة بسعر 25 دولارًا كنديًا في الساعة، ذهابًا وإيابًا.",
    "تُضاف ضريبة GST (5%) وضريبة QST (9.975%) إلى المجموع.",
    "نرسل لك الفاتورة بالبريد الإلكتروني بعد انتهاء العمل."
  ],
  plansTitle: "باقات اختيارية للمناوبات قصيرة الأمد",
  plansIntro: "ادفع لكل مناوبة بلا باقة، أو اختر باقة شهرية لتوفّر على كل ساعة. جرّب أي باقة مجانًا لمدة 14 يومًا.",
  plans: [
    { name: "Shift Pro", price: "49 دولارًا كنديًا / شهريًا + الضرائب", points: ["خصم 5% على كل ساعة", "رسوم الاستعجال بنصف السعر", "تجربة مجانية 14 يومًا"] },
    { name: "Shift Business", price: "149 دولارًا كنديًا / شهريًا + الضرائب", points: ["خصم 8% على كل ساعة", "رسوم الاستعجال بنصف السعر", "تجربة مجانية 14 يومًا"] }
  ],
  plansLink: "اطّلع على الباقات والتوفير",
  longTitle: "وظائف طويلة الأمد (عقد أطول من 4 أسابيع)",
  longIntro: "أنت توظّف العامل وتدفع له مباشرة. يفرض Joblop رسوم الإعلان الشهري فقط.",
  longPoints: [
    "99 دولارًا كنديًا لكل إعلان وظيفة شهريًا + الضرائب، تُدفع مقدمًا.",
    "أول أسبوعين مجانًا، مرة واحدة لكل شركة.",
    "بعد ذلك، أول شهر مدفوع بخصم 50%.",
    "لا فوترة بالساعة ولا أوراق دوام ولا فواتير من Joblop لهذه الوظائف."
  ],
  payTitle: "طريقة الدفع",
  payPoints: [
    "ادفع عبر تحويل Interac الإلكتروني. نعرض لك المبلغ مع الضرائب وأين ترسله.",
    "الدفع بالبطاقة قريبًا."
  ],
  cancelTitle: "الإلغاء",
  cancelPoints: [
    "الباقات والإعلانات: الإلغاء يوقف الشهر التالي. لا تُسترد الأشهر المدفوعة مسبقًا.",
    "يمكن إلغاء المناوبة مجانًا قبل بدئها بـ 24 ساعة أو أكثر. بعد ذلك تُحسب 6 ساعات عن كل عامل مؤكَّد."
  ],
  ctaTitle: "هل أنت مستعد لطلب عمال؟",
  ctaPrimary: "تسجيل الدخول",
  ctaSecondary: "اتصل بنا",
  footerFaq: "لديك أسئلة؟ اقرأ الأسئلة الشائعة"
};

export const pricingCopy: Readonly<Record<EmployerLocale, PricingCopy>> = { "en-CA": en, "fr-CA": fr, ar };
