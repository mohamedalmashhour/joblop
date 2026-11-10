export const contactPaths = [
  {
    title: "Help with an active shift",
    text: "Current shift, late arrival, no-show, replacement, check-in or check-out, or urgent operations issue."
  },
  {
    title: "General contact",
    text: "Staffing, billing, documents, sales, privacy, technical, account, or non-active-shift support."
  }
] as const;

export const activeShiftIssues = [
  "Worker has not arrived",
  "Worker is late",
  "Worker cannot continue shift",
  "Employer cannot receive worker",
  "Shift details are incorrect",
  "Replacement needed",
  "Check-in or check-out problem",
  "Communication failure",
  "Operational safety concern",
  "Other active-shift issue"
] as const;

export const immediateActions = [
  "Contact assigned worker",
  "Contact employer or residence",
  "Request replacement",
  "Report late arrival",
  "Report inability to continue",
  "Open secure support case"
] as const;

export const escalationTimeline = [
  "Submitted",
  "Triage in progress",
  "Assigned to support",
  "Action being coordinated",
  "Resolved or closed"
] as const;

export const generalReasons = [
  "Request staffing",
  "Existing shift issue",
  "Worker support",
  "Employer account support",
  "Billing or invoice",
  "Documents or compliance",
  "Technical issue",
  "Sales or enterprise",
  "Privacy request",
  "Other"
] as const;

export const attachmentWarnings = [
  "Do not upload passwords.",
  "Do not upload complete payment-card details.",
  "Do not upload unnecessary health records.",
  "Do not upload full banking details.",
  "Do not upload unrelated personal information."
] as const;

export const aiSupportBoundary = [
  "AI may classify the issue.",
  "AI may identify urgency.",
  "AI may summarize the case.",
  "AI may flag duplicate reports.",
  "AI must not discipline a worker.",
  "AI must not assign a replacement without authorized confirmation.",
  "AI must not close a dispute or claim the issue is resolved."
] as const;

export const faqPreview = [
  "How do I request urgent staff?",
  "How do I report a problem during a shift?",
  "Where do I ask about an invoice?",
  "How do I make a privacy request?"
] as const;

// ---------------------------------------------------------------------------------------------
// Localized page copy (EN / FR Québec / AR). English values equal the exports above.
// ---------------------------------------------------------------------------------------------
// The two paths are always in this order: [active-shift support, general contact]. The page owns the
// matching anchors (see pathAnchors in page.tsx).
export type ContactPathCopy = Readonly<{ title: string; text: string; button: string }>;

export type ContactCopy = Readonly<{
  eyebrow: string;
  title: string;
  lede: string;
  activeShortcut: string;
  generalShortcut: string;
  pathsEyebrow: string;
  pathsTitle: string;
  paths: readonly ContactPathCopy[];
  activeEyebrow: string;
  activeTitle: string;
  activeCopy: string;
  issueCategory: string;
  activeShiftIssues: readonly string[];
  panelTitle: string;
  panelText: string;
  immediateActions: readonly string[];
  timelineEyebrow: string;
  timelineTitle: string;
  escalationTimeline: readonly string[];
  generalEyebrow: string;
  generalTitle: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  generalReasons: readonly string[];
  userTypeLabel: string;
  userTypePlaceholder: string;
  userTypes: readonly string[];
  subjectLabel: string;
  subjectPlaceholder: string;
  responseLabel: string;
  responsePlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
  emailButton: string;
  emailNote: string;
  guardrailsEyebrow: string;
  guardrailsTitle: string;
  guardrailsCopy: string;
  attachmentsEyebrow: string;
  attachmentsTitle: string;
  attachmentWarnings: readonly string[];
  aiEyebrow: string;
  aiTitle: string;
  aiSupportBoundary: readonly string[];
  faqEyebrow: string;
  faqTitle: string;
  faqPreview: readonly string[];
}>;

const contactEn: ContactCopy = {
  eyebrow: "Contact Joblop",
  title: "Choose the right support path so your request can be routed safely.",
  lede: "Joblop handles staffing and operational shift issues. Medical emergencies, threats to immediate safety, or public-safety emergencies must use local emergency services.",
  activeShortcut: "Active-shift help",
  generalShortcut: "General contact",
  pathsEyebrow: "Support paths",
  pathsTitle: "Active-shift support is separate from ordinary contact.",
  paths: [
    { ...contactPaths[0], button: "Start Active-Shift Support" },
    { ...contactPaths[1], button: "Use General Contact" }
  ],
  activeEyebrow: "Active-shift support",
  activeTitle: "Operational help for a current or imminent shift.",
  activeCopy:
    "This route prepares or routes an operational case. It does not promise automatic resolution, automatic replacement, worker discipline, or confirmed staffing.",
  issueCategory: "Issue category",
  activeShiftIssues,
  panelTitle: "Active case panel",
  panelText:
    "Signed-in users may see authorized shift context. Signed-out users provide only the minimum details needed to identify the shift.",
  immediateActions,
  timelineEyebrow: "Case escalation timeline",
  timelineTitle: "Case status is visible, but resolution is not fabricated.",
  escalationTimeline,
  generalEyebrow: "General contact",
  generalTitle: "Use this route for non-active-shift questions.",
  reasonLabel: "Contact reason",
  reasonPlaceholder: "Select a reason",
  generalReasons,
  userTypeLabel: "User type",
  userTypePlaceholder: "Select user type",
  userTypes: ["Worker", "Employer", "Residence manager", "Scheduler", "Applicant", "Visitor"],
  subjectLabel: "Subject",
  subjectPlaceholder: "Short summary",
  responseLabel: "Preferred response method",
  responsePlaceholder: "Email or secure in-app message when available",
  messageLabel: "Message",
  messagePlaceholder: "Describe what you need. Do not include passwords or full financial details.",
  emailButton: "Email Joblop support",
  emailNote:
    "This opens your email app to reach Joblop support directly. Don't include passwords or full financial details.",
  guardrailsEyebrow: "Replacement and privacy guardrails",
  guardrailsTitle: "Support routes issues to governed workflows.",
  guardrailsCopy:
    "Availability is not guaranteed. Matching may be AI-assisted, but a person or authorized employer confirms final assignment. The original shift remains unresolved until a replacement is confirmed.",
  attachmentsEyebrow: "Attachment rules",
  attachmentsTitle: "Sensitive material belongs in governed secure channels.",
  attachmentWarnings,
  aiEyebrow: "AI support boundary",
  aiTitle: "AI can help classify support needs, but it cannot resolve governed workflows.",
  aiSupportBoundary,
  faqEyebrow: "FAQ preview",
  faqTitle: "Common support questions before contacting us.",
  faqPreview
};

const contactFr: ContactCopy = {
  eyebrow: "Joindre Joblop",
  title: "Choisissez le bon type d'aide pour que votre demande soit bien acheminée.",
  lede: "Joblop s'occupe de la dotation et des problèmes liés aux quarts de travail. Pour une urgence médicale, une menace immédiate à la sécurité ou une urgence publique, communiquez avec les services d'urgence locaux.",
  activeShortcut: "Aide pour un quart en cours",
  generalShortcut: "Demande générale",
  pathsEyebrow: "Types d'aide",
  pathsTitle: "L'aide pour un quart en cours est séparée des demandes générales.",
  paths: [
    {
      title: "Aide pour un quart en cours",
      text: "Quart en cours, retard, absence, remplacement, problème de pointage à l'arrivée ou au départ, ou problème urgent sur place.",
      button: "Obtenir de l'aide pour un quart"
    },
    {
      title: "Demande générale",
      text: "Dotation, facturation, documents, ventes, confidentialité, soutien technique, compte, ou toute question qui ne touche pas un quart en cours.",
      button: "Faire une demande générale"
    }
  ],
  activeEyebrow: "Aide pour un quart en cours",
  activeTitle: "De l'aide pour un quart en cours ou sur le point de commencer.",
  activeCopy:
    "Ce chemin prépare ou achemine un dossier opérationnel. Il ne promet pas de solution automatique, de remplacement automatique, de mesure disciplinaire ni de personnel confirmé.",
  issueCategory: "Type de problème",
  activeShiftIssues: [
    "Le travailleur n'est pas arrivé",
    "Le travailleur est en retard",
    "Le travailleur ne peut pas finir son quart",
    "L'employeur ne peut pas recevoir le travailleur",
    "Les détails du quart sont erronés",
    "Remplacement nécessaire",
    "Problème de pointage",
    "Problème de communication",
    "Préoccupation de sécurité sur place",
    "Autre problème lié à un quart en cours"
  ],
  panelTitle: "Dossier en cours",
  panelText:
    "Les utilisateurs connectés peuvent voir le contexte autorisé du quart. Les visiteurs non connectés donnent seulement les détails nécessaires pour reconnaître le quart.",
  immediateActions: [
    "Joindre le travailleur affecté",
    "Joindre l'employeur ou la résidence",
    "Demander un remplacement",
    "Signaler un retard",
    "Signaler qu'il ne peut pas continuer",
    "Ouvrir un dossier de soutien sécurisé"
  ],
  timelineEyebrow: "Étapes d'un dossier",
  timelineTitle: "Vous voyez l'état du dossier; on n'annonce jamais une solution qui n'existe pas.",
  escalationTimeline: [
    "Envoyé",
    "Analyse en cours",
    "Confié au soutien",
    "Action en coordination",
    "Réglé ou fermé"
  ],
  generalEyebrow: "Demande générale",
  generalTitle: "Utilisez ce chemin pour les questions qui ne touchent pas un quart en cours.",
  reasonLabel: "Raison de la demande",
  reasonPlaceholder: "Choisissez une raison",
  generalReasons: [
    "Demander du personnel",
    "Problème avec un quart existant",
    "Soutien aux travailleurs",
    "Soutien au compte employeur",
    "Facturation ou facture",
    "Documents ou conformité",
    "Problème technique",
    "Ventes ou grandes entreprises",
    "Demande liée à la confidentialité",
    "Autre"
  ],
  userTypeLabel: "Vous êtes",
  userTypePlaceholder: "Choisissez un profil",
  userTypes: ["Travailleur", "Employeur", "Gestionnaire de résidence", "Responsable des horaires", "Candidat", "Visiteur"],
  subjectLabel: "Sujet",
  subjectPlaceholder: "Résumé court",
  responseLabel: "Mode de réponse préféré",
  responsePlaceholder: "Courriel ou message sécurisé dans l'appli lorsque offert",
  messageLabel: "Message",
  messagePlaceholder: "Décrivez votre besoin. N'incluez pas de mot de passe ni de renseignements financiers complets.",
  emailButton: "Écrire au soutien Joblop",
  emailNote:
    "Ce bouton ouvre votre application de courriel pour joindre directement le soutien Joblop. N'incluez pas de mot de passe ni de renseignements financiers complets.",
  guardrailsEyebrow: "Remplacements et confidentialité",
  guardrailsTitle: "Le soutien achemine chaque problème vers le bon processus.",
  guardrailsCopy:
    "La disponibilité n'est pas garantie. Le jumelage peut être assisté par l'IA, mais une personne ou un employeur autorisé confirme l'affectation finale. Le quart d'origine reste ouvert tant qu'un remplacement n'est pas confirmé.",
  attachmentsEyebrow: "Règles pour les pièces jointes",
  attachmentsTitle: "Les renseignements sensibles passent par des canaux sécurisés.",
  attachmentWarnings: [
    "N'envoyez pas de mots de passe.",
    "N'envoyez pas les détails complets d'une carte de paiement.",
    "N'envoyez pas de dossiers de santé inutiles.",
    "N'envoyez pas vos coordonnées bancaires complètes.",
    "N'envoyez pas de renseignements personnels sans lien avec la demande."
  ],
  aiEyebrow: "Limites de l'IA au soutien",
  aiTitle: "L'IA peut aider à classer les demandes, mais elle ne peut pas les régler seule.",
  aiSupportBoundary: [
    "L'IA peut classer le problème.",
    "L'IA peut repérer l'urgence.",
    "L'IA peut résumer le dossier.",
    "L'IA peut signaler les demandes en double.",
    "L'IA ne doit pas imposer de mesure disciplinaire à un travailleur.",
    "L'IA ne doit pas affecter un remplaçant sans confirmation autorisée.",
    "L'IA ne doit pas fermer un litige ni dire que le problème est réglé."
  ],
  faqEyebrow: "Aperçu de la FAQ",
  faqTitle: "Questions fréquentes avant de nous écrire.",
  faqPreview: [
    "Comment demander du personnel en urgence?",
    "Comment signaler un problème pendant un quart?",
    "À qui poser une question sur une facture?",
    "Comment faire une demande liée à la confidentialité?"
  ]
};

const contactAr: ContactCopy = {
  eyebrow: "تواصل مع Joblop",
  title: "اختر نوع المساعدة المناسب حتى يصل طلبك إلى المكان الصحيح.",
  lede: "يتولى Joblop مسائل التوظيف ومشكلات المناوبات. في الحالات الطبية الطارئة أو أي خطر مباشر على السلامة أو طوارئ السلامة العامة، اتصل بخدمات الطوارئ المحلية.",
  activeShortcut: "مساعدة في مناوبة جارية",
  generalShortcut: "تواصل عام",
  pathsEyebrow: "أنواع المساعدة",
  pathsTitle: "المساعدة في مناوبة جارية منفصلة عن التواصل العام.",
  paths: [
    {
      title: "مساعدة في مناوبة جارية",
      text: "مناوبة جارية، تأخر في الوصول، غياب، بديل، مشكلة في تسجيل الحضور أو الانصراف، أو مشكلة عمل عاجلة.",
      button: "ابدأ طلب مساعدة لمناوبة"
    },
    {
      title: "تواصل عام",
      text: "التوظيف، الفواتير، المستندات، المبيعات، الخصوصية، الدعم التقني، الحساب، أو أي سؤال لا يخص مناوبة جارية.",
      button: "استخدم التواصل العام"
    }
  ],
  activeEyebrow: "مساعدة في مناوبة جارية",
  activeTitle: "مساعدة عملية لمناوبة جارية أو على وشك البدء.",
  activeCopy:
    "هذا المسار يجهّز حالة تشغيلية أو يحيلها. لا يعد بحل تلقائي أو بديل تلقائي أو إجراء تأديبي أو عمّال مؤكدين.",
  issueCategory: "نوع المشكلة",
  activeShiftIssues: [
    "العامل لم يصل",
    "العامل متأخر",
    "العامل لا يستطيع إكمال المناوبة",
    "صاحب العمل لا يستطيع استقبال العامل",
    "تفاصيل المناوبة غير صحيحة",
    "نحتاج إلى بديل",
    "مشكلة في تسجيل الحضور أو الانصراف",
    "انقطاع في التواصل",
    "مخاوف تتعلق بالسلامة في العمل",
    "مشكلة أخرى في مناوبة جارية"
  ],
  panelTitle: "لوحة الحالة الجارية",
  panelText:
    "يمكن للمستخدمين المسجّلين رؤية تفاصيل المناوبة المسموح لهم بها. أما غير المسجّلين فيقدّمون الحد الأدنى من التفاصيل اللازمة لتحديد المناوبة.",
  immediateActions: [
    "التواصل مع العامل المعيّن",
    "التواصل مع صاحب العمل أو المسكن",
    "طلب بديل",
    "الإبلاغ عن تأخر",
    "الإبلاغ عن عدم القدرة على الإكمال",
    "فتح حالة دعم آمنة"
  ],
  timelineEyebrow: "مراحل الحالة",
  timelineTitle: "حالة الطلب ظاهرة لك، ولا نعلن حلًا غير موجود.",
  escalationTimeline: ["تم الإرسال", "قيد الفرز", "أُحيلت إلى الدعم", "يجري تنسيق الإجراء", "تم الحل أو الإغلاق"],
  generalEyebrow: "تواصل عام",
  generalTitle: "استخدم هذا المسار للأسئلة التي لا تخص مناوبة جارية.",
  reasonLabel: "سبب التواصل",
  reasonPlaceholder: "اختر سببًا",
  generalReasons: [
    "طلب عمّال",
    "مشكلة في مناوبة قائمة",
    "دعم العمّال",
    "دعم حساب صاحب العمل",
    "الفواتير",
    "المستندات أو الامتثال",
    "مشكلة تقنية",
    "المبيعات أو الشركات الكبرى",
    "طلب يتعلق بالخصوصية",
    "أخرى"
  ],
  userTypeLabel: "نوع المستخدم",
  userTypePlaceholder: "اختر نوع المستخدم",
  userTypes: ["عامل", "صاحب عمل", "مدير مسكن", "منسّق جداول", "متقدّم لوظيفة", "زائر"],
  subjectLabel: "الموضوع",
  subjectPlaceholder: "ملخص قصير",
  responseLabel: "طريقة الرد المفضلة",
  responsePlaceholder: "البريد الإلكتروني أو رسالة آمنة داخل التطبيق عند توفرها",
  messageLabel: "الرسالة",
  messagePlaceholder: "صف ما تحتاج إليه. لا تكتب كلمات المرور أو التفاصيل المالية الكاملة.",
  emailButton: "راسل دعم Joblop",
  emailNote:
    "يفتح هذا الزر تطبيق البريد لديك للتواصل مباشرة مع دعم Joblop. لا تكتب كلمات المرور أو التفاصيل المالية الكاملة.",
  guardrailsEyebrow: "البدائل والخصوصية",
  guardrailsTitle: "يحيل الدعم كل مشكلة إلى الخطوات المنظّمة المناسبة.",
  guardrailsCopy:
    "التوفر غير مضمون. قد تتم المطابقة بمساعدة الذكاء الاصطناعي، لكن شخصًا أو صاحب عمل مخوّلًا يؤكد التعيين النهائي. تبقى المناوبة الأصلية مفتوحة إلى أن يتم تأكيد البديل.",
  attachmentsEyebrow: "قواعد المرفقات",
  attachmentsTitle: "المعلومات الحساسة تُرسل عبر قنوات آمنة فقط.",
  attachmentWarnings: [
    "لا ترفع كلمات المرور.",
    "لا ترفع تفاصيل بطاقة الدفع الكاملة.",
    "لا ترفع سجلات صحية غير ضرورية.",
    "لا ترفع تفاصيلك المصرفية الكاملة.",
    "لا ترفع معلومات شخصية لا علاقة لها بالطلب."
  ],
  aiEyebrow: "حدود الذكاء الاصطناعي في الدعم",
  aiTitle: "يمكن للذكاء الاصطناعي المساعدة في تصنيف الطلبات، لكنه لا يحلّها بمفرده.",
  aiSupportBoundary: [
    "يمكن للذكاء الاصطناعي تصنيف المشكلة.",
    "يمكن للذكاء الاصطناعي تحديد درجة الاستعجال.",
    "يمكن للذكاء الاصطناعي تلخيص الحالة.",
    "يمكن للذكاء الاصطناعي التنبيه إلى البلاغات المكررة.",
    "لا يجوز للذكاء الاصطناعي اتخاذ إجراء تأديبي بحق عامل.",
    "لا يجوز للذكاء الاصطناعي تعيين بديل دون تأكيد مخوّل.",
    "لا يجوز للذكاء الاصطناعي إغلاق نزاع أو القول إن المشكلة حُلّت."
  ],
  faqEyebrow: "من الأسئلة الشائعة",
  faqTitle: "أسئلة دعم شائعة قبل أن تتواصل معنا.",
  faqPreview: [
    "كيف أطلب عمّالًا بشكل عاجل؟",
    "كيف أبلّغ عن مشكلة أثناء المناوبة؟",
    "أين أسأل عن فاتورة؟",
    "كيف أقدّم طلبًا يتعلق بالخصوصية؟"
  ]
};

export const contactCopy: Readonly<Record<"en-CA" | "fr-CA" | "ar", ContactCopy>> = {
  "en-CA": contactEn,
  "fr-CA": contactFr,
  ar: contactAr
};

export function getContactContent(locale: string): ContactCopy {
  return contactCopy[locale as keyof typeof contactCopy] ?? contactEn;
}

