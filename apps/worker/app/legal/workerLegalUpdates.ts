// Reviewed and accepted by the owner's Québec lawyer (2026-11-09). See docs/legal/LEGAL_REVIEW_NOTES.md before changing any wording.
// NEW worker clauses added on top of the approved October 26, 2026 text (./content.tsx English,
// ./workerLegalFr.ts French). Kept separate so the lawyer only has to review what is listed in
// docs/legal/LEGAL_REVIEW_NOTES.md. Facts were checked in code (worker pay channel, Worker Pro order
// repository, worker cancellation penalty, long-term listings).
import { AI_FEATURES_ARABIC_SUMMARY, LEGAL_COMPANY, LEGAL_EFFECTIVE_DATE, type LegalBlock } from "@rwos/shared";

export function workerTermsAdditions(lang: "en" | "fr"): readonly LegalBlock[] {
  const en = lang === "en";
  return [
    {
      kind: "h2",
      id: "whats-new",
      text: en
        ? `15. What is new in this version (effective ${LEGAL_EFFECTIVE_DATE})`
        : `15. Nouveautés de cette version (en vigueur le ${LEGAL_EFFECTIVE_DATE})`
    },
    {
      kind: "p",
      text: en
        ? "This section adds to sections 1 to 14. If anything in this section is different from sections 1 to 14, this section applies."
        : "La présente section s’ajoute aux sections 1 à 14. Si un élément de la présente section diffère des sections 1 à 14, la présente section s’applique."
    },
    { kind: "h3", text: en ? "15.1 Short-term shifts paid by Joblop" : "15.1 Quarts à court terme payés par Joblop" },
    {
      kind: "p",
      text: en
        ? "Short-term shifts (up to 4 weeks) appear on the shared calendar. The first eligible worker who claims a shift gets it. Joblop pays you for these shifts under the worker agreement you accept in your profile, which is the separate written agreement mentioned in section 4. In that agreement you choose how you are paid: as an employee (Joblop makes the source deductions and gives you the tax slips required by law) or as a self-employed worker (you are paid the full amount, you handle your own taxes, and you receive the slips required by law; if you are registered for GST and QST, the taxes are added to your pay)."
        : "Les quarts à court terme (jusqu’à 4 semaines) apparaissent dans le calendrier partagé. Le premier travailleur admissible qui réclame un quart l’obtient. Joblop vous paie pour ces quarts selon l’entente de travailleur que vous acceptez dans votre profil, qui est l’entente écrite distincte mentionnée à la section 4. Dans cette entente, vous choisissez comment vous êtes payé : comme salarié (Joblop effectue les retenues à la source et vous remet les feuillets fiscaux exigés par la loi) ou comme travailleur autonome (vous recevez le montant complet, vous gérez vos propres impôts et vous recevez les feuillets exigés par la loi; si vous êtes inscrit à la TPS et à la TVQ, les taxes s’ajoutent à votre paie)."
    },
    {
      kind: "p",
      text: en
        ? "Your pay is based on the hours in the approved timesheet. You have 48 hours after a shift to tell us about a problem with it. Pay is normally released 14 days after the end of the pay period."
        : "Votre paie est calculée selon les heures de la feuille de temps approuvée. Vous avez 48 heures après un quart pour nous signaler un problème. La paie est normalement versée 14 jours après la fin de la période de paie."
    },
    { kind: "h3", text: en ? "15.2 Canceling a shift you accepted" : "15.2 Annuler un quart accepté" },
    {
      kind: "p",
      text: en
        ? "If you cancel a confirmed shift less than 24 hours before it starts, a Joblop staff member may suspend your account for 7 days the first time and close it the second time. Tell us the reason through Contact Joblop; a person reviews every case."
        : "Si vous annulez un quart confirmé moins de 24 heures avant son début, un membre du personnel de Joblop peut suspendre votre compte pendant 7 jours la première fois et le fermer la deuxième fois. Indiquez-nous la raison au moyen de « Joindre Joblop »; une personne examine chaque cas."
    },
    { kind: "h3", text: en ? "15.3 Long-term jobs" : "15.3 Emplois à long terme" },
    {
      kind: "p",
      text: en
        ? "Long-term jobs (contracts over 4 weeks) are listings paid for by the employer. If you are hired for one, the employer hires you and pays you directly, and the employer is your employer. Joblop is not your employer for those jobs and does not pay you or keep timesheets for them."
        : "Les emplois à long terme (contrats de plus de 4 semaines) sont des annonces payées par l’employeur. Si vous êtes embauché pour l’un d’eux, l’employeur vous embauche et vous paie directement, et c’est lui votre employeur. Joblop n’est pas votre employeur pour ces emplois et ne vous paie pas ni ne tient de feuilles de temps pour ceux-ci."
    },
    { kind: "h3", text: en ? "15.4 Worker Pro (optional)" : "15.4 Worker Pro (facultatif)" },
    {
      kind: "p",
      text: en
        ? "Worker Pro is an optional paid upgrade that includes the AI CV builder. It costs C$12.99 per month. You can try it free for 14 days, once, without giving a card. You pay by Interac e-transfer, and each payment covers one month. Worker Pro does not renew by itself: it ends when the paid month ends unless you pay for another month. Joblop still never takes any part of your pay."
        : "Worker Pro est une option payante facultative qui comprend le générateur de CV par IA. Elle coûte 12,99 $ CA par mois. Vous pouvez l’essayer gratuitement pendant 14 jours, une seule fois, sans fournir de carte. Vous payez par virement Interac et chaque paiement couvre un mois. Worker Pro ne se renouvelle pas automatiquement : l’option prend fin à la fin du mois payé, sauf si vous payez un autre mois. Joblop ne prélève toujours aucune part de votre paie."
    },
    { kind: "h3", text: en ? "15.5 Documents" : "15.5 Documents" },
    {
      kind: "p",
      text: en
        ? "Documents you upload must be genuine, current and your own. We may ask for another document, and we may refuse a document that cannot be checked."
        : "Les documents que vous téléversez doivent être authentiques, à jour et les vôtres. Nous pouvons demander un autre document et refuser un document qui ne peut pas être vérifié."
    },
    { kind: "h3", text: en ? "15.6 Deleting your account" : "15.6 Supprimer votre compte" },
    {
      kind: "p",
      text: en
        ? "You can ask us to delete your account at any time. The steps are on the “Delete your account” page."
        : "Vous pouvez nous demander de supprimer votre compte en tout temps. La marche à suivre se trouve sur la page « Supprimer votre compte »."
    },
    { kind: "links", links: [{ href: "/account-deletion", label: en ? "Delete your account" : "Supprimer votre compte" }] },
    { kind: "h3", text: en ? "15.7 Language" : "15.7 Langue" },
    {
      kind: "p",
      text: en
        ? "These Terms are published in French and in English, and both versions have the same value. The Arabic page is a summary for convenience only."
        : "Les présentes conditions sont publiées en français et en anglais, et les deux versions ont la même valeur. La page en arabe est un résumé fourni pour votre commodité seulement."
    }
  ];
}

/** Added to the account-deletion page: who to write to and what happens to tax records. */
export function accountDeletionAdditions(lang: "en" | "fr"): readonly LegalBlock[] {
  const en = lang === "en";
  return [
    { kind: "h2", text: en ? "Added on November 9, 2026" : "Ajout du 9 novembre 2026" },
    {
      kind: "p",
      text: en
        ? `Pay and tax records are kept for as long as tax law requires (in Québec, generally 6 years after the end of the year they relate to). Questions about deletion can also go to our Privacy Officer: ${LEGAL_COMPANY.legalName}, ${LEGAL_COMPANY.address}.`
        : `Les dossiers de paie et fiscaux sont conservés aussi longtemps que l’exigent les lois fiscales (au Québec, généralement 6 ans après la fin de l’année à laquelle ils se rapportent). Les questions sur la suppression peuvent aussi être adressées à notre responsable de la protection des renseignements personnels : ${LEGAL_COMPANY.legalName}, ${LEGAL_COMPANY.address}.`
    }
  ];
}

const AR_NOTICE =
  "هذه الصفحة ملخّص باللغة العربية للتسهيل فقط. النصّان الفرنسي والإنجليزي هما المعتمدان، وفي حال أي اختلاف يُعتمد النص الفرنسي أو الإنجليزي.";

export const workerPrivacyArabic: readonly LegalBlock[] = [
  { kind: "p", text: AR_NOTICE },
  { kind: "h2", text: "ملخّص سياسة الخصوصية" },
  {
    kind: "ul",
    items: [
      "نجمع بيانات حسابك (الاسم، البريد الإلكتروني، رقم الجوال)، وعنوانك ورمزك البريدي، وتفضيلات العمل، وسجلّات العمل والدفع، والوثائق التي ترفعها.",
      "نستخدمها لتسجيل دخولك برمز يُرسل برسالة نصية، ولمطابقتك مع الوظائف، ولدفع أجرك، ولإرسال الإشعارات والفواتير بالبريد الإلكتروني.",
      "لا يرى وثائقك إلا أنت وموظفو الموارد البشرية المخوّلون في جوب‑لوب. أصحاب العمل لا يرون وثائقك.",
      "نستعين بمزوّدي خدمات مثل Render وBrevo وAnthropic وExpo وGoogle وStripe وAdzuna، وقد تُعالج بياناتك خارج كيبيك، بما في ذلك في الولايات المتحدة.",
      "الذكاء الاصطناعي يقترح فقط؛ أي قرار مهم يتخذه موظف من جوب‑لوب.",
      AI_FEATURES_ARABIC_SUMMARY.worker,
      "لك الحق في الاطلاع على بياناتك وتصحيحها وسحب موافقتك وحذفها ونقلها، وتقديم شكوى إلى لجنة الوصول إلى المعلومات في كيبيك.",
      "نحتفظ بالسجلات الضريبية والمالية المدة التي يفرضها القانون (6 سنوات عموماً في كيبيك).",
      `للتواصل: ${LEGAL_COMPANY.email} — مسؤول حماية المعلومات الشخصية، ${LEGAL_COMPANY.legalName}، ${LEGAL_COMPANY.address}.`
    ]
  }
];

export const workerTermsArabic: readonly LegalBlock[] = [
  { kind: "p", text: AR_NOTICE },
  { kind: "h2", text: "ملخّص شروط الاستخدام" },
  {
    kind: "ul",
    items: [
      "يجب أن يكون عمرك 18 سنة أو أكثر، وأن تقدّم معلومات صحيحة.",
      "المناوبات القصيرة: أول عامل مؤهَّل يحجز المناوبة يحصل عليها، وتدفع لك جوب‑لوب أجرها حسب اتفاقية العامل (موظف أو عامل مستقل).",
      "إلغاء مناوبة مؤكدة قبل أقل من 24 ساعة قد يؤدي إلى إيقاف الحساب 7 أيام في المرة الأولى وإغلاقه في المرة الثانية، بعد مراجعة موظف.",
      "الوظائف طويلة الأمد: صاحب العمل يوظّفك ويدفع لك مباشرة، وجوب‑لوب ليست صاحبة العمل.",
      "Worker Pro اختياري: 12.99 دولاراً كندياً شهرياً، مع تجربة مجانية لمدة 14 يوماً مرة واحدة، ولا يتجدد تلقائياً.",
      "تخضع هذه الشروط لقوانين كيبيك. يمكنك طلب حذف حسابك في أي وقت من صفحة «حذف الحساب»."
    ]
  },
  { kind: "links", links: [{ href: "/account-deletion", label: "حذف الحساب" }] }
];

export const accountDeletionArabic: readonly LegalBlock[] = [
  { kind: "p", text: AR_NOTICE },
  { kind: "h2", text: "كيف تطلب حذف حسابك" },
  {
    kind: "ol",
    items: [
      `أرسل رسالة إلى ${LEGAL_COMPANY.email} من البريد الإلكتروني المسجّل في حسابك، بعنوان «Delete my account».`,
      "اذكر الاسم المسجّل في الحساب لنتأكد من هويتك.",
      "نتحقق من الطلب ونحذف الحساب خلال 30 يوماً، ونؤكد لك ذلك بالبريد الإلكتروني."
    ]
  },
  {
    kind: "p",
    text: "قد نحتفظ ببعض السجلات التي يفرضها القانون (مثل سجلات العمل والأجور والضرائب) للمدة القانونية، ثم تُحذف أو تُجعل مجهولة الهوية."
  }
];
