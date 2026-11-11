// Words (en / fr-CA / ar) for the employer "Contact Joblop" messages.
import type { Trilingual } from "../../i18n/localText";

type ContactText = Readonly<{
  topics: Readonly<Record<string, string>>;
  status: Readonly<Record<string, string>>;
  authors: Readonly<Record<string, string>>;
  topicLabel: string;
  messageLabel: string;
  urgentLabel: string;
  noBankDetails: string;
  sendFailed: string;
  sending: string;
  send: string;
  loading: string;
  allMessages: string;
  urgent: string;
  askPerson: string;
  signIn: string;
  loadFailed: string;
  history: string;
  newReply: string;
}>;

export const contactText: Trilingual<ContactText> = {
  en: {
    topics: { shift: "A shift", worker_no_show: "Worker didn't show", timesheet: "Timesheet", invoice: "Invoice", account: "Account", other: "Other" },
    status: { ai: "With AI assistant", needs_admin: "Waiting for the Joblop team", admin_replied: "Joblop team replied", solved: "Solved" },
    authors: { requester: "You", ai: "Joblop AI assistant", assistant_result: "Joblop AI assistant", admin: "Joblop team" },
    topicLabel: "What is this about?",
    messageLabel: "Your message",
    urgentLabel: "Urgent: a shift is happening now, or starts soon",
    noBankDetails: "Please don't write bank or card details here.",
    sendFailed: "Your message could not be sent. Please try again.",
    sending: "Sending…",
    send: "Send",
    loading: "Loading…",
    allMessages: "← All messages",
    urgent: "Urgent",
    askPerson: "Talk to a person",
    signIn: "Sign in to contact Joblop.",
    loadFailed: "Your messages could not be loaded. Please try again.",
    history: "Your messages",
    newReply: "New reply"
  },
  fr: {
    topics: { shift: "Un quart", worker_no_show: "Le travailleur ne s'est pas présenté", timesheet: "Feuille de temps", invoice: "Facture", account: "Compte", other: "Autre" },
    status: { ai: "Avec l'assistant IA", needs_admin: "En attente de l'équipe Joblop", admin_replied: "L'équipe Joblop a répondu", solved: "Réglé" },
    authors: { requester: "Vous", ai: "Assistant IA Joblop", assistant_result: "Assistant IA Joblop", admin: "Équipe Joblop" },
    topicLabel: "De quoi s'agit-il?",
    messageLabel: "Votre message",
    urgentLabel: "Urgent : un quart est en cours ou commence bientôt",
    noBankDetails: "N'écrivez pas de renseignements bancaires ou de carte ici.",
    sendFailed: "Votre message n'a pas pu être envoyé. Veuillez réessayer.",
    sending: "Envoi…",
    send: "Envoyer",
    loading: "Chargement…",
    allMessages: "← Tous les messages",
    urgent: "Urgent",
    askPerson: "Parler à une personne",
    signIn: "Connectez-vous pour contacter Joblop.",
    loadFailed: "Vos messages n'ont pas pu être chargés. Veuillez réessayer.",
    history: "Vos messages",
    newReply: "Nouvelle réponse"
  },
  ar: {
    topics: { shift: "مناوبة", worker_no_show: "العامل لم يحضر", timesheet: "سجل الدوام", invoice: "فاتورة", account: "الحساب", other: "أخرى" },
    status: { ai: "مع المساعد الذكي", needs_admin: "بانتظار فريق Joblop", admin_replied: "ردّ فريق Joblop", solved: "تم الحل" },
    authors: { requester: "أنت", ai: "مساعد Joblop الذكي", assistant_result: "مساعد Joblop الذكي", admin: "فريق Joblop" },
    topicLabel: "بماذا يتعلق الأمر؟",
    messageLabel: "رسالتك",
    urgentLabel: "عاجل: مناوبة جارية الآن أو تبدأ قريبًا",
    noBankDetails: "يرجى عدم كتابة بيانات بنكية أو بيانات بطاقة هنا.",
    sendFailed: "تعذّر إرسال رسالتك. يرجى المحاولة مرة أخرى.",
    sending: "جارٍ الإرسال…",
    send: "إرسال",
    loading: "جارٍ التحميل…",
    allMessages: "→ كل الرسائل",
    urgent: "عاجل",
    askPerson: "التحدث إلى شخص",
    signIn: "سجّل الدخول للتواصل مع Joblop.",
    loadFailed: "تعذّر تحميل رسائلك. يرجى المحاولة مرة أخرى.",
    history: "رسائلك",
    newReply: "رد جديد"
  }
};
