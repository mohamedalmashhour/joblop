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
  media: {
    eyebrow: string;
    title: string;
    copy: string;
    clips: readonly { src: string; poster: string; label: string; caption: string; withSound?: boolean }[];
    soundOn: string;
    soundOff: string;
    play: string;
  };
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
    availableOn: "Phone app — coming soon",
    oppTitle: "Opportunities",
    oppAround: "around you"
  },
  categories: {
    eyebrow: "Kinds of work",
    title: "Pick the kind of help you need.",
    copy: "Start with a group, then choose the exact role. New kinds of work are added as employers and workers ask for them.",
    items: [
      { key: "kitchen", name: "Kitchen", roles: "Chef diplômé, Sous-chef, Cuisinier, Aide-cuisinier, Dishwasher", detail: "Cooks, kitchen helpers and dishwashers for busy services and last-minute gaps." },
      { key: "care", name: "Care / Nurse", roles: "Préposé(e) aux bénéficiaires, Nurse, care aide", detail: "Care aides and nurses for residences and care homes, with the right papers checked." },
      { key: "housekeeping", name: "Housekeeping & Dining", roles: "Housekeeping, dining support, laundry, cleaner", detail: "Cleaners, dining room and laundry staff for daily needs or when someone calls in sick." },
      { key: "maintenance", name: "Maintenance", roles: "Facility support, repairs, porter, urgent support", detail: "Handy helpers, porters and repair support, with safety rules made clear before the shift." }
    ]
  },
  media: {
    eyebrow: "See Joblop in action",
    title: "Help on site, when you need it",
    copy: "Short clips from kitchens and teams: post a shift, get matched with ready workers, and keep the day running.",
    clips: [
      { src: "/media/find-help.mp4", poster: "/media/find-help.jpg", label: "Find the help you need", caption: "Find the help you need" },
      { src: "/media/kitchen-rush.mp4", poster: "/media/kitchen-rush.jpg", label: "A rush in the kitchen? Get covered fast", caption: "A rush in the kitchen? Get covered fast" },
      { src: "/media/how-joblop-works.mp4", poster: "/media/how-joblop-works.jpg", label: "How Joblop works for employers (30 s)", caption: "How Joblop works for employers (30 s)", withSound: true }
    ],
    soundOn: "Sound on",
    soundOff: "Sound off",
    play: "Play video"
  },
  workflow: {
    eyebrow: "How a shift gets covered",
    title: "From your request to a worker on site.",
    steps: ["You post a job", "Joblop reviews it", "A worker accepts", "The shift is confirmed", "Worker clocks in"]
  },
  experiences: {
    eyebrow: "One platform, three sides",
    title: "Simple tools for everyone involved.",
    pillars: [
      { key: "employers", label: "For Employers", points: ["Post a job in a minute", "See when it is reviewed", "Follow who is coming", "Get invoices by email"] },
      { key: "workers", label: "For Workers", points: ["See jobs near you", "Accept or decline", "Check your schedule", "Clock in from your phone"] },
      { key: "admins", label: "For the Joblop team", points: ["Review every request", "Check workers’ papers", "Handle problems fast", "Keep a full record"] }
    ]
  },
  preview: {
    eyebrow: "Inside your account",
    title: "Everything about your shifts in one place.",
    copy: "A look at the Joblop employer account: your jobs, who is coming and what is covered, at a glance. Sample data shown for illustration."
  },
  workers: {
    eyebrow: "For workers",
    title: "Find shifts on your phone and get paid for your work.",
    benefits: ["See the pay before you accept", "Clear terms for every job", "Your schedule in one place", "Sign in with a text code", "Works on any phone", "No fake jobs"]
  },
  ai: {
    eyebrow: "Smart help, real people",
    title: "Technology suggests. People decide.",
    flow: [["Suggests", "The best-matched workers for each job"], ["Explains", "Why a worker is a good fit"], ["Waits", "Our team makes the final choice"]]
  },
  trust: {
    eyebrow: "Why you can trust Joblop",
    title: "Safe and fair for employers and workers.",
    controls: ["Verified workers", "Your company’s data stays private", "Workers own their records", "Every match checked by our team", "Clear prices before you book", "Hours recorded on the phone"]
  },
  journeys: {
    workerTitle: "For workers",
    employerTitle: "For employers",
    worker: ["Create your free account", "See jobs near you", "Accept or decline", "Get your confirmed shift", "Clock in and get paid"],
    employer: ["Post a job", "We review it", "Change it if needed", "Follow who is coming", "Get your invoice by email"]
  },
  faq: {
    eyebrow: "Questions",
    title: "Quick answers before you start.",
    questions: ["What happens after I post a job?", "Who can see my job details?", "When is a worker confirmed?", "Does a computer choose the workers?"],
    readNote: "Find the full answer in our FAQ.",
    readLink: "Read the answer"
  },
  cta: {
    title: "Ready to transform your workforce?",
    copy: "Post your first job in a minute, or book a quick demo.",
    hire: "Hire staff",
    requestAccess: "Request Access",
    findWork: "Find work"
  },
  footer: { brandHome: "Joblop", employers: "Employers", workers: "Workers", howItWorks: "How It Works", pricing: "Pricing", contact: "Contact" },
  store: {
    apple: { line: "Coming soon to the", name: "App Store", aria: "App Store — coming soon" },
    google: { line: "COMING SOON TO", name: "Google Play", aria: "Google Play — coming soon" }
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
    availableOn: "Application mobile — bientôt disponible",
    oppTitle: "Occasions",
    oppAround: "près de vous"
  },
  categories: {
    eyebrow: "Types de travail",
    title: "Choisissez le type d’aide dont vous avez besoin.",
    copy: "Commencez par un groupe, puis choisissez le poste exact. De nouveaux types de travail s’ajoutent selon les besoins des employeurs et des travailleurs.",
    items: [
      { key: "kitchen", name: "Cuisine", roles: "Chef diplômé, Sous-chef, Cuisinier, Aide-cuisinier, Plongeur", detail: "Cuisiniers, aides-cuisiniers et plongeurs pour les services chargés et les absences de dernière minute." },
      { key: "care", name: "Soins / Infirmier", roles: "Préposé(e) aux bénéficiaires, Infirmier(ère), aide-soignant(e)", detail: "Préposés et infirmiers pour les résidences et les CHSLD, avec les documents requis vérifiés." },
      { key: "housekeeping", name: "Entretien ménager et salle à manger", roles: "Entretien ménager, soutien en salle, buanderie, préposé au nettoyage", detail: "Préposés à l’entretien, à la salle à manger et à la buanderie pour le quotidien ou les absences." },
      { key: "maintenance", name: "Entretien", roles: "Soutien aux installations, réparations, portier, soutien urgent", detail: "Aides à l’entretien, porteurs et soutien aux réparations, avec des consignes de sécurité claires avant le quart." }
    ]
  },
  media: {
    eyebrow: "Joblop en action",
    title: "De l'aide sur place, quand vous en avez besoin",
    copy: "De courtes vidéos de cuisines et d'équipes : publiez un quart, trouvez des travailleurs prêts et gardez la journée sur les rails.",
    clips: [
      { src: "/media/find-help.mp4", poster: "/media/find-help.jpg", label: "Trouvez le renfort qu'il vous faut", caption: "Trouvez le renfort qu'il vous faut" },
      { src: "/media/kitchen-rush.mp4", poster: "/media/kitchen-rush.jpg", label: "Un coup de feu en cuisine ? Soyez couvert vite", caption: "Un coup de feu en cuisine ? Soyez couvert vite" },
      { src: "/media/how-joblop-works.mp4", poster: "/media/how-joblop-works.jpg", label: "Comment Joblop fonctionne pour les employeurs (30 s)", caption: "Comment Joblop fonctionne pour les employeurs (30 s)", withSound: true }
    ],
    soundOn: "Activer le son",
    soundOff: "Couper le son",
    play: "Lire la vidéo"
  },
  workflow: {
    eyebrow: "Comment un quart est comblé",
    title: "De votre demande à un travailleur sur place.",
    steps: ["Vous publiez un emploi", "Joblop le vérifie", "Un travailleur accepte", "Le quart est confirmé", "Le travailleur pointe son arrivée"]
  },
  experiences: {
    eyebrow: "Une plateforme, trois côtés",
    title: "Des outils simples pour tout le monde.",
    pillars: [
      { key: "employers", label: "Pour les employeurs", points: ["Publier un emploi en une minute", "Savoir quand il est vérifié", "Voir qui vient travailler", "Recevoir les factures par courriel"] },
      { key: "workers", label: "Pour les travailleurs", points: ["Voir les emplois près de chez vous", "Accepter ou refuser", "Consulter votre horaire", "Pointer depuis votre téléphone"] },
      { key: "admins", label: "Pour l’équipe Joblop", points: ["Vérifier chaque demande", "Vérifier les documents des travailleurs", "Régler les problèmes rapidement", "Garder un dossier complet"] }
    ]
  },
  preview: {
    eyebrow: "Dans votre compte",
    title: "Tout sur vos quarts, au même endroit.",
    copy: "Un aperçu du compte employeur Joblop : vos emplois, qui vient et ce qui est comblé, d’un coup d’œil. Données d’exemple présentées à titre indicatif."
  },
  workers: {
    eyebrow: "Pour les travailleurs",
    title: "Trouvez des quarts sur votre téléphone et soyez payé pour votre travail.",
    benefits: ["Voyez le salaire avant d’accepter", "Des conditions claires pour chaque emploi", "Votre horaire au même endroit", "Connexion par code texto", "Fonctionne sur tous les téléphones", "Aucune fausse offre"]
  },
  ai: {
    eyebrow: "Aide intelligente, vraies personnes",
    title: "La technologie suggère. Les gens décident.",
    flow: [["Suggère", "Les travailleurs les mieux adaptés à chaque emploi"], ["Explique", "Pourquoi un travailleur convient"], ["Attend", "Notre équipe fait le choix final"]]
  },
  trust: {
    eyebrow: "Pourquoi faire confiance à Joblop",
    title: "Sûr et équitable pour les employeurs et les travailleurs.",
    controls: ["Travailleurs vérifiés", "Les données de votre entreprise restent privées", "Les travailleurs gardent leurs dossiers", "Chaque jumelage vérifié par notre équipe", "Des prix clairs avant de réserver", "Heures enregistrées sur le téléphone"]
  },
  journeys: {
    workerTitle: "Pour les travailleurs",
    employerTitle: "Pour les employeurs",
    worker: ["Se connecter", "Voir les emplois près de chez vous", "Accepter ou refuser", "Recevoir votre quart confirmé", "Pointer et être payé"],
    employer: ["Créer une demande", "Nous la vérifions", "La modifier au besoin", "Voir qui vient travailler", "Recevoir la facture par courriel"]
  },
  faq: {
    eyebrow: "Questions",
    title: "Des réponses rapides avant de commencer.",
    questions: ["Que se passe-t-il après la publication d’un emploi?", "Qui peut voir les détails de mon emploi?", "Quand un travailleur est-il confirmé?", "Est-ce un ordinateur qui choisit les travailleurs?"],
    readNote: "Trouvez la réponse complète dans notre FAQ.",
    readLink: "Lire la réponse"
  },
  cta: {
    title: "Prêt à transformer votre main-d’œuvre?",
    copy: "Publiez votre premier emploi en une minute ou réservez une courte démonstration.",
    hire: "Embaucher du personnel",
    requestAccess: "Demander l’accès",
    findWork: "Trouver du travail"
  },
  footer: { brandHome: "Joblop", employers: "Employeurs", workers: "Travailleurs", howItWorks: "Comment ça marche", pricing: "Tarifs", contact: "Contact" },
  store: {
    apple: { line: "Bientôt sur", name: "App Store", aria: "App Store — bientôt disponible" },
    google: { line: "BIENTÔT SUR", name: "Google Play", aria: "Google Play — bientôt disponible" }
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
    line2: "اعثر على موظفين.",
    line3: "امضِ قُدُمًا.",
    lede: "تربط Joblop العمّال المحليّين بالأشخاص والشركات التي تحتاج إلى مساعدة. سريع. بسيط. موثوق.",
    chips: ["مطابقات سريعة", "مستخدمون موثَّقون", "آمن وموثوق"],
    ctaWork: "أبحث عن عمل",
    ctaHire: "طلب عمّال",
    availableOn: "تطبيق الهاتف — قريبًا",
    oppTitle: "فرص",
    oppAround: "من حولك"
  },
  categories: {
    eyebrow: "أنواع العمل",
    title: "اختر نوع المساعدة التي تحتاجها.",
    copy: "ابدأ بمجموعة ثم اختر الوظيفة بالضبط. نضيف أنواع عمل جديدة حسب طلب أصحاب العمل والعمال.",
    items: [
      { key: "kitchen", name: "المطبخ", roles: "شيف مؤهَّل، مساعد شيف، طبّاخ، مساعد مطبخ، غسّال صحون", detail: "طباخون ومساعدو مطبخ وغاسلو صحون للأوقات المزدحمة والغيابات المفاجئة." },
      { key: "care", name: "الرعاية / التمريض", roles: "مرافق المقيمين، ممرّض، مساعد رعاية", detail: "مساعدو رعاية وممرضون لدور الإقامة والرعاية، مع التحقق من الوثائق اللازمة." },
      { key: "housekeeping", name: "التدبير المنزلي وقاعة الطعام", roles: "التدبير المنزلي، دعم قاعة الطعام، الغسيل، عامل نظافة", detail: "عمال تنظيف وخدمة قاعة الطعام والغسيل للاحتياجات اليومية أو عند غياب أحد الموظفين." },
      { key: "maintenance", name: "الصيانة", roles: "دعم المرافق، الإصلاحات، البوّاب، الدعم العاجل", detail: "مساعدو صيانة وحمّالون ودعم للإصلاحات، مع قواعد سلامة واضحة قبل النوبة." }
    ]
  },
  media: {
    eyebrow: "Joblop أثناء العمل",
    title: "مساعدة في الموقع عندما تحتاجها",
    copy: "مقاطع قصيرة من المطابخ والفرق: انشر مناوبة، وتواصل مع عمال جاهزين، وحافظ على سير يومك.",
    clips: [
      { src: "/media/find-help.mp4", poster: "/media/find-help.jpg", label: "اعثر على الدعم الذي تحتاجه", caption: "اعثر على الدعم الذي تحتاجه" },
      { src: "/media/kitchen-rush.mp4", poster: "/media/kitchen-rush.jpg", label: "ضغط في المطبخ؟ احصل على تغطية بسرعة", caption: "ضغط في المطبخ؟ احصل على تغطية بسرعة" },
      { src: "/media/how-joblop-works.mp4", poster: "/media/how-joblop-works.jpg", label: "كيف يعمل Joblop لأصحاب العمل (30 ث)", caption: "كيف يعمل Joblop لأصحاب العمل (30 ث)", withSound: true }
    ],
    soundOn: "تشغيل الصوت",
    soundOff: "كتم الصوت",
    play: "تشغيل الفيديو"
  },
  workflow: {
    eyebrow: "كيف تُغطّى النوبة",
    title: "من طلبك إلى عامل في الموقع.",
    steps: ["تنشر وظيفة", "يراجعها Joblop", "يقبلها عامل", "تُؤكَّد النوبة", "يسجّل العامل حضوره"]
  },
  experiences: {
    eyebrow: "منصة واحدة، ثلاثة أطراف",
    title: "أدوات بسيطة للجميع.",
    pillars: [
      { key: "employers", label: "لأصحاب العمل", points: ["انشر وظيفة في دقيقة", "اعرف متى تمت مراجعتها", "تابع من سيأتي", "استلم الفواتير بالبريد الإلكتروني"] },
      { key: "workers", label: "للعمّال", points: ["شاهد الوظائف القريبة منك", "اقبل أو ارفض", "راجع جدولك", "سجّل حضورك من هاتفك"] },
      { key: "admins", label: "لفريق Joblop", points: ["مراجعة كل طلب", "التحقق من وثائق العمال", "حل المشاكل بسرعة", "الاحتفاظ بسجل كامل"] }
    ]
  },
  preview: {
    eyebrow: "داخل حسابك",
    title: "كل ما يخص نوباتك في مكان واحد.",
    copy: "نظرة على حساب صاحب العمل في Joblop: وظائفك، ومن سيأتي، وما تمت تغطيته، بلمحة واحدة. بيانات توضيحية."
  },
  workers: {
    eyebrow: "للعمّال",
    title: "اعثر على نوبات من هاتفك واحصل على أجر عملك.",
    benefits: ["اعرف الأجر قبل القبول", "شروط واضحة لكل وظيفة", "جدولك في مكان واحد", "تسجيل الدخول برمز نصي", "يعمل على أي هاتف", "لا وظائف وهمية"]
  },
  ai: {
    eyebrow: "مساعدة ذكية وأشخاص حقيقيون",
    title: "التقنية تقترح. والناس يقرّرون.",
    flow: [["تقترح", "أنسب العمال لكل وظيفة"], ["تشرح", "لماذا يناسب العامل الوظيفة"], ["تنتظر", "فريقنا يتخذ القرار النهائي"]]
  },
  trust: {
    eyebrow: "لماذا تثق بـ Joblop",
    title: "آمن وعادل لأصحاب العمل والعمال.",
    controls: ["عمال موثَّقون", "بيانات شركتك تبقى خاصة", "العمال يملكون سجلاتهم", "كل مطابقة يراجعها فريقنا", "أسعار واضحة قبل الحجز", "تسجيل الساعات من الهاتف"]
  },
  journeys: {
    workerTitle: "للعمّال",
    employerTitle: "لأصحاب العمل",
    worker: ["أنشئ حسابك المجاني", "شاهد الوظائف القريبة منك", "اقبل أو ارفض", "استلم نوبتك المؤكَّدة", "سجّل حضورك واحصل على أجرك"],
    employer: ["انشر وظيفة", "نراجعها", "عدّلها عند الحاجة", "تابع من سيأتي", "استلم فاتورتك بالبريد الإلكتروني"]
  },
  faq: {
    eyebrow: "أسئلة",
    title: "إجابات سريعة قبل أن تبدأ.",
    questions: ["ماذا يحدث بعد نشر الوظيفة؟", "من يمكنه رؤية تفاصيل وظيفتي؟", "متى يتم تأكيد العامل؟", "هل يختار الحاسوب العمال؟"],
    readNote: "اقرأ الإجابة الكاملة في الأسئلة الشائعة.",
    readLink: "اقرأ الإجابة"
  },
  cta: {
    title: "هل أنت مستعدّ لتحويل قوّتك العاملة؟",
    copy: "انشر وظيفتك الأولى في دقيقة، أو احجز عرضًا قصيرًا.",
    hire: "توظيف طاقم",
    requestAccess: "طلب الوصول",
    findWork: "ابحث عن عمل"
  },
  footer: { brandHome: "Joblop", employers: "أصحاب العمل", workers: "العمّال", howItWorks: "كيف تعمل", pricing: "الأسعار", contact: "اتصل بنا" },
  store: {
    apple: { line: "قريبًا على", name: "App Store", aria: "App Store — قريبًا" },
    google: { line: "قريبًا على", name: "Google Play", aria: "Google Play — قريبًا" }
  },
  heroPhone: {
    greeting: "مرحبًا، أحمد",
    prompt: "عمّا تبحث اليوم؟",
    findWork: "ابحث عن عمل",
    findWorkSub: "وظائف قريبة منك",
    findPeople: "ابحث عن موظفين",
    findPeopleSub: "وظّف موظفين يمكنك الاعتماد عليهم",
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
