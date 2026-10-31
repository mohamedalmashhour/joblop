// Joblop marketing landing copy. en-CA is the source of truth; fr-CA MUST stay at full
// parity (Quebec / Bill 96). page.tsx is a server component that resolves the active locale
// and renders from getLandingContent(locale). Stable `key` fields drive image and status
// lookups so translating the visible label never breaks them.
import type { EmployerLocale } from "./i18n/config";

export interface StaffingCategory {
  key: "kitchen" | "care" | "housekeeping" | "maintenance";
  name: string;
  roles: string;
  detail: string;
}

export interface Pillar {
  key: "employers" | "workers" | "admins";
  label: string;
  points: readonly string[];
}

export interface OperationRow {
  role: string;
  status: string;
  filled: boolean;
}

export interface LandingContent {
  header: { navLinks: readonly string[]; ctaGetStarted: string; ctaRequestAccess: string; openMenu: string; closeMenu: string; signIn: string };
  staging: { label: string; synthetic: string; noPayment: string; noProdData: string };
  hero: {
    line1: string;
    line2: string;
    line3: string;
    lede: string;
    chips: readonly [string, string, string];
    ctaWork: string;
    ctaHire: string;
    availableOn: string;
    oppTitle: string;
    oppAround: string;
  };
  categories: { eyebrow: string; title: string; copy: string; items: readonly StaffingCategory[] };
  workflow: { eyebrow: string; title: string; steps: readonly string[] };
  experiences: { eyebrow: string; title: string; pillars: readonly Pillar[] };
  preview: { eyebrow: string; title: string; copy: string };
  workers: { eyebrow: string; title: string; benefits: readonly string[] };
  ai: { eyebrow: string; title: string; flow: readonly (readonly [string, string])[] };
  trust: { eyebrow: string; title: string; controls: readonly string[] };
  journeys: { workerTitle: string; employerTitle: string; worker: readonly string[]; employer: readonly string[] };
  faq: { eyebrow: string; title: string; questions: readonly string[]; readNote: string; readLink: string };
  cta: { title: string; copy: string; hire: string; requestAccess: string; findWork: string };
  footer: { brandHome: string; employers: string; workers: string; howItWorks: string; pricing: string; contact: string };
  store: { apple: { line: string; name: string; aria: string }; google: { line: string; name: string; aria: string } };
  heroPhone: { greeting: string; prompt: string; findWork: string; findWorkSub: string; findPeople: string; findPeopleSub: string; popular: string; jobTitle: string; jobMeta: string; jobPay: string };
  dashboard: {
    nav: readonly string[];
    welcome: string;
    org: string;
    postShift: string;
    metrics: readonly (readonly [string, string])[];
    upcoming: string;
    recentActivity: string;
    activity: readonly string[];
    operations: readonly OperationRow[];
  };
  workerPhone: readonly (readonly [string, string, string])[];
}

const en: LandingContent = {
  header: {
    navLinks: ["How It Works", "Employers", "Workers", "Pricing", "About"],
    ctaGetStarted: "Get Started",
    ctaRequestAccess: "Request Access",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    signIn: "Sign In"
  },
  staging: { label: "STAGING", synthetic: "SYNTHETIC DATA", noPayment: "NO REAL PAYMENT", noProdData: "NO PRODUCTION CUSTOMER DATA" },
  hero: {
    line1: "Find work.",
    line2: "Find people.",
    line3: "Move forward.",
    lede: "Joblop connects local workers with people and businesses that need help. Fast. Simple. Reliable.",
    chips: ["Quick Matches", "Verified Users", "Secure & Trusted"],
    ctaWork: "I’m Looking for Work",
    ctaHire: "Workers Request",
    availableOn: "Available on",
    oppTitle: "Opportunities",
    oppAround: "around you"
  },
  categories: {
    eyebrow: "Work group capsules",
    title: "Start with the right group, then narrow the request.",
    copy: "Capsules keep job requests easy to scan while leaving space for new roles that clients and workers add over time.",
    items: [
      { key: "kitchen", name: "Kitchen", roles: "Chef diplômé, Sous-chef, Cuisinier, Aide-cuisinier, Dishwasher", detail: "Food service coverage with shift requirements, food-safety context, and kitchen handoff notes." },
      { key: "care", name: "Care / Nurse", roles: "Préposé(e) aux bénéficiaires, Nurse, care aide", detail: "Credential-aware requests for supervised care environments without exposing resident records." },
      { key: "housekeeping", name: "Housekeeping & Dining", roles: "Housekeeping, dining support, laundry, cleaner", detail: "Operational support roles for daily residence coverage and urgent absence replacement." },
      { key: "maintenance", name: "Maintenance", roles: "Facility support, repairs, porter, urgent support", detail: "Facility requests with clear access limits, safety expectations, and supervisor handoff." }
    ]
  },
  workflow: {
    eyebrow: "Managed staffing flow",
    title: "Built around operations, not just job posting.",
    steps: ["Job Request", "Admin Dispatch", "Worker Offer", "Assignment", "Attendance Handoff"]
  },
  experiences: {
    eyebrow: "One platform, three experiences",
    title: "Focused tools for every workforce role.",
    pillars: [
      { key: "employers", label: "For Employers", points: ["Create staffing requests", "Track request review", "See staffing progress", "View confirmed assignments"] },
      { key: "workers", label: "For Workers", points: ["Review owned offers", "Accept or decline", "See assignments", "Use attendance handoff"] },
      { key: "admins", label: "For Administrators", points: ["Control dispatch", "Review compliance", "Monitor exceptions", "Maintain audit trails"] }
    ]
  },
  preview: {
    eyebrow: "Inside the workspace",
    title: "Quiet dashboards for repeated daily work.",
    copy: "A preview of the Joblop workspace — clear staffing status, requests, and coverage at a glance. Sample data shown for illustration."
  },
  workers: {
    eyebrow: "For workers",
    title: "Mobile-first staffing without hidden employer economics.",
    benefits: ["Private offer visibility", "Exact terms versions", "Owned assignment schedule", "Authenticated access", "Mobile-first reference", "Truthful empty states"]
  },
  ai: {
    eyebrow: "AI brain boundary",
    title: "AI assists decisions. People remain in control.",
    flow: [["Recommends", "Qualified matches, gaps, and risks"], ["Explains", "Evidence, uncertainty, and missing data"], ["Waits", "Human review controls final action"]]
  },
  trust: {
    eyebrow: "Trust controls",
    title: "Governance stays visible across the journey.",
    controls: ["Database-backed roles", "Tenant isolation", "Worker-owned records", "Human dispatch review", "Version conflict checks", "Attendance handoff boundary"]
  },
  journeys: {
    workerTitle: "Worker Journey",
    employerTitle: "Employer Journey",
    worker: ["Sign in", "Review owned offer", "Accept or decline", "See confirmed assignment", "Continue to attendance handoff"],
    employer: ["Create request", "Submit for review", "Correct if requested", "Track staffing progress", "See confirmed assignments"]
  },
  faq: {
    eyebrow: "FAQ preview",
    title: "Clear answers before users choose a path.",
    questions: ["How does a staffing request enter review?", "Who can see worker offer details?", "When does an offer become an assignment?", "Does AI assign workers?"],
    readNote: "Read the governed answer before choosing a path.",
    readLink: "Read answer in FAQ"
  },
  cta: {
    title: "Ready to transform your workforce?",
    copy: "Start with a governed staffing request or schedule a demo.",
    hire: "Hire staff",
    requestAccess: "Request Access",
    findWork: "Find work"
  },
  footer: { brandHome: "Joblop", employers: "Employers", workers: "Workers", howItWorks: "How It Works", pricing: "Pricing", contact: "Contact" },
  store: {
    apple: { line: "Download on the", name: "App Store", aria: "App Store — coming soon" },
    google: { line: "GET IT ON", name: "Google Play", aria: "Google Play — coming soon" }
  },
  heroPhone: {
    greeting: "Hello, Ahmed",
    prompt: "What are you looking for today?",
    findWork: "Find Work",
    findWorkSub: "Find jobs near you",
    findPeople: "Find People",
    findPeopleSub: "Hire people you can count on",
    popular: "Popular Near You",
    jobTitle: "Kitchen Helper",
    jobMeta: "Restaurant · Laval, QC",
    jobPay: "$18/hr"
  },
  dashboard: {
    nav: ["Dashboard", "Workers", "Jobs", "Compliance", "Reports"],
    welcome: "Welcome, Sarah Johnson",
    org: "Sunrise of Oak Hill",
    postShift: "Post a Shift",
    metrics: [["Open shifts", "12"], ["Scheduled today", "24"], ["Workers active", "48"], ["Hours this week", "320"]],
    upcoming: "Upcoming shifts",
    recentActivity: "Recent activity",
    activity: ["Worker accepted shift", "Shift filled", "New application"],
    operations: [
      { role: "CNA evening shift", status: "Filled", filled: true },
      { role: "Housekeeping", status: "Partial", filled: false },
      { role: "Dining assistant", status: "Open", filled: false }
    ]
  },
  workerPhone: [["Upcoming", "CNA evening shift", "$96.00"], ["Schedule", "May 2026", "3 shifts"], ["Earnings", "$560.00", "pending"]]
};

const fr: LandingContent = {
  header: {
    navLinks: ["Comment ça marche", "Employeurs", "Travailleurs", "Tarifs", "À propos"],
    ctaGetStarted: "Commencer",
    ctaRequestAccess: "Demander l’accès",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
    signIn: "Se connecter"
  },
  staging: { label: "PRÉPRODUCTION", synthetic: "DONNÉES SYNTHÉTIQUES", noPayment: "AUCUN PAIEMENT RÉEL", noProdData: "AUCUNE DONNÉE CLIENT DE PRODUCTION" },
  hero: {
    line1: "Trouvez du travail.",
    line2: "Trouvez des gens.",
    line3: "Avancez.",
    lede: "Joblop met en relation les travailleurs locaux avec les personnes et les entreprises qui ont besoin d’aide. Rapide. Simple. Fiable.",
    chips: ["Jumelages rapides", "Utilisateurs vérifiés", "Sécurisé et fiable"],
    ctaWork: "Je cherche du travail",
    ctaHire: "Demande de travailleurs",
    availableOn: "Disponible sur",
    oppTitle: "Occasions",
    oppAround: "près de vous"
  },
  categories: {
    eyebrow: "Capsules de groupes de travail",
    title: "Commencez par le bon groupe, puis précisez la demande.",
    copy: "Les capsules gardent les demandes d’emploi faciles à parcourir tout en laissant place aux nouveaux rôles que les clients et les travailleurs ajoutent au fil du temps.",
    items: [
      { key: "kitchen", name: "Cuisine", roles: "Chef diplômé, Sous-chef, Cuisinier, Aide-cuisinier, Plongeur", detail: "Couverture des services alimentaires avec exigences de quart, contexte de salubrité et notes de transfert en cuisine." },
      { key: "care", name: "Soins / Infirmier", roles: "Préposé(e) aux bénéficiaires, Infirmier(ère), aide-soignant(e)", detail: "Demandes tenant compte des accréditations pour les milieux de soins supervisés, sans exposer les dossiers des résidents." },
      { key: "housekeeping", name: "Entretien ménager et salle à manger", roles: "Entretien ménager, soutien en salle, buanderie, préposé au nettoyage", detail: "Rôles de soutien opérationnel pour la couverture quotidienne des résidences et le remplacement d’absences urgentes." },
      { key: "maintenance", name: "Entretien", roles: "Soutien aux installations, réparations, portier, soutien urgent", detail: "Demandes liées aux installations avec limites d’accès claires, attentes de sécurité et transfert au superviseur." }
    ]
  },
  workflow: {
    eyebrow: "Flux de dotation géré",
    title: "Conçu pour les opérations, pas seulement l’affichage de postes.",
    steps: ["Demande d’emploi", "Répartition admin", "Offre au travailleur", "Affectation", "Transfert de présence"]
  },
  experiences: {
    eyebrow: "Une plateforme, trois expériences",
    title: "Des outils ciblés pour chaque rôle de la main-d’œuvre.",
    pillars: [
      { key: "employers", label: "Pour les employeurs", points: ["Créer des demandes de dotation", "Suivre la révision des demandes", "Voir la progression de la dotation", "Consulter les affectations confirmées"] },
      { key: "workers", label: "Pour les travailleurs", points: ["Consulter ses offres", "Accepter ou refuser", "Voir les affectations", "Utiliser le transfert de présence"] },
      { key: "admins", label: "Pour les administrateurs", points: ["Contrôler la répartition", "Vérifier la conformité", "Surveiller les exceptions", "Tenir les pistes de vérification"] }
    ]
  },
  preview: {
    eyebrow: "À l’intérieur de l’espace de travail",
    title: "Des tableaux de bord sobres pour le travail quotidien répété.",
    copy: "Un aperçu de l’espace de travail Joblop — statut de dotation, demandes et couverture clairs d’un coup d’œil. Données d’exemple présentées à titre indicatif."
  },
  workers: {
    eyebrow: "Pour les travailleurs",
    title: "Une dotation axée sur le mobile, sans logique économique cachée pour l’employeur.",
    benefits: ["Visibilité privée des offres", "Versions exactes des conditions", "Horaire d’affectation personnel", "Accès authentifié", "Référence axée sur le mobile", "États vides honnêtes"]
  },
  ai: {
    eyebrow: "Limites de l’IA",
    title: "L’IA assiste les décisions. Les personnes gardent le contrôle.",
    flow: [["Recommande", "Jumelages qualifiés, lacunes et risques"], ["Explique", "Preuves, incertitude et données manquantes"], ["Attend", "La révision humaine contrôle l’action finale"]]
  },
  trust: {
    eyebrow: "Contrôles de confiance",
    title: "La gouvernance demeure visible tout au long du parcours.",
    controls: ["Rôles stockés en base de données", "Isolation des locataires", "Dossiers détenus par le travailleur", "Révision humaine de la répartition", "Contrôles de conflit de version", "Limite de transfert de présence"]
  },
  journeys: {
    workerTitle: "Parcours du travailleur",
    employerTitle: "Parcours de l’employeur",
    worker: ["Se connecter", "Consulter son offre", "Accepter ou refuser", "Voir l’affectation confirmée", "Passer au transfert de présence"],
    employer: ["Créer une demande", "Soumettre pour révision", "Corriger au besoin", "Suivre la progression de la dotation", "Voir les affectations confirmées"]
  },
  faq: {
    eyebrow: "Aperçu de la FAQ",
    title: "Des réponses claires avant de choisir une voie.",
    questions: ["Comment une demande de dotation entre-t-elle en révision?", "Qui peut voir les détails d’une offre?", "Quand une offre devient-elle une affectation?", "Est-ce l’IA qui assigne les travailleurs?"],
    readNote: "Lisez la réponse encadrée avant de choisir une voie.",
    readLink: "Lire la réponse dans la FAQ"
  },
  cta: {
    title: "Prêt à transformer votre main-d’œuvre?",
    copy: "Commencez par une demande de dotation encadrée ou planifiez une démonstration.",
    hire: "Embaucher du personnel",
    requestAccess: "Demander l’accès",
    findWork: "Trouver du travail"
  },
  footer: { brandHome: "Joblop", employers: "Employeurs", workers: "Travailleurs", howItWorks: "Comment ça marche", pricing: "Tarifs", contact: "Contact" },
  store: {
    apple: { line: "Téléchargez sur", name: "App Store", aria: "App Store — bientôt disponible" },
    google: { line: "DISPONIBLE SUR", name: "Google Play", aria: "Google Play — bientôt disponible" }
  },
  heroPhone: {
    greeting: "Bonjour, Ahmed",
    prompt: "Que cherchez-vous aujourd’hui?",
    findWork: "Trouver du travail",
    findWorkSub: "Des emplois près de chez vous",
    findPeople: "Trouver des gens",
    findPeopleSub: "Embauchez des gens fiables",
    popular: "Populaire près de vous",
    jobTitle: "Aide-cuisinier",
    jobMeta: "Restaurant · Laval, QC",
    jobPay: "18 $/h"
  },
  dashboard: {
    nav: ["Tableau de bord", "Travailleurs", "Emplois", "Conformité", "Rapports"],
    welcome: "Bienvenue, Sarah Johnson",
    org: "Sunrise of Oak Hill",
    postShift: "Publier un quart",
    metrics: [["Quarts ouverts", "12"], ["Prévus aujourd’hui", "24"], ["Travailleurs actifs", "48"], ["Heures cette semaine", "320"]],
    upcoming: "Quarts à venir",
    recentActivity: "Activité récente",
    activity: ["Un travailleur a accepté un quart", "Quart comblé", "Nouvelle candidature"],
    operations: [
      { role: "Quart de soir PAB", status: "Comblé", filled: true },
      { role: "Entretien ménager", status: "Partiel", filled: false },
      { role: "Aide en salle à manger", status: "Ouvert", filled: false }
    ]
  },
  workerPhone: [["À venir", "Quart de soir PAB", "96,00 $"], ["Horaire", "Mai 2026", "3 quarts"], ["Gains", "560,00 $", "en attente"]]
};

// Arabic (RTL) marketing landing — full parity with en-CA. Proper nouns (Joblop, App Store,
// Google Play, Interac) and sample data (places, numbers) stay as-is by convention.
const ar: LandingContent = {
  header: {
    navLinks: ["كيف تعمل", "أصحاب العمل", "العمّال", "الأسعار", "من نحن"],
    ctaGetStarted: "ابدأ الآن",
    ctaRequestAccess: "طلب الوصول",
    openMenu: "فتح القائمة",
    closeMenu: "إغلاق القائمة",
    signIn: "تسجيل الدخول"
  },
  staging: { label: "بيئة اختبار", synthetic: "بيانات اصطناعية", noPayment: "لا دفع حقيقي", noProdData: "لا بيانات عملاء إنتاجية" },
  hero: {
    line1: "اعثر على عمل.",
    line2: "اعثر على أشخاص.",
    line3: "امضِ قُدُمًا.",
    lede: "تربط Joblop العمّال المحليّين بالأشخاص والشركات التي تحتاج إلى مساعدة. سريع. بسيط. موثوق.",
    chips: ["مطابقات سريعة", "مستخدمون موثَّقون", "آمن وموثوق"],
    ctaWork: "أبحث عن عمل",
    ctaHire: "طلب عمّال",
    availableOn: "متاح على",
    oppTitle: "فرص",
    oppAround: "من حولك"
  },
  categories: {
    eyebrow: "كبسولات مجموعات العمل",
    title: "ابدأ بالمجموعة المناسبة، ثم ضيّق نطاق الطلب.",
    copy: "تُبقي الكبسولات طلبات العمل سهلة التصفّح مع إتاحة مساحة للأدوار الجديدة التي يضيفها العملاء والعمّال مع الوقت.",
    items: [
      { key: "kitchen", name: "المطبخ", roles: "Chef diplômé، Sous-chef، Cuisinier، Aide-cuisinier، غسّال صحون", detail: "تغطية خدمات الطعام مع متطلّبات المناوبة وسياق سلامة الغذاء وملاحظات تسليم المطبخ." },
      { key: "care", name: "الرعاية / التمريض", roles: "Préposé(e) aux bénéficiaires، ممرّض، مساعد رعاية", detail: "طلبات تراعي الاعتمادات لبيئات الرعاية الخاضعة للإشراف دون كشف سجلّات المقيمين." },
      { key: "housekeeping", name: "التدبير المنزلي وقاعة الطعام", roles: "التدبير المنزلي، دعم قاعة الطعام، الغسيل، عامل نظافة", detail: "أدوار دعم تشغيلية للتغطية اليومية للمقارّ السكنية واستبدال الغياب العاجل." },
      { key: "maintenance", name: "الصيانة", roles: "دعم المرافق، الإصلاحات، البوّاب، الدعم العاجل", detail: "طلبات المرافق بحدود وصول واضحة وتوقّعات سلامة وتسليم للمشرف." }
    ]
  },
  workflow: {
    eyebrow: "تدفّق توظيف مُدار",
    title: "مبنيّ حول العمليات، لا مجرّد نشر الوظائف.",
    steps: ["طلب عمل", "توزيع إداري", "عرض للعامل", "تعيين", "تسليم الحضور"]
  },
  experiences: {
    eyebrow: "منصّة واحدة، ثلاث تجارب",
    title: "أدوات مركّزة لكل دور في القوى العاملة.",
    pillars: [
      { key: "employers", label: "لأصحاب العمل", points: ["إنشاء طلبات توظيف", "تتبّع مراجعة الطلبات", "رؤية تقدّم التوظيف", "عرض التعيينات المؤكَّدة"] },
      { key: "workers", label: "للعمّال", points: ["مراجعة العروض الخاصة", "القبول أو الرفض", "رؤية التعيينات", "استخدام تسليم الحضور"] },
      { key: "admins", label: "للمسؤولين", points: ["التحكّم في التوزيع", "مراجعة الامتثال", "مراقبة الاستثناءات", "حفظ سجلّات التدقيق"] }
    ]
  },
  preview: {
    eyebrow: "داخل مساحة العمل",
    title: "لوحات تحكّم هادئة للعمل اليومي المتكرّر.",
    copy: "معاينة لمساحة عمل Joblop — حالة توظيف وطلبات وتغطية واضحة بلمحة. تُعرَض بيانات عيّنة لأغراض التوضيح."
  },
  workers: {
    eyebrow: "للعمّال",
    title: "توظيف يركّز على الهاتف دون اقتصاديات خفيّة لصاحب العمل.",
    benefits: ["رؤية خاصّة للعروض", "نسخ دقيقة من الشروط", "جدول تعيينات شخصي", "وصول مُصادَق عليه", "مرجع يركّز على الهاتف", "حالات فارغة صادقة"]
  },
  ai: {
    eyebrow: "حدود عقل الذكاء الاصطناعي",
    title: "الذكاء الاصطناعي يساعد في القرارات. الناس يبقون متحكّمين.",
    flow: [["يوصي", "مطابقات مؤهّلة وثغرات ومخاطر"], ["يشرح", "الأدلّة وعدم اليقين والبيانات الناقصة"], ["ينتظر", "المراجعة البشرية تتحكّم في الإجراء النهائي"]]
  },
  trust: {
    eyebrow: "ضوابط الثقة",
    title: "تبقى الحوكمة ظاهرة طوال الرحلة.",
    controls: ["أدوار مخزّنة في قاعدة البيانات", "عزل المستأجرين", "سجلّات يملكها العامل", "مراجعة بشرية للتوزيع", "فحوصات تعارض الإصدارات", "حدود تسليم الحضور"]
  },
  journeys: {
    workerTitle: "رحلة العامل",
    employerTitle: "رحلة صاحب العمل",
    worker: ["تسجيل الدخول", "مراجعة العرض الخاص", "القبول أو الرفض", "رؤية التعيين المؤكَّد", "المتابعة إلى تسليم الحضور"],
    employer: ["إنشاء طلب", "الإرسال للمراجعة", "التصحيح عند الطلب", "تتبّع تقدّم التوظيف", "رؤية التعيينات المؤكَّدة"]
  },
  faq: {
    eyebrow: "معاينة الأسئلة الشائعة",
    title: "إجابات واضحة قبل أن يختار المستخدمون مسارًا.",
    questions: ["كيف يدخل طلب التوظيف إلى المراجعة؟", "من يمكنه رؤية تفاصيل عرض العامل؟", "متى يصبح العرض تعيينًا؟", "هل يعيّن الذكاء الاصطناعي العمّال؟"],
    readNote: "اقرأ الإجابة المحكومة قبل اختيار مسار.",
    readLink: "اقرأ الإجابة في الأسئلة الشائعة"
  },
  cta: {
    title: "هل أنت مستعدّ لتحويل قوّتك العاملة؟",
    copy: "ابدأ بطلب توظيف محكوم أو احجز عرضًا توضيحيًا.",
    hire: "توظيف طاقم",
    requestAccess: "طلب الوصول",
    findWork: "ابحث عن عمل"
  },
  footer: { brandHome: "Joblop", employers: "أصحاب العمل", workers: "العمّال", howItWorks: "كيف تعمل", pricing: "الأسعار", contact: "اتصل بنا" },
  store: {
    apple: { line: "نزّله من", name: "App Store", aria: "App Store — قريبًا" },
    google: { line: "احصل عليه من", name: "Google Play", aria: "Google Play — قريبًا" }
  },
  heroPhone: {
    greeting: "مرحبًا، أحمد",
    prompt: "عمّا تبحث اليوم؟",
    findWork: "ابحث عن عمل",
    findWorkSub: "وظائف قريبة منك",
    findPeople: "ابحث عن أشخاص",
    findPeopleSub: "وظّف أشخاصًا يمكنك الاعتماد عليهم",
    popular: "رائج بالقرب منك",
    jobTitle: "مساعد مطبخ",
    jobMeta: "مطعم · لافال، كيبيك",
    jobPay: "18$/ساعة"
  },
  dashboard: {
    nav: ["لوحة التحكّم", "العمّال", "الوظائف", "الامتثال", "التقارير"],
    welcome: "مرحبًا، سارة جونسون",
    org: "Sunrise of Oak Hill",
    postShift: "نشر مناوبة",
    metrics: [["مناوبات مفتوحة", "12"], ["مجدولة اليوم", "24"], ["عمّال نشطون", "48"], ["ساعات هذا الأسبوع", "320"]],
    upcoming: "المناوبات القادمة",
    recentActivity: "النشاط الأخير",
    activity: ["قبِل عامل مناوبة", "تمّ شغل المناوبة", "طلب جديد"],
    operations: [
      { role: "مناوبة مسائية CNA", status: "مشغولة", filled: true },
      { role: "التدبير المنزلي", status: "جزئية", filled: false },
      { role: "مساعد قاعة طعام", status: "مفتوحة", filled: false }
    ]
  },
  workerPhone: [["قادمة", "مناوبة مسائية CNA", "96.00$"], ["الجدول", "أيار 2026", "3 مناوبات"], ["الأرباح", "560.00$", "قيد الانتظار"]]
};

const content: Readonly<Record<EmployerLocale, LandingContent>> = { "en-CA": en, "fr-CA": fr, ar };

export function getLandingContent(locale: EmployerLocale): LandingContent {
  return content[locale];
}
