export const trustMechanisms = [
  {
    title: "Verified worker onboarding",
    text: "Workers move through controlled onboarding before they can participate in governed staffing workflows."
  },
  {
    title: "Credential verification workflow",
    text: "Credential information is routed through review states instead of being treated as automatically approved."
  },
  {
    title: "Background check process",
    text: "Background-check status is represented where available and applicable, without implying universal availability."
  },
  {
    title: "Attendance verification",
    text: "Shift records distinguish scheduled time, attendance evidence, review, and approved outcomes."
  },
  {
    title: "Secure document handling",
    text: "Sensitive documents belong in controlled workflows with limited visibility and review boundaries."
  },
  {
    title: "Human oversight",
    text: "AI-assisted matching supports review. It does not replace authorized human decisions."
  },
  {
    title: "Operational transparency",
    text: "Requests, approvals, attendance, communication, and financial handoffs are designed to stay traceable."
  },
  {
    title: "Auditability",
    text: "Important actions are designed to preserve who acted, what changed, when it happened, and why."
  }
] as const;

export const operatingPhilosophy = [
  "Verify first",
  "Match carefully",
  "Human approval",
  "Track work",
  "Preserve records",
  "Separate billing from compensation"
] as const;

export const servedOrganizations = [
  "Hospitals",
  "Senior residences",
  "Hotels",
  "Restaurants",
  "Factories",
  "Temporary staffing agencies"
] as const;

export const platformCapabilities = [
  "Worker intake",
  "Client request intake",
  "Group-based staffing categories",
  "AI-assisted matching",
  "Human approval",
  "Attendance tracking",
  "Billing and worker-pay separation",
  "Documentation and audit trail"
] as const;

export const trustStatements = [
  {
    audience: "Employers",
    text: "Employers receive clearer request, approval, attendance, communication, and billing records."
  },
  {
    audience: "Workers",
    text: "Workers are matched according to role, profile, availability, and approved employer needs."
  }
] as const;

export const aiBoundary = [
  "AI can prepare recommendations.",
  "AI can identify missing information.",
  "AI cannot dispatch workers automatically.",
  "AI cannot approve compliance decisions.",
  "AI cannot approve pay or final operational decisions."
] as const;

// ---------------------------------------------------------------------------------------------
// Localized page copy (EN / FR Québec / AR). English values equal the exports above.
// ---------------------------------------------------------------------------------------------
type Card = Readonly<{ title: string; text: string }>;

export type AboutCopy = Readonly<{
  eyebrow: string;
  title: string;
  lede: string;
  requestStaff: string;
  becomeWorker: string;
  contactUs: string;
  panelAria: string;
  panelKicker: string;
  panelTitle: string;
  panelText: string;
  trustEyebrow: string;
  trustTitle: string;
  trustMechanisms: readonly Card[];
  trustStatements: readonly Readonly<{ audience: string; text: string }>[];
  problemEyebrow: string;
  problemTitle: string;
  problemCopy: string;
  doesEyebrow: string;
  platformCapabilities: readonly string[];
  servesEyebrow: string;
  servesTitle: string;
  servedOrganizations: readonly string[];
  philosophyEyebrow: string;
  philosophyTitle: string;
  operatingPhilosophy: readonly string[];
  aiEyebrow: string;
  aiTitle: string;
  aiCopy: string;
  aiBoundary: readonly string[];
  nextEyebrow: string;
  nextTitle: string;
}>;

const aboutEn: AboutCopy = {
  eyebrow: "About Joblop",
  title: "Staffing operations for organizations that need reliable workers and clear records.",
  lede: "Joblop helps organizations manage workforce requests with verified workflows, human approval, attendance evidence, and privacy-aware records.",
  requestStaff: "Request staff",
  becomeWorker: "Become a worker",
  contactUs: "Contact us",
  panelAria: "About page implementation guardrail",
  panelKicker: "Trust rule",
  panelTitle: "Mechanisms, not unsupported claims.",
  panelText:
    "This page describes how the platform is designed to operate. It does not show fake metrics, fabricated testimonials, unsupported certifications, or country-specific regulatory claims.",
  trustEyebrow: "Why trust Joblop",
  trustTitle: "Trust is built through controlled workflows, clear records, and human review.",
  trustMechanisms,
  trustStatements,
  problemEyebrow: "The problem",
  problemTitle: "Staffing gaps affect service continuity and operational confidence.",
  problemCopy:
    "Healthcare and senior-living staffing cannot depend on listings alone. Teams need request intake, worker readiness, attendance evidence, communication, and governed handoffs.",
  doesEyebrow: "What the platform does",
  platformCapabilities,
  servesEyebrow: "Who it serves",
  servesTitle: "Built for care-focused organizations and the workers who support them.",
  servedOrganizations,
  philosophyEyebrow: "Operating philosophy",
  philosophyTitle: "A governed workflow from request to record.",
  operatingPhilosophy,
  aiEyebrow: "AI advisory philosophy",
  aiTitle: "AI recommendation, human review, final decision.",
  aiCopy: "Joblop uses AI as decision support. Operational authority remains with approved human workflows.",
  aiBoundary,
  nextEyebrow: "Next step",
  nextTitle: "Choose the path that matches your role."
};

const aboutFr: AboutCopy = {
  eyebrow: "À propos de Joblop",
  title: "La gestion du personnel pour les organisations qui ont besoin de travailleurs fiables et de dossiers clairs.",
  lede: "Joblop aide les organisations à gérer leurs demandes de main-d'œuvre avec des étapes vérifiées, une approbation humaine, des preuves de présence et des dossiers qui respectent la vie privée.",
  requestStaff: "Demander du personnel",
  becomeWorker: "Devenir travailleur",
  contactUs: "Nous joindre",
  panelAria: "Règle de confiance de la page À propos",
  panelKicker: "Règle de confiance",
  panelTitle: "Des mécanismes, pas des promesses sans preuve.",
  panelText:
    "Cette page décrit comment la plateforme est conçue pour fonctionner. Elle ne montre pas de faux chiffres, de faux témoignages, de certifications non prouvées ni d'affirmations réglementaires propres à un pays.",
  trustEyebrow: "Pourquoi faire confiance à Joblop",
  trustTitle: "La confiance repose sur des étapes contrôlées, des dossiers clairs et une révision humaine.",
  trustMechanisms: [
    { title: "Inscription vérifiée des travailleurs", text: "Les travailleurs passent par une inscription contrôlée avant de participer aux processus de dotation." },
    { title: "Vérification des attestations", text: "Les attestations passent par des étapes de révision au lieu d'être approuvées automatiquement." },
    { title: "Vérification des antécédents", text: "Le statut de vérification des antécédents est indiqué lorsqu'il est disponible et applicable, sans laisser croire qu'il l'est toujours." },
    { title: "Vérification de la présence", text: "Les dossiers de quart distinguent l'horaire prévu, les preuves de présence, la révision et le résultat approuvé." },
    { title: "Gestion sécurisée des documents", text: "Les documents sensibles restent dans des processus contrôlés, avec une visibilité limitée et des règles de révision." },
    { title: "Supervision humaine", text: "Le jumelage assisté par l'IA aide à la révision. Il ne remplace pas les décisions humaines autorisées." },
    { title: "Transparence des opérations", text: "Les demandes, approbations, présences, communications et transferts financiers sont conçus pour rester traçables." },
    { title: "Traçabilité", text: "Les actions importantes sont conçues pour garder qui a agi, ce qui a changé, quand et pourquoi." }
  ],
  trustStatements: [
    { audience: "Employeurs", text: "Les employeurs reçoivent des dossiers plus clairs pour les demandes, approbations, présences, communications et la facturation." },
    { audience: "Travailleurs", text: "Les travailleurs sont jumelés selon le poste, le profil, les disponibilités et les besoins approuvés de l'employeur." }
  ],
  problemEyebrow: "Le problème",
  problemTitle: "Le manque de personnel nuit à la continuité des services et à la confiance des équipes.",
  problemCopy:
    "La dotation en santé et en résidences pour aînés ne peut pas reposer seulement sur des annonces. Les équipes ont besoin de recevoir les demandes, de travailleurs prêts, de preuves de présence, de communication et de transferts encadrés.",
  doesEyebrow: "Ce que fait la plateforme",
  platformCapabilities: [
    "Inscription des travailleurs",
    "Réception des demandes des clients",
    "Catégories de dotation par groupe",
    "Jumelage assisté par l'IA",
    "Approbation humaine",
    "Suivi de la présence",
    "Séparation de la facturation et de la paie des travailleurs",
    "Documentation et piste de vérification"
  ],
  servesEyebrow: "Pour qui",
  servesTitle: "Conçu pour les organisations de soins et les travailleurs qui les soutiennent.",
  servedOrganizations: ["Hôpitaux", "Résidences pour aînés", "Hôtels", "Restaurants", "Usines", "Agences de placement temporaire"],
  philosophyEyebrow: "Notre façon de travailler",
  philosophyTitle: "Un processus encadré, de la demande au dossier.",
  operatingPhilosophy: [
    "Vérifier d'abord",
    "Jumeler avec soin",
    "Approbation humaine",
    "Suivre le travail",
    "Conserver les dossiers",
    "Séparer la facturation de la rémunération"
  ],
  aiEyebrow: "Le rôle de l'IA",
  aiTitle: "L'IA recommande, une personne révise et décide.",
  aiCopy: "Joblop utilise l'IA comme aide à la décision. Les décisions opérationnelles restent entre les mains de personnes autorisées.",
  aiBoundary: [
    "L'IA peut préparer des recommandations.",
    "L'IA peut repérer les renseignements manquants.",
    "L'IA ne peut pas affecter des travailleurs automatiquement.",
    "L'IA ne peut pas approuver les décisions de conformité.",
    "L'IA ne peut pas approuver la paie ni les décisions opérationnelles finales."
  ],
  nextEyebrow: "Prochaine étape",
  nextTitle: "Choisissez le chemin qui correspond à votre rôle."
};

const aboutAr: AboutCopy = {
  eyebrow: "عن Joblop",
  title: "إدارة التوظيف للمؤسسات التي تحتاج إلى عمّال موثوقين وسجلات واضحة.",
  lede: "يساعد Joblop المؤسسات على إدارة طلبات العمالة بخطوات موثّقة وموافقة بشرية وإثبات للحضور وسجلات تحترم الخصوصية.",
  requestStaff: "اطلب عمّالًا",
  becomeWorker: "انضم كعامل",
  contactUs: "تواصل معنا",
  panelAria: "قاعدة الثقة في صفحة من نحن",
  panelKicker: "قاعدة الثقة",
  panelTitle: "آليات واضحة، لا ادعاءات بلا دليل.",
  panelText:
    "تشرح هذه الصفحة كيف صُممت المنصة لتعمل. لا تعرض أرقامًا مزيفة ولا شهادات عملاء مختلقة ولا اعتمادات غير مثبتة ولا ادعاءات تنظيمية خاصة ببلد معيّن.",
  trustEyebrow: "لماذا تثق بـ Joblop",
  trustTitle: "تُبنى الثقة بخطوات مضبوطة وسجلات واضحة ومراجعة بشرية.",
  trustMechanisms: [
    { title: "تسجيل موثّق للعمّال", text: "يمر العمّال بتسجيل مضبوط قبل أن يشاركوا في عمليات التوظيف." },
    { title: "التحقق من الشهادات", text: "تمر معلومات الشهادات بمراحل مراجعة بدل اعتمادها تلقائيًا." },
    { title: "فحص السوابق", text: "تُعرض حالة فحص السوابق عندما تكون متاحة ومنطبقة، دون الإيحاء بأنها متاحة دائمًا." },
    { title: "التحقق من الحضور", text: "تفرّق سجلات المناوبات بين الوقت المجدول وإثبات الحضور والمراجعة والنتيجة المعتمدة." },
    { title: "التعامل الآمن مع المستندات", text: "تبقى المستندات الحساسة ضمن خطوات مضبوطة مع اطلاع محدود وقواعد للمراجعة." },
    { title: "إشراف بشري", text: "المطابقة بمساعدة الذكاء الاصطناعي تدعم المراجعة، ولا تحل محل القرارات البشرية المخوّلة." },
    { title: "شفافية العمل", text: "صُممت الطلبات والموافقات والحضور والتواصل والتحويلات المالية لتبقى قابلة للتتبع." },
    { title: "قابلية التدقيق", text: "صُممت الإجراءات المهمة لتحفظ من قام بها وما الذي تغيّر ومتى ولماذا." }
  ],
  trustStatements: [
    { audience: "أصحاب العمل", text: "يحصل أصحاب العمل على سجلات أوضح للطلبات والموافقات والحضور والتواصل والفواتير." },
    { audience: "العمّال", text: "تتم مطابقة العمّال حسب الوظيفة والملف الشخصي والتوفر واحتياجات صاحب العمل المعتمدة." }
  ],
  problemEyebrow: "المشكلة",
  problemTitle: "نقص العمّال يؤثر على استمرارية الخدمة وثقة الفرق.",
  problemCopy:
    "لا يمكن أن يعتمد التوظيف في الرعاية الصحية ومساكن كبار السن على الإعلانات وحدها. تحتاج الفرق إلى استقبال الطلبات وعمّال جاهزين وإثبات للحضور وتواصل وتسليم منظّم.",
  doesEyebrow: "ما الذي تقدمه المنصة",
  platformCapabilities: [
    "تسجيل العمّال",
    "استقبال طلبات العملاء",
    "فئات توظيف حسب المجموعات",
    "مطابقة بمساعدة الذكاء الاصطناعي",
    "موافقة بشرية",
    "تتبع الحضور",
    "فصل الفواتير عن أجور العمّال",
    "التوثيق وسجل التدقيق"
  ],
  servesEyebrow: "لمن هي",
  servesTitle: "مصممة لمؤسسات الرعاية والعمّال الذين يدعمونها.",
  servedOrganizations: ["المستشفيات", "مساكن كبار السن", "الفنادق", "المطاعم", "المصانع", "وكالات التوظيف المؤقت"],
  philosophyEyebrow: "طريقة عملنا",
  philosophyTitle: "خطوات منظّمة من الطلب إلى السجل.",
  operatingPhilosophy: [
    "التحقق أولًا",
    "المطابقة بعناية",
    "موافقة بشرية",
    "تتبع العمل",
    "حفظ السجلات",
    "فصل الفواتير عن الأجور"
  ],
  aiEyebrow: "دور الذكاء الاصطناعي",
  aiTitle: "الذكاء الاصطناعي يقترح، والإنسان يراجع ويقرر.",
  aiCopy: "يستخدم Joblop الذكاء الاصطناعي لدعم القرار فقط. تبقى القرارات التشغيلية بيد أشخاص مخوّلين.",
  aiBoundary: [
    "يمكن للذكاء الاصطناعي إعداد توصيات.",
    "يمكن للذكاء الاصطناعي تحديد المعلومات الناقصة.",
    "لا يمكن للذكاء الاصطناعي إرسال العمّال تلقائيًا.",
    "لا يمكن للذكاء الاصطناعي اعتماد قرارات الامتثال.",
    "لا يمكن للذكاء الاصطناعي اعتماد الأجور أو القرارات التشغيلية النهائية."
  ],
  nextEyebrow: "الخطوة التالية",
  nextTitle: "اختر الطريق الذي يناسب دورك."
};

export const aboutCopy: Readonly<Record<"en-CA" | "fr-CA" | "ar", AboutCopy>> = {
  "en-CA": aboutEn,
  "fr-CA": aboutFr,
  ar: aboutAr
};

export function getAboutContent(locale: string): AboutCopy {
  return aboutCopy[locale as keyof typeof aboutCopy] ?? aboutEn;
}
