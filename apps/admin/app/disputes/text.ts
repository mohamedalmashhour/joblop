import type { PageText } from "../i18n/pageTextCore";

// Copy for the worker disputes page (/disputes). Dispute categories and payout status codes come
// from the API; only the label shown to people is translated.

const plain = (code: string) => code.replaceAll("_", " ");

const en = {
  eyebrow: "Joblop / Finance",
  title: "Worker disputes",
  lede: "A worker's open dispute pauses their payout. Settling it here records your decision, shows it to the worker, and returns the payout to the normal flow. No amount changes here: if the worker is owed something different, correct it in payroll first.",
  settling: "Settling the dispute.",
  settleFailed: "The dispute could not be settled. Refresh and try again.",
  settled: "Dispute settled. The payout is back in the normal flow.",
  loading: "Loading worker disputes.",
  denied: "Your session has ended or this account has no access.",
  signInAgain: "Sign in again",
  error: "The dispute queue could not be reached.",
  empty: "No open disputes.",
  workerFallback: "Worker",
  organizationFallback: "Organization",
  category: (code: string): string => plain(code),
  raisedOn: (date: string) => `raised ${date}`,
  payoutLine: (amount: string, status: string) => `Payout ${amount}, currently ${status}`,
  payoutStatus: (code: string): string => code,
  noPayout: "No payout record for this dispute.",
  settleLabel: "How was this settled? The worker sees this.",
  settlingShort: "Settling…",
  settle: "Settle dispute and release hold"
};

export type DisputesText = typeof en;

const FR_PAYOUT: Record<string, string> = { pending: "en attente de libération", released: "prêt à verser", held: "suspendu", paid: "payé", cancelled: "annulé" };
const AR_PAYOUT: Record<string, string> = { pending: "بانتظار الإفراج", released: "جاهزة للدفع", held: "موقوفة", paid: "مدفوعة", cancelled: "ملغاة" };

const fr: DisputesText = {
  eyebrow: "Joblop / Finances",
  title: "Litiges des travailleurs",
  lede: "Un litige ouvert par un travailleur suspend son versement. Le régler ici consigne votre décision, la montre au travailleur et remet le versement dans le circuit normal. Aucun montant n’est modifié ici : si le travailleur a droit à un autre montant, corrigez-le d’abord dans la paie.",
  settling: "Règlement du litige en cours.",
  settleFailed: "Le litige n’a pas pu être réglé. Actualisez la page et réessayez.",
  settled: "Litige réglé. Le versement est de retour dans le circuit normal.",
  loading: "Chargement des litiges des travailleurs.",
  denied: "Votre session a pris fin ou ce compte n’a pas accès.",
  signInAgain: "Se reconnecter",
  error: "Impossible de joindre la file des litiges.",
  empty: "Aucun litige ouvert.",
  workerFallback: "Travailleur",
  organizationFallback: "Organisation",
  category: (code) => plain(code),
  raisedOn: (date) => `ouvert le ${date}`,
  payoutLine: (amount, status) => `Versement de ${amount}, présentement ${status}`,
  payoutStatus: (code) => FR_PAYOUT[code] ?? code,
  noPayout: "Aucun versement associé à ce litige.",
  settleLabel: "Comment ce litige a-t-il été réglé? Le travailleur verra cette réponse.",
  settlingShort: "Règlement…",
  settle: "Régler le litige et lever la retenue"
};

const ar: DisputesText = {
  eyebrow: "Joblop / المالية",
  title: "نزاعات العمال",
  lede: "يوقف النزاع المفتوح من العامل دفعته. تسويته هنا تسجّل قرارك وتعرضه على العامل وتعيد الدفعة إلى مسارها العادي. لا يتغيّر أي مبلغ هنا: إن كان للعامل مبلغ مختلف، فصحّحه في الرواتب أولًا.",
  settling: "جارٍ تسوية النزاع.",
  settleFailed: "تعذّرت تسوية النزاع. حدّث الصفحة وحاول مجددًا.",
  settled: "تمت تسوية النزاع. عادت الدفعة إلى مسارها العادي.",
  loading: "جارٍ تحميل نزاعات العمال.",
  denied: "انتهت جلستك أو ليس لهذا الحساب صلاحية الوصول.",
  signInAgain: "سجّل الدخول مجددًا",
  error: "تعذّر الوصول إلى قائمة النزاعات.",
  empty: "لا توجد نزاعات مفتوحة.",
  workerFallback: "عامل",
  organizationFallback: "المؤسسة",
  category: (code) => plain(code),
  raisedOn: (date) => `فُتح في ${date}`,
  payoutLine: (amount, status) => `دفعة بقيمة ${amount}، حالتها الآن: ${status}`,
  payoutStatus: (code) => AR_PAYOUT[code] ?? code,
  noPayout: "لا يوجد سجل دفعة لهذا النزاع.",
  settleLabel: "كيف سُوّي هذا النزاع؟ سيرى العامل هذا الرد.",
  settlingShort: "جارٍ التسوية…",
  settle: "تسوية النزاع ورفع الحجز"
};

export const disputesText = { en, fr, ar } satisfies PageText<DisputesText>;
