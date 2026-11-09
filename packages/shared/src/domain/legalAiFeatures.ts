// Reviewed and accepted by the owner's Québec lawyer (2026-11-09). See docs/legal/LEGAL_REVIEW_NOTES.md before changing any wording.
// Privacy Policy section 11 ("Artificial intelligence (AI) features"), shared by the worker and employer
// sites. It is ADDED after sections 1 to 10; it does not rewrite them. Every fact here was checked
// against the code on 2026-11-11 (launch step 6):
//   - apps/api/src/outsideAi.ts: the one door to Anthropic. Features: contact_chat, staff_assistant,
//     cv_builder. Text only (images, documents and base64 are refused), health text is refused,
//     20 s timeout, kill switch AI_OUTSIDE_CALLS=disabled, logs hold metadata only.
//   - apps/api/src/instantContact.ts + instantContactRoutes.ts: chat facts (first name, own records),
//     health / safety / dispute / account / "a person" messages go to staff without the AI.
//   - apps/api/src/cvBuilderClaude.ts: name, email and phone never sent; basic offline CV on any failure.
//   - apps/api/src/documentAiReview.ts: no document or image is sent anywhere; a person decides.
//   - apps/employer/.../DictationButton.tsx: browser Web Speech API, no request to Joblop's servers.
// See docs/legal/LEGAL_REVIEW_NOTES.md section 5.
import { LEGAL_COMPANY, type LegalBlock } from "./legalDocuments";
import type { LegalAudience } from "./legalPrivacyAdditions";

const officer = (lang: "en" | "fr") =>
  lang === "en"
    ? `Privacy Officer, ${LEGAL_COMPANY.legalName}, ${LEGAL_COMPANY.address}, Canada. Email: ${LEGAL_COMPANY.email}.`
    : `Responsable de la protection des renseignements personnels, ${LEGAL_COMPANY.legalName}, ${LEGAL_COMPANY.address}, Canada. Courriel : ${LEGAL_COMPANY.email}.`;

/** Privacy Policy section 11, in English or French. Same blocks, in the same order, in both languages. */
export function aiFeaturesSection(audience: LegalAudience, lang: "en" | "fr"): readonly LegalBlock[] {
  const en = lang === "en";
  const worker = audience === "worker";
  let n = 0;
  const h3 = (enText: string, frText: string): LegalBlock => {
    n += 1;
    return { kind: "h3", text: `11.${n} ${en ? enText : frText}` };
  };

  const blocks: LegalBlock[] = [
    {
      kind: "h2",
      id: "ai-features",
      text: en ? "11. Artificial intelligence (AI) features" : "11. Fonctions d’intelligence artificielle (IA)"
    },
    {
      kind: "p",
      text: en
        ? "This section explains when Joblop uses artificial intelligence (AI) and what happens to your information. It adds to sections 1 to 10. If anything in this section is different from sections 1 to 10, this section applies."
        : "La présente section explique quand Joblop utilise l’intelligence artificielle (IA) et ce qu’il advient de vos renseignements. Elle s’ajoute aux sections 1 à 10. Si un élément de la présente section diffère des sections 1 à 10, la présente section s’applique."
    },
    h3("Features that may use an outside AI provider", "Fonctions qui peuvent utiliser un fournisseur d’IA externe"),
    {
      kind: "p",
      text: en
        ? "These features may send text to Anthropic, an AI company in the United States (its AI is called Claude):"
        : "Les fonctions suivantes peuvent envoyer du texte à Anthropic, une entreprise d’IA située aux États-Unis (son IA s’appelle Claude) :"
    },
    {
      kind: "ul",
      items: [
        en
          ? `The “Contact Joblop” chat assistant${worker ? ", on the website and in the phone app" : ""}. It answers your message first. If it cannot help, a person on the Joblop team takes over.`
          : `L’assistant de clavardage « Contacter Joblop »${worker ? ", sur le site Web et dans l’application mobile" : ""}. Il répond en premier à votre message. S’il ne peut pas vous aider, une personne de l’équipe Joblop prend le relais.`,
        en
          ? "The staff assistant. When a Joblop staff member answers your message, they can ask the AI to suggest a reply. The staff member reads the suggestion and decides what to send."
          : "L’assistant du personnel. Lorsqu’un membre du personnel de Joblop répond à votre message, il peut demander à l’IA de suggérer une réponse. Le membre du personnel lit la suggestion et décide de ce qui est envoyé.",
        ...(worker
          ? [
              en
                ? "The CV and cover-letter builder for Worker Pro members, and the same builder when Joblop staff prepare a CV for you. Free members get a basic CV made by Joblop’s own software, with no outside AI."
                : "Le générateur de CV et de lettre de présentation pour les membres Worker Pro, ainsi que le même générateur lorsque le personnel de Joblop prépare un CV pour vous. Les membres gratuits reçoivent un CV de base produit par le logiciel de Joblop, sans IA externe."
            ]
          : [])
      ]
    },
    {
      kind: "p",
      text: en
        ? "No other Joblop feature sends your information to an outside AI. Document checks, job matching, search results, pay and invoices do not use an outside AI."
        : "Aucune autre fonction de Joblop n’envoie vos renseignements à une IA externe. La vérification des documents, le jumelage des emplois, les résultats de recherche, la paie et la facturation n’utilisent pas d’IA externe."
    }
  ];

  if (!worker) {
    blocks.push(h3("The “Speak” button", "Le bouton « Parler »"), {
      kind: "p",
      text: en
        ? "The optional “Speak” button on the request form does not use Joblop’s servers or Anthropic. It uses the speech recognition built into your browser or device (for example Google in Chrome, Apple in Safari). Your voice goes directly from your browser to that company, under its own privacy terms. Joblop receives only the text that appears in the box, when you save the form. You can always type instead."
        : "Le bouton facultatif « Parler » du formulaire de demande n’utilise ni les serveurs de Joblop ni Anthropic. Il utilise la reconnaissance vocale intégrée à votre navigateur ou à votre appareil (par exemple Google dans Chrome, Apple dans Safari). Votre voix est transmise directement de votre navigateur à cette entreprise, selon ses propres conditions de confidentialité. Joblop reçoit seulement le texte qui apparaît dans la case, lorsque vous enregistrez le formulaire. Vous pouvez toujours taper le texte à la place."
    });
  }

  blocks.push(
    h3("What is sent", "Ce qui est envoyé"),
    {
      kind: "p",
      text: en ? "Only the text needed for the request is sent:" : "Seul le texte nécessaire à la demande est envoyé :"
    },
    {
      kind: "ul",
      items: [
        en
          ? `For the chat assistant: your message, the earlier messages in the same conversation, the topic you chose, and a short summary of your own Joblop records needed to answer (${worker ? "for example your first name, your recent shifts and their city, your timesheets, your pay statement totals and the status of your documents" : "for example your company name, your recent requests and orders, your timesheets and your invoice totals"}).`
          : `Pour l’assistant de clavardage : votre message, les messages précédents de la même conversation, le sujet choisi et un court résumé de vos propres dossiers Joblop nécessaires pour répondre (${worker ? "par exemple votre prénom, vos quarts récents et leur ville, vos feuilles de temps, les totaux de vos relevés de paie et l’état de vos documents" : "par exemple le nom de votre entreprise, vos demandes et commandes récentes, vos feuilles de temps et les totaux de vos factures"}).`,
        en
          ? "For the staff assistant: the staff member’s question and the recent messages of your conversation."
          : "Pour l’assistant du personnel : la question du membre du personnel et les messages récents de votre conversation.",
        ...(worker
          ? [
              en
                ? "For the CV builder: the CV details you enter (such as your headline, area, experience, skills, languages, certifications and education) and, if you choose one, the job you are applying for."
                : "Pour le générateur de CV : les renseignements du CV que vous saisissez (comme votre titre, votre région, votre expérience, vos compétences, vos langues, vos certifications et votre formation) et, si vous en choisissez un, l’emploi visé."
            ]
          : [])
      ]
    },
    {
      kind: "p",
      text: en
        ? `Before anything is sent, Joblop’s software automatically masks or removes email addresses, phone numbers, street addresses and postal codes, social insurance numbers, bank account and card numbers, dates of birth, health-card, passport and driver’s licence numbers, and health details. Your full name, email address and phone number from your account are not sent: ${worker ? "the chat assistant sees only your first name, and the CV builder adds your name and contact details back on Joblop’s side after the AI is done" : "the chat assistant sees your company name, not your own name"}. Masking is automatic and may miss something, so please do not type private details, or other people’s names, that your request does not need.`
        : `Avant tout envoi, le logiciel de Joblop masque ou retire automatiquement les adresses courriel, les numéros de téléphone, les adresses et codes postaux, les numéros d’assurance sociale, les numéros de compte bancaire et de carte, les dates de naissance, les numéros de carte d’assurance maladie, de passeport et de permis de conduire, ainsi que les renseignements de santé. Votre nom complet, votre adresse courriel et votre numéro de téléphone inscrits à votre compte ne sont pas envoyés : ${worker ? "l’assistant de clavardage voit seulement votre prénom, et le générateur de CV ajoute votre nom et vos coordonnées du côté de Joblop une fois le travail de l’IA terminé" : "l’assistant de clavardage voit le nom de votre entreprise, et non votre propre nom"}. Le masquage est automatique et peut laisser passer un élément; veuillez donc ne pas taper de renseignements privés, ni le nom d’autres personnes, dont votre demande n’a pas besoin.`
    },
    {
      kind: "p",
      text: en
        ? `No document, photo, scan or other image is ever sent to an outside AI; our software blocks it.${worker ? " The document pre-check described in section 10.4 no longer uses AI: a Joblop staff member checks your documents." : ""}`
        : `Aucun document, aucune photo, aucune numérisation ni aucune autre image n’est jamais envoyé à une IA externe; notre logiciel le bloque.${worker ? " La vérification préalable des documents décrite à la section 10.4 n’utilise plus l’IA : un membre du personnel de Joblop vérifie vos documents." : ""}`
    },
    {
      kind: "p",
      text: en
        ? `If a message mentions health (for example an illness, an injury, a pregnancy or a sick note), it is not sent to the AI. It goes straight to a person on the Joblop team. Messages about safety, a dispute or your account also go to a person.${worker ? " If CV details still mention health after masking, the AI is not used and you get the basic CV." : ""}`
        : `Si un message mentionne la santé (par exemple une maladie, une blessure, une grossesse ou un billet médical), il n’est pas envoyé à l’IA. Il est transmis directement à une personne de l’équipe Joblop. Les messages portant sur la sécurité, un différend ou votre compte sont aussi transmis à une personne.${worker ? " Si les renseignements du CV mentionnent encore la santé après le masquage, l’IA n’est pas utilisée et vous recevez le CV de base." : ""}`
    },
    h3("What AI does not do", "Ce que l’IA ne fait pas"),
    {
      kind: "p",
      text: en
        ? `AI does not make decisions about hiring, pay or the status of your account. No decision about you is based only on automated processing by AI (Québec’s Act respecting the protection of personal information in the private sector, section 12.1). The AI cannot change ${worker ? "your pay, your shifts or your account" : "your requests, your invoices or your account"}: it only answers, drafts and suggests. ${worker ? "Joblop staff review documents, settle disputes and decide anything that matters to you." : "Joblop staff settle disputes and decide anything that matters to you."}`
        : `L’IA ne prend aucune décision concernant l’embauche, la rémunération ou l’état de votre compte. Aucune décision vous concernant n’est fondée uniquement sur un traitement automatisé par l’IA (Loi sur la protection des renseignements personnels dans le secteur privé du Québec, article 12.1). L’IA ne peut pas modifier ${worker ? "votre rémunération, vos quarts ou votre compte" : "vos demandes, vos factures ou votre compte"} : elle répond, rédige et suggère seulement. ${worker ? "Le personnel de Joblop examine les documents, règle les différends et décide de tout ce qui est important pour vous." : "Le personnel de Joblop règle les différends et décide de tout ce qui est important pour vous."}`
    },
    h3("Where the information goes and how long it is kept", "Où vont les renseignements et combien de temps ils sont conservés"),
    {
      kind: "p",
      text: en
        ? "Anthropic processes the text in the United States, outside Québec. Under our agreement with the provider, Anthropic does not use this information to train its AI models. How long Anthropic keeps the text is set by its terms with us."
        : "Anthropic traite le texte aux États-Unis, à l’extérieur du Québec. Selon notre entente avec le fournisseur, Anthropic n’utilise pas ces renseignements pour entraîner ses modèles d’IA. La durée pendant laquelle Anthropic conserve le texte est fixée par ses conditions avec nous."
    },
    {
      kind: "p",
      text: en
        ? `Joblop does not keep a separate copy of what is sent to the AI. Our records of AI use show only which feature was used, by which account, when, and the result (for example, whether it worked). They do not contain the text sent or received. What stays in your account is kept like any other content: your Contact Joblop conversation, including the assistant’s answers${worker ? ", and your latest CV" : ""}.`
        : `Joblop ne conserve pas de copie distincte de ce qui est envoyé à l’IA. Nos registres d’utilisation de l’IA indiquent seulement la fonction utilisée, le compte, le moment et le résultat (par exemple, si la demande a fonctionné). Ils ne contiennent pas le texte envoyé ou reçu. Ce qui reste dans votre compte est conservé comme tout autre contenu : votre conversation « Contacter Joblop », y compris les réponses de l’assistant${worker ? ", et votre dernier CV" : ""}.`
    },
    h3("You can always talk to a person", "Vous pouvez toujours parler à une personne"),
    {
      kind: "p",
      text: en
        ? `You never have to use the AI. In the chat, write that you want to talk to a person (for example “I want to talk to a person”) and your message goes to the Joblop team.${worker ? " You can also write your CV yourself." : ""} For any question about AI and your personal information, or to ask a person to review something the AI did, contact: ${officer("en")}`
        : `Vous n’êtes jamais obligé d’utiliser l’IA. Dans le clavardage, écrivez que vous voulez parler à une personne (par exemple « Je veux parler à une personne ») et votre message est transmis à l’équipe Joblop.${worker ? " Vous pouvez aussi rédiger votre CV vous-même." : ""} Pour toute question sur l’IA et vos renseignements personnels, ou pour demander qu’une personne révise ce que l’IA a fait, communiquez avec : ${officer("fr")}`
    },
    h3("Turning AI off", "Désactivation de l’IA"),
    {
      kind: "p",
      text: en
        ? `Joblop can turn off all outside AI features at any time. The service then keeps working without them: chat messages go straight to a person on the Joblop team${worker ? ", and the CV builder gives you a basic CV made by Joblop’s own software" : ""}. The same happens if the AI is slow or unavailable.`
        : `Joblop peut désactiver toutes les fonctions d’IA externe en tout temps. Le service continue alors de fonctionner sans elles : les messages du clavardage sont transmis directement à une personne de l’équipe Joblop${worker ? ", et le générateur de CV vous remet un CV de base produit par le logiciel de Joblop" : ""}. Il en va de même si l’IA est lente ou non disponible.`
    }
  );
  return blocks;
}

/** One Arabic summary line for section 11 (the French and English versions govern). */
export const AI_FEATURES_ARABIC_SUMMARY: Readonly<Record<LegalAudience, string>> = {
  worker:
    "الذكاء الاصطناعي (القسم 11): قد يُرسَل نص مساعد «تواصل مع Joblop» ومساعد الموظفين ومنشئ السيرة الذاتية إلى Anthropic في الولايات المتحدة بعد إخفاء بيانات الاتصال والمعلومات الصحية. لا تُرسَل أي وثيقة أو صورة. لا يتخذ الذكاء الاصطناعي قرارات بشأن التوظيف أو الأجر أو حسابك، ويمكنك دائماً طلب التحدث إلى شخص.",
  employer:
    "الذكاء الاصطناعي (القسم 11): قد يُرسَل نص مساعد «تواصل مع Joblop» ومساعد الموظفين إلى Anthropic في الولايات المتحدة بعد إخفاء بيانات الاتصال والمعلومات الصحية. لا تُرسَل أي وثيقة أو صورة. زر «تحدّث» يستخدم خدمة الكلام في متصفحك وليس خوادم جوب‑لوب. لا يتخذ الذكاء الاصطناعي قرارات بشأن التوظيف أو الأجر أو حسابك، ويمكنك دائماً طلب التحدث إلى شخص."
};
