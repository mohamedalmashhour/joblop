// Plain words (en / fr-CA / ar) for the employer's "Staffing progress" page: how far Joblop has got in
// finding workers for one request. Worker names, pay and internal notes are never shown here.
import type { Trilingual } from "../../../i18n/localText";

type StageCopy = Readonly<{ title: string; body: string }>;
type Stage =
  | "not_started"
  | "draft"
  | "active"
  | "candidate_review"
  | "shortlist_ready"
  | "offer_preparation"
  | "paused"
  | "cancelled"
  | "closed";

type StaffingText = Readonly<{
  pageEyebrow: string;
  pageTitle: string;
  pageLede: string;
  back: string;
  loadingTitle: string;
  loadingBody: string;
  invalidTitle: string;
  invalidBody: string;
  chooseTitle: string;
  chooseBody: string;
  chooseAction: string;
  deniedTitle: string;
  deniedBody: string;
  unavailableTitle: string;
  unavailableBody: string;
  errorTitle: string;
  errorBody: string;
  retry: string;
  eyebrow: string;
  request: string;
  requested: string;
  stillToFill: string;
  zeroNote: string;
  updated: string;
  sideTitle: string;
  sideBody: string;
  stages: Readonly<Record<Stage, StageCopy>>;
}>;

export const staffingText: Trilingual<StaffingText> = {
  en: {
    pageEyebrow: "Request calendar / Staffing progress",
    pageTitle: "Staffing progress",
    pageLede: "How far Joblop has got in finding workers for this request.",
    back: "Back to the request calendar",
    loadingTitle: "Loading staffing progress…",
    loadingBody: "This takes a moment.",
    invalidTitle: "No request chosen",
    invalidBody: "Open staffing progress from a request in your request calendar.",
    chooseTitle: "Choose your company first",
    chooseBody: "Pick your company on the request calendar, then open staffing progress again.",
    chooseAction: "Choose company",
    deniedTitle: "Please sign in",
    deniedBody: "Sign in on the request calendar to see this request.",
    unavailableTitle: "We can't reach staffing progress right now",
    unavailableBody: "Please try again in a moment. Your request was not changed.",
    errorTitle: "Staffing progress could not be loaded",
    errorBody: "Please try again in a moment.",
    retry: "Try again",
    eyebrow: "Staffing progress",
    request: "Request",
    requested: "Workers requested",
    stillToFill: "Places still being filled",
    zeroNote: "Zero places left means Joblop has a worker in mind for each place. You will see them on Assigned workers once they confirm.",
    updated: "Updated: {date} (UTC)",
    sideTitle: "When will I see my workers?",
    sideBody: "This page shows Joblop's progress only. Workers appear on the Assigned workers page once they confirm the shift.",
    stages: {
      not_started: { title: "Not started yet", body: "Joblop has not started looking for workers for this request." },
      draft: { title: "Getting ready", body: "Joblop is getting ready to look for workers." },
      active: { title: "Looking for workers", body: "Joblop is working on your request." },
      candidate_review: { title: "Choosing workers", body: "Joblop is looking at workers who fit your request." },
      shortlist_ready: { title: "Workers picked", body: "Joblop has picked workers who fit. They have not been asked yet." },
      offer_preparation: { title: "Asking workers", body: "Joblop is preparing to offer the shift to workers." },
      paused: { title: "Paused", body: "Joblop has paused the search for now. Contact Joblop if you have questions." },
      cancelled: { title: "Stopped", body: "The search for this request was stopped." },
      closed: { title: "Finished", body: "Joblop has finished looking for workers for this request." }
    }
  },
  fr: {
    pageEyebrow: "Calendrier des demandes / Recrutement",
    pageTitle: "Où en est le recrutement",
    pageLede: "Où en est Joblop dans la recherche de travailleurs pour cette demande.",
    back: "Retour au calendrier des demandes",
    loadingTitle: "Chargement du suivi…",
    loadingBody: "Un instant.",
    invalidTitle: "Aucune demande choisie",
    invalidBody: "Ouvrez ce suivi à partir d'une demande de votre calendrier des demandes.",
    chooseTitle: "Choisissez d'abord votre entreprise",
    chooseBody: "Choisissez votre entreprise dans le calendrier des demandes, puis rouvrez ce suivi.",
    chooseAction: "Choisir l'entreprise",
    deniedTitle: "Veuillez vous connecter",
    deniedBody: "Connectez-vous dans le calendrier des demandes pour voir cette demande.",
    unavailableTitle: "Nous ne pouvons pas joindre ce suivi pour le moment",
    unavailableBody: "Veuillez réessayer dans un moment. Votre demande n'a pas été modifiée.",
    errorTitle: "Le suivi n'a pas pu être chargé",
    errorBody: "Veuillez réessayer dans un moment.",
    retry: "Réessayer",
    eyebrow: "Recrutement",
    request: "Demande",
    requested: "Travailleurs demandés",
    stillToFill: "Places encore à combler",
    zeroNote: "Zéro place restante signifie que Joblop a un travailleur en vue pour chaque place. Vous les verrez dans Travailleurs assignés dès qu'ils auront confirmé.",
    updated: "Mis à jour : {date} (UTC)",
    sideTitle: "Quand verrai-je mes travailleurs?",
    sideBody: "Cette page montre seulement l'avancement de Joblop. Les travailleurs s'affichent dans Travailleurs assignés dès qu'ils confirment le quart.",
    stages: {
      not_started: { title: "Pas encore commencé", body: "Joblop n'a pas encore commencé à chercher des travailleurs pour cette demande." },
      draft: { title: "En préparation", body: "Joblop se prépare à chercher des travailleurs." },
      active: { title: "Recherche de travailleurs", body: "Joblop travaille sur votre demande." },
      candidate_review: { title: "Choix des travailleurs", body: "Joblop examine les travailleurs qui conviennent à votre demande." },
      shortlist_ready: { title: "Travailleurs choisis", body: "Joblop a choisi des travailleurs qui conviennent. Ils n'ont pas encore été contactés." },
      offer_preparation: { title: "Offre aux travailleurs", body: "Joblop se prépare à offrir le quart aux travailleurs." },
      paused: { title: "En pause", body: "Joblop a mis la recherche en pause pour l'instant. Contactez Joblop si vous avez des questions." },
      cancelled: { title: "Arrêtée", body: "La recherche pour cette demande a été arrêtée." },
      closed: { title: "Terminée", body: "Joblop a terminé la recherche de travailleurs pour cette demande." }
    }
  },
  ar: {
    pageEyebrow: "تقويم الطلبات / تقدّم التوظيف",
    pageTitle: "تقدّم التوظيف",
    pageLede: "إلى أين وصلت Joblop في إيجاد عمال لهذا الطلب.",
    back: "العودة إلى تقويم الطلبات",
    loadingTitle: "جارٍ تحميل تقدّم التوظيف…",
    loadingBody: "لحظة من فضلك.",
    invalidTitle: "لم يتم اختيار طلب",
    invalidBody: "افتح تقدّم التوظيف من طلب في تقويم طلباتك.",
    chooseTitle: "اختر شركتك أولًا",
    chooseBody: "اختر شركتك من تقويم الطلبات، ثم افتح تقدّم التوظيف مرة أخرى.",
    chooseAction: "اختيار الشركة",
    deniedTitle: "يرجى تسجيل الدخول",
    deniedBody: "سجّل الدخول من تقويم الطلبات لرؤية هذا الطلب.",
    unavailableTitle: "لا يمكننا الوصول إلى تقدّم التوظيف الآن",
    unavailableBody: "يرجى المحاولة مرة أخرى بعد قليل. لم يتغيّر طلبك.",
    errorTitle: "تعذّر تحميل تقدّم التوظيف",
    errorBody: "يرجى المحاولة مرة أخرى بعد قليل.",
    retry: "حاول مرة أخرى",
    eyebrow: "تقدّم التوظيف",
    request: "الطلب",
    requested: "العمال المطلوبون",
    stillToFill: "أماكن لم تُشغَل بعد",
    zeroNote: "صفر أماكن متبقية يعني أن لدى Joblop عاملًا مرشحًا لكل مكان. ستراهم في صفحة العمال المعيّنين بعد أن يؤكّدوا.",
    updated: "آخر تحديث: {date} (UTC)",
    sideTitle: "متى سأرى عمالي؟",
    sideBody: "تعرض هذه الصفحة تقدّم Joblop فقط. يظهر العمال في صفحة العمال المعيّنين بعد أن يؤكّدوا المناوبة.",
    stages: {
      not_started: { title: "لم يبدأ بعد", body: "لم تبدأ Joblop بعد في البحث عن عمال لهذا الطلب." },
      draft: { title: "قيد التحضير", body: "تستعد Joblop للبحث عن عمال." },
      active: { title: "نبحث عن عمال", body: "تعمل Joblop على طلبك." },
      candidate_review: { title: "نختار العمال", body: "تراجع Joblop العمال المناسبين لطلبك." },
      shortlist_ready: { title: "تم اختيار عمال", body: "اختارت Joblop عمالًا مناسبين. لم يتم سؤالهم بعد." },
      offer_preparation: { title: "نعرض المناوبة على العمال", body: "تستعد Joblop لعرض المناوبة على العمال." },
      paused: { title: "متوقف مؤقتًا", body: "أوقفت Joblop البحث مؤقتًا. تواصل مع Joblop إذا كانت لديك أسئلة." },
      cancelled: { title: "توقف البحث", body: "تم إيقاف البحث لهذا الطلب." },
      closed: { title: "انتهى", body: "انتهت Joblop من البحث عن عمال لهذا الطلب." }
    }
  }
};
