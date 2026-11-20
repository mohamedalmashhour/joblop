import type { PageText } from "../i18n/pageTextCore";
import { PAYOUT_STATUS_LABEL } from "./payoutCopy";

// Copy for the worker payouts page (/payouts). Payout status codes stay as they are; only the
// label shown to people is translated (English labels live in payoutCopy.ts, locked by tests).

const en = {
  eyebrow: "Joblop / Finance",
  title: "Worker payouts",
  lede: "Every worker payout and where it stands. A payout waits out its hold, then shows as ready to pay. Test payouts use Stripe test mode, so no real money moves.",
  sending: "Sending the test payout.",
  sendFailed: "The test payout did not go through, and the payout was not marked paid. Refresh and try again.",
  sent: "Test payout sent. No real money moved.",
  unconfirmed: "The test payout could not be confirmed. Refresh to check its status before trying again.",
  loading: "Loading worker payouts.",
  denied: "Your session has ended or this account has no access.",
  error: "Worker payouts could not be reached.",
  switchedOff: "Test payouts are switched off, so payouts can be viewed here but not sent.",
  empty: "No worker payouts yet.",
  workerFallback: "Worker",
  employerFallback: "Employer",
  paidOn: (date: string) => `Paid ${date}`,
  holdEnds: (date: string) => `Hold ends ${date}`,
  reference: (ref: string) => `Reference ${ref}`,
  sendingShort: "Sending…",
  send: "Send test payout",
  statusLabels: PAYOUT_STATUS_LABEL as Readonly<Record<string, string>>
};

export type PayoutsText = typeof en;

const fr: PayoutsText = {
  eyebrow: "Joblop / Finances",
  title: "Versements aux travailleurs",
  lede: "Tous les versements aux travailleurs et leur état. Un versement attend la fin de sa retenue, puis s’affiche comme prêt à verser. Les versements de test utilisent le mode test de Stripe : aucun argent réel n’est versé.",
  sending: "Envoi du versement de test.",
  sendFailed: "Le versement de test n’a pas abouti et le versement n’a pas été marqué comme payé. Actualisez la page et réessayez.",
  sent: "Versement de test envoyé. Aucun argent réel n’a été versé.",
  unconfirmed: "Le versement de test n’a pas pu être confirmé. Actualisez la page pour vérifier son état avant de réessayer.",
  loading: "Chargement des versements aux travailleurs.",
  denied: "Votre session a pris fin ou ce compte n’a pas accès.",
  error: "Impossible de joindre les versements aux travailleurs.",
  switchedOff: "Les versements de test sont désactivés : vous pouvez consulter les versements ici, mais pas les envoyer.",
  empty: "Aucun versement aux travailleurs pour l’instant.",
  workerFallback: "Travailleur",
  employerFallback: "Employeur",
  paidOn: (date) => `Payé le ${date}`,
  holdEnds: (date) => `Fin de la retenue le ${date}`,
  reference: (ref) => `Référence ${ref}`,
  sendingShort: "Envoi…",
  send: "Envoyer un versement de test",
  statusLabels: {
    pending: "En attente de libération",
    released: "Prêt à verser",
    held: "Suspendu par un litige",
    paid: "Payé",
    cancelled: "Annulé"
  }
};

const ar: PayoutsText = {
  eyebrow: "Joblop / المالية",
  title: "مدفوعات العمال",
  lede: "كل مدفوعات العمال وحالة كل منها. تنتظر الدفعة انتهاء فترة الحجز، ثم تظهر جاهزة للدفع. تستخدم الدفعات التجريبية وضع الاختبار في Stripe، فلا تُحوَّل أي أموال حقيقية.",
  sending: "جارٍ إرسال الدفعة التجريبية.",
  sendFailed: "لم تتم الدفعة التجريبية، ولم تُعلَّم الدفعة على أنها مدفوعة. حدّث الصفحة وحاول مجددًا.",
  sent: "أُرسلت الدفعة التجريبية. لم تُحوَّل أي أموال حقيقية.",
  unconfirmed: "تعذّر تأكيد الدفعة التجريبية. حدّث الصفحة للتحقق من حالتها قبل المحاولة مجددًا.",
  loading: "جارٍ تحميل مدفوعات العمال.",
  denied: "انتهت جلستك أو ليس لهذا الحساب صلاحية الوصول.",
  error: "تعذّر الوصول إلى مدفوعات العمال.",
  switchedOff: "الدفعات التجريبية معطّلة، لذا يمكن عرض المدفوعات هنا دون إرسالها.",
  empty: "لا توجد مدفوعات للعمال بعد.",
  workerFallback: "عامل",
  employerFallback: "صاحب العمل",
  paidOn: (date) => `دُفعت في ${date}`,
  holdEnds: (date) => `ينتهي الحجز في ${date}`,
  reference: (ref) => `المرجع ${ref}`,
  sendingShort: "جارٍ الإرسال…",
  send: "إرسال دفعة تجريبية",
  statusLabels: {
    pending: "بانتظار الإفراج",
    released: "جاهزة للدفع",
    held: "موقوفة بسبب نزاع",
    paid: "مدفوعة",
    cancelled: "ملغاة"
  }
};

export const payoutsText = { en, fr, ar } satisfies PageText<PayoutsText>;
