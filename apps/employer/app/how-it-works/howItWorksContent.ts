export const workerJourney = [
  "Create profile",
  "Add roles and credentials",
  "Set availability",
  "Review available shifts",
  "Apply or accept",
  "Work approved shift",
  "See earnings records"
] as const;

export const employerJourney = [
  "Request staff",
  "Share shift requirements",
  "Receive AI-assisted suggestions",
  "Human review and confirmation",
  "Track shift and attendance",
  "Approve timesheet",
  "Receive billing records"
] as const;

export const lifecyclePhases = [
  {
    title: "Before the shift",
    statuses: ["Pending", "Review required", "Approved"],
    responsibilities: {
      Employer: [
        "Create or request a shift.",
        "Define role, time, location, requirements, and urgency.",
        "Review AI-assisted matches.",
        "Confirm the selected worker."
      ],
      Worker: [
        "Complete and maintain the verified profile.",
        "Set availability.",
        "Review the shift details.",
        "Accept or apply for the shift.",
        "Confirm readiness."
      ],
      Platform: [
        "Check eligibility and required credentials.",
        "Detect scheduling conflicts.",
        "Provide matching recommendations.",
        "Send confirmations and reminders."
      ]
    }
  },
  {
    title: "During the shift",
    statuses: ["In progress", "Coverage risk", "Support needed"],
    responsibilities: {
      Employer: [
        "Confirm arrival where required.",
        "View attendance status.",
        "Communicate with the worker.",
        "Request support or replacement when necessary."
      ],
      Worker: [
        "Navigate to the workplace.",
        "Check in.",
        "Perform the assigned work.",
        "Communicate operational issues.",
        "Check out."
      ],
      Platform: [
        "Record attendance events.",
        "Support authorized location and time verification.",
        "Surface lateness, no-show, or coverage risks.",
        "Preserve an auditable activity record."
      ]
    }
  },
  {
    title: "After the shift",
    statuses: ["Completed", "Needs follow-up", "Dispute review"],
    responsibilities: {
      Employer: [
        "Review and approve the timesheet.",
        "Report discrepancies.",
        "Receive the invoice.",
        "Rate the completed assignment where permitted."
      ],
      Worker: [
        "Review submitted hours.",
        "Report corrections if needed.",
        "View earnings and payment status.",
        "Provide appropriate feedback."
      ],
      Platform: [
        "Finalize the timesheet workflow.",
        "Generate billing records.",
        "Calculate worker compensation according to approved rules.",
        "Maintain the audit trail.",
        "Surface unresolved disputes for human review."
      ]
    }
  }
] as const;

export const aiAssistance = [
  "AI helps organize information.",
  "AI can identify missing details.",
  "AI can suggest matches.",
  "AI cannot hire, assign, dispatch, approve timesheets, approve pay, discipline, or make compliance decisions by itself."
] as const;

export const trustLayer = [
  "Verified onboarding",
  "Credentials",
  "Attendance evidence",
  "Documents",
  "Communication records",
  "Auditability",
  "Privacy commitments"
] as const;

// ---------------------------------------------------------------------------------------------
// Localized page copy (EN / FR Québec / AR). English values equal the exports above.
// Phase `key` and owner keys stay English so heading ids are stable in every language.
// ---------------------------------------------------------------------------------------------
export type OwnerKey = "Employer" | "Worker" | "Platform";
export const responsibilityOwners: readonly OwnerKey[] = ["Employer", "Worker", "Platform"];

export type LocalizedPhase = Readonly<{
  key: string;
  title: string;
  statuses: readonly string[];
  responsibilities: Readonly<Record<OwnerKey, readonly string[]>>;
}>;

export type HowItWorksCopy = Readonly<{
  eyebrow: string;
  title: string;
  lede: string;
  needStaff: string;
  wantShifts: string;
  pathEyebrow: string;
  pathTitle: string;
  forWorkers: string;
  forEmployers: string;
  workerJourney: readonly string[];
  employerJourney: readonly string[];
  lifecycleEyebrow: string;
  lifecycleTitle: string;
  statusLabel: string;
  ownerLabels: Readonly<Record<OwnerKey, string>>;
  phases: readonly LocalizedPhase[];
  aiEyebrow: string;
  aiTitle: string;
  aiAssistance: readonly string[];
  trustEyebrow: string;
  trustTitle: string;
  trustLayer: readonly string[];
  questionsEyebrow: string;
  questionsTitle: string;
  viewFaq: string;
  contactUs: string;
}>;

const phaseKeys = ["before", "during", "after"] as const;

const howEn: HowItWorksCopy = {
  eyebrow: "How Joblop works",
  title: "A clear staffing workflow for workers, employers, and operations.",
  lede: "This public page explains the process. It does not confirm availability, dispatch, pricing, attendance, payroll, or payment.",
  needStaff: "I need staff",
  wantShifts: "I want shifts",
  pathEyebrow: "Choose your path",
  pathTitle: "Workers and employers see different responsibilities inside one governed workflow.",
  forWorkers: "For workers",
  forEmployers: "For employers",
  workerJourney,
  employerJourney,
  lifecycleEyebrow: "Shared operating lifecycle",
  lifecycleTitle: "Before, during, and after the shift stay distinct.",
  statusLabel: "Possible statuses",
  ownerLabels: { Employer: "Employer", Worker: "Worker", Platform: "Platform" },
  phases: lifecyclePhases.map((phase, index) => ({
    key: phaseKeys[index] ?? String(index),
    title: phase.title,
    statuses: phase.statuses,
    responsibilities: phase.responsibilities
  })),
  aiEyebrow: "AI assistance",
  aiTitle: "AI recommendation, human review, final decision.",
  aiAssistance,
  trustEyebrow: "Trust and recordkeeping",
  trustTitle: "The workflow depends on reviewable records, not unsupported promises.",
  trustLayer,
  questionsEyebrow: "Common questions",
  questionsTitle: "Need more detail before choosing a path?",
  viewFaq: "View FAQ",
  contactUs: "Contact us"
};

const howFr: HowItWorksCopy = {
  eyebrow: "Comment fonctionne Joblop",
  title: "Un processus de dotation clair pour les travailleurs, les employeurs et les opérations.",
  lede: "Cette page publique explique le processus. Elle ne confirme ni la disponibilité, ni l'affectation, ni les prix, ni la présence, ni la paie, ni le paiement.",
  needStaff: "J'ai besoin de personnel",
  wantShifts: "Je veux des quarts",
  pathEyebrow: "Choisissez votre chemin",
  pathTitle: "Les travailleurs et les employeurs ont des rôles différents dans un même processus encadré.",
  forWorkers: "Pour les travailleurs",
  forEmployers: "Pour les employeurs",
  workerJourney: [
    "Créer son profil",
    "Ajouter ses postes et attestations",
    "Indiquer ses disponibilités",
    "Consulter les quarts offerts",
    "Postuler ou accepter",
    "Travailler le quart approuvé",
    "Voir ses gains"
  ],
  employerJourney: [
    "Demander du personnel",
    "Préciser les besoins du quart",
    "Recevoir des suggestions assistées par l'IA",
    "Révision et confirmation par une personne",
    "Suivre le quart et la présence",
    "Approuver la feuille de temps",
    "Recevoir la facturation"
  ],
  lifecycleEyebrow: "Le déroulement d'un quart",
  lifecycleTitle: "Avant, pendant et après le quart restent bien distincts.",
  statusLabel: "Statuts possibles",
  ownerLabels: { Employer: "Employeur", Worker: "Travailleur", Platform: "Plateforme" },
  phases: [
    {
      key: "before",
      title: "Avant le quart",
      statuses: ["En attente", "Révision requise", "Approuvé"],
      responsibilities: {
        Employer: [
          "Créer ou demander un quart.",
          "Préciser le poste, l'heure, le lieu, les exigences et l'urgence.",
          "Réviser les jumelages assistés par l'IA.",
          "Confirmer le travailleur choisi."
        ],
        Worker: [
          "Remplir et tenir à jour son profil vérifié.",
          "Indiquer ses disponibilités.",
          "Lire les détails du quart.",
          "Accepter le quart ou y postuler.",
          "Confirmer qu'il est prêt."
        ],
        Platform: [
          "Vérifier l'admissibilité et les attestations requises.",
          "Repérer les conflits d'horaire.",
          "Proposer des recommandations de jumelage.",
          "Envoyer les confirmations et les rappels."
        ]
      }
    },
    {
      key: "during",
      title: "Pendant le quart",
      statuses: ["En cours", "Risque de couverture", "Soutien requis"],
      responsibilities: {
        Employer: [
          "Confirmer l'arrivée au besoin.",
          "Voir le statut de présence.",
          "Communiquer avec le travailleur.",
          "Demander du soutien ou un remplacement au besoin."
        ],
        Worker: [
          "Se rendre au lieu de travail.",
          "Pointer à l'arrivée.",
          "Faire le travail assigné.",
          "Signaler les problèmes sur place.",
          "Pointer au départ."
        ],
        Platform: [
          "Enregistrer les événements de présence.",
          "Soutenir la vérification autorisée du lieu et de l'heure.",
          "Signaler les retards, absences ou risques de couverture.",
          "Garder un registre d'activité vérifiable."
        ]
      }
    },
    {
      key: "after",
      title: "Après le quart",
      statuses: ["Terminé", "Suivi requis", "Litige en révision"],
      responsibilities: {
        Employer: [
          "Réviser et approuver la feuille de temps.",
          "Signaler les écarts.",
          "Recevoir la facture.",
          "Évaluer le quart terminé lorsque c'est permis."
        ],
        Worker: [
          "Vérifier les heures soumises.",
          "Demander des corrections au besoin.",
          "Voir ses gains et l'état du paiement.",
          "Donner ses commentaires."
        ],
        Platform: [
          "Finaliser la feuille de temps.",
          "Produire la facturation.",
          "Calculer la rémunération selon les règles approuvées.",
          "Conserver la piste de vérification.",
          "Soumettre les litiges non réglés à une révision humaine."
        ]
      }
    }
  ],
  aiEyebrow: "L'aide de l'IA",
  aiTitle: "L'IA recommande, une personne révise et décide.",
  aiAssistance: [
    "L'IA aide à organiser l'information.",
    "L'IA peut repérer les détails manquants.",
    "L'IA peut suggérer des jumelages.",
    "L'IA ne peut pas, seule, embaucher, affecter, envoyer un travailleur, approuver des feuilles de temps ou la paie, imposer des mesures disciplinaires ni prendre des décisions de conformité."
  ],
  trustEyebrow: "Confiance et dossiers",
  trustTitle: "Le processus repose sur des dossiers vérifiables, pas sur des promesses.",
  trustLayer: [
    "Inscription vérifiée",
    "Attestations",
    "Preuves de présence",
    "Documents",
    "Historique des communications",
    "Traçabilité",
    "Engagements de confidentialité"
  ],
  questionsEyebrow: "Questions fréquentes",
  questionsTitle: "Besoin de plus de détails avant de choisir?",
  viewFaq: "Voir la FAQ",
  contactUs: "Nous joindre"
};

const howAr: HowItWorksCopy = {
  eyebrow: "كيف يعمل Joblop",
  title: "خطوات توظيف واضحة للعمّال وأصحاب العمل وفريق التشغيل.",
  lede: "تشرح هذه الصفحة العامة طريقة العمل. لا تؤكد التوفر أو الإرسال أو الأسعار أو الحضور أو الرواتب أو الدفع.",
  needStaff: "أحتاج إلى عمّال",
  wantShifts: "أريد مناوبات",
  pathEyebrow: "اختر طريقك",
  pathTitle: "للعمّال ولأصحاب العمل مسؤوليات مختلفة ضمن خطوات منظّمة واحدة.",
  forWorkers: "للعمّال",
  forEmployers: "لأصحاب العمل",
  workerJourney: [
    "أنشئ ملفك الشخصي",
    "أضف وظائفك وشهاداتك",
    "حدّد أوقات توفرك",
    "اطّلع على المناوبات المتاحة",
    "قدّم طلبًا أو اقبل",
    "اعمل في المناوبة المعتمدة",
    "اطّلع على سجل أرباحك"
  ],
  employerJourney: [
    "اطلب عمّالًا",
    "حدّد متطلبات المناوبة",
    "استلم اقتراحات بمساعدة الذكاء الاصطناعي",
    "مراجعة وتأكيد من شخص",
    "تابع المناوبة والحضور",
    "اعتمد ورقة الدوام",
    "استلم سجلات الفواتير"
  ],
  lifecycleEyebrow: "مراحل المناوبة",
  lifecycleTitle: "تبقى مراحل ما قبل المناوبة وأثناءها وبعدها منفصلة وواضحة.",
  statusLabel: "الحالات الممكنة",
  ownerLabels: { Employer: "صاحب العمل", Worker: "العامل", Platform: "المنصة" },
  phases: [
    {
      key: "before",
      title: "قبل المناوبة",
      statuses: ["قيد الانتظار", "تحتاج مراجعة", "معتمدة"],
      responsibilities: {
        Employer: [
          "إنشاء مناوبة أو طلبها.",
          "تحديد الوظيفة والوقت والمكان والمتطلبات ودرجة الاستعجال.",
          "مراجعة المطابقات المقترحة بمساعدة الذكاء الاصطناعي.",
          "تأكيد العامل المختار."
        ],
        Worker: [
          "إكمال الملف الموثّق وتحديثه.",
          "تحديد أوقات التوفر.",
          "قراءة تفاصيل المناوبة.",
          "قبول المناوبة أو التقديم عليها.",
          "تأكيد الجاهزية."
        ],
        Platform: [
          "التحقق من الأهلية والشهادات المطلوبة.",
          "اكتشاف تعارض المواعيد.",
          "تقديم توصيات للمطابقة.",
          "إرسال التأكيدات والتذكيرات."
        ]
      }
    },
    {
      key: "during",
      title: "أثناء المناوبة",
      statuses: ["جارية", "خطر نقص التغطية", "تحتاج دعمًا"],
      responsibilities: {
        Employer: [
          "تأكيد الوصول عند الحاجة.",
          "متابعة حالة الحضور.",
          "التواصل مع العامل.",
          "طلب دعم أو بديل عند الضرورة."
        ],
        Worker: [
          "الوصول إلى مكان العمل.",
          "تسجيل الحضور.",
          "أداء العمل المطلوب.",
          "الإبلاغ عن مشكلات العمل.",
          "تسجيل الانصراف."
        ],
        Platform: [
          "تسجيل أحداث الحضور.",
          "دعم التحقق المصرّح به من المكان والوقت.",
          "التنبيه إلى التأخر أو الغياب أو خطر نقص التغطية.",
          "حفظ سجل نشاط قابل للتدقيق."
        ]
      }
    },
    {
      key: "after",
      title: "بعد المناوبة",
      statuses: ["مكتملة", "تحتاج متابعة", "نزاع قيد المراجعة"],
      responsibilities: {
        Employer: [
          "مراجعة ورقة الدوام واعتمادها.",
          "الإبلاغ عن أي اختلاف.",
          "استلام الفاتورة.",
          "تقييم المناوبة المكتملة عندما يكون ذلك مسموحًا."
        ],
        Worker: [
          "مراجعة الساعات المقدّمة.",
          "طلب تصحيح عند الحاجة.",
          "الاطلاع على الأرباح وحالة الدفع.",
          "تقديم ملاحظات مناسبة."
        ],
        Platform: [
          "إنهاء خطوات ورقة الدوام.",
          "إنشاء سجلات الفواتير.",
          "حساب أجر العامل حسب القواعد المعتمدة.",
          "حفظ سجل التدقيق.",
          "عرض النزاعات غير المحلولة على مراجعة بشرية."
        ]
      }
    }
  ],
  aiEyebrow: "مساعدة الذكاء الاصطناعي",
  aiTitle: "الذكاء الاصطناعي يقترح، والإنسان يراجع ويقرر.",
  aiAssistance: [
    "يساعد الذكاء الاصطناعي على تنظيم المعلومات.",
    "يمكن للذكاء الاصطناعي تحديد التفاصيل الناقصة.",
    "يمكن للذكاء الاصطناعي اقتراح مطابقات.",
    "لا يمكن للذكاء الاصطناعي وحده التوظيف أو التعيين أو الإرسال أو اعتماد أوراق الدوام أو الأجور أو اتخاذ إجراءات تأديبية أو قرارات امتثال."
  ],
  trustEyebrow: "الثقة وحفظ السجلات",
  trustTitle: "تعتمد الخطوات على سجلات قابلة للمراجعة، لا على وعود بلا دليل.",
  trustLayer: [
    "تسجيل موثّق",
    "الشهادات",
    "إثبات الحضور",
    "المستندات",
    "سجلات التواصل",
    "قابلية التدقيق",
    "الالتزام بالخصوصية"
  ],
  questionsEyebrow: "أسئلة شائعة",
  questionsTitle: "تحتاج إلى تفاصيل أكثر قبل أن تختار؟",
  viewFaq: "اطّلع على الأسئلة الشائعة",
  contactUs: "تواصل معنا"
};

export const howItWorksCopy: Readonly<Record<"en-CA" | "fr-CA" | "ar", HowItWorksCopy>> = {
  "en-CA": howEn,
  "fr-CA": howFr,
  ar: howAr
};

export function getHowItWorksContent(locale: string): HowItWorksCopy {
  return howItWorksCopy[locale as keyof typeof howItWorksCopy] ?? howEn;
}

