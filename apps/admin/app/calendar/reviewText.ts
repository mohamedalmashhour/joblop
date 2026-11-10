import type { PageText } from "../i18n/pageTextCore";

// Copy for the staff request detail page (/calendar/request?request=JR-…), in English, French
// (Québec) and Arabic. Plain words for staff: what the employer asked for, the price, and the decision.

export type ReviewActionMessage =
  | "reasonTooShort"
  | "applying"
  | "stale"
  | "authRequired"
  | "failed"
  | "started"
  | "infoRecorded"
  | "approved"
  | "serviceUnavailable";

const en = {
  referenceRequiredTitle: "No request chosen",
  referenceRequiredMessage: "Open a request from the review calendar.",
  loadingTitle: "Loading the request",
  loadingMessage: "One moment…",
  unavailableTitle: "This request can't be shown right now",
  unavailableMessage: "Press Retry, or come back in a minute.",
  staleTitle: "This request changed",
  staleMessage: "Reload it to see the latest version.",
  errorTitle: "This request could not be loaded",
  errorMessage: "Press Retry. If it keeps happening, tell the Joblop team.",
  messages: {
    reasonTooShort: "Write your question first (at least 4 characters).",
    applying: "Saving…",
    stale: "Someone changed this request. Reload it before you continue.",
    authRequired: "Please sign in again.",
    failed: "That didn't work. Try again.",
    started: "Review started.",
    infoRecorded: "Your question was sent to the employer.",
    approved: "Approved.",
    serviceUnavailable: "We couldn't confirm it worked. Reload the page to check."
  } satisfies Record<ReviewActionMessage, string>,
  eyebrow: (requestNumber: string) => `Employer request ${requestNumber}`,
  back: "Back to review calendar",
  reload: "Reload",
  askedTitle: "What the employer asked for",
  rows: {
    company: "Company",
    role: "Role",
    location: "Location",
    schedule: "Date and time",
    workers: "Workers",
    hours: "Hours",
    urgency: "Urgency",
    certificates: "Required certificates",
    allowances: "Extras for workers",
    duties: "Job description",
    specialInstructions: "Notes for workers",
    address: "Address",
    reviewReason: "Your last question"
  },
  hoursValue: (perWorker: string, total: string) => `${perWorker} h per worker · ${total} h in total`,
  urgencyNames: { normal: "Normal", urgent: "Urgent", immediate: "Emergency (today)" } as Record<string, string>,
  allowanceNames: { transport: "Transport", meal: "Meals", lodging: "Lodging" } as Record<string, string>,
  allowanceValue: (provision: string, amount: string | null) =>
    provision === "provided"
      ? "Provided by the employer"
      : provision === "allowance"
        ? amount
          ? `Cash allowance ${amount} per shift`
          : "Cash allowance (no amount given)"
        : "Not offered",
  none: "None",
  notProvided: "Not provided",
  unavailable: "Unavailable",
  priceTitle: "Price",
  priceRows: {
    employerRate: "Employer pays per hour (contract)",
    urgentSurcharge: "Urgent surcharge per hour",
    workerPay: "Worker gets per hour (staff only)",
    margin: "Joblop keeps per hour",
    allowances: "Extras per worker per shift",
    estimatedTotal: "Estimated total, before taxes"
  },
  marginValue: (amount: string, percent: string) => `${amount} (${percent} %)`,
  estimateNote: "Estimate for all workers, before GST and QST. The price is locked when you approve.",
  approvedNote: "Price saved when the request was approved.",
  pricingProblem: {
    no_contract:
      "This company has no contract for this date. Add one in Employer contracts first — approval is refused without it.",
    no_role_rate:
      "The company's contract has no rate for this role. Add the rate in Employer contracts first — approval is refused without it.",
    unavailable: "The price can't be calculated right now."
  } as Record<string, string>,
  contractsLink: "Open Employer contracts",
  statusTitle: "Where this request is",
  statusNames: {
    draft: "Draft",
    submitted: "New – waiting for review",
    admin_review: "In review",
    information_required: "Waiting for the employer's answer",
    approved_for_dispatch: "Approved",
    cancelled: "Cancelled",
    expired: "Expired",
    archived: "Archived"
  } as Record<string, string>,
  intakeTitle: "Your decision",
  payPreview: (worker: string, margin: string) => `Worker gets ${worker}/h · Joblop keeps ${margin}/h`,
  choiceLegend: "After approval",
  choiceBoard: "Post on the job board (first qualified worker gets it)",
  choiceManual: "I'll choose the worker myself",
  reasonLabel: "Question for the employer (only if you need more details)",
  requestInformation: "Send question to employer",
  approveOpenClaim: "Approve and post on the job board",
  approveForDispatch: "Approve – I'll choose the worker",
  confirmTitle: "Please confirm",
  cancel: "Cancel",
  applyingButton: "Saving…",
  confirmAction: "Yes, continue",
  loadLatest: "Reload the request",
  stateSubmitted: "New request. Check the details, then approve it or ask the employer a question.",
  stateAdminReview: "Check the details, then approve it or ask the employer a question.",
  stateInformationRequired: (reason: string | null) =>
    `Waiting for the employer's answer.${reason ? ` Your question: ${reason}` : ""}`,
  stateApproved: "Approved.",
  stateNone: "Nothing to do on this request.",
  confirmAdminReview: "Start reviewing this request?",
  confirmRequestInformation:
    "Send your question to the employer? The request goes back to them until they answer.",
  confirmApproveBoard:
    "Approve this request and post it on the job board? Qualified workers can take it right away.",
  confirmApproveManual: "Approve this request? You will then choose the worker yourself.",
  postedBoard: (open: number, confirmed: number) =>
    `Posted on the job board – ${open} place${open === 1 ? "" : "s"} open – ${confirmed} worker${confirmed === 1 ? "" : "s"} confirmed`,
  postedManual: (open: number, confirmed: number) =>
    `Approved – you choose the worker – ${open} place${open === 1 ? "" : "s"} open – ${confirmed} worker${confirmed === 1 ? "" : "s"} confirmed`,
  seeJobBoard: "See the job on the job board",
  dispatchTitle: "Workers",
  retry: "Retry"
};

type ReviewCopy = typeof en;

const fr: ReviewCopy = {
  referenceRequiredTitle: "Aucune demande choisie",
  referenceRequiredMessage: "Ouvrez une demande à partir du calendrier de révision.",
  loadingTitle: "Chargement de la demande",
  loadingMessage: "Un instant…",
  unavailableTitle: "Cette demande ne peut pas être affichée pour le moment",
  unavailableMessage: "Appuyez sur Réessayer ou revenez dans une minute.",
  staleTitle: "Cette demande a changé",
  staleMessage: "Rechargez-la pour voir la dernière version.",
  errorTitle: "Impossible de charger cette demande",
  errorMessage: "Appuyez sur Réessayer. Si le problème continue, avisez l’équipe Joblop.",
  messages: {
    reasonTooShort: "Écrivez d’abord votre question (au moins 4 caractères).",
    applying: "Enregistrement…",
    stale: "Quelqu’un a modifié cette demande. Rechargez-la avant de continuer.",
    authRequired: "Veuillez vous reconnecter.",
    failed: "Ça n’a pas fonctionné. Réessayez.",
    started: "Révision commencée.",
    infoRecorded: "Votre question a été envoyée à l’employeur.",
    approved: "Approuvée.",
    serviceUnavailable: "Impossible de confirmer que c’est fait. Rechargez la page pour vérifier."
  },
  eyebrow: (requestNumber: string) => `Demande d’employeur ${requestNumber}`,
  back: "Retour au calendrier de révision",
  reload: "Recharger",
  askedTitle: "Ce que l’employeur a demandé",
  rows: {
    company: "Entreprise",
    role: "Poste",
    location: "Lieu",
    schedule: "Date et heure",
    workers: "Travailleurs",
    hours: "Heures",
    urgency: "Urgence",
    certificates: "Certificats exigés",
    allowances: "Extras pour les travailleurs",
    duties: "Description du travail",
    specialInstructions: "Notes pour les travailleurs",
    address: "Adresse",
    reviewReason: "Votre dernière question"
  },
  hoursValue: (perWorker: string, total: string) => `${perWorker} h par travailleur · ${total} h au total`,
  urgencyNames: { normal: "Normale", urgent: "Urgente", immediate: "Urgence (aujourd’hui)" },
  allowanceNames: { transport: "Transport", meal: "Repas", lodging: "Hébergement" },
  allowanceValue: (provision: string, amount: string | null) =>
    provision === "provided"
      ? "Fourni par l’employeur"
      : provision === "allowance"
        ? amount
          ? `Allocation de ${amount} par quart`
          : "Allocation (montant non indiqué)"
        : "Non offert",
  none: "Aucun",
  notProvided: "Non fourni",
  unavailable: "Non disponible",
  priceTitle: "Prix",
  priceRows: {
    employerRate: "L’employeur paie l’heure (contrat)",
    urgentSurcharge: "Supplément urgent par heure",
    workerPay: "Le travailleur reçoit l’heure (personnel seulement)",
    margin: "Joblop garde par heure",
    allowances: "Extras par travailleur par quart",
    estimatedTotal: "Total estimé, avant taxes"
  },
  marginValue: (amount: string, percent: string) => `${amount} (${percent} %)`,
  estimateNote: "Estimation pour tous les travailleurs, avant TPS et TVQ. Le prix est fixé quand vous approuvez.",
  approvedNote: "Prix enregistré au moment de l’approbation.",
  pricingProblem: {
    no_contract:
      "Cette entreprise n’a pas de contrat pour cette date. Ajoutez-en un dans Contrats employeurs d’abord — l’approbation est refusée sans contrat.",
    no_role_rate:
      "Le contrat de l’entreprise n’a pas de taux pour ce poste. Ajoutez le taux dans Contrats employeurs d’abord — l’approbation est refusée sans taux.",
    unavailable: "Le prix ne peut pas être calculé pour le moment."
  },
  contractsLink: "Ouvrir Contrats employeurs",
  statusTitle: "Où en est la demande",
  statusNames: {
    draft: "Brouillon",
    submitted: "Nouvelle – en attente de révision",
    admin_review: "En révision",
    information_required: "En attente de la réponse de l’employeur",
    approved_for_dispatch: "Approuvée",
    cancelled: "Annulée",
    expired: "Expirée",
    archived: "Archivée"
  },
  intakeTitle: "Votre décision",
  payPreview: (worker: string, margin: string) => `Le travailleur reçoit ${worker}/h · Joblop garde ${margin}/h`,
  choiceLegend: "Après l’approbation",
  choiceBoard: "Publier sur le babillard d’emplois (le premier travailleur qualifié l’obtient)",
  choiceManual: "Je choisis le travailleur moi-même",
  reasonLabel: "Question pour l’employeur (seulement s’il vous faut plus de détails)",
  requestInformation: "Envoyer la question à l’employeur",
  approveOpenClaim: "Approuver et publier sur le babillard",
  approveForDispatch: "Approuver – je choisis le travailleur",
  confirmTitle: "Veuillez confirmer",
  cancel: "Annuler",
  applyingButton: "Enregistrement…",
  confirmAction: "Oui, continuer",
  loadLatest: "Recharger la demande",
  stateSubmitted: "Nouvelle demande. Vérifiez les détails, puis approuvez la demande ou posez une question à l’employeur.",
  stateAdminReview: "Vérifiez les détails, puis approuvez la demande ou posez une question à l’employeur.",
  stateInformationRequired: (reason: string | null) =>
    `En attente de la réponse de l’employeur.${reason ? ` Votre question : ${reason}` : ""}`,
  stateApproved: "Approuvée.",
  stateNone: "Rien à faire pour cette demande.",
  confirmAdminReview: "Commencer la révision de cette demande?",
  confirmRequestInformation:
    "Envoyer votre question à l’employeur? La demande lui revient jusqu’à ce qu’il réponde.",
  confirmApproveBoard:
    "Approuver cette demande et la publier sur le babillard? Les travailleurs qualifiés peuvent la prendre tout de suite.",
  confirmApproveManual: "Approuver cette demande? Vous choisirez ensuite le travailleur vous-même.",
  postedBoard: (open: number, confirmed: number) =>
    `Publiée sur le babillard – ${open} place${open > 1 ? "s" : ""} libre${open > 1 ? "s" : ""} – ${confirmed} travailleur${confirmed > 1 ? "s" : ""} confirmé${confirmed > 1 ? "s" : ""}`,
  postedManual: (open: number, confirmed: number) =>
    `Approuvée – vous choisissez le travailleur – ${open} place${open > 1 ? "s" : ""} libre${open > 1 ? "s" : ""} – ${confirmed} travailleur${confirmed > 1 ? "s" : ""} confirmé${confirmed > 1 ? "s" : ""}`,
  seeJobBoard: "Voir l’emploi sur le babillard",
  dispatchTitle: "Travailleurs",
  retry: "Réessayer"
};

const ar: ReviewCopy = {
  referenceRequiredTitle: "لم يتم اختيار طلب",
  referenceRequiredMessage: "افتح طلبًا من تقويم المراجعة.",
  loadingTitle: "جارٍ تحميل الطلب",
  loadingMessage: "لحظة من فضلك…",
  unavailableTitle: "تعذّر عرض هذا الطلب الآن",
  unavailableMessage: "اضغط «إعادة المحاولة» أو عد بعد دقيقة.",
  staleTitle: "تغيّر هذا الطلب",
  staleMessage: "أعد تحميله لرؤية أحدث نسخة.",
  errorTitle: "تعذّر تحميل هذا الطلب",
  errorMessage: "اضغط «إعادة المحاولة». إذا تكرّر الأمر، أخبر فريق Joblop.",
  messages: {
    reasonTooShort: "اكتب سؤالك أولًا (4 أحرف على الأقل).",
    applying: "جارٍ الحفظ…",
    stale: "غيّر شخص ما هذا الطلب. أعد تحميله قبل المتابعة.",
    authRequired: "يُرجى تسجيل الدخول مرة أخرى.",
    failed: "لم ينجح ذلك. حاول مرة أخرى.",
    started: "بدأت المراجعة.",
    infoRecorded: "أُرسل سؤالك إلى صاحب العمل.",
    approved: "تمت الموافقة.",
    serviceUnavailable: "تعذّر التأكد من نجاح العملية. أعد تحميل الصفحة للتحقق."
  },
  eyebrow: (requestNumber: string) => `طلب صاحب العمل ${requestNumber}`,
  back: "العودة إلى تقويم المراجعة",
  reload: "إعادة التحميل",
  askedTitle: "ما طلبه صاحب العمل",
  rows: {
    company: "الشركة",
    role: "الوظيفة",
    location: "الموقع",
    schedule: "التاريخ والوقت",
    workers: "العمّال",
    hours: "الساعات",
    urgency: "الاستعجال",
    certificates: "الشهادات المطلوبة",
    allowances: "مزايا للعمّال",
    duties: "وصف العمل",
    specialInstructions: "ملاحظات للعمّال",
    address: "العنوان",
    reviewReason: "سؤالك الأخير"
  },
  hoursValue: (perWorker: string, total: string) => `${perWorker} ساعة لكل عامل · ${total} ساعة إجمالًا`,
  urgencyNames: { normal: "عادي", urgent: "عاجل", immediate: "طارئ (اليوم)" },
  allowanceNames: { transport: "التنقل", meal: "الوجبات", lodging: "السكن" },
  allowanceValue: (provision: string, amount: string | null) =>
    provision === "provided"
      ? "يوفّره صاحب العمل"
      : provision === "allowance"
        ? amount
          ? `بدل نقدي ${amount} لكل مناوبة`
          : "بدل نقدي (بدون مبلغ)"
        : "غير متوفّر",
  none: "لا يوجد",
  notProvided: "غير متوفر",
  unavailable: "غير متاح",
  priceTitle: "السعر",
  priceRows: {
    employerRate: "يدفع صاحب العمل في الساعة (العقد)",
    urgentSurcharge: "رسوم الاستعجال في الساعة",
    workerPay: "يحصل العامل في الساعة (للفريق فقط)",
    margin: "تحتفظ Joblop في الساعة",
    allowances: "المزايا لكل عامل في المناوبة",
    estimatedTotal: "الإجمالي التقديري قبل الضرائب"
  },
  marginValue: (amount: string, percent: string) => `${amount} (${percent} %)`,
  estimateNote: "تقدير لكل العمّال قبل GST وQST. يُثبَّت السعر عند الموافقة.",
  approvedNote: "السعر المحفوظ عند الموافقة على الطلب.",
  pricingProblem: {
    no_contract: "لا يوجد عقد لهذه الشركة في هذا التاريخ. أضف عقدًا في «عقود أصحاب العمل» أولًا — تُرفض الموافقة بدونه.",
    no_role_rate: "عقد الشركة لا يتضمن سعرًا لهذه الوظيفة. أضف السعر في «عقود أصحاب العمل» أولًا — تُرفض الموافقة بدونه.",
    unavailable: "تعذّر حساب السعر الآن."
  },
  contractsLink: "فتح عقود أصحاب العمل",
  statusTitle: "أين وصل الطلب",
  statusNames: {
    draft: "مسودة",
    submitted: "جديد – بانتظار المراجعة",
    admin_review: "قيد المراجعة",
    information_required: "بانتظار ردّ صاحب العمل",
    approved_for_dispatch: "تمت الموافقة",
    cancelled: "ملغى",
    expired: "منتهي",
    archived: "مؤرشف"
  },
  intakeTitle: "قرارك",
  payPreview: (worker: string, margin: string) => `يحصل العامل على ${worker}/ساعة · تحتفظ Joblop بـ ${margin}/ساعة`,
  choiceLegend: "بعد الموافقة",
  choiceBoard: "النشر على لوحة الوظائف (يحصل عليها أول عامل مؤهّل)",
  choiceManual: "سأختار العامل بنفسي",
  reasonLabel: "سؤال لصاحب العمل (فقط إذا احتجت إلى تفاصيل أكثر)",
  requestInformation: "إرسال السؤال إلى صاحب العمل",
  approveOpenClaim: "الموافقة والنشر على لوحة الوظائف",
  approveForDispatch: "الموافقة – سأختار العامل",
  confirmTitle: "يُرجى التأكيد",
  cancel: "إلغاء",
  applyingButton: "جارٍ الحفظ…",
  confirmAction: "نعم، تابع",
  loadLatest: "إعادة تحميل الطلب",
  stateSubmitted: "طلب جديد. راجع التفاصيل، ثم وافق على الطلب أو اسأل صاحب العمل.",
  stateAdminReview: "راجع التفاصيل، ثم وافق على الطلب أو اسأل صاحب العمل.",
  stateInformationRequired: (reason: string | null) =>
    `بانتظار ردّ صاحب العمل.${reason ? ` سؤالك: ${reason}` : ""}`,
  stateApproved: "تمت الموافقة.",
  stateNone: "لا يوجد ما تفعله في هذا الطلب.",
  confirmAdminReview: "بدء مراجعة هذا الطلب؟",
  confirmRequestInformation: "إرسال سؤالك إلى صاحب العمل؟ يعود الطلب إليه حتى يجيب.",
  confirmApproveBoard: "الموافقة على هذا الطلب ونشره على لوحة الوظائف؟ يمكن للعمّال المؤهّلين أخذه فورًا.",
  confirmApproveManual: "الموافقة على هذا الطلب؟ ستختار العامل بنفسك بعد ذلك.",
  postedBoard: (open: number, confirmed: number) =>
    `منشور على لوحة الوظائف – ${open} مكان متاح – ${confirmed} عامل مؤكَّد`,
  postedManual: (open: number, confirmed: number) =>
    `تمت الموافقة – أنت تختار العامل – ${open} مكان متاح – ${confirmed} عامل مؤكَّد`,
  seeJobBoard: "عرض الوظيفة على لوحة الوظائف",
  dispatchTitle: "العمّال",
  retry: "إعادة المحاولة"
};

export type { ReviewCopy };
export const reviewText: PageText<ReviewCopy> = { en, fr, ar };
