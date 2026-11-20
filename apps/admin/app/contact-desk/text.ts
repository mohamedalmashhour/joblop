import type { PageText } from "../i18n/pageTextCore";

// Copy for the Contact desk page, in English, French (Québec) and Arabic. Filter, side, status, reason
// and author codes from the API stay in the panel; only the labels shown to staff are translated here,
// keyed by those codes (unknown codes fall back to the code).

type ContactDeskCopy = {
  eyebrow: string;
  title: string;
  lede: string;
  filters: Readonly<Record<string, string>>;
  sides: Readonly<Record<string, string>>;
  status: Readonly<Record<string, string>>;
  reason: Readonly<Record<string, string>>;
  author: Readonly<Record<string, string>>;
  minutes: (n: number) => string;
  hours: (n: number) => string;
  days: (n: number) => string;
  askTitle: string;
  askHelp: string;
  yourQuestion: string;
  thinking: string;
  ask: string;
  draftReply: string;
  askFailed: string;
  loading: string;
  worker: string;
  employer: string;
  aiSummary: string;
  about: (type: string, id: string | null) => string;
  internalTag: string;
  failed: string;
  internalNote: string;
  reply: string;
  internalCheck: string;
  saveNote: string;
  sendReply: string;
  assignToMe: string;
  reopen: string;
  markSolved: string;
  denied: string;
  loadError: string;
  empty: string;
  urgent: string;
  unknown: string;
  lastMessage: (ago: string) => string;
  chooseConversation: string;
  /** Assistant action cards (Brain phase 2). */
  assistant: AssistantCopy;
};

export type AssistantCopy = {
  cardLabel: string;
  titles: Readonly<Record<string, string>>;
  otherTitle: string;
  confirm: string;
  cancel: string;
  working: string;
  workers: (n: string) => string;
  minutes: (n: string) => string;
  action: (key: string) => string;
  timesheet: string;
  lateCancel: string;
  shown: (title: string, subject: string) => string;
  result: (status: string, text: string) => string;
  actionFailed: string;
  expired: string;
};

const en: ContactDeskCopy = {
  eyebrow: "Joblop / Administration",
  title: "Contact desk",
  lede:
    "Workers and employers talking to Joblop. AI answers first; everything here needing a person is " +
    "waiting for you. Only a person can mark a conversation solved.",
  filters: { needs_admin: "Needs a person", ai: "With AI", solved: "Solved", all: "All" },
  sides: { "": "Everyone", worker: "Workers", employer: "Employers" },
  status: { ai: "With AI", needs_admin: "Needs a person", admin_replied: "Replied, waiting", solved: "Solved" },
  reason: {
    safety: "Safety",
    health: "Private health details (kept from the AI)",
    dispute: "Dispute",
    account: "Account or privacy",
    person_requested: "Asked for a person",
    urgent: "Urgent",
    ai_unsure: "AI unsure",
    ai_unavailable: "AI unavailable",
    ai_limit: "AI limit reached"
  },
  author: { requester: "Them", ai: "AI assistant", admin: "Joblop team", system: "Record", assistant_action: "AI assistant", assistant_result: "AI assistant" },
  minutes: (n) => `${n} min`,
  hours: (n) => `${n} h`,
  days: (n) => `${n} d`,
  askTitle: "Ask Joblop AI",
  askHelp: "Ask how anything works, for admin or finance. It advises only and changes nothing.",
  yourQuestion: "Your question",
  thinking: "Thinking…",
  ask: "Ask",
  draftReply: "Draft a reply",
  askFailed: "AI could not answer. It may not be set up yet, or you can try again.",
  loading: "Loading…",
  worker: "Worker",
  employer: "Employer",
  aiSummary: "AI summary:",
  about: (type, id) => `About ${type}: ${id ?? ""}`,
  internalTag: " (internal)",
  failed: "That did not work. Please try again.",
  internalNote: "Internal note",
  reply: "Reply",
  internalCheck: "Internal note, never shown to them",
  saveNote: "Save note",
  sendReply: "Send reply",
  assignToMe: "Assign to me",
  reopen: "Reopen",
  markSolved: "Mark solved",
  denied: "Platform administrator access is required.",
  loadError: "The Contact desk could not be loaded.",
  empty: "Nothing here right now.",
  urgent: "URGENT · ",
  unknown: "Unknown",
  lastMessage: (ago) => `Last message ${ago} ago`,
  chooseConversation: "Choose a conversation.",
  assistant: {
    cardLabel: "Action to confirm",
    titles: {
      brain_do_it: "Run this Brain action?",
      approve_request: "Approve this request for dispatch?",
      approve_timesheet: "Approve this timesheet?",
      claim_open_job: "Claim this job?",
      cancel_my_shift: "Cancel this shift?",
      confirm_shift: "Confirm this shift?",
      create_draft_request: "Save this request as a draft?",
      submit_draft: "Send this request to Joblop?",
      confirm_timesheet: "Confirm these hours?",
      duplicate_request: "Copy this request into a new draft?"
    },
    otherTitle: "Do this?",
    confirm: "Confirm",
    cancel: "Cancel",
    working: "Working…",
    workers: (n) => `${n} workers`,
    minutes: (n) => `${n} minutes`,
    action: (key) => `Action: ${key}`,
    timesheet: "Timesheet",
    lateCancel: "Less than 24 hours before the start: the late-cancellation rule applies.",
    shown: (title, subject) => `Card shown: ${title} ${subject}`,
    result: (status, text) => `Card result (${status}): ${text}`,
    actionFailed: "That did not work. Refresh and try again.",
    expired: "This card has expired. Ask again for a new one."
  }
};

const fr: ContactDeskCopy = {
  eyebrow: "Joblop / Administration",
  title: "Service à la clientèle",
  lede:
    "Les travailleurs et les employeurs qui écrivent à Joblop. L’IA répond d’abord; tout ce qui demande une " +
    "personne vous attend ici. Seule une personne peut marquer une conversation comme réglée.",
  filters: { needs_admin: "Requiert une personne", ai: "Avec l’IA", solved: "Réglées", all: "Toutes" },
  sides: { "": "Tout le monde", worker: "Travailleurs", employer: "Employeurs" },
  status: {
    ai: "Avec l’IA",
    needs_admin: "Requiert une personne",
    admin_replied: "Répondu, en attente",
    solved: "Réglée"
  },
  reason: {
    safety: "Sécurité",
    health: "Renseignements de santé privés (cachés à l’IA)",
    dispute: "Litige",
    account: "Compte ou confidentialité",
    person_requested: "A demandé une personne",
    urgent: "Urgent",
    ai_unsure: "IA incertaine",
    ai_unavailable: "IA non disponible",
    ai_limit: "Limite de l’IA atteinte"
  },
  author: { requester: "Demandeur", ai: "Assistant IA", admin: "Équipe Joblop", system: "Journal", assistant_action: "Assistant IA", assistant_result: "Assistant IA" },
  minutes: (n) => `${n} min`,
  hours: (n) => `${n} h`,
  days: (n) => `${n} j`,
  askTitle: "Demander à l’IA de Joblop",
  askHelp:
    "Demandez comment tout fonctionne, pour l’administration ou les finances. Elle conseille seulement et ne modifie rien.",
  yourQuestion: "Votre question",
  thinking: "Réflexion…",
  ask: "Demander",
  draftReply: "Rédiger une réponse",
  askFailed: "L’IA n’a pas pu répondre. Elle n’est peut-être pas encore configurée, ou vous pouvez réessayer.",
  loading: "Chargement…",
  worker: "Travailleur",
  employer: "Employeur",
  aiSummary: "Résumé de l’IA :",
  about: (type, id) => `Concerne ${type} : ${id ?? ""}`,
  internalTag: " (interne)",
  failed: "Cela n’a pas fonctionné. Veuillez réessayer.",
  internalNote: "Note interne",
  reply: "Réponse",
  internalCheck: "Note interne, jamais montrée au demandeur",
  saveNote: "Enregistrer la note",
  sendReply: "Envoyer la réponse",
  assignToMe: "M’assigner",
  reopen: "Rouvrir",
  markSolved: "Marquer comme réglée",
  denied: "Un accès d’administrateur de plateforme est requis.",
  loadError: "Le service à la clientèle n’a pas pu être chargé.",
  empty: "Rien pour l’instant.",
  urgent: "URGENT · ",
  unknown: "Inconnu",
  lastMessage: (ago) => `Dernier message il y a ${ago}`,
  chooseConversation: "Choisissez une conversation.",
  assistant: {
    cardLabel: "Action à confirmer",
    titles: {
      brain_do_it: "Lancer cette action du cerveau?",
      approve_request: "Approuver cette demande pour l'affectation?",
      approve_timesheet: "Approuver cette feuille de temps?",
      claim_open_job: "Prendre cette mission?",
      cancel_my_shift: "Annuler ce quart?",
      confirm_shift: "Confirmer ce quart?",
      create_draft_request: "Enregistrer cette demande comme brouillon?",
      submit_draft: "Envoyer cette demande à Joblop?",
      confirm_timesheet: "Confirmer ces heures?",
      duplicate_request: "Copier cette demande dans un nouveau brouillon?"
    },
    otherTitle: "Faire ceci?",
    confirm: "Confirmer",
    cancel: "Annuler",
    working: "En cours…",
    workers: (n) => `${n} travailleurs`,
    minutes: (n) => `${n} minutes`,
    action: (key) => `Action : ${key}`,
    timesheet: "Feuille de temps",
    lateCancel: "Moins de 24 heures avant le début : la règle d'annulation tardive s'applique.",
    shown: (title, subject) => `Carte montrée : ${title} ${subject}`,
    result: (status, text) => `Résultat de la carte (${status}) : ${text}`,
    actionFailed: "Cela n'a pas fonctionné. Actualisez et réessayez.",
    expired: "Cette carte a expiré. Redemandez pour en avoir une nouvelle."
  }
};

const ar: ContactDeskCopy = {
  eyebrow: "Joblop / الإدارة",
  title: "مكتب التواصل",
  lede:
    "العمّال وأصحاب العمل الذين يتواصلون مع Joblop. يجيب الذكاء الاصطناعي أولًا؛ وكل ما يحتاج إلى شخص " +
    "ينتظرك هنا. وحده الشخص يمكنه وضع علامة «تم الحل» على المحادثة.",
  filters: { needs_admin: "يحتاج إلى شخص", ai: "مع الذكاء الاصطناعي", solved: "تم حلها", all: "الكل" },
  sides: { "": "الجميع", worker: "العمّال", employer: "أصحاب العمل" },
  status: {
    ai: "مع الذكاء الاصطناعي",
    needs_admin: "يحتاج إلى شخص",
    admin_replied: "تم الرد، بانتظار الجواب",
    solved: "تم الحل"
  },
  reason: {
    safety: "السلامة",
    health: "معلومات صحية خاصة (محجوبة عن الذكاء الاصطناعي)",
    dispute: "نزاع",
    account: "الحساب أو الخصوصية",
    person_requested: "طلب التحدث إلى شخص",
    urgent: "عاجل",
    ai_unsure: "الذكاء الاصطناعي غير متأكد",
    ai_unavailable: "الذكاء الاصطناعي غير متاح",
    ai_limit: "بلغ الذكاء الاصطناعي حده"
  },
  author: { requester: "مقدّم الطلب", ai: "المساعد الذكي", admin: "فريق Joblop", system: "السجل", assistant_action: "المساعد الذكي", assistant_result: "المساعد الذكي" },
  minutes: (n) => `${n} دقيقة`,
  hours: (n) => `${n} ساعة`,
  days: (n) => `${n} يوم`,
  askTitle: "اسأل ذكاء Joblop الاصطناعي",
  askHelp: "اسأل عن طريقة عمل أي شيء، للإدارة أو المالية. هو يقدّم المشورة فقط ولا يغيّر شيئًا.",
  yourQuestion: "سؤالك",
  thinking: "جارٍ التفكير…",
  ask: "اسأل",
  draftReply: "صياغة رد",
  askFailed: "تعذّر على الذكاء الاصطناعي الإجابة. ربما لم يُفعَّل بعد، أو يمكنك المحاولة مرة أخرى.",
  loading: "جارٍ التحميل…",
  worker: "عامل",
  employer: "صاحب العمل",
  aiSummary: "ملخص الذكاء الاصطناعي:",
  about: (type, id) => `بخصوص ${type}: ${id ?? ""}`,
  internalTag: " (داخلي)",
  failed: "لم ينجح ذلك. يُرجى المحاولة مرة أخرى.",
  internalNote: "ملاحظة داخلية",
  reply: "رد",
  internalCheck: "ملاحظة داخلية، لا تظهر لمقدّم الطلب أبدًا",
  saveNote: "حفظ الملاحظة",
  sendReply: "إرسال الرد",
  assignToMe: "أسندها إليّ",
  reopen: "إعادة الفتح",
  markSolved: "وضع علامة «تم الحل»",
  denied: "مطلوب صلاحية مسؤول المنصة.",
  loadError: "تعذّر تحميل مكتب التواصل.",
  empty: "لا شيء هنا حاليًا.",
  urgent: "عاجل · ",
  unknown: "غير معروف",
  lastMessage: (ago) => `آخر رسالة قبل ${ago}`,
  chooseConversation: "اختر محادثة.",
  assistant: {
    cardLabel: "إجراء بانتظار التأكيد",
    titles: {
      brain_do_it: "هل تريد تنفيذ إجراء العقل هذا؟",
      approve_request: "هل تريد اعتماد هذا الطلب للتوزيع؟",
      approve_timesheet: "هل تريد اعتماد ورقة الوقت هذه؟",
      claim_open_job: "هل تريد أخذ هذه الوظيفة؟",
      cancel_my_shift: "هل تريد إلغاء هذه المناوبة؟",
      confirm_shift: "هل تريد تأكيد هذه المناوبة؟",
      create_draft_request: "هل تريد حفظ هذا الطلب كمسودة؟",
      submit_draft: "هل تريد إرسال هذا الطلب إلى Joblop؟",
      confirm_timesheet: "هل تريد تأكيد هذه الساعات؟",
      duplicate_request: "هل تريد نسخ هذا الطلب في مسودة جديدة؟"
    },
    otherTitle: "هل تريد تنفيذ هذا؟",
    confirm: "تأكيد",
    cancel: "إلغاء",
    working: "جارٍ التنفيذ…",
    workers: (n) => `${n} عمال`,
    minutes: (n) => `${n} دقيقة`,
    action: (key) => `الإجراء: ${key}`,
    timesheet: "ورقة الوقت",
    lateCancel: "قبل أقل من 24 ساعة من البداية: تنطبق قاعدة الإلغاء المتأخر.",
    shown: (title, subject) => `بطاقة معروضة: ${title} ${subject}`,
    result: (status, text) => `نتيجة البطاقة (${status}): ${text}`,
    actionFailed: "لم ينجح ذلك. حدّث الصفحة وحاول مرة أخرى.",
    expired: "انتهت صلاحية هذه البطاقة. اطلب بطاقة جديدة."
  }
};

export const contactDeskText: PageText<ContactDeskCopy> = { en, fr, ar };
