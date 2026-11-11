// Page headers (en / fr-CA / ar) for employer pages whose panels are already translated but whose
// title, intro and header buttons were still English.
import type { Trilingual } from "../i18n/localText";

type Header = Readonly<{ eyebrow: string; title: string; lede: string }>;

type PageHeaders = Readonly<{
  dashboard: Header;
  myCalendar: Header;
  money: Header & Readonly<{ invoices: string }>;
  orders: Header & Readonly<{ back: string }>;
  orderCreate: Header & Readonly<{ back: string }>;
  orderDetail: Header & Readonly<{ back: string }>;
  company: Header;
  invoiceDetail: Header & Readonly<{ breakdown: string; back: string }>;
  invoiceBreakdown: Header & Readonly<{ backToInvoice: string; backToInvoices: string }>;
  contact: Header & Readonly<{ back: string }>;
}>;

export const pageHeaders: Trilingual<PageHeaders> = {
  en: {
    dashboard: { eyebrow: "Employer home", title: "Employer home", lede: "What needs you today." },
    myCalendar: { eyebrow: "My calendar", title: "My calendar", lede: "Your jobs, bonus offers and invoices in one calendar." },
    money: {
      eyebrow: "Money",
      title: "Your money, in one place",
      lede: "What you've been invoiced, what you've paid, and what's still to pay, with links to each invoice.",
      invoices: "Invoices"
    },
    orders: {
      eyebrow: "Orders",
      title: "Your orders",
      lede: "One order can ask for several types of workers at once. Joblop reviews and prices each type on its own.",
      back: "Back to the request calendar"
    },
    orderCreate: {
      eyebrow: "Orders / New order",
      title: "New order for several types of workers",
      lede: "Choose the site and the time, then add a line for each type of worker you need. When you send it, Joblop reviews each line.",
      back: "Back to orders"
    },
    orderDetail: {
      eyebrow: "Orders / Details",
      title: "Order details",
      lede: "See each line of the order and where it stands. You can send a draft order to Joblop, or cancel the whole order (this cancels every line).",
      back: "Back to orders"
    },
    company: { eyebrow: "Your company", title: "Company details", lede: "Keep your company's names up to date." },
    invoiceDetail: {
      eyebrow: "Invoice",
      title: "Invoice details",
      lede: "An invoice is only paid once its payment shows as paid.",
      breakdown: "See the charges",
      back: "Back to invoices"
    },
    invoiceBreakdown: {
      eyebrow: "Invoice charges",
      title: "What this invoice charges for",
      lede: "Each charge that makes up the invoice total.",
      backToInvoice: "Back to the invoice",
      backToInvoices: "Back to invoices"
    },
    contact: { eyebrow: "Help", title: "Contact Joblop", lede: "Our AI assistant answers right away, day and night. When a person needs to decide, it passes your message to the Joblop team. Your conversation is private.", back: "← Home" }
  },
  fr: {
    dashboard: { eyebrow: "Accueil employeur", title: "Accueil employeur", lede: "Ce qui demande votre attention aujourd'hui." },
    myCalendar: { eyebrow: "Mon calendrier", title: "Mon calendrier", lede: "Vos emplois, offres de prime et factures dans un seul calendrier." },
    money: {
      eyebrow: "Argent",
      title: "Votre argent, au même endroit",
      lede: "Ce qui vous a été facturé, ce que vous avez payé et ce qu'il reste à payer, avec un lien vers chaque facture.",
      invoices: "Factures"
    },
    orders: {
      eyebrow: "Commandes",
      title: "Vos commandes",
      lede: "Une commande peut demander plusieurs types de travailleurs à la fois. Joblop examine et fixe le prix de chaque type séparément.",
      back: "Retour au calendrier des demandes"
    },
    orderCreate: {
      eyebrow: "Commandes / Nouvelle commande",
      title: "Nouvelle commande pour plusieurs types de travailleurs",
      lede: "Choisissez le site et l'heure, puis ajoutez une ligne pour chaque type de travailleur. À l'envoi, Joblop examine chaque ligne.",
      back: "Retour aux commandes"
    },
    orderDetail: {
      eyebrow: "Commandes / Détails",
      title: "Détails de la commande",
      lede: "Voyez chaque ligne de la commande et où elle en est. Vous pouvez envoyer une commande brouillon à Joblop ou annuler toute la commande (cela annule chaque ligne).",
      back: "Retour aux commandes"
    },
    company: { eyebrow: "Votre entreprise", title: "Renseignements sur l'entreprise", lede: "Gardez les noms de votre entreprise à jour." },
    invoiceDetail: {
      eyebrow: "Facture",
      title: "Détails de la facture",
      lede: "Une facture n'est payée que lorsque son paiement s'affiche comme payé.",
      breakdown: "Voir les frais",
      back: "Retour aux factures"
    },
    invoiceBreakdown: {
      eyebrow: "Frais de la facture",
      title: "Ce que cette facture comprend",
      lede: "Chaque frais qui compose le total de la facture.",
      backToInvoice: "Retour à la facture",
      backToInvoices: "Retour aux factures"
    },
    contact: { eyebrow: "Aide", title: "Contacter Joblop", lede: "Notre assistant IA répond tout de suite, jour et nuit. Quand une personne doit décider, il transmet votre message à l'équipe Joblop. Votre conversation est privée.", back: "← Accueil" }
  },
  ar: {
    dashboard: { eyebrow: "الصفحة الرئيسية لصاحب العمل", title: "الصفحة الرئيسية لصاحب العمل", lede: "ما يحتاج إلى انتباهك اليوم." },
    myCalendar: { eyebrow: "تقويمي", title: "تقويمي", lede: "وظائفك وعروض المكافآت والفواتير في تقويم واحد." },
    money: {
      eyebrow: "المال",
      title: "أموالك في مكان واحد",
      lede: "ما فُوتر عليك، وما دفعته، وما بقي للدفع، مع رابط لكل فاتورة.",
      invoices: "الفواتير"
    },
    orders: {
      eyebrow: "الطلبيات",
      title: "طلبياتك",
      lede: "يمكن للطلبية الواحدة أن تطلب عدة أنواع من العمال معًا. تراجع Joblop كل نوع وتحدد سعره على حدة.",
      back: "العودة إلى تقويم الطلبات"
    },
    orderCreate: {
      eyebrow: "الطلبيات / طلبية جديدة",
      title: "طلبية جديدة لعدة أنواع من العمال",
      lede: "اختر الموقع والوقت، ثم أضف سطرًا لكل نوع من العمال تحتاجه. عند الإرسال، تراجع Joblop كل سطر.",
      back: "العودة إلى الطلبيات"
    },
    orderDetail: {
      eyebrow: "الطلبيات / التفاصيل",
      title: "تفاصيل الطلبية",
      lede: "اطّلع على كل سطر في الطلبية وحالته. يمكنك إرسال طلبية مسودة إلى Joblop، أو إلغاء الطلبية كلها (وهذا يلغي كل سطر).",
      back: "العودة إلى الطلبيات"
    },
    company: { eyebrow: "شركتك", title: "بيانات الشركة", lede: "حافظ على أسماء شركتك محدّثة." },
    invoiceDetail: {
      eyebrow: "الفاتورة",
      title: "تفاصيل الفاتورة",
      lede: "لا تُعدّ الفاتورة مدفوعة إلا عندما يظهر دفعها على أنه مدفوع.",
      breakdown: "عرض الرسوم",
      back: "العودة إلى الفواتير"
    },
    invoiceBreakdown: {
      eyebrow: "رسوم الفاتورة",
      title: "ما تشمله هذه الفاتورة",
      lede: "كل رسم يشكّل مجموع الفاتورة.",
      backToInvoice: "العودة إلى الفاتورة",
      backToInvoices: "العودة إلى الفواتير"
    },
    contact: { eyebrow: "مساعدة", title: "تواصل مع Joblop", lede: "يجيب مساعدنا الذكي فورًا، ليلًا ونهارًا. وعندما يلزم قرار من شخص، يحيل رسالتك إلى فريق Joblop. محادثتك خاصة.", back: "الرئيسية ←" }
  }
};
