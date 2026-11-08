import type { PageText } from "../i18n/pageTextCore";
import type { InvoiceStaffAction } from "./invoiceIssue";

// Copy for the Invoices page, in English, French (Québec) and Arabic. Status codes from the API stay
// as they are; only the label shown to staff is translated (unknown codes fall back to the code).

type InvoicesCopy = {
  eyebrow: string;
  title: string;
  lede: string;
  actionLabel: Record<InvoiceStaffAction, string>;
  actionProgress: Record<InvoiceStaffAction, string>;
  approved: string;
  issued: string;
  sentEmailed: string;
  sentNoEmail: string;
  changedRefreshed: string;
  failedRetry: string;
  denied: string;
  signInAgain: string;
  employer: string;
  chooseEmployer: string;
  loading: string;
  loadError: string;
  empty: string;
  notIssued: string;
  status: (label: string) => string;
  statusLabel: Readonly<Record<string, string>>;
  working: string;
};

const en: InvoicesCopy = {
  eyebrow: "Joblop / Finance",
  title: "Invoices",
  lede:
    "A locked timesheet creates a draft invoice. Approve it, issue it to give it a number, then send it to the " +
    "employer, who is emailed and can pay it. No money moves here, and issuing cannot be undone from this screen.",
  actionLabel: { approve: "Approve invoice", issue: "Issue invoice", send: "Send to employer" },
  actionProgress: { approve: "Approving the invoice.", issue: "Issuing the invoice.", send: "Sending the invoice." },
  approved: "Invoice approved. It can be issued now.",
  issued: "Invoice issued. It can be sent now.",
  sentEmailed: "Invoice sent, and the employer has been emailed.",
  sentNoEmail: "Invoice marked as sent and visible to the employer, but the email did not go out.",
  changedRefreshed: "That didn't go through. Someone may have changed this invoice, so the list has been refreshed.",
  failedRetry: "That didn't go through. Refresh and try again.",
  denied: "Your session has ended or this account has no access.",
  signInAgain: "Sign in again",
  employer: "Employer",
  chooseEmployer: "Choose employer…",
  loading: "Loading invoices.",
  loadError: "The invoices could not be loaded.",
  empty: "This employer has no invoices.",
  notIssued: "Not issued yet",
  status: (label) => `Status: ${label}`,
  statusLabel: {
    draft: "draft",
    approved: "approved",
    issued: "issued",
    sent: "sent",
    viewed: "viewed",
    partially_paid: "partially paid",
    paid: "paid",
    overdue: "overdue",
    disputed: "disputed",
    voided: "voided",
    refunded: "refunded"
  },
  working: "Working…"
};

const fr: InvoicesCopy = {
  eyebrow: "Joblop / Finances",
  title: "Factures",
  lede:
    "Une feuille de temps verrouillée crée une facture brouillon. Approuvez-la, émettez-la pour lui donner un numéro, " +
    "puis envoyez-la à l’employeur, qui reçoit un courriel et peut la payer. Aucun argent ne circule ici, et " +
    "l’émission ne peut pas être annulée à partir de cet écran.",
  actionLabel: { approve: "Approuver la facture", issue: "Émettre la facture", send: "Envoyer à l’employeur" },
  actionProgress: {
    approve: "Approbation de la facture.",
    issue: "Émission de la facture.",
    send: "Envoi de la facture."
  },
  approved: "Facture approuvée. Elle peut maintenant être émise.",
  issued: "Facture émise. Elle peut maintenant être envoyée.",
  sentEmailed: "Facture envoyée, et l’employeur a reçu un courriel.",
  sentNoEmail: "Facture marquée comme envoyée et visible par l’employeur, mais le courriel n’est pas parti.",
  changedRefreshed:
    "L’opération n’a pas abouti. Quelqu’un a peut-être modifié cette facture, alors la liste a été actualisée.",
  failedRetry: "L’opération n’a pas abouti. Actualisez et réessayez.",
  denied: "Votre session a pris fin ou ce compte n’a pas accès.",
  signInAgain: "Se reconnecter",
  employer: "Employeur",
  chooseEmployer: "Choisir un employeur…",
  loading: "Chargement des factures.",
  loadError: "Les factures n’ont pas pu être chargées.",
  empty: "Cet employeur n’a aucune facture.",
  notIssued: "Pas encore émise",
  status: (label) => `Statut : ${label}`,
  statusLabel: {
    draft: "brouillon",
    approved: "approuvée",
    issued: "émise",
    sent: "envoyée",
    viewed: "consultée",
    partially_paid: "partiellement payée",
    paid: "payée",
    overdue: "en retard",
    disputed: "contestée",
    voided: "annulée",
    refunded: "remboursée"
  },
  working: "En cours…"
};

const ar: InvoicesCopy = {
  eyebrow: "Joblop / المالية",
  title: "الفواتير",
  lede:
    "ينشئ كشف الساعات المقفل فاتورة مسودة. اعتمدها، ثم أصدرها لتحصل على رقم، ثم أرسلها إلى صاحب العمل الذي " +
    "يتلقى بريدًا إلكترونيًا ويمكنه دفعها. لا تُحوَّل أي أموال هنا، ولا يمكن التراجع عن الإصدار من هذه الشاشة.",
  actionLabel: { approve: "اعتماد الفاتورة", issue: "إصدار الفاتورة", send: "إرسال إلى صاحب العمل" },
  actionProgress: { approve: "جارٍ اعتماد الفاتورة.", issue: "جارٍ إصدار الفاتورة.", send: "جارٍ إرسال الفاتورة." },
  approved: "اعتُمدت الفاتورة. يمكن إصدارها الآن.",
  issued: "صدرت الفاتورة. يمكن إرسالها الآن.",
  sentEmailed: "أُرسلت الفاتورة، وأُبلغ صاحب العمل بالبريد الإلكتروني.",
  sentNoEmail: "وُضعت علامة «مُرسلة» على الفاتورة وأصبحت ظاهرة لصاحب العمل، لكن البريد الإلكتروني لم يُرسل.",
  changedRefreshed: "لم تنجح العملية. ربما عدّل شخص آخر هذه الفاتورة، لذا جرى تحديث القائمة.",
  failedRetry: "لم تنجح العملية. حدّث الصفحة وحاول مرة أخرى.",
  denied: "انتهت جلستك أو أن هذا الحساب لا يملك صلاحية الوصول.",
  signInAgain: "سجّل الدخول مرة أخرى",
  employer: "صاحب العمل",
  chooseEmployer: "اختر صاحب العمل…",
  loading: "جارٍ تحميل الفواتير.",
  loadError: "تعذّر تحميل الفواتير.",
  empty: "لا توجد فواتير لصاحب العمل هذا.",
  notIssued: "لم تصدر بعد",
  status: (label) => `الحالة: ${label}`,
  statusLabel: {
    draft: "مسودة",
    approved: "معتمدة",
    issued: "صادرة",
    sent: "مُرسلة",
    viewed: "تمت مشاهدتها",
    partially_paid: "مدفوعة جزئيًا",
    paid: "مدفوعة",
    overdue: "متأخرة",
    disputed: "متنازع عليها",
    voided: "ملغاة",
    refunded: "مستردة"
  },
  working: "جارٍ التنفيذ…"
};

export const invoicesText: PageText<InvoicesCopy> = { en, fr, ar };
