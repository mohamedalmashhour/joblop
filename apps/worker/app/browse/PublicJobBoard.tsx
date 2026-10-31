"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { JobScannerDemo } from "./JobScannerDemo";
import { trackConversion } from "../analytics";
import { useLocale } from "../i18n/LocaleProvider";
import { SiteHeader } from "../SiteHeader";
import { activeCountry } from "../country";

// Public, no-sign-in landing + job board for Joblop. Hero search, real categories, REAL featured
// jobs (from /public/jobs — never fabricated), job-seeker + employer sections, honest stats and
// value props (no fake brand logos or invented reviews), CTA band, footer. Bilingual (Bill 96).
// Privacy-safe: area-level job data only (city + province) — never address, client, or pay.

type Job = {
  jobCode: string; role: string; city: string | null; province: string | null;
  areaLabel: string; openings: number; startAt: string; urgency: string;
};
// Public JobScanner teaser lead — external market posting (sanitized), a hand-off to the source.
type Lead = {
  title: string; employer: string | null; areaLabel: string;
  salaryMinMinor: number | null; salaryMaxMinor: number | null; salaryPeriod: string | null;
  category: string | null; postedAt: string | null; url: string; source: string;
};
type Lang = "en" | "fr" | "ar";

// Regions come from the active country profile (F16 seam) — no hardcoded province list here.
const PROVINCES = activeCountry().regions;

// Joblop's real work categories (not tech roles). `q` matches role/title/city server-side.
const CATEGORIES = [
  { icon: "🩺", bg: "#fbf9f4", en: "Care & Nursing", fr: "Soins & infirmerie", ar: "الرعاية والتمريض", q: "nurse" },
  { icon: "🧑‍⚕️", bg: "#eafaf4", en: "Personal Support", fr: "Préposé aux bénéficiaires", ar: "الدعم الشخصي", q: "support" },
  { icon: "🍳", bg: "#fff2e8", en: "Kitchen", fr: "Cuisine", ar: "المطبخ", q: "cook" },
  { icon: "👨‍🍳", bg: "#fdeef3", en: "Chef", fr: "Chef", ar: "طاهٍ", q: "chef" },
  { icon: "🧹", bg: "#fbf9f4", en: "Housekeeping", fr: "Entretien ménager", ar: "التدبير المنزلي", q: "housekeeping" },
  { icon: "🍽️", bg: "#fbf9f4", en: "Dining Support", fr: "Service en salle", ar: "خدمة الطعام", q: "dining" },
  { icon: "🔧", bg: "#fff6e0", en: "Maintenance", fr: "Maintenance", ar: "الصيانة", q: "maintenance" },
  { icon: "🧺", bg: "#eef7e8", en: "Laundry & Cleaning", fr: "Buanderie & nettoyage", ar: "الغسيل والتنظيف", q: "cleaner" }
];

// Illustrative preview roles for the hero card — real Joblop categories, clearly flagged as a
// preview (not live listings), mirroring how premium marketplace heroes show "a few possibilities".
const PREVIEW = [
  { icon: "🩺", en: "Care & Nursing", fr: "Soins & infirmerie", ar: "الرعاية والتمريض", areaEn: "Montréal", areaFr: "Montréal", areaAr: "مونتريال", tagEn: "Hybrid", tagFr: "Hybride", tagAr: "هجين" },
  { icon: "🍳", en: "Kitchen", fr: "Cuisine", ar: "المطبخ", areaEn: "Laval", areaFr: "Laval", areaAr: "لافال", tagEn: "On-site", tagFr: "Sur place", tagAr: "في الموقع" },
  { icon: "🧑‍⚕️", en: "Personal Support", fr: "Préposé aux bénéficiaires", ar: "الدعم الشخصي", areaEn: "Across Canada", areaFr: "Partout au Canada", areaAr: "في جميع أنحاء كندا", tagEn: "Flexible", tagFr: "Flexible", tagAr: "مرن" }
];

const T = {
  en: {
    navJobs: "Find Jobs", navEmp: "For Employers", navRes: "Resources", navAbout: "About",
    signin: "Sign In", create: "Create Account",
    tabFind: "Find a Job", tabHire: "Hire Talent",
    pathTag: "GET STARTED", pathTitle: "Choose your path", pathSub: "Joblop works for both sides of the shift — pick the one that's you.",
    pathWorkerTag: "WORKERS", pathWorkerTitle: "I'm looking for work",
    pathWorkerDesc: "Search the whole market in one place, apply 100% free, and get paid fairly for your hours.",
    pathWorkerBtn: "Find work",
    pathClientTag: "CLIENTS & EMPLOYERS", pathClientTitle: "I'm hiring",
    pathClientDesc: "Post a staffing request and fill shifts with reliable local workers — governed and compliant.",
    pathClientBtn: "Hire & staff",
    magnetJobs: "jobs waiting right now", magnetProv: (n: number) => `across ${n} province${n === 1 ? "" : "s"}`,
    magnetSub: "Open a free account to see them all, apply in a tap, and get alerts the moment new ones land.",
    magnetBtn: "See all jobs — free",
    heroA: "Reliable People.", heroB: "Better Care.",
    heroSub: "The trusted staffing marketplace for senior residences — verified local workers, fair pay, and secure matching. 100% free to apply, always.",
    heroBadge: "⚡ Powered by JobScanner — one search across the market",
    freePill: "Trusted workforce for senior residences",
    trust1: "100% free to apply", trust2: "Never a cut of your pay",
    trust3: "The whole market, one search", trust4: "Across Canada · EN & FR",
    pcTag: "Preview", pcTitle: "A few good possibilities",
    previewLive: "Live results", previewMore: "Unlock the whole market with JobScanner — sign up free",
    previewEmpty: "Type a role or pick a province to see live matches.",
    phRole: "Job title, role, or keyword", phLoc: "Location", searchBtn: "Search Jobs",
    popular: "Popular:", allCanada: "All of Canada",
    cStat1: "open jobs", cStat2: "Across every province", cBuild: "Build your future",
    catTitle: "Explore jobs by category", catSub: "Start with the work you do, then narrow by place.",
    featTitle: "Featured opportunities", featSub: "Fresh open shifts from employers near you.", viewAll: "View all jobs →",
    openings: (n: number) => `${n} opening${n === 1 ? "" : "s"}`, urgent: "Urgent", starts: "Starts", apply: "Apply now",
    none: "No open jobs match right now — try another province or clear the search.", loading: "Finding jobs…",
    seekTag: "FOR WORKERS", seekTitle: "Take the next step in your work",
    seekSub: "Create a free profile, get matched to shifts near you, and never miss an opportunity.",
    seekBtn: "Create your account",
    seek1: "Apply to shifts in a few taps", seek2: "Get matched to work near you", seek3: "Your hours recorded fairly",
    empTag: "FOR EMPLOYERS", empTitle: "Find and staff shifts faster",
    empSub: "Post a request, reach available local workers, and get coverage you can count on.",
    empBtn: "Post a request", emp1: "Reach available local workers", emp2: "Governed, compliant staffing", emp3: "Fill urgent shifts fast",
    trustTitle: "Trusted where people live and work",
    trustSub: "Care homes, restaurants, and local employers across Canada staff with Joblop.",
    st1: "open jobs", st2: "provinces hiring", st3: "worker fees", st4: "to browse",
    jsTag: "⚡ JOBSCANNER", jsTitle: "The deepest job search in Canada — and it's free",
    jsSub: "JobScanner hunts the market for you: it continuously scans partner job feeds across Canada, ranks the best matches, and lets you apply free on Joblop. One search instead of ten tabs.",
    js1t: "Deep, real search", js1b: "The whole market scanned and refreshed around the clock.",
    js2t: "Ranked for you", js2b: "Sorted by fit and pay so the best jobs rise to the top.",
    js3t: "Apply free", js3b: "Apply on Joblop at no cost — we never take a cut of your pay.",
    jsBtn: "Search the market — free",
    leadsLive: "Live from across the web", leadsSrc: "External leads",
    leadsApply: "Apply with Joblop", leadsApplyHint: "Create a free Joblop account to apply and get alerts",
    leadsNote: "External roles — create a free Joblop account to apply and get alerts, all in one place.",
    leadsCta: "See the full ranked scanner (free)",
    alertTitle: "Get job alerts — from Joblop",
    alertSub: "Leave your email and we'll alert you as matching jobs appear. Free, and we never take a cut of your pay.",
    alertPh: "you@email.com", alertBtn: "Alert me", alertSending: "Saving…",
    alertOk: "You're on the list. We'll email you as Joblop alerts roll out.",
    alertErr: "Please enter a valid email and try again.",
    alertFine: "No spam. Unsubscribe anytime. Your email stays with Joblop.",
    whyTitle: "Why workers choose Joblop",
    why1t: "Trusted workplaces", why1b: "Clear terms before you accept — no surprises.",
    why2t: "Paid fairly", why2b: "Your hours come from your own clock-in / clock-out.",
    why3t: "No cut of your pay", why3b: "Joblop never takes a fee from what you earn.",
    contactTag: "CONTACT", contactTitle: "Get in touch",
    contactSub: "Questions about a job, hiring, or your account? Send us a message and we'll get back to you.",
    cEmail: "Email us", cVisit: "Visit us", cResp: "We usually reply within one business day.",
    cName: "Your name", cEmailF: "Your email", cMsg: "How can we help?", cSend: "Send message",
    ctaTitle: "Ready to start your next shift?", ctaSub: "Whether you're looking for work or the right people, Joblop is here to help.",
    ctaFind: "Find work", ctaPost: "Post a request",
    fTag: "Connecting people with opportunities to build a brighter future.",
    fSeekers: "For Workers", fEmp: "For Employers", fCo: "Company", fLegal: "Legal",
    fBrowse: "Browse jobs", fCreate: "Create account", fAlerts: "Job alerts",
    fPost: "Post a request", fFind: "Find workers", fPricing: "Pricing",
    fAbout: "About", fContact: "Contact", fCareers: "Careers",
    fPrivacy: "Privacy", fTerms: "Terms", fCookie: "Cookies",
    copyright: "Joblop. A brighter future, together."
  },
  fr: {
    navJobs: "Offres", navEmp: "Employeurs", navRes: "Ressources", navAbout: "À propos",
    signin: "Se connecter", create: "Créer un compte",
    tabFind: "Trouver un emploi", tabHire: "Recruter",
    pathTag: "COMMENCER", pathTitle: "Choisissez votre parcours", pathSub: "Joblop sert les deux côtés du quart — choisissez le vôtre.",
    pathWorkerTag: "TRAVAILLEURS", pathWorkerTitle: "Je cherche du travail",
    pathWorkerDesc: "Cherchez tout le marché au même endroit, postulez 100 % gratuitement et soyez payé équitablement pour vos heures.",
    pathWorkerBtn: "Trouver du travail",
    pathClientTag: "CLIENTS & EMPLOYEURS", pathClientTitle: "Je recrute",
    pathClientDesc: "Publiez une demande de dotation et comblez vos quarts avec des travailleurs locaux fiables — encadré et conforme.",
    pathClientBtn: "Recruter et doter",
    magnetJobs: "emplois disponibles en ce moment", magnetProv: (n: number) => `dans ${n} province${n === 1 ? "" : "s"}`,
    magnetSub: "Créez un compte gratuit pour tous les voir, postuler en un geste et être alerté dès qu'un nouvel emploi arrive.",
    magnetBtn: "Voir tous les emplois — gratuit",
    heroA: "Des gens fiables.", heroB: "De meilleurs soins.",
    heroSub: "La plateforme de dotation de confiance pour les résidences pour aînés — des travailleurs locaux vérifiés, une paie équitable et un jumelage sécuritaire. 100 % gratuit pour postuler.",
    heroBadge: "⚡ Propulsé par JobScanner — une seule recherche, tout le marché",
    freePill: "Personnel de confiance pour les résidences pour aînés",
    trust1: "Postuler 100 % gratuit", trust2: "Jamais de commission sur votre paie",
    trust3: "Tout le marché, une seule recherche", trust4: "Partout au Canada · EN & FR",
    pcTag: "Aperçu", pcTitle: "Quelques bonnes possibilités",
    previewLive: "Résultats en direct", previewMore: "Débloquez tout le marché avec JobScanner — inscription gratuite",
    previewEmpty: "Tapez un rôle ou choisissez une province pour voir des offres en direct.",
    phRole: "Titre, rôle ou mot-clé", phLoc: "Lieu", searchBtn: "Rechercher",
    popular: "Populaire :", allCanada: "Tout le Canada",
    cStat1: "offres ouvertes", cStat2: "Dans toutes les provinces", cBuild: "Bâtissez votre avenir",
    catTitle: "Explorez par catégorie", catSub: "Partez du travail que vous faites, puis affinez par lieu.",
    featTitle: "Offres en vedette", featSub: "De nouveaux quarts ouverts près de chez vous.", viewAll: "Voir toutes les offres →",
    openings: (n: number) => `${n} poste${n === 1 ? "" : "s"}`, urgent: "Urgent", starts: "Début", apply: "Postuler",
    none: "Aucune offre ne correspond — essayez une autre province ou effacez la recherche.", loading: "Recherche…",
    seekTag: "POUR LES TRAVAILLEURS", seekTitle: "Passez à l'étape suivante",
    seekSub: "Créez un profil gratuit, soyez jumelé à des quarts près de chez vous et ne manquez aucune occasion.",
    seekBtn: "Créer votre compte",
    seek1: "Postulez en quelques touches", seek2: "Jumelé à du travail près de vous", seek3: "Vos heures enregistrées équitablement",
    empTag: "POUR LES EMPLOYEURS", empTitle: "Comblez vos quarts plus vite",
    empSub: "Publiez une demande, rejoignez des travailleurs locaux disponibles et obtenez une couverture fiable.",
    empBtn: "Publier une demande", emp1: "Rejoignez des travailleurs locaux", emp2: "Dotation encadrée et conforme", emp3: "Comblez les urgences vite",
    trustTitle: "La confiance, là où l'on vit et travaille",
    trustSub: "Résidences, restaurants et employeurs locaux partout au Canada recrutent avec Joblop.",
    st1: "offres ouvertes", st2: "provinces qui embauchent", st3: "frais travailleur", st4: "pour consulter",
    jsTag: "⚡ JOBSCANNER", jsTitle: "La recherche d'emploi la plus poussée au Canada — gratuite",
    jsSub: "JobScanner cherche le marché pour vous : il analyse en continu des fils d'emplois partenaires partout au Canada, classe les meilleures correspondances et vous laisse postuler gratuitement sur Joblop. Une seule recherche au lieu de dix onglets.",
    js1t: "Recherche réelle et poussée", js1b: "Tout le marché analysé et rafraîchi en continu.",
    js2t: "Classé pour vous", js2b: "Triées par adéquation et salaire — les meilleures en premier.",
    js3t: "Postuler gratuitement", js3b: "Postulez sur Joblop sans frais — jamais de part de votre paie.",
    jsBtn: "Chercher le marché — gratuit",
    leadsLive: "En direct du web", leadsSrc: "Offres externes",
    leadsApply: "Postuler avec Joblop", leadsApplyHint: "Créez un compte Joblop gratuit pour postuler et recevoir des alertes",
    leadsNote: "Offres externes — créez un compte Joblop gratuit pour postuler et recevoir des alertes, au même endroit.",
    leadsCta: "Voir le scanner complet et classé (gratuit)",
    alertTitle: "Recevez des alertes d'emploi — de Joblop",
    alertSub: "Laissez votre courriel et nous vous alerterons dès qu'un emploi correspond. Gratuit, et nous ne prenons aucune part de votre paie.",
    alertPh: "vous@courriel.com", alertBtn: "M'alerter", alertSending: "Enregistrement…",
    alertOk: "Vous êtes inscrit. Nous vous écrirons dès le lancement des alertes Joblop.",
    alertErr: "Veuillez entrer un courriel valide et réessayer.",
    alertFine: "Pas de pourriel. Désabonnement en tout temps. Votre courriel reste chez Joblop.",
    whyTitle: "Pourquoi les travailleurs choisissent Joblop",
    why1t: "Milieux de confiance", why1b: "Conditions claires avant d'accepter — sans surprise.",
    why2t: "Payé équitablement", why2b: "Vos heures proviennent de votre propre pointage.",
    why3t: "Aucune part de votre paie", why3b: "Joblop ne prend jamais de frais sur ce que vous gagnez.",
    contactTag: "CONTACT", contactTitle: "Nous joindre",
    contactSub: "Des questions sur un emploi, le recrutement ou votre compte ? Écrivez-nous et nous vous répondrons.",
    cEmail: "Écrivez-nous", cVisit: "Nos bureaux", cResp: "Nous répondons habituellement en un jour ouvrable.",
    cName: "Votre nom", cEmailF: "Votre courriel", cMsg: "Comment pouvons-nous aider ?", cSend: "Envoyer le message",
    ctaTitle: "Prêt pour votre prochain quart ?", ctaSub: "Que vous cherchiez du travail ou les bonnes personnes, Joblop est là pour vous aider.",
    ctaFind: "Trouver du travail", ctaPost: "Publier une demande",
    fTag: "Relier les gens aux occasions pour bâtir un avenir meilleur.",
    fSeekers: "Travailleurs", fEmp: "Employeurs", fCo: "Entreprise", fLegal: "Légal",
    fBrowse: "Parcourir les offres", fCreate: "Créer un compte", fAlerts: "Alertes d'emploi",
    fPost: "Publier une demande", fFind: "Trouver des travailleurs", fPricing: "Tarifs",
    fAbout: "À propos", fContact: "Contact", fCareers: "Carrières",
    fPrivacy: "Confidentialité", fTerms: "Conditions", fCookie: "Témoins",
    copyright: "Joblop. Un avenir meilleur, ensemble."
  },
  ar: {
    navJobs: "الوظائف", navEmp: "لأصحاب العمل", navRes: "الموارد", navAbout: "من نحن",
    signin: "تسجيل الدخول", create: "إنشاء حساب",
    tabFind: "ابحث عن عمل", tabHire: "وظّف كفاءات",
    pathTag: "ابدأ الآن", pathTitle: "اختر مسارك", pathSub: "جوب‑لوب يخدم طرفَي النوبة — اختر ما يناسبك.",
    pathWorkerTag: "العمال", pathWorkerTitle: "أبحث عن عمل",
    pathWorkerDesc: "ابحث في السوق كله من مكان واحد، وتقدّم مجانًا 100٪، واحصل على أجر عادل مقابل ساعاتك.",
    pathWorkerBtn: "ابحث عن عمل",
    pathClientTag: "العملاء وأصحاب العمل", pathClientTitle: "أنا أوظّف",
    pathClientDesc: "انشر طلب توظيف واملأ النوبات بعمال محليين موثوقين — ضمن إطار منظّم ومتوافق.",
    pathClientBtn: "وظّف ودبّر",
    magnetJobs: "وظيفة متاحة الآن", magnetProv: (n: number) => `في ${n} مقاطعة`,
    magnetSub: "افتح حسابًا مجانيًا لرؤيتها كلها، وتقدّم بضغطة، واحصل على تنبيهات فور توفّر وظائف جديدة.",
    magnetBtn: "اعرض كل الوظائف — مجانًا",
    heroA: "أشخاص موثوقون.", heroB: "رعاية أفضل.",
    heroSub: "سوق التوظيف الموثوق لدور المسنين — عمال محليون موثّقون، أجر عادل، ومطابقة آمنة. التقديم مجاني 100٪ دائمًا.",
    heroBadge: "⚡ مدعوم بـ JobScanner — بحث واحد في السوق كله",
    freePill: "قوة عاملة موثوقة لدور المسنين",
    trust1: "التقديم مجاني 100٪", trust2: "لا نقتطع أبدًا من أجرك",
    trust3: "السوق كله ببحث واحد", trust4: "في جميع أنحاء كندا · إنجليزي وفرنسي",
    pcTag: "معاينة", pcTitle: "بعض الإمكانات الجيدة",
    previewLive: "نتائج مباشرة", previewMore: "افتح السوق كله مع JobScanner — سجّل مجانًا",
    previewEmpty: "اكتب دورًا أو اختر مقاطعة لرؤية نتائج مباشرة.",
    phRole: "المسمى الوظيفي أو الدور أو كلمة مفتاحية", phLoc: "الموقع", searchBtn: "ابحث عن وظائف",
    popular: "شائع:", allCanada: "كل كندا",
    cStat1: "وظيفة متاحة", cStat2: "في كل مقاطعة", cBuild: "ابنِ مستقبلك",
    catTitle: "استكشف الوظائف حسب الفئة", catSub: "ابدأ بالعمل الذي تتقنه، ثم ضيّق النطاق حسب المكان.",
    featTitle: "فرص مميزة", featSub: "نوبات مفتوحة جديدة من أصحاب عمل قريبين منك.", viewAll: "عرض كل الوظائف ←",
    openings: (n: number) => `${n} شاغر`, urgent: "عاجل", starts: "يبدأ", apply: "قدّم الآن",
    none: "لا توجد وظائف مطابقة الآن — جرّب مقاطعة أخرى أو امسح البحث.", loading: "جارٍ البحث…",
    seekTag: "للعمال", seekTitle: "اتخذ خطوتك التالية في العمل",
    seekSub: "أنشئ ملفًا مجانيًا، واحصل على مطابقة لنوبات قريبة منك، ولا تفوّت أي فرصة.",
    seekBtn: "أنشئ حسابك",
    seek1: "تقدّم للنوبات بضغطات قليلة", seek2: "مطابقة لعمل قريب منك", seek3: "ساعاتك مسجّلة بإنصاف",
    empTag: "لأصحاب العمل", empTitle: "املأ النوبات بسرعة أكبر",
    empSub: "انشر طلبًا، وتواصل مع عمال محليين متاحين، واحصل على تغطية يمكنك الاعتماد عليها.",
    empBtn: "انشر طلبًا", emp1: "تواصل مع عمال محليين متاحين", emp2: "توظيف منظّم ومتوافق", emp3: "املأ النوبات العاجلة بسرعة",
    trustTitle: "الثقة حيث نعيش ونعمل",
    trustSub: "دور الرعاية والمطاعم وأصحاب العمل المحليون في جميع أنحاء كندا يوظّفون عبر جوب‑لوب.",
    st1: "وظيفة متاحة", st2: "مقاطعة توظّف", st3: "رسوم على العامل", st4: "للتصفّح",
    jsTag: "⚡ JOBSCANNER", jsTitle: "أعمق بحث عن عمل في كندا — ومجاني",
    jsSub: "JobScanner يبحث في السوق نيابة عنك: يمسح باستمرار مصادر وظائف شريكة في جميع أنحاء كندا، ويرتّب أفضل المطابقات، ويتيح لك التقديم مجانًا عبر جوب‑لوب. بحث واحد بدل عشر نوافذ.",
    js1t: "بحث حقيقي وعميق", js1b: "السوق كله يُمسح ويُحدَّث باستمرار.",
    js2t: "مرتّب من أجلك", js2b: "مصنّفة حسب الملاءمة والأجر — الأفضل أولًا.",
    js3t: "تقديم مجاني", js3b: "تقدّم عبر جوب‑لوب دون رسوم — لا اقتطاع من أجرك أبدًا.",
    jsBtn: "ابحث في السوق — مجانًا",
    leadsLive: "مباشر من الويب", leadsSrc: "وظائف خارجية",
    leadsApply: "تقدّم عبر جوب‑لوب", leadsApplyHint: "أنشئ حساب جوب‑لوب مجاني للتقديم وتلقّي التنبيهات",
    leadsNote: "وظائف خارجية — أنشئ حساب جوب‑لوب مجاني للتقديم وتلقّي التنبيهات، من مكان واحد.",
    leadsCta: "اعرض الماسح الكامل والمصنّف (مجانًا)",
    alertTitle: "احصل على تنبيهات وظائف — من جوب‑لوب",
    alertSub: "اترك بريدك الإلكتروني وسننبّهك فور توفّر وظيفة مطابقة. مجانًا، ولا نقتطع أي جزء من أجرك.",
    alertPh: "you@email.com", alertBtn: "نبّهني", alertSending: "جارٍ الحفظ…",
    alertOk: "تم تسجيلك. سنراسلك فور إطلاق تنبيهات جوب‑لوب.",
    alertErr: "يرجى إدخال بريد إلكتروني صالح والمحاولة مجددًا.",
    alertFine: "لا رسائل مزعجة. يمكنك إلغاء الاشتراك في أي وقت. بريدك يبقى لدى جوب‑لوب.",
    whyTitle: "لماذا يختار العمال جوب‑لوب",
    why1t: "بيئات موثوقة", why1b: "شروط واضحة قبل القبول — دون مفاجآت.",
    why2t: "أجر عادل", why2b: "ساعاتك تأتي من تسجيل حضورك أنت.",
    why3t: "لا اقتطاع من أجرك", why3b: "جوب‑لوب لا يأخذ أبدًا رسومًا مما تكسبه.",
    contactTag: "تواصل", contactTitle: "تواصل معنا",
    contactSub: "أسئلة عن وظيفة أو التوظيف أو حسابك؟ راسلنا وسنرد عليك.",
    cEmail: "راسلنا", cVisit: "مكاتبنا", cResp: "نرد عادةً خلال يوم عمل واحد.",
    cName: "اسمك", cEmailF: "بريدك الإلكتروني", cMsg: "كيف يمكننا المساعدة؟", cSend: "أرسل الرسالة",
    ctaTitle: "جاهز لنوبتك التالية؟", ctaSub: "سواء كنت تبحث عن عمل أو عن الأشخاص المناسبين، جوب‑لوب هنا لمساعدتك.",
    ctaFind: "ابحث عن عمل", ctaPost: "انشر طلبًا",
    fTag: "نربط الناس بالفرص لبناء مستقبل أكثر إشراقًا.",
    fSeekers: "للعمال", fEmp: "لأصحاب العمل", fCo: "الشركة", fLegal: "قانوني",
    fBrowse: "تصفّح الوظائف", fCreate: "إنشاء حساب", fAlerts: "تنبيهات الوظائف",
    fPost: "انشر طلبًا", fFind: "ابحث عن عمال", fPricing: "الأسعار",
    fAbout: "من نحن", fContact: "تواصل", fCareers: "وظائف لدينا",
    fPrivacy: "الخصوصية", fTerms: "الشروط", fCookie: "ملفات تعريف الارتباط",
    copyright: "جوب‑لوب. مستقبل أكثر إشراقًا، معًا."
  }
} as const;

// Employer app entry — set NEXT_PUBLIC_EMPLOYER_URL in production (https://employer.joblop.com).
const EMPLOYER_URL = process.env.NEXT_PUBLIC_EMPLOYER_URL ?? "http://localhost:3100";
const CONTACT_EMAIL = "contact@joblop.com"; // change to the live inbox when set up
const CONTACT_ADDRESS = activeCountry().contactAddress;

export function PublicJobBoard() {
  // Follow the platform's chosen locale (cookie-driven, same control as the rest of the app) so the
  // page language AND the server-set <html dir> always agree: ع ⇒ rtl + Arabic, EN/FR ⇒ ltr.
  const locale = useLocale();
  const lang: Lang = locale === "ar" ? "ar" : locale.startsWith("fr") ? "fr" : "en";
  // Pick a localized string with en fallback for anything not yet translated.
  const tr = (en: string, fr: string, ar?: string) =>
    lang === "ar" ? ar ?? en : lang === "fr" ? fr : en;
  const [tab, setTab] = useState<"find" | "hire">("find");
  const [province, setProvince] = useState("");
  const [q, setQ] = useState("");
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [leadsTotal, setLeadsTotal] = useState<number | null>(null);
  const [totalJobs, setTotalJobs] = useState<number | null>(null);
  const [totalProvinces, setTotalProvinces] = useState<number | null>(null);
  const [alertEmail, setAlertEmail] = useState("");
  const [alertState, setAlertState] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [cForm, setCForm] = useState({ name: "", email: "", msg: "" });
  const gen = useRef(0);
  const t = T[lang];

  // Opens the visitor's own email client with the message pre-filled — a real, no-backend contact
  // path. We never collect or store the data ourselves.
  const sendContact = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Joblop — ${cForm.name || "contact"}`);
    const body = encodeURIComponent(`${cForm.msg}\n\n— ${cForm.name} <${cForm.email}>`);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  };

  const load = useCallback(async () => {
    const mine = ++gen.current;
    setJobs(null);
    const params = new URLSearchParams();
    if (province) params.set("province", province);
    if (q.trim()) params.set("q", q.trim());
    params.set("limit", "24");
    try {
      const res = await fetch(`/api/public/jobs?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (mine === gen.current) setJobs(Array.isArray(data.jobs) ? data.jobs : []);
    } catch {
      if (mine === gen.current) setJobs([]);
    }
  }, [province, q]);

  useEffect(() => {
    const h = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(h);
  }, [load, q]);

  // Dark-first landing: paint the page canvas black end to end so the experience is one continuous
  // black surface (behind the island and the app's global footer), then restore on leave.
  useEffect(() => {
    const body = document.body.style.background;
    const html = document.documentElement.style.background;
    document.body.style.background = "#000000";
    document.documentElement.style.background = "#000000";
    return () => {
      document.body.style.background = body;
      document.documentElement.style.background = html;
    };
  }, []);

  // Public JobScanner teaser — real external market leads (cached, read-only). Follows the same
  // role/province filters so the magnet reacts to the visitor's search. Empty until a scan has run.
  const loadLeads = useCallback(async () => {
    const params = new URLSearchParams();
    if (province) params.set("province", province);
    if (q.trim()) params.set("q", q.trim());
    params.set("limit", "6");
    try {
      const res = await fetch(`/api/public/jobscanner/leads?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      setLeads(Array.isArray(data.leads) ? data.leads : []);
      setLeadsTotal(typeof data.total === "number" ? data.total : null);
    } catch {
      setLeads([]);
    }
  }, [province, q]);

  useEffect(() => {
    const h = setTimeout(loadLeads, q ? 350 : 0);
    return () => clearTimeout(h);
  }, [loadLeads, q]);

  // TRUE total of jobs waiting (Joblop open jobs + scanned external leads) for the headline magnet.
  // Pure count query on the API — no live scan. Reacts to province, not to every keystroke.
  const loadStats = useCallback(async () => {
    const params = new URLSearchParams();
    if (province) params.set("province", province);
    try {
      const res = await fetch(`/api/public/jobscanner/stats?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      setTotalJobs(typeof data.total === "number" ? data.total : null);
      setTotalProvinces(typeof data.provinceCount === "number" ? data.provinceCount : null);
    } catch {
      /* non-fatal — magnet falls back to the live-result count */
    }
  }, [province]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  // Capture a job-alert email for Joblop (not the external source). Carries the current role/province
  // so the subscription is pre-targeted. Honest: records the subscription; delivery rolls out later.
  const submitAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (alertState === "sending") return;
    const email = alertEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setAlertState("err"); return; }
    setAlertState("sending");
    try {
      const res = await fetch("/api/public/jobscanner/alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, q: q.trim() || undefined, province: province || undefined, locale: lang })
      });
      if (res.ok) trackConversion("generate_lead", { method: "email_alert" });
      setAlertState(res.ok ? "ok" : "err");
    } catch {
      setAlertState("err");
    }
  };

  const fmtPay = (l: Lead) => {
    const toK = (minor: number | null) => (minor == null ? null : Math.round(minor / 100 / 1000));
    const lo = toK(l.salaryMinMinor);
    const hi = toK(l.salaryMaxMinor);
    if (lo == null && hi == null) return null;
    if (lo != null && hi != null) return lo === hi ? `$${lo}k` : `$${lo}–${hi}k`;
    return `$${lo ?? hi}k`;
  };

  const scrollToJobs = () => document.getElementById("jobs")?.scrollIntoView({ behavior: "smooth" });
  const fmtDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { month: "short", day: "numeric" }); }
    catch { return iso; }
  };
  const provinceCount = jobs ? new Set(jobs.map((j) => j.province).filter(Boolean)).size : 0;
  const jobCount = jobs ? jobs.length : null;
  // Hero/stat headline count: prefer the TRUE total (Joblop open jobs + all scanned leads) from the
  // stats endpoint; fall back to the live teaser total, then to Joblop's own public-job count.
  const openCount = totalJobs ?? leadsTotal ?? jobCount;
  // Province tally for the aggregate stats: prefer the stats endpoint (same source as openCount) so
  // the trust-band figure isn't a bare "—" just because the live typeahead has no local matches yet.
  const openProvinces = totalProvinces ?? (provinceCount || null);
  const fmtCount = (n: number | null) => (n == null ? "—" : n.toLocaleString(lang === "fr" ? "fr-CA" : "en-CA"));

  return (
    <div className="jl">
      <style>{CSS}</style>

      {/* NAV */}
      <SiteHeader />

      {/* HERO */}
      <section className="jl-hero">
        <div className="jl-hero-in">
          <div className="jl-hero-copy">
            <span className="jl-free-pill">✓ {t.freePill}</span>
            <h1>{t.heroA}<br /><span className="jl-hl-accent">{t.heroB}</span></h1>
            <p>{t.heroSub}</p>
            <div className="jl-tabs">
              <button className={tab === "find" ? "on" : ""} onClick={() => setTab("find")}>🔍 {t.tabFind}</button>
              <button className={tab === "hire" ? "on" : ""} onClick={() => setTab("hire")}>🧑‍💼 {t.tabHire}</button>
            </div>
            {tab === "find" ? (
              <form className="jl-search" onSubmit={(e) => { e.preventDefault(); scrollToJobs(); void load(); }}>
                <div className="jl-sf"><span>🔎</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.phRole} aria-label={t.phRole} /></div>
                <div className="jl-sf jl-sf-loc"><span>📍</span>
                  <select value={province} onChange={(e) => setProvince(e.target.value)} aria-label={t.phLoc}>
                    <option value="">{t.allCanada}</option>
                    {PROVINCES.map((p) => <option key={p.code} value={p.code}>{lang === "ar" ? p.ar : lang === "fr" ? p.fr : p.en}</option>)}
                  </select>
                </div>
                <button type="submit" className="jl-search-btn">{t.searchBtn}</button>
              </form>
            ) : (
              <a href={EMPLOYER_URL} className="jl-hire-cta">{t.empBtn} →</a>
            )}
            {tab === "find" && (
              <div className="jl-popular">
                <span>{t.popular}</span>
                {CATEGORIES.slice(0, 4).map((c) => (
                  <button key={c.q} onClick={() => { setQ(c.q); scrollToJobs(); }}>{c[lang]}</button>
                ))}
              </div>
            )}
            <a href="#jobscanner" className="jl-hero-js">{t.heroBadge} →</a>

            {/* Live search demo: real matches appear as the visitor types — proof of the deep search. */}
            {tab === "find" && (
              <div className="jl-preview">
                <div className="jl-preview-head">
                  <span className="jl-preview-dot" /> {t.previewLive}
                  {jobs !== null && jobs.length > 0 ? <span className="jl-preview-n">{jobs.length} {t.st1}</span> : null}
                </div>
                {jobs === null ? (
                  <div className="jl-preview-empty">{t.loading}</div>
                ) : jobs.length === 0 ? (
                  <div className="jl-preview-empty">{t.previewEmpty}</div>
                ) : (
                  <>
                    {jobs.slice(0, 3).map((j) => (
                      <a key={j.jobCode} href="/" className="jl-preview-row">
                        <span className="jl-preview-ic">{iconFor(j.role)}</span>
                        <span className="jl-preview-main"><strong>{j.role}</strong><em>📍 {j.areaLabel}</em></span>
                        {(j.urgency === "urgent" || j.urgency === "immediate") ? <span className="jl-preview-u">{t.urgent}</span> : null}
                      </a>
                    ))}
                    <a href="/" className="jl-preview-more">🔓 {t.previewMore} →</a>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="jl-hero-art" aria-hidden="true">
            <div className="jl-blob" />
            <div className="jl-pcard">
              <div className="jl-pcard-top"><span className="jl-pcard-tag">✦ {t.pcTag}</span></div>
              <strong className="jl-pcard-h">{t.pcTitle}</strong>
              {PREVIEW.map((p) => (
                <div className="jl-pcard-row" key={p.en}>
                  <span className="jl-pcard-ic">{p.icon}</span>
                  <span className="jl-pcard-m"><b>{p[lang]}</b><em>{lang === "ar" ? p.areaAr : lang === "fr" ? p.areaFr : p.areaEn}</em></span>
                  <span className="jl-pcard-t">{lang === "ar" ? p.tagAr : lang === "fr" ? p.tagFr : p.tagEn}</span>
                </div>
              ))}
            </div>
            <div className="jl-fc jl-fc-badge"><div className="jl-fc-ic">🗂️</div><div><strong>{openCount ?? "—"}</strong><span>{t.cStat1}</span></div></div>
          </div>
        </div>
      </section>

      {/* FEATURE BAND — four concrete, honest differentiators under the hero (reference layout) */}
      <section className="jl-features" aria-label="Why Joblop">
        <div className="jl-wrap jl-features-in">
          {[
            { ic: "🛡️", t: tr("Verified Workers", "Travailleurs vérifiés", "عمال موثّقون"), s: tr("Background checked", "Antécédents vérifiés", "تحقّق من الخلفية") },
            { ic: "⚡", t: tr("Fast Matching", "Jumelage rapide", "مطابقة سريعة"), s: tr("Find staff in minutes", "Trouvez du personnel en minutes", "جد العمال في دقائق") },
            { ic: "🔒", t: tr("Secure Payments", "Paiements sécurisés", "مدفوعات آمنة"), s: tr("Safe and transparent", "Sûrs et transparents", "آمنة وشفافة") },
            { ic: "📍", t: tr("Local Workforce", "Main-d'œuvre locale", "قوة عاملة محلية"), s: tr("Across Canada", "Partout au Canada", "في جميع أنحاء كندا") }
          ].map((f) => (
            <div className="jl-feature" key={f.t}>
              <span className="jl-feature-ic">{f.ic}</span>
              <div className="jl-feature-txt">
                <strong>{f.t}</strong>
                <span>{f.s}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* COMMON STAFFING NEEDS — photo cards (senior-residence roles) */}
      <section className="jl-sec jl-needs">
        <div className="jl-wrap">
          <h2>{tr("Common Staffing Needs", "Besoins de dotation courants", "احتياجات التوظيف الشائعة")}</h2>
          <div className="jl-needs-grid">
            {[
              { img: "chef", en: "Chefs & Cooks", fr: "Chefs et cuisiniers", ar: "طهاة وطباخون", enS: "Qualified culinary staff for all shifts", frS: "Personnel culinaire qualifié, tous les quarts", arS: "طاقم طهي مؤهّل لكل النوبات" },
              { img: "cleaning", en: "Cleaning Staff", fr: "Personnel d'entretien", ar: "طاقم التنظيف", enS: "Reliable and experienced cleaners", frS: "Préposés fiables et expérimentés", arS: "عمال تنظيف موثوقون وذوو خبرة" },
              { img: "moving", en: "Moving & Delivery", fr: "Déménagement et livraison", ar: "النقل والتوصيل", enS: "Help with moving, setup and delivery", frS: "Aide au déménagement et à la livraison", arS: "مساعدة في النقل والتجهيز والتوصيل" },
              { img: "handyman", en: "Handyman", fr: "Homme à tout faire", ar: "فنّي صيانة", enS: "Skilled workers for maintenance tasks", frS: "Travailleurs qualifiés pour l'entretien", arS: "عمال مهرة لمهام الصيانة" }
            ].map((c) => (
              <div className="jl-need" key={c.img}>
                <div className="jl-need-img" style={{ backgroundImage: `url('/img/cat-${c.img}.png')` }} />
                <div className="jl-need-b">
                  <strong>{c[lang]}</strong>
                  <span>{lang === "ar" ? c.arS : lang === "fr" ? c.frS : c.enS}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* JOB-COUNT MAGNET + CHOOSE YOUR PATH — one clear fork for workers vs clients */}
      <section className="jl-sec" id="paths">
        <div className="jl-wrap">
          <div className="jl-magnet">
            <div className="jl-magnet-num">{fmtCount(openCount)}</div>
            <div className="jl-magnet-copy">
              <strong>{t.magnetJobs}</strong>
              {totalProvinces ? <span className="jl-magnet-prov">{t.magnetProv(totalProvinces)}</span> : null}
              <p>{t.magnetSub}</p>
            </div>
            <a href="/" className="jl-btn-orange jl-btn-lg">{t.magnetBtn}</a>
          </div>

          <div className="jl-paths-head">
            <span className="jl-tag">{t.pathTag}</span>
            <h2>{t.pathTitle}</h2>
            <p className="jl-sub">{t.pathSub}</p>
          </div>
          <div className="jl-paths">
            <div className="jl-path jl-path-worker">
              <span className="jl-path-tag">👷 {t.pathWorkerTag}</span>
              <h3>{t.pathWorkerTitle}</h3>
              <p>{t.pathWorkerDesc}</p>
              <div className="jl-path-cta">
                <a href="/" className="jl-btn-primary">{t.pathWorkerBtn}</a>
                <button className="jl-link" onClick={() => { setTab("find"); scrollToJobs(); }}>{t.navJobs} →</button>
              </div>
            </div>
            <div className="jl-path jl-path-client">
              <span className="jl-path-tag">🧑‍💼 {t.pathClientTag}</span>
              <h3>{t.pathClientTitle}</h3>
              <p>{t.pathClientDesc}</p>
              <div className="jl-path-cta">
                <a href={EMPLOYER_URL} className="jl-btn-primary">{t.pathClientBtn}</a>
                <a href={EMPLOYER_URL} className="jl-link">{t.navEmp} →</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — numbered steps (reference layout) */}
      <section className="jl-sec jl-how" aria-label="How Joblop works">
        <div className="jl-wrap jl-center">
          <span className="jl-eyebrow">{tr("HOW IT WORKS", "COMMENT ÇA MARCHE", "كيف يعمل")}</span>
          <h2>{tr("How Joblop works", "Comment fonctionne Joblop", "كيف يعمل جوب‑لوب")}</h2>
          <p className="jl-sub">{tr("From search to paid — four simple steps.", "De la recherche à la paie — quatre étapes simples.", "من البحث إلى الأجر — أربع خطوات بسيطة.")}</p>
          <div className="jl-how-grid">
            {[
              { t: tr("Search the market", "Cherchez le marché", "ابحث في السوق"), d: tr("Browse every open shift in one place.", "Parcourez tous les quarts ouverts au même endroit.", "تصفّح كل النوبات المفتوحة في مكان واحد.") },
              { t: tr("Apply 100% free", "Postulez 100 % gratuit", "تقدّم مجانًا 100٪"), d: tr("One tap, no fees, ever.", "Un geste, sans frais, jamais.", "بضغطة واحدة، دون رسوم أبدًا.") },
              { t: tr("Get matched", "Soyez jumelé", "احصل على مطابقة"), d: tr("Verified roles matched to you.", "Des postes vérifiés jumelés à vous.", "وظائف موثّقة مطابقة لك.") },
              { t: tr("Get hired & paid", "Soyez embauché et payé", "اقبل الوظيفة واحصل على أجرك"), d: tr("Start work and get paid fairly.", "Commencez à travailler et soyez payé équitablement.", "ابدأ العمل واحصل على أجر عادل.") }
            ].map((s, i) => (
              <div className="jl-how-step" key={s.t}>
                <span className="jl-how-num">{i + 1}</span>
                <strong>{s.t}</strong>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="jl-sec">
        <div className="jl-wrap">
          <h2>{t.catTitle}</h2>
          <p className="jl-sub">{t.catSub}</p>
          <div className="jl-cats">
            {CATEGORIES.map((c) => (
              <button key={c.q} className="jl-cat" onClick={() => { setQ(c.q); scrollToJobs(); }}>
                <span className="jl-cat-ic">{c.icon}</span>
                <strong>{c[lang]}</strong>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED / RESULTS (real data) */}
      <section className="jl-sec jl-sec-alt" id="jobs">
        <div className="jl-wrap">
          <div className="jl-row-head">
            <div><h2>{t.featTitle}</h2><p className="jl-sub">{t.featSub}</p></div>
            <button className="jl-link" onClick={() => { setQ(""); setProvince(""); }}>{t.viewAll}</button>
          </div>
          {jobs === null ? (
            <p className="jl-muted">{t.loading}</p>
          ) : jobs.length === 0 ? (
            <p className="jl-muted">{t.none}</p>
          ) : (
            <div className="jl-jobs">
              {jobs.map((j) => {
                const urgent = j.urgency === "urgent" || j.urgency === "immediate";
                return (
                  <div key={j.jobCode} className="jl-job">
                    <div className="jl-job-ic">{iconFor(j.role)}</div>
                    <div className="jl-job-main">
                      <strong>{j.role}</strong>
                      <span className="jl-job-meta">📍 {j.areaLabel} · {t.starts} {fmtDate(j.startAt)}</span>
                    </div>
                    <div className="jl-job-tags">
                      {urgent ? <span className="jl-tag jl-tag-u">{t.urgent}</span> : null}
                      <span className="jl-tag">{t.openings(j.openings)}</span>
                    </div>
                    <a href="/" className="jl-apply">{t.apply}</a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* JOBSCANNER */}
      <section className="jl-js" id="jobscanner">
        <div className="jl-wrap jl-js-in">
          <div className="jl-js-copy">
            <span className="jl-js-tag">📡 {t.jsTag}</span>
            <h2>{t.jsTitle}</h2>
            <p>{t.jsSub}</p>
            <a href="/job-scanner" className="jl-js-btn">{t.jsBtn} →</a>
          </div>
          <div className="jl-js-demo"><JobScannerDemo lang={lang} /></div>
        </div>
        {leads && leads.length > 0 && (
          <div className="jl-leads">
            <div className="jl-leads-head">
              <span className="jl-leads-dot" /> {t.leadsLive}
              <span className="jl-leads-src">{t.leadsSrc}</span>
            </div>
            <div className="jl-leads-grid">
              {leads.map((l, i) => {
                const pay = fmtPay(l);
                // Funnel into Joblop first: clicking opens free sign-up (then Assisted Apply to the
                // source), so Joblop — not the external site — owns the worker relationship.
                return (
                  <a key={`${l.source}-${i}`} href="/" className="jl-lead" title={t.leadsApplyHint}>
                    <span className="jl-lead-ic">{iconFor(l.title)}</span>
                    <span className="jl-lead-main">
                      <strong>{l.title}</strong>
                      <em>{l.employer ? `${l.employer} · ` : ""}📍 {l.areaLabel}</em>
                    </span>
                    {pay ? <span className="jl-lead-pay">{pay}</span> : null}
                    <span className="jl-lead-go">{t.leadsApply} →</span>
                  </a>
                );
              })}
            </div>
            <p className="jl-leads-note">{t.leadsNote} <a href="/job-scanner">{t.leadsCta} →</a></p>
          </div>
        )}
        <div className="jl-wrap jl-alert">
          <div className="jl-alert-copy">
            <h3>{t.alertTitle}</h3>
            <p>{t.alertSub}</p>
          </div>
          {alertState === "ok" ? (
            <p className="jl-alert-ok">✓ {t.alertOk}</p>
          ) : (
            <form className="jl-alert-form" onSubmit={submitAlert}>
              <input
                type="email"
                value={alertEmail}
                onChange={(e) => { setAlertEmail(e.target.value); if (alertState === "err") setAlertState("idle"); }}
                placeholder={t.alertPh}
                aria-label={t.alertPh}
                required
              />
              <button type="submit" disabled={alertState === "sending"}>
                {alertState === "sending" ? t.alertSending : t.alertBtn}
              </button>
            </form>
          )}
          {alertState === "err" ? <p className="jl-alert-err">{t.alertErr}</p> : null}
          {alertState !== "ok" ? <p className="jl-alert-fine">{t.alertFine}</p> : null}
        </div>
      </section>

      {/* FOR WORKERS */}
      <section className="jl-split jl-split-a">
        <div className="jl-wrap jl-split-in">
          <div className="jl-split-copy">
            <span className="jl-eyebrow">{t.seekTag}</span>
            <h2>{t.seekTitle}</h2>
            <p>{t.seekSub}</p>
            <a href="/" className="jl-btn-primary jl-btn-lg">{t.seekBtn}</a>
            <ul className="jl-checks">
              <li>✓ {t.seek1}</li><li>✓ {t.seek2}</li><li>✓ {t.seek3}</li>
            </ul>
          </div>
          <div className="jl-split-card">
            <div className="jl-mini"><span>🎯</span> {tr("Matches just for you", "Jumelage pour vous", "مطابقات لك وحدك")}</div>
            <ul className="jl-mini-list">
              <li>✓ {tr("Create profile", "Créer un profil", "أنشئ ملفًا")}</li>
              <li>✓ {tr("Get matched", "Être jumelé", "احصل على مطابقة")}</li>
              <li>✓ {tr("Apply to shifts", "Postuler", "تقدّم للنوبات")}</li>
              <li>○ {tr("Get hired", "Commencer", "ابدأ العمل")}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FOR EMPLOYERS */}
      <section className="jl-split jl-split-b">
        <div className="jl-wrap jl-split-in">
          <div className="jl-split-copy">
            <span className="jl-eyebrow jl-eyebrow-o">{t.empTag}</span>
            <h2>{t.empTitle}</h2>
            <p>{t.empSub}</p>
            <a href={EMPLOYER_URL} className="jl-btn-orange jl-btn-lg">{t.empBtn}</a>
            <ul className="jl-checks jl-checks-o">
              <li>✓ {t.emp1}</li><li>✓ {t.emp2}</li><li>✓ {t.emp3}</li>
            </ul>
          </div>
          <div className="jl-split-card">
            <div className="jl-mini"><span>👥</span> {tr("Qualified workers", "Travailleurs qualifiés", "عمال مؤهّلون")}</div>
            <div className="jl-avatars">{["🧑‍⚕️","👨‍🍳","🧹","🔧","🧑‍⚕️"].map((a, i) => <span key={i}>{a}</span>)}</div>
            <div className="jl-mini jl-mini-2"><span>📊</span> {tr("Coverage you can count on", "Couverture fiable", "تغطية يمكنك الاعتماد عليها")}</div>
          </div>
        </div>
      </section>

      {/* TRUST (honest) + STATS */}
      <section className="jl-sec" id="about">
        <div className="jl-wrap jl-center">
          <h2>{t.trustTitle}</h2>
          <p className="jl-sub">{t.trustSub}</p>
          <div className="jl-stats">
            <div><strong>{openCount ?? "—"}</strong><span>{t.st1}</span></div>
            <div><strong>{openProvinces ?? "—"}</strong><span>{t.st2}</span></div>
            <div><strong>$0</strong><span>{t.st3}</span></div>
            <div><strong>$0</strong><span>{t.st4}</span></div>
          </div>
        </div>
      </section>

      {/* WHY (replaces fabricated testimonials) */}
      <section className="jl-sec jl-sec-alt" id="why">
        <div className="jl-wrap jl-center">
          <h2>{t.whyTitle}</h2>
          <div className="jl-why">
            <div className="jl-why-c"><div className="jl-why-ic">🤝</div><h4>{t.why1t}</h4><p>{t.why1b}</p></div>
            <div className="jl-why-c"><div className="jl-why-ic">⏱️</div><h4>{t.why2t}</h4><p>{t.why2b}</p></div>
            <div className="jl-why-c"><div className="jl-why-ic">🚫</div><h4>{t.why3t}</h4><p>{t.why3b}</p></div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="jl-sec jl-sec-alt" id="contact">
        <div className="jl-wrap jl-contact">
          <div className="jl-contact-copy">
            <span className="jl-eyebrow">{t.contactTag}</span>
            <h2>{t.contactTitle}</h2>
            <p className="jl-sub">{t.contactSub}</p>
            <div className="jl-contact-row">
              <span className="jl-contact-ic">✉️</span>
              <div><strong>{t.cEmail}</strong><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></div>
            </div>
            <div className="jl-contact-row">
              <span className="jl-contact-ic">📍</span>
              <div><strong>{t.cVisit}</strong><span>{CONTACT_ADDRESS}</span></div>
            </div>
            <p className="jl-contact-note">⏱ {t.cResp}</p>
          </div>
          <form className="jl-contact-form" onSubmit={sendContact}>
            <input required value={cForm.name} onChange={(e) => setCForm({ ...cForm, name: e.target.value })} placeholder={t.cName} aria-label={t.cName} />
            <input required type="email" value={cForm.email} onChange={(e) => setCForm({ ...cForm, email: e.target.value })} placeholder={t.cEmailF} aria-label={t.cEmailF} />
            <textarea required value={cForm.msg} onChange={(e) => setCForm({ ...cForm, msg: e.target.value })} placeholder={t.cMsg} aria-label={t.cMsg} rows={4} />
            <button type="submit" className="jl-btn-primary jl-btn-lg">{t.cSend}</button>
          </form>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="jl-cta">
        <div className="jl-wrap jl-center">
          <h2>{t.ctaTitle}</h2>
          <p>{t.ctaSub}</p>
          <div className="jl-cta-btns">
            <a href="/" className="jl-cta-white">{t.ctaFind}</a>
            <a href={EMPLOYER_URL} className="jl-cta-outline">{t.ctaPost}</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="jl-foot">
        <div className="jl-wrap jl-foot-in">
          <div className="jl-foot-brand">
            <a href="/" className="jl-logo jl-logo-w"><img src="/img/joblop-logo.png" alt="Joblop" style={{ height: 28, width: "auto", display: "block", borderRadius: 6 }} /></a>
            <p>{t.fTag}</p>
          </div>
          <div className="jl-foot-cols">
            <div><h5>{t.fSeekers}</h5><a href="#jobs">{t.fBrowse}</a><a href="/">{t.fCreate}</a><a href="#jobs">{t.fAlerts}</a></div>
            <div><h5>{t.fEmp}</h5><a href={EMPLOYER_URL}>{t.fPost}</a><a href={EMPLOYER_URL}>{t.fFind}</a><a href={EMPLOYER_URL}>{t.fPricing}</a></div>
            <div><h5>{t.fCo}</h5><a href="#about">{t.fAbout}</a><a href="#contact">{t.fContact}</a><a href="#about">{t.fCareers}</a></div>
            <div><h5>{t.fLegal}</h5><a href="/privacy">{t.fPrivacy}</a><a href="/privacy">{t.fTerms}</a><a href="/privacy">{t.fCookie}</a></div>
          </div>
        </div>
        <div className="jl-foot-bar">© {new Date().getFullYear()} {t.copyright}</div>
      </footer>
    </div>
  );
}


function iconFor(role: string): string {
  const r = role.toLowerCase();
  if (r.includes("nurse")) return "🩺";
  if (r.includes("support") || r.includes("psw") || r.includes("préposé")) return "🧑‍⚕️";
  if (r.includes("chef")) return "👨‍🍳";
  if (r.includes("cook") || r.includes("kitchen") || r.includes("cuisin")) return "🍳";
  if (r.includes("house") || r.includes("clean") || r.includes("ménag")) return "🧹";
  if (r.includes("dining") || r.includes("salle")) return "🍽️";
  if (r.includes("maint")) return "🔧";
  return "💼";
}

const CSS = `
/* Dark-first premium brand experience — one continuous BLACK canvas, top to bottom. Cream body,
   gold accents used sparingly, serif headings, dark-raised panels with thin gold hairline borders.
   Built on the shared --jl-* tokens. */
.jl{
  --ink:#f4efe4;            /* cream body text on black */
  --muted:#b3a894;          /* warm secondary text */
  --faint:#8a8070;          /* tertiary */
  --bg:#000000;             /* page canvas */
  --card:#0c0c0c;           /* raised panel */
  --card-2:#131110;         /* slightly higher raise / chips */
  --chip:#161310;           /* icon tiles */
  --line:rgba(201,162,75,.16);   /* gold hairline */
  --line-2:rgba(201,162,75,.34); /* gold hairline on hover */
  --gold:#c9a24b;           /* primary accent — pops on black */
  --gold-pri:#c9a24b;--gold-pri-2:#b8862f;--gold-2:#9a7122;--accent-warm:#c9a24b;--tint:#161310;--ink-dark:#000000;
  --shadow:0 24px 60px -34px rgba(0,0,0,.8),0 2px 8px rgba(0,0,0,.5);
  color:var(--ink);background:var(--bg);min-height:100vh;font-family:var(--jl-font-sans);-webkit-font-smoothing:antialiased;line-height:1.5;}
.jl *{box-sizing:border-box;}
.jl a{color:inherit;text-decoration:none;}
.jl h2{font-family:var(--jl-font-serif);font-size:clamp(26px,3.6vw,38px);letter-spacing:-.015em;margin:0 0 10px;font-weight:800;color:#fbf7ee;text-wrap:balance;}
.jl .jl-sub{color:var(--muted);margin:0 0 28px;font-size:16px;max-width:60ch;}
.jl-wrap{max-width:1120px;margin:0 auto;padding:0 max(18px,env(safe-area-inset-left)) 0 max(18px,env(safe-area-inset-right));}
.jl-center{text-align:center;}
.jl-center .jl-sub{margin-left:auto;margin-right:auto;}
.jl-muted{color:var(--muted);}
:where(.jl) a:focus-visible,:where(.jl) button:focus-visible,:where(.jl) input:focus-visible,:where(.jl) select:focus-visible{outline:2px solid var(--gold);outline-offset:2px;border-radius:6px;}
/* NAV */
.jl-nav{position:sticky;top:env(safe-area-inset-top,0);z-index:30;background:rgba(0,0,0,.7);-webkit-backdrop-filter:blur(14px) saturate(1.2);backdrop-filter:blur(14px) saturate(1.2);border-bottom:1px solid var(--line);}
.jl-nav-in{max-width:1120px;margin:0 auto;display:flex;align-items:center;gap:20px;padding:12px max(18px,env(safe-area-inset-left));min-height:64px;}
.jl-logo{display:inline-flex;align-items:center;gap:9px;font-weight:800;font-size:21px;color:var(--ink);letter-spacing:-.02em;}
.jl-logo span{color:var(--gold);}
.jl-links{display:flex;gap:26px;margin-left:12px;}
.jl-links a{color:var(--muted);font-weight:600;font-size:14.5px;transition:color .15s;}
.jl-links a:hover{color:var(--ink);}
.jl-nav-cta{margin-left:auto;display:flex;align-items:center;gap:12px;}
.jl-btn-ghost{border:1px solid var(--line-2);color:var(--ink);padding:9px 16px;border-radius:10px;font-weight:700;font-size:14px;transition:background .15s,border-color .15s;}
.jl-btn-ghost:hover{background:rgba(201,162,75,.08);border-color:var(--gold);}
.jl-btn-primary{background:var(--gold);color:#000;padding:9px 18px;border-radius:10px;font-weight:800;font-size:14px;transition:background .15s,transform .12s;}
.jl-btn-primary:hover{background:var(--gold-pri-2);transform:translateY(-1px);}
.jl-btn-lg{display:inline-block;padding:13px 26px;font-size:15.5px;border-radius:12px;}
/* HERO */
.jl-hero{background:linear-gradient(100deg,#000 0%,#000 36%,rgba(0,0,0,.72) 58%,rgba(0,0,0,.34) 100%),radial-gradient(1100px 560px at 92% -12%,rgba(201,162,75,.22),transparent),url('/img/hero.png') right center/cover no-repeat,#000;border-bottom:1px solid var(--line);color:#f4efe4;}
.jl-hero .jl-hero-copy h1{color:#fbf7ee;}
.jl-hero .jl-hero-copy>p{color:#cdc3ae;}
.jl-hero-in{max-width:1120px;margin:0 auto;display:grid;grid-template-columns:1.1fr .9fr;gap:36px;align-items:center;padding:clamp(40px,7vw,76px) max(18px,env(safe-area-inset-left));}
.jl-free-pill{display:inline-flex;align-items:center;background:rgba(201,162,75,.1);border:1px solid var(--line);color:#e8c87a;font-weight:800;font-size:11px;letter-spacing:.16em;text-transform:uppercase;padding:6px 12px;border-radius:999px;margin-bottom:18px;}
.jl a.jl-hero-js{display:inline-flex;align-items:center;flex-wrap:wrap;gap:4px 8px;line-height:1.4;margin-top:18px;background:linear-gradient(90deg,#141210,#1f1a12);color:#f4efe4;-webkit-text-fill-color:#f4efe4;font-weight:700;font-size:13px;padding:10px 16px;border-radius:999px;border:1px solid var(--line-2);max-width:100%;}
.jl a.jl-hero-js:hover{filter:brightness(1.14);}
.jl-hero-copy h1{font-family:var(--jl-font-serif);font-size:clamp(38px,5.6vw,60px);line-height:1.04;letter-spacing:-.015em;margin:0 0 16px;font-weight:800;}
.jl-hl-accent{color:var(--gold);font-style:normal;font-weight:800;}
.jl-hero-copy>p{color:#cdc3ae;font-size:clamp(15px,1.9vw,18px);max-width:520px;margin:0 0 22px;line-height:1.6;}
.jl-tabs{display:inline-flex;gap:4px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:4px;margin-bottom:14px;}
.jl-tabs button{border:0;background:transparent;padding:9px 18px;border-radius:9px;font-weight:700;font-size:14px;cursor:pointer;color:var(--muted);transition:background .15s,color .15s;}
.jl-tabs button.on{background:rgba(201,162,75,.14);color:var(--gold);}
.jl-search{display:flex;gap:8px;flex-wrap:wrap;background:var(--card);border:1px solid var(--line-2);border-radius:16px;padding:8px;box-shadow:var(--shadow);max-width:560px;}
.jl-sf{display:flex;align-items:center;gap:8px;background:var(--chip);border:1px solid var(--line);border-radius:11px;padding:0 12px;flex:1 1 190px;min-width:0;}
.jl-sf-loc{flex:0 0 auto;}
.jl-sf span{opacity:.7;font-size:14px;}
.jl-sf input,.jl-sf select{border:0;background:transparent;outline:none;font-size:15px;color:var(--ink);padding:13px 2px;width:100%;min-width:0;font-family:inherit;}
.jl-sf select{cursor:pointer;}
.jl-sf select option{color:#111;}
.jl-search-btn{border:0;background:var(--gold);color:#000;font-weight:800;font-size:14.5px;border-radius:11px;padding:0 24px;min-height:48px;cursor:pointer;flex:0 0 auto;transition:background .15s;}
.jl-search-btn:hover{background:var(--gold-pri-2);}
.jl-hire-cta{display:inline-block;background:var(--gold);color:#000;font-weight:800;padding:14px 24px;border-radius:12px;}
.jl-popular{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:18px;font-size:13px;}
.jl-hero .jl-popular span,.jl-popular span{color:var(--muted);font-weight:700;}
.jl-popular button{border:1px solid var(--line);background:rgba(255,255,255,.03);border-radius:999px;padding:6px 13px;font-size:12.5px;cursor:pointer;color:var(--muted);transition:border-color .15s,color .15s;}
.jl-popular button:hover{border-color:var(--gold);color:var(--gold);}
.jl-preview{margin-top:18px;max-width:560px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:8px;box-shadow:var(--shadow);}
.jl-preview-head{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:800;letter-spacing:.04em;color:var(--muted);padding:8px 8px 8px;text-transform:uppercase;}
.jl-preview-dot{width:8px;height:8px;border-radius:50%;background:#35e08a;box-shadow:0 0 0 0 rgba(53,224,138,.5);animation:jlpulse 1.8s infinite;}
@keyframes jlpulse{0%{box-shadow:0 0 0 0 rgba(53,224,138,.5);}70%{box-shadow:0 0 0 7px rgba(53,224,138,0);}100%{box-shadow:0 0 0 0 rgba(53,224,138,0);}}
.jl-preview-n{margin-left:auto;color:var(--gold);}
.jl-preview-empty{padding:10px 8px 12px;color:var(--muted);font-size:13.5px;}
.jl-preview-row{display:flex;align-items:center;gap:10px;padding:10px 8px;border-radius:10px;transition:background .15s;}
.jl-preview-row:hover{background:rgba(255,255,255,.04);}
.jl-preview-ic{width:34px;height:34px;border-radius:10px;background:var(--chip);border:1px solid var(--line);display:grid;place-items:center;font-size:17px;flex:0 0 auto;}
.jl-preview-main{display:flex;flex-direction:column;min-width:0;flex:1;}
.jl-preview-main strong{font-size:14px;color:var(--ink);}
.jl-preview-main em{font-style:normal;color:var(--muted);font-size:12.5px;}
.jl-preview-u{background:rgba(201,162,75,.16);color:#e8c87a;font-size:10.5px;font-weight:800;padding:2px 8px;border-radius:999px;text-transform:uppercase;flex:0 0 auto;}
.jl-preview-more{display:block;text-align:center;margin-top:4px;background:rgba(201,162,75,.1);border:1px solid var(--line);color:var(--gold);font-weight:700;font-size:13px;padding:12px;border-radius:11px;transition:background .15s;}
.jl-preview-more:hover{background:rgba(201,162,75,.18);}
.jl-hero-art{position:relative;min-height:320px;display:flex;align-items:center;justify-content:center;}
.jl-blob{position:absolute;inset:8% 6%;background:radial-gradient(circle at 40% 35%,rgba(201,162,75,.22),rgba(201,162,75,.05) 70%);border-radius:44% 56% 62% 38%/48% 42% 58% 52%;filter:blur(6px);}
.jl-fc{position:absolute;background:var(--card);border:1px solid var(--line-2);border-radius:14px;padding:12px 16px;box-shadow:var(--shadow);display:flex;align-items:center;gap:10px;}
.jl-fc-ic{width:36px;height:36px;border-radius:10px;background:var(--chip);border:1px solid var(--line);display:grid;place-items:center;font-size:18px;}
.jl-fc strong{display:block;font-size:17px;font-weight:800;letter-spacing:-.01em;color:var(--ink);}
.jl-fc span{font-size:12px;color:var(--muted);}
.jl-fc1{top:8%;left:2%;}
.jl-fc2{top:44%;right:0;}
.jl-fc3{bottom:10%;left:12%;}
/* Hero preview card */
.jl-pcard{position:relative;z-index:2;width:min(100%,380px);background:var(--card);border:1px solid var(--line-2);border-radius:18px;box-shadow:var(--shadow);padding:16px;}
.jl-pcard-top{display:flex;align-items:center;justify-content:flex-end;margin-bottom:10px;min-height:22px;}
.jl-pcard-tag{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:#e8c87a;background:rgba(201,162,75,.14);border:1px solid var(--line);padding:4px 10px;border-radius:999px;}
.jl-pcard-h{display:block;font-family:var(--jl-font-serif);font-size:19px;font-weight:800;margin:0 0 12px;letter-spacing:-.01em;color:#fbf7ee;}
.jl-pcard-row{display:flex;align-items:center;gap:11px;padding:10px 11px;border:1px solid var(--line);border-radius:12px;margin-bottom:8px;background:var(--card-2);}
.jl-pcard-row:last-child{margin-bottom:0;}
.jl-pcard-ic{width:34px;height:34px;border-radius:10px;background:var(--chip);border:1px solid var(--line);display:grid;place-items:center;font-size:17px;flex:0 0 auto;}
.jl-pcard-m{display:flex;flex-direction:column;min-width:0;flex:1;}
.jl-pcard-m b{font-size:13.5px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink);}
.jl-pcard-m em{font-size:12px;color:var(--muted);font-style:normal;}
.jl-pcard-t{font-size:10.5px;font-weight:800;color:#e8c87a;background:rgba(201,162,75,.14);padding:4px 9px;border-radius:999px;flex:0 0 auto;}
.jl-fc-badge{position:absolute;top:-16px;left:-12px;z-index:3;}
/* SECTIONS — one continuous black canvas */
.jl-sec{padding:clamp(40px,6vw,76px) 0;}
.jl-sec-alt{background:#060606;border-top:1px solid var(--line);border-bottom:1px solid var(--line);}
.jl-row-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:24px;}
.jl-row-head h2,.jl-row-head p{margin:0;}
.jl-link{border:0;background:transparent;color:var(--gold);font-weight:700;font-size:14.5px;cursor:pointer;}
.jl-link:hover{color:var(--gold-soft,#f0d9a0);}
/* TRUST STRIP */
/* FEATURE BAND (4 icon differentiators under the hero) */
.jl-features{border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:linear-gradient(180deg,rgba(201,162,75,.05),transparent);}
.jl-features-in{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;padding:26px max(18px,env(safe-area-inset-left));}
.jl-feature{display:flex;align-items:center;gap:13px;}
.jl-feature-ic{width:44px;height:44px;flex:0 0 auto;border-radius:12px;display:grid;place-items:center;font-size:21px;background:rgba(201,162,75,.12);border:1px solid var(--line);}
.jl-feature-txt{display:flex;flex-direction:column;min-width:0;}
.jl-feature-txt strong{font-size:14.5px;color:var(--ink);letter-spacing:-.01em;}
.jl-feature-txt span{font-size:12.5px;color:var(--muted);}
/* HOW IT WORKS (numbered steps) */
.jl-how-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:30px;text-align:center;}
.jl-how-step{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:26px 20px;display:flex;flex-direction:column;align-items:center;gap:8px;transition:border-color .14s,transform .14s;}
.jl-how-step:hover{border-color:var(--line-2);transform:translateY(-2px);}
.jl-how-num{width:40px;height:40px;border-radius:999px;display:grid;place-items:center;font-weight:800;font-size:17px;color:#000;background:var(--gold);font-variant-numeric:tabular-nums;margin-bottom:4px;}
.jl-how-step strong{font-family:var(--jl-font-serif);font-size:18px;font-weight:800;color:#fbf7ee;}
.jl-how-step p{margin:0;color:var(--muted);font-size:14px;line-height:1.5;}
/* CATEGORIES */
.jl-cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px;}
.jl-cat{display:flex;flex-direction:column;gap:12px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;cursor:pointer;text-align:left;transition:transform .14s,box-shadow .14s,border-color .14s;}
.jl-cat:hover{transform:translateY(-3px);box-shadow:var(--shadow);border-color:var(--line-2);}
.jl-cat-ic{width:48px;height:48px;border-radius:13px;display:grid;place-items:center;font-size:24px;background:var(--chip);border:1px solid var(--line);}
.jl-cat strong{font-size:14.5px;color:var(--ink);}
/* JOBS */
.jl-jobs{display:flex;flex-direction:column;gap:10px;}
.jl-job{display:flex;align-items:center;gap:14px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;transition:box-shadow .14s,border-color .14s,transform .14s;flex-wrap:wrap;}
.jl-job:hover{box-shadow:var(--shadow);border-color:var(--line-2);transform:translateY(-1px);}
.jl-job-ic{width:44px;height:44px;border-radius:12px;background:var(--chip);border:1px solid var(--line);display:grid;place-items:center;font-size:21px;flex:0 0 auto;}
.jl-job-main{display:flex;flex-direction:column;gap:3px;min-width:140px;flex:1 1 200px;}
.jl-job-main strong{font-size:15.5px;color:var(--ink);}
.jl-job-meta{color:var(--muted);font-size:13px;}
.jl-job-tags{display:flex;gap:7px;flex-wrap:wrap;}
.jl-tag{background:rgba(201,162,75,.12);color:#e8c87a;font-size:12px;font-weight:600;padding:4px 10px;border-radius:999px;border:1px solid var(--line);}
.jl-tag-u{background:rgba(224,107,15,.16);color:#f0a96a;border-color:rgba(224,107,15,.3);}
.jl-apply{background:var(--gold);color:#000;font-weight:800;font-size:13.5px;padding:10px 16px;border-radius:10px;flex:0 0 auto;transition:background .15s;}
.jl-apply:hover{background:var(--gold-pri-2);}
/* JOB-COUNT MAGNET + CHOOSE YOUR PATH */
.jl-magnet{display:flex;align-items:center;gap:24px;flex-wrap:wrap;background:radial-gradient(600px 240px at 85% -30%,rgba(201,162,75,.22),transparent),linear-gradient(135deg,#0c0a08,#17120b);border:1px solid var(--line-2);color:#f4efe4;border-radius:22px;padding:clamp(24px,3vw,36px);margin-bottom:clamp(30px,4vw,48px);}
.jl-magnet-num{font-size:clamp(46px,8vw,78px);font-weight:800;line-height:1;letter-spacing:-.02em;color:var(--gold);font-variant-numeric:tabular-nums;}
.jl-magnet-copy{flex:1 1 240px;min-width:0;}
.jl-magnet-copy strong{display:block;font-size:clamp(17px,2.4vw,22px);font-weight:700;color:#fbf7ee;}
.jl-magnet-prov{display:inline-block;margin-top:2px;font-size:13px;color:var(--muted);font-weight:600;}
.jl-magnet-copy p{margin:8px 0 0;color:#d6cbb2;font-size:14.5px;max-width:52ch;}
.jl-paths-head{text-align:center;margin-bottom:24px;}
.jl-paths-head .jl-tag{display:inline-block;margin-bottom:10px;}
.jl-paths{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;}
.jl-path{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:clamp(22px,2.6vw,32px);display:flex;flex-direction:column;gap:10px;transition:transform .14s,border-color .14s,box-shadow .14s;}
.jl-path:hover{transform:translateY(-3px);border-color:var(--line-2);box-shadow:var(--shadow);}
.jl-path-worker{border-top:3px solid var(--gold);}
.jl-path-client{border-top:3px solid var(--gold-2);}
.jl-path-tag{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);}
.jl-path h3{margin:2px 0 0;font-family:var(--jl-font-serif);font-weight:800;font-size:clamp(20px,2.6vw,26px);color:#fbf7ee;}
.jl-path p{color:var(--muted);font-size:15px;margin:0;flex:1 1 auto;line-height:1.6;}
.jl-path-cta{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:6px;}
/* SPLIT (workers / employers) */
.jl-split{padding:clamp(34px,5vw,64px) 0;}
.jl-split-a,.jl-split-b{background:#060606;border-top:1px solid var(--line);border-bottom:1px solid var(--line);}
.jl-split-in{display:grid;grid-template-columns:1.05fr .95fr;gap:36px;align-items:center;}
.jl-eyebrow{font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);}
.jl-eyebrow-o{color:var(--gold-2);}
.jl-split-copy h2{margin:12px 0;}
.jl-split-copy>p{color:var(--muted);max-width:440px;margin:0 0 18px;line-height:1.6;}
.jl-checks{list-style:none;padding:0;margin:18px 0 0;display:flex;flex-direction:column;gap:11px;color:var(--ink);font-weight:600;font-size:14.5px;}
.jl-checks li{display:flex;align-items:center;gap:10px;}
.jl-checks li::marker{content:"";}
.jl-checks-o li{color:var(--ink);}
.jl-btn-orange{background:var(--gold);color:#000;font-weight:800;border-radius:12px;}
.jl-btn-orange:hover{background:var(--gold-pri-2);}
.jl-split-card{background:var(--card);border:1px solid var(--line-2);border-radius:18px;padding:24px;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:14px;}
.jl-mini{display:flex;align-items:center;gap:9px;font-weight:700;font-size:14.5px;color:var(--ink);}
.jl-mini span{font-size:18px;}
.jl-mini-2{color:var(--muted);}
.jl-mini-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:9px;color:var(--muted);font-size:14px;}
.jl-avatars{display:flex;gap:6px;}
.jl-avatars span{width:38px;height:38px;border-radius:50%;background:var(--chip);display:grid;place-items:center;font-size:19px;border:2px solid #000;}
/* JOBSCANNER */
.jl-js{padding:clamp(34px,5vw,64px) 0;}
.jl-js-in{background:radial-gradient(600px 300px at 12% 0%,rgba(201,162,75,.22),transparent),linear-gradient(120deg,#0b0906,#16110a 60%,#000);border:1px solid var(--line-2);
  border-radius:24px;padding:clamp(28px,5vw,46px);color:#f4efe4;display:grid;grid-template-columns:1.05fr .95fr;gap:36px;align-items:center;
  margin-left:max(18px,env(safe-area-inset-left));margin-right:max(18px,env(safe-area-inset-right));}
.jl-js-tag{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.1em;color:#e8c87a;background:rgba(201,162,75,.14);border:1px solid var(--line);padding:5px 12px;border-radius:999px;}
.jl-js-copy h2{color:#fbf7ee;margin:14px 0 12px;}
.jl-js-copy>p{color:#cabfa8;max-width:460px;margin:0 0 22px;line-height:1.6;}
.jl-js-btn{display:inline-block;background:linear-gradient(90deg,#c9a24b,#f0d9a0);color:#000;font-weight:800;padding:14px 24px;border-radius:12px;}
.jl-js-btn:hover{filter:brightness(1.06);}
.jl-js-demo{display:flex;justify-content:center;}
.jl-leads{margin-top:18px;background:radial-gradient(600px 300px at 88% 0%,rgba(201,162,75,.18),transparent),linear-gradient(120deg,#0b0906,#16110a 60%,#000);border:1px solid var(--line);border-radius:24px;padding:clamp(24px,4vw,36px);margin-left:max(18px,env(safe-area-inset-left));margin-right:max(18px,env(safe-area-inset-right));}
.jl-leads-head{display:flex;align-items:center;gap:9px;color:#ece0c4;font-weight:800;font-size:13px;letter-spacing:.05em;text-transform:uppercase;margin-bottom:16px;}
.jl-leads-dot{width:9px;height:9px;border-radius:50%;background:#35e08a;box-shadow:0 0 0 4px rgba(53,224,138,.22);animation:jlpulse 1.8s ease-in-out infinite;}
.jl-leads-src{margin-left:auto;font-weight:700;font-size:11px;letter-spacing:.03em;color:var(--muted);background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:999px;padding:3px 10px;}
.jl-leads-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
.jl-lead{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.04);border:1px solid var(--line);border-radius:14px;padding:13px 14px;transition:background .15s,border-color .15s,transform .15s;min-width:0;}
.jl-lead:hover{background:rgba(255,255,255,.07);border-color:var(--line-2);transform:translateY(-1px);}
.jl-lead-ic{font-size:22px;flex:none;}
.jl-lead-main{display:flex;flex-direction:column;gap:2px;min-width:0;}
.jl-lead-main strong{color:var(--ink);font-size:14.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.jl-lead-main em{color:var(--muted);font-size:12.5px;font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.jl-lead-pay{margin-left:auto;flex:none;color:#4fe3a0;font-weight:800;font-size:13px;}
.jl-leads-note{margin:16px 0 0;color:var(--muted);font-size:13px;}
.jl-leads-note a{color:var(--gold);font-weight:700;}
.jl-lead-go{flex:none;margin-left:10px;color:var(--gold);font-weight:800;font-size:12px;opacity:0;transform:translateX(-4px);transition:opacity .15s,transform .15s;white-space:nowrap;}
.jl-lead:hover .jl-lead-go{opacity:1;transform:translateX(0);}
.jl-alert{margin-top:18px;background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:22px;padding:clamp(24px,4vw,32px);display:flex;flex-wrap:wrap;align-items:center;gap:16px 24px;margin-left:max(18px,env(safe-area-inset-left));margin-right:max(18px,env(safe-area-inset-right));}
.jl-alert-copy{flex:1 1 280px;min-width:0;}
.jl-alert-copy h3{margin:0 0 6px;color:#fbf7ee;font-size:19px;font-family:var(--jl-font-serif);font-weight:800;}
.jl-alert-copy p{margin:0;color:var(--muted);font-size:13.5px;max-width:460px;}
.jl-alert-form{flex:1 1 300px;display:flex;gap:9px;min-width:0;}
.jl-alert-form input{flex:1 1 auto;min-width:0;background:var(--chip);border:1px solid var(--line-2);border-radius:11px;padding:13px 14px;font-size:14.5px;color:var(--ink);}
.jl-alert-form input::placeholder{color:var(--faint);}
.jl-alert-form button{flex:none;background:var(--gold);color:#000;font-weight:800;font-size:14px;padding:12px 22px;border:none;border-radius:11px;cursor:pointer;transition:background .15s;}
.jl-alert-form button:hover{background:var(--gold-pri-2);}
.jl-alert-form button:disabled{opacity:.6;cursor:default;}
.jl-alert-ok{flex:1 1 300px;margin:0;color:#4fe3a0;font-weight:700;font-size:15px;}
.jl-alert-err{flex:1 1 100%;margin:2px 0 0;color:#ff9b9b;font-size:13px;}
.jl-alert-fine{flex:1 1 100%;margin:2px 0 0;color:var(--faint);font-size:12px;}
.jl-js-feats{display:flex;flex-direction:column;gap:12px;}
.jl-js-feat{display:flex;gap:13px;background:rgba(255,255,255,.04);border:1px solid var(--line);border-radius:14px;padding:16px;}
.jl-js-feat span{font-size:22px;}
.jl-js-feat strong{display:block;font-size:15px;color:#fbf7ee;}
.jl-js-feat p{margin:3px 0 0;color:var(--muted);font-size:13.5px;}
/* STATS */
.jl-stats{display:flex;gap:40px;flex-wrap:wrap;justify-content:center;margin-top:28px;}
.jl-stats div{display:flex;flex-direction:column;align-items:center;}
.jl-stats strong{font-size:clamp(30px,4vw,38px);font-weight:800;color:var(--gold);letter-spacing:-.02em;font-variant-numeric:tabular-nums;}
.jl-stats span{font-size:12.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:4px;}
/* WHY */
.jl-why{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;margin-top:24px;text-align:left;}
.jl-why-c{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:24px;transition:border-color .14s,transform .14s;}
.jl-why-c:hover{border-color:var(--line-2);transform:translateY(-2px);}
.jl-why-ic{font-size:26px;}
.jl-why-c h4{margin:12px 0 6px;font-size:16.5px;color:#fbf7ee;}
.jl-why-c p{margin:0;color:var(--muted);font-size:14.5px;line-height:1.6;}
/* CONTACT */
.jl-contact{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start;}
.jl-contact-copy .jl-eyebrow{display:block;margin-bottom:6px;}
.jl-contact-row{display:flex;gap:12px;align-items:flex-start;margin-top:18px;}
.jl-contact-ic{width:40px;height:40px;border-radius:12px;background:var(--chip);border:1px solid var(--line);display:grid;place-items:center;font-size:18px;flex:0 0 auto;}
.jl-contact-row strong{display:block;font-size:13px;color:var(--muted);}
.jl-contact-row a,.jl-contact-row span{color:var(--ink);font-weight:600;}
.jl-contact-row a:hover{color:var(--gold);}
.jl-contact-note{margin-top:18px;color:var(--muted);font-size:13.5px;}
.jl-contact-form{display:flex;flex-direction:column;gap:12px;background:var(--card);border:1px solid var(--line-2);border-radius:18px;padding:24px;box-shadow:var(--shadow);}
.jl-contact-form input,.jl-contact-form textarea{border:1px solid var(--line-2);border-radius:11px;padding:13px 14px;font-size:15px;font-family:inherit;color:var(--ink);background:var(--chip);outline:none;resize:vertical;}
.jl-contact-form input::placeholder,.jl-contact-form textarea::placeholder{color:var(--faint);}
.jl-contact-form input:focus,.jl-contact-form textarea:focus{border-color:var(--gold);}
.jl-contact-form .jl-btn-lg{text-align:center;border:0;cursor:pointer;}
/* CTA */
.jl-cta{padding:clamp(34px,5vw,64px) 0;}
.jl-cta .jl-wrap{background:radial-gradient(700px 300px at 85% -20%,rgba(201,162,75,.24),transparent),linear-gradient(120deg,#0c0a08,#17120b 55%,#1f1810);border:1px solid var(--line-2);border-radius:24px;padding:clamp(36px,6vw,58px) 24px;color:#f4efe4;}
.jl-cta h2{color:#fbf7ee;}
.jl-cta p{opacity:.92;max-width:520px;margin:0 auto 22px;color:#d6cbb2;}
.jl-cta-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;}
.jl-cta-white{background:var(--gold);color:#000;font-weight:800;padding:14px 28px;border-radius:12px;transition:background .15s;}
.jl-cta-white:hover{background:var(--gold-pri-2);}
.jl-cta-outline{border:1.5px solid var(--line-2);color:#f4efe4;font-weight:800;padding:14px 28px;border-radius:12px;transition:background .15s,border-color .15s;}
.jl-cta-outline:hover{background:rgba(201,162,75,.1);border-color:var(--gold);}
/* FOOTER */
.jl-foot{background:#000;border-top:1px solid var(--line);color:var(--muted);padding:clamp(34px,5vw,54px) 0 0;}
.jl-foot-in{display:grid;grid-template-columns:1.2fr 2fr;gap:28px;padding-bottom:28px;}
.jl-logo-w{color:#fbf7ee;}
.jl-foot-brand p{color:var(--muted);font-size:14px;max-width:280px;margin:12px 0 0;line-height:1.6;}
.jl-foot-cols{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;}
.jl-foot-cols h5{color:#fbf7ee;font-size:13.5px;margin:0 0 12px;}
.jl-foot-cols a{display:block;color:var(--muted);font-size:13.5px;margin-bottom:9px;transition:color .15s;}
.jl-foot-cols a:hover{color:var(--gold);}
.jl-foot-bar{border-top:1px solid var(--line);padding:18px max(18px,env(safe-area-inset-left));text-align:center;color:var(--faint);font-size:13px;max-width:1120px;margin:0 auto;}
/* RESPONSIVE */
@media (max-width:860px){
  .jl-hero-in,.jl-split-in,.jl-foot-in,.jl-js-in,.jl-contact{grid-template-columns:1fr;}
  .jl-hero-art{min-height:auto;order:-1;display:block;margin:2px 0 16px;}
  .jl-blob{display:none;}
  .jl-pcard{width:100%;}
  .jl-fc-badge{position:static;display:inline-flex;margin-bottom:10px;padding:9px 14px;}
  .jl-fc-badge .jl-fc-ic{width:32px;height:32px;font-size:16px;}
  .jl-fc-badge strong{font-size:16px;}
  .jl-links{display:none;}
  .jl-foot-cols{grid-template-columns:repeat(2,1fr);}
  .jl-features-in{grid-template-columns:repeat(2,1fr);gap:16px 20px;}
  .jl-how-grid{grid-template-columns:repeat(2,1fr);}
  .jl-leads-grid{grid-template-columns:1fr;}
}
@media (max-width:520px){
  .jl-sf,.jl-sf-loc,.jl-search-btn{flex:1 1 100%;}
  .jl-nav-cta .jl-btn-ghost{display:none;}
}
.jl-needs-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:4px;}
.jl-need{background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:var(--shadow);transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease;}
.jl-need:hover{transform:translateY(-3px);border-color:var(--line-2);}
.jl-need-img{height:152px;background-size:cover;background-position:center;border-bottom:1px solid var(--line);}
.jl-need-b{padding:14px 16px 18px;}
.jl-need-b strong{display:block;font-size:16px;color:var(--ink);letter-spacing:-.01em;}
.jl-need-b span{display:block;color:var(--muted);font-size:13px;margin-top:4px;line-height:1.4;}
@media(max-width:860px){.jl-needs-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:480px){.jl-needs-grid,.jl-how-grid{grid-template-columns:1fr;}}
`;
