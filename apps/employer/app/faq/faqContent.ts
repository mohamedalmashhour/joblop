// Public employer FAQ (EN/FR/AR). Plain answers that match what the platform really does today.
// Owner rule: never state the size of Joblop's service fee or the worker's rate.
// Sources: cancellation — packages/auth/src/employerCancellation.ts (24 h cutoff, 6 h per confirmed
// worker); urgent fees — packages/shared/src/domain/variableClientPricing.ts + platformPricing.ts;
// plans — packages/shared/src/domain/employerPlan.ts; what workers see — worker job detail
// (company name, area, approximate map spot, schedule, duties, qualifications, their own pay);
// worker verification — worker app "ver.*" texts (only a status is shared, never documents).
import type { EmployerLocale } from "../i18n/config";
import type { PublicNavLabels } from "../pricing/publicPageStyles";

/** Stable anchors. The home page FAQ cards link to the first four. */
export const faqIds = [
  "post-a-job",
  "after-posting",
  "who-sees-details",
  "worker-confirmed",
  "who-chooses-workers",
  "six-hour-minimum",
  "urgent",
  "short-or-long-term",
  "plans-and-trial",
  "long-term-listing",
  "paying-and-receipts",
  "cancel-a-shift",
  "cancel-a-plan",
  "worker-checks"
] as const;
export type FaqId = (typeof faqIds)[number];

/** Home page FAQ cards, in the order of landingContent faq.questions. */
export const homeFaqAnchors: readonly FaqId[] = ["after-posting", "who-sees-details", "worker-confirmed", "who-chooses-workers"];

export type FaqCopy = Readonly<{
  nav: PublicNavLabels;
  eyebrow: string;
  title: string;
  lede: string;
  answers: Readonly<Record<FaqId, readonly [question: string, answer: string]>>;
  moreTitle: string;
  moreCopy: string;
  moreButton: string;
}>;

const en: FaqCopy = {
  nav: { home: "Home", howItWorks: "How it works", pricing: "Pricing", plans: "Plans", faq: "FAQ", contact: "Contact", signIn: "Sign in", terms: "Terms", privacy: "Privacy" },
  eyebrow: "FAQ",
  title: "Questions employers ask us.",
  lede: "Short, plain answers. If you don't find yours, contact us.",
  answers: {
    "post-a-job": ["How do I post a job?", "Sign in with your mobile number (we text you a code). Open Request workers, pick the role, the dates and hours, and how many workers you need, then submit. If your company has no account yet, contact us and we will set it up."],
    "after-posting": ["What happens after I post a job?", "Joblop staff review your request. Once it is approved, workers who fit the job can see it and accept it. You follow who is coming in your calendar, and you can change or cancel the request if needed."],
    "who-sees-details": ["Who can see my job details?", "Workers see your company name, the general area of the job, a map spot near it, the dates and hours, the duties and the qualifications you need. They see their own pay only. The hourly rate you pay is never shown to workers."],
    "worker-confirmed": ["When is a worker confirmed?", "A worker is confirmed when they accept your shift and it is assigned to them. You then see them in your calendar under the job."],
    "who-chooses-workers": ["Does a computer choose the workers?", "No. Joblop staff review every request before workers see it, and workers decide themselves to accept a shift. Our system only helps show the job to the right people."],
    "six-hour-minimum": ["What is the 6-hour minimum?", "For short-term shifts, each shift is billed for at least 6 hours, even if the worker works less. Longer shifts are billed for the hours worked."],
    "urgent": ["How much does an urgent request cost?", "An urgent request adds 15% of your hourly rate for each billed hour. An immediate request adds 30%. Both also cost C$5.00 more per billed hour. With Shift Pro or Shift Business, the urgent fee is half price."],
    "short-or-long-term": ["What is the difference between short-term and long-term?", "Short-term is shifts up to 4 weeks: you pay your contract hourly rate (Joblop's service fee is included), and Joblop handles timesheets and invoices. Long-term is a contract over 4 weeks: you pay a monthly listing, then hire and pay the worker directly."],
    "plans-and-trial": ["What are the plans, and is there a free trial?", "Plans are optional and only for short-term shifts. Shift Pro is C$49 a month (5% off every hour, urgent fee half price). Shift Business is C$149 a month (8% off every hour, urgent fee half price). Taxes are added. Each company can try a plan free for 14 days."],
    "long-term-listing": ["How does the long-term job listing work?", "A long-term job listing costs C$99 a month plus taxes, paid in advance. Your first 2 weeks are free, once per company, and your first paid month is 50% off. Workers see the job only after staff approval and while the listing is active."],
    "paying-and-receipts": ["How do I pay, and do I get an invoice?", "You pay by Interac e-transfer. For shifts, we email you an invoice with GST and QST shown; you can also see it under Invoices. For plans and listings, we show the amount with taxes before you send it. Card payments are coming soon."],
    "cancel-a-shift": ["Can I cancel a shift?", "Yes. Canceling 24 hours or more before the start is free. If you cancel later, each confirmed worker is billed 6 hours at your hourly rate."],
    "cancel-a-plan": ["Can I cancel a plan or a listing?", "Yes, at any time. Canceling stops the next month. You keep the plan or listing until the end of the month you already paid."],
    "worker-checks": ["What checks do workers go through?", "Workers sign in with their own phone number, add their documents and certificates, and can verify their identity. Joblop shares only a status such as “Identity verified” — never their personal documents. Tell us if your job needs a specific certificate."]
  },
  moreTitle: "Still have a question?",
  moreCopy: "Contact us and our team will answer you.",
  moreButton: "Contact us"
};

const fr: FaqCopy = {
  nav: { home: "Accueil", howItWorks: "Comment ça marche", pricing: "Tarifs", plans: "Forfaits", faq: "FAQ", contact: "Contact", signIn: "Se connecter", terms: "Conditions", privacy: "Confidentialité" },
  eyebrow: "FAQ",
  title: "Les questions que les employeurs nous posent.",
  lede: "Des réponses courtes et claires. Si vous ne trouvez pas la vôtre, écrivez-nous.",
  answers: {
    "post-a-job": ["Comment publier un emploi?", "Connectez-vous avec votre numéro de cellulaire (nous vous envoyons un code par texto). Ouvrez Demander des travailleurs, choisissez le poste, les dates et heures et le nombre de travailleurs, puis envoyez. Si votre entreprise n'a pas encore de compte, écrivez-nous et nous le créerons."],
    "after-posting": ["Que se passe-t-il après la publication d’un emploi?", "L'équipe de Joblop vérifie votre demande. Une fois approuvée, les travailleurs qui correspondent à l'emploi peuvent la voir et l'accepter. Vous suivez qui vient travailler dans votre calendrier, et vous pouvez modifier ou annuler la demande au besoin."],
    "who-sees-details": ["Qui peut voir les détails de mon emploi?", "Les travailleurs voient le nom de votre entreprise, le secteur de l'emploi, un point approximatif sur la carte, les dates et heures, les tâches et les qualifications demandées. Ils voient seulement leur propre paie. Le tarif horaire que vous payez n'est jamais montré aux travailleurs."],
    "worker-confirmed": ["Quand un travailleur est-il confirmé?", "Un travailleur est confirmé quand il accepte votre quart et que celui-ci lui est attribué. Vous le voyez alors dans votre calendrier, sous l'emploi."],
    "who-chooses-workers": ["Est-ce un ordinateur qui choisit les travailleurs?", "Non. L'équipe de Joblop vérifie chaque demande avant que les travailleurs la voient, et ce sont les travailleurs qui décident d'accepter un quart. Notre système aide seulement à montrer l'emploi aux bonnes personnes."],
    "six-hour-minimum": ["Qu'est-ce que le minimum de 6 heures?", "Pour les quarts à court terme, chaque quart est facturé au moins 6 heures, même si le travailleur travaille moins. Les quarts plus longs sont facturés selon les heures travaillées."],
    "urgent": ["Combien coûte une demande urgente?", "Une demande urgente ajoute 15 % de votre tarif horaire pour chaque heure facturée. Une demande immédiate ajoute 30 %. Les deux coûtent aussi 5,00 $ CA de plus par heure facturée. Avec Shift Pro ou Shift Business, les frais d'urgence sont à moitié prix."],
    "short-or-long-term": ["Quelle est la différence entre court terme et long terme?", "Le court terme, ce sont des quarts jusqu'à 4 semaines : vous payez le tarif horaire de votre contrat (les frais de service de Joblop sont inclus) et Joblop gère les feuilles de temps et les factures. Le long terme, c'est un contrat de plus de 4 semaines : vous payez une annonce mensuelle, puis vous embauchez et payez le travailleur directement."],
    "plans-and-trial": ["Quels sont les forfaits, et y a-t-il un essai gratuit?", "Les forfaits sont optionnels et seulement pour les quarts à court terme. Shift Pro coûte 49 $ CA par mois (5 % de rabais sur chaque heure, frais d'urgence à moitié prix). Shift Business coûte 149 $ CA par mois (8 % de rabais sur chaque heure, frais d'urgence à moitié prix). Les taxes s'ajoutent. Chaque entreprise peut essayer un forfait gratuitement pendant 14 jours."],
    "long-term-listing": ["Comment fonctionne l'annonce d'emploi à long terme?", "Une annonce d'emploi à long terme coûte 99 $ CA par mois plus taxes, payé d'avance. Vos 2 premières semaines sont gratuites, une fois par entreprise, et votre premier mois payé est à 50 % de rabais. Les travailleurs voient l'emploi seulement après l'approbation de l'équipe et tant que l'annonce est active."],
    "paying-and-receipts": ["Comment payer, et est-ce que je reçois une facture?", "Vous payez par virement Interac. Pour les quarts, nous vous envoyons une facture par courriel avec la TPS et la TVQ; vous la voyez aussi sous Factures. Pour les forfaits et les annonces, nous affichons le montant avec les taxes avant que vous l'envoyiez. Le paiement par carte arrive bientôt."],
    "cancel-a-shift": ["Puis-je annuler un quart?", "Oui. L'annulation 24 heures ou plus avant le début est gratuite. Si vous annulez plus tard, 6 heures à votre tarif horaire sont facturées pour chaque travailleur confirmé."],
    "cancel-a-plan": ["Puis-je annuler un forfait ou une annonce?", "Oui, en tout temps. L'annulation arrête le mois suivant. Vous gardez le forfait ou l'annonce jusqu'à la fin du mois déjà payé."],
    "worker-checks": ["Quelles vérifications les travailleurs passent-ils?", "Les travailleurs se connectent avec leur propre numéro de téléphone, ajoutent leurs documents et certificats et peuvent faire vérifier leur identité. Joblop partage seulement un statut comme « Identité vérifiée », jamais leurs documents personnels. Dites-nous si votre emploi exige un certificat précis."]
  },
  moreTitle: "Vous avez encore une question?",
  moreCopy: "Écrivez-nous et notre équipe vous répondra.",
  moreButton: "Nous joindre"
};

const ar: FaqCopy = {
  nav: { home: "الرئيسية", howItWorks: "كيف يعمل", pricing: "الأسعار", plans: "الباقات", faq: "الأسئلة الشائعة", contact: "اتصل بنا", signIn: "تسجيل الدخول", terms: "الشروط", privacy: "الخصوصية" },
  eyebrow: "الأسئلة الشائعة",
  title: "أسئلة يطرحها علينا أصحاب العمل.",
  lede: "إجابات قصيرة وواضحة. إن لم تجد سؤالك، تواصل معنا.",
  answers: {
    "post-a-job": ["كيف أنشر وظيفة؟", "سجّل الدخول برقم هاتفك المحمول (نرسل لك رمزًا برسالة نصية). افتح «طلب عمال»، واختر الوظيفة والتواريخ والساعات وعدد العمال، ثم أرسل الطلب. إن لم يكن لشركتك حساب بعد، تواصل معنا وسننشئه لك."],
    "after-posting": ["ماذا يحدث بعد نشر الوظيفة؟", "يراجع فريق Joblop طلبك. بعد الموافقة، يستطيع العمال المناسبون رؤيته وقبوله. تتابع من سيأتي في تقويمك، ويمكنك تعديل الطلب أو إلغاؤه عند الحاجة."],
    "who-sees-details": ["من يمكنه رؤية تفاصيل وظيفتي؟", "يرى العمال اسم شركتك، والمنطقة العامة للوظيفة، وموقعًا تقريبيًا على الخريطة، والتواريخ والساعات، والمهام والمؤهلات المطلوبة. ويرون أجرهم فقط. التعرفة بالساعة التي تدفعها لا تُعرض على العمال أبدًا."],
    "worker-confirmed": ["متى يتم تأكيد العامل؟", "يتم تأكيد العامل عندما يقبل مناوبتك وتُسند إليه. بعدها تراه في تقويمك تحت الوظيفة."],
    "who-chooses-workers": ["هل يختار الحاسوب العمال؟", "لا. يراجع فريق Joblop كل طلب قبل أن يراه العمال، والعمال هم من يقرّرون قبول المناوبة. نظامنا يساعد فقط في عرض الوظيفة على الأشخاص المناسبين."],
    "six-hour-minimum": ["ما هو الحد الأدنى 6 ساعات؟", "في المناوبات قصيرة الأمد، تُحسب كل مناوبة 6 ساعات على الأقل حتى لو عمل العامل أقل. المناوبات الأطول تُحسب بالساعات الفعلية."],
    "urgent": ["كم يكلّف الطلب العاجل؟", "الطلب العاجل يضيف 15% من تعرفتك بالساعة عن كل ساعة محسوبة. الطلب الفوري يضيف 30%. وكلاهما يكلّف أيضًا 5.00 دولار كندي إضافية عن كل ساعة محسوبة. مع Shift Pro أو Shift Business تكون رسوم الاستعجال بنصف السعر."],
    "short-or-long-term": ["ما الفرق بين قصير الأمد وطويل الأمد؟", "قصير الأمد مناوبات حتى 4 أسابيع: تدفع التعرفة بالساعة في عقدك (رسوم خدمة Joblop مشمولة)، ويتولى Joblop أوراق الدوام والفواتير. طويل الأمد عقد أطول من 4 أسابيع: تدفع إعلانًا شهريًا، ثم توظّف العامل وتدفع له مباشرة."],
    "plans-and-trial": ["ما هي الباقات، وهل هناك تجربة مجانية؟", "الباقات اختيارية وللمناوبات قصيرة الأمد فقط. Shift Pro بسعر 49 دولارًا كنديًا شهريًا (خصم 5% على كل ساعة، ورسوم الاستعجال بنصف السعر). Shift Business بسعر 149 دولارًا كنديًا شهريًا (خصم 8% على كل ساعة، ورسوم الاستعجال بنصف السعر). تُضاف الضرائب. يمكن لكل شركة تجربة باقة مجانًا لمدة 14 يومًا."],
    "long-term-listing": ["كيف يعمل إعلان الوظيفة طويلة الأمد؟", "يكلّف إعلان الوظيفة طويلة الأمد 99 دولارًا كنديًا شهريًا مع الضرائب، يُدفع مقدمًا. أول أسبوعين مجانًا، مرة واحدة لكل شركة، وأول شهر مدفوع بخصم 50%. لا يرى العمال الوظيفة إلا بعد موافقة الفريق وطالما الإعلان نشط."],
    "paying-and-receipts": ["كيف أدفع، وهل أحصل على فاتورة؟", "تدفع عبر تحويل Interac الإلكتروني. للمناوبات، نرسل لك فاتورة بالبريد الإلكتروني تظهر فيها ضريبتا GST وQST، وتجدها أيضًا في «الفواتير». للباقات والإعلانات، نعرض المبلغ مع الضرائب قبل أن ترسله. الدفع بالبطاقة قريبًا."],
    "cancel-a-shift": ["هل يمكنني إلغاء مناوبة؟", "نعم. الإلغاء قبل البدء بـ 24 ساعة أو أكثر مجاني. إذا ألغيت بعد ذلك، تُحسب 6 ساعات بتعرفتك عن كل عامل مؤكَّد."],
    "cancel-a-plan": ["هل يمكنني إلغاء باقة أو إعلان؟", "نعم، في أي وقت. الإلغاء يوقف الشهر التالي. تحتفظ بالباقة أو الإعلان حتى نهاية الشهر الذي دفعته."],
    "worker-checks": ["ما الفحوصات التي يخضع لها العمال؟", "يسجّل العمال الدخول برقم هاتفهم، ويضيفون وثائقهم وشهاداتهم، ويمكنهم توثيق هويتهم. يشارك Joblop حالة فقط مثل «تم التحقق من الهوية»، ولا يشارك وثائقهم الشخصية أبدًا. أخبرنا إن كانت وظيفتك تتطلب شهادة معيّنة."]
  },
  moreTitle: "ما زال لديك سؤال؟",
  moreCopy: "تواصل معنا وسيرد عليك فريقنا.",
  moreButton: "اتصل بنا"
};

export const faqCopy: Readonly<Record<EmployerLocale, FaqCopy>> = { "en-CA": en, "fr-CA": fr, ar };
