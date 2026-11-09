// DRAFT — must be reviewed by a Québec lawyer before relying on it.
// Privacy Policy section 10 ("What is new in this version"), shared by the worker and employer
// sites. It is ADDED after the approved October 26, 2026 text (sections 1 to 9); it does not
// rewrite it. Every fact here was checked against the code; see docs/legal/LEGAL_REVIEW_NOTES.md.
import { LEGAL_COMPANY, LEGAL_EFFECTIVE_DATE, type LegalBlock } from "./legalDocuments";

export type LegalAudience = "worker" | "employer";

const officer = (lang: "en" | "fr") =>
  lang === "en"
    ? `Privacy Officer, ${LEGAL_COMPANY.legalName}, ${LEGAL_COMPANY.address}, Canada. Email: ${LEGAL_COMPANY.email}.`
    : `Responsable de la protection des renseignements personnels, ${LEGAL_COMPANY.legalName}, ${LEGAL_COMPANY.address}, Canada. Courriel : ${LEGAL_COMPANY.email}.`;

function providerRows(audience: LegalAudience, lang: "en" | "fr"): string[][] {
  const en = lang === "en";
  const rows: string[][] = [
    en
      ? ["Render", "Cloud hosting of our websites, servers and stored files", "All the data we store"]
      : ["Render", "Hébergement infonuagique de nos sites, serveurs et fichiers", "Toutes les données que nous conservons"],
    en
      ? ["Brevo", "Text messages (sign-in codes, shift notices) and service emails (invoices, receipts, job alerts, replies from Joblop)", "Mobile number, email address, message content"]
      : ["Brevo", "Messages texte (codes de connexion, avis de quart) et courriels de service (factures, reçus, alertes d’emploi, réponses de Joblop)", "Numéro de cellulaire, adresse courriel, contenu du message"],
    en
      ? [
          "Anthropic (Claude)",
          audience === "worker"
            ? "AI that answers Contact Joblop messages first and drafts replies for Joblop staff; the Worker Pro CV builder; an automated pre-check of some uploaded documents"
            : "AI that answers Contact Joblop messages first and drafts replies for Joblop staff",
          audience === "worker"
            ? "Your message, with contact details such as phone numbers, email addresses and addresses masked first; your CV content; for the document pre-check, an image of the document"
            : "Your message, with contact details such as phone numbers, email addresses and addresses masked first"
        ]
      : [
          "Anthropic (Claude)",
          audience === "worker"
            ? "IA qui répond en premier aux messages « Joindre Joblop » et rédige des brouillons de réponse pour le personnel de Joblop; le générateur de CV Worker Pro; une vérification automatisée préalable de certains documents téléversés"
            : "IA qui répond en premier aux messages « Joindre Joblop » et rédige des brouillons de réponse pour le personnel de Joblop",
          audience === "worker"
            ? "Votre message, après masquage des coordonnées comme les numéros de téléphone, les adresses courriel et les adresses; le contenu de votre CV; pour la vérification préalable, une image du document"
            : "Votre message, après masquage des coordonnées comme les numéros de téléphone, les adresses courriel et les adresses"
        ],
    en
      ? ["Expo (with Apple and Google push services)", "Push notifications in the Joblop phone app", "Device notification token, notification text"]
      : ["Expo (avec les services de notification d’Apple et de Google)", "Notifications poussées dans l’application mobile Joblop", "Jeton de notification de l’appareil, texte de la notification"],
    en
      ? ["Google Maps Platform", "Turning postal codes and addresses into map locations, maps and driving times", "Postal codes, addresses"]
      : ["Google Maps Platform", "Conversion des codes postaux et des adresses en positions, cartes et temps de route", "Codes postaux, adresses"],
    en
      ? ["Stripe", "Card payments, when card payments are available", "The payment details you enter on Stripe’s secure form (Joblop does not see your full card number)"]
      : ["Stripe", "Paiements par carte, lorsque ce mode de paiement est offert", "Les données de paiement saisies dans le formulaire sécurisé de Stripe (Joblop ne voit pas le numéro complet de votre carte)"]
  ];
  if (audience === "employer") {
    rows.push(
      en
        ? ["OpenStreetMap (Nominatim)", "Finding the address of a worksite as you type it", "The address you type"]
        : ["OpenStreetMap (Nominatim)", "Recherche de l’adresse d’un lieu de travail pendant la saisie", "L’adresse saisie"],
      en
        ? ["Your browser’s speech service (Google or Apple)", "The optional “Speak” voice-typing button on the request form", "What you say while the button is on"]
        : ["Le service vocal de votre navigateur (Google ou Apple)", "Le bouton facultatif « Parler » (saisie vocale) du formulaire de demande", "Ce que vous dites pendant que le bouton est actif"]
    );
  }
  return rows;
}

export function privacyAdditions(audience: LegalAudience, lang: "en" | "fr"): readonly LegalBlock[] {
  const en = lang === "en";
  const blocks: LegalBlock[] = [
    {
      kind: "h2",
      id: "whats-new",
      text: en
        ? `10. What is new in this version (effective ${LEGAL_EFFECTIVE_DATE})`
        : `10. Nouveautés de cette version (en vigueur le ${LEGAL_EFFECTIVE_DATE})`
    },
    {
      kind: "p",
      text: en
        ? "This section adds to sections 1 to 9. If anything in this section is different from sections 1 to 9, this section applies."
        : "La présente section s’ajoute aux sections 1 à 9. Si un élément de la présente section diffère des sections 1 à 9, la présente section s’applique."
    },
    { kind: "h3", text: en ? "10.1 Person in charge of protecting your personal information" : "10.1 Personne responsable de la protection de vos renseignements personnels" },
    {
      kind: "p",
      text: en
        ? `The person in charge of the protection of personal information at Joblop is the company’s highest-ranking officer, acting as: ${officer("en")} Send any question, request or complaint about your personal information there.`
        : `La personne responsable de la protection des renseignements personnels chez Joblop est la personne ayant la plus haute autorité au sein de l’entreprise, qui agit à titre de : ${officer("fr")} Adressez-y toute question, demande ou plainte concernant vos renseignements personnels.`
    },
    { kind: "h3", text: en ? "10.2 More service providers" : "10.2 Autres fournisseurs de services" },
    {
      kind: "p",
      text: en
        ? "In addition to the providers in section 3, we use these service providers. They process personal information only on our instructions and only to provide their service to us."
        : "En plus des fournisseurs de la section 3, nous faisons appel aux fournisseurs de services suivants. Ils traitent les renseignements personnels uniquement selon nos instructions et seulement pour nous fournir leur service."
    },
    {
      kind: "table",
      head: en ? ["Provider", "Purpose", "Data involved"] : ["Fournisseur", "Fin", "Données concernées"],
      rows: providerRows(audience, lang)
    },
    {
      kind: "p",
      text: en
        ? "Google Analytics (section 3) is used only when we turn it on for a site. It then places Google’s own cookies in your browser."
        : "Google Analytics (section 3) est utilisé seulement lorsque nous l’activons pour un site. Il dépose alors ses propres témoins (cookies) dans votre navigateur."
    }
  ];
  if (audience === "employer") {
    blocks.push({
      kind: "p",
      text: en
        ? "The “Speak” button: when you press it, your browser sends what you say to its own speech service (Google for Chrome, Apple for Safari) to turn it into text. Joblop does not receive or keep the audio, only the text that appears in the box. Do not say personal details you would not type. If you do not want this, type instead; the button is never required."
        : "Le bouton « Parler » : lorsque vous l’activez, votre navigateur envoie ce que vous dites à son propre service vocal (Google pour Chrome, Apple pour Safari) pour le transformer en texte. Joblop ne reçoit ni ne conserve l’audio, seulement le texte qui apparaît dans la case. Ne dites pas de renseignements personnels que vous ne taperiez pas. Si vous ne le souhaitez pas, tapez plutôt le texte; le bouton n’est jamais obligatoire."
    });
  }
  blocks.push(
    { kind: "h3", text: en ? "10.3 AI and automated decisions" : "10.3 IA et décisions automatisées" },
    {
      kind: "p",
      text: en
        ? "Joblop does not make any decision about hiring, pay or your account based only on automated processing. The AI answers questions, writes drafts and makes suggestions. A Joblop staff member reviews and decides anything that matters, such as approving a document, settling a dispute or acting on an account. Messages about safety, disputes or your account, and any message where you ask for a person, go to a person."
        : "Joblop ne prend aucune décision concernant l’embauche, la rémunération ou votre compte fondée uniquement sur un traitement automatisé. L’IA répond aux questions, rédige des brouillons et fait des suggestions. Un membre du personnel de Joblop examine et décide de tout ce qui est important, comme approuver un document, régler un différend ou intervenir sur un compte. Les messages portant sur la sécurité, un différend ou votre compte, ainsi que tout message où vous demandez une personne, sont transmis à une personne."
    }
  );
  if (audience === "worker") {
    blocks.push(
      {
        kind: "p",
        text: en
          ? "How many Joblop jobs you see in a search depends on how complete the documents in your profile are. This never blocks you from taking a job you can see. Short-term shifts on the shared calendar go to the first eligible worker who claims them."
          : "Le nombre d’emplois Joblop affichés dans une recherche dépend de l’état complet des documents de votre profil. Cela ne vous empêche jamais de prendre un emploi que vous voyez. Les quarts à court terme du calendrier partagé sont attribués au premier travailleur admissible qui les réclame."
      },
      { kind: "h3", text: en ? "10.4 Documents you upload" : "10.4 Documents que vous téléversez" },
      {
        kind: "p",
        text: en
          ? "On the Documents page you can upload documents such as proof of work authorization, identity documents, your CV, licences, certificates, first-aid cards, Québec health-care documents, a photo, your social insurance number and a void cheque. We use them to check that you can work, to set up your pay and to show you suitable jobs. Only you and authorized Joblop HR staff can see them. Employers do not see your uploaded documents."
          : "Sur la page Documents, vous pouvez téléverser des documents comme une preuve d’autorisation de travail, des pièces d’identité, votre CV, des permis, des certificats, des cartes de premiers soins, des documents de santé du Québec, une photo, votre numéro d’assurance sociale et un chèque annulé. Nous les utilisons pour vérifier que vous pouvez travailler, pour établir votre paie et pour vous montrer des emplois qui vous conviennent. Seuls vous et le personnel autorisé des ressources humaines de Joblop pouvez les voir. Les employeurs ne voient pas vos documents téléversés."
      },
      {
        kind: "p",
        text: en
          ? "For a CV, certificate, photo or first-aid card, an image of the document may be sent to Anthropic for an automated pre-check (for example, whether it is readable). A Joblop staff member always makes the decision. Identity documents, social insurance numbers, licences, work authorizations, health documents and void cheques are never sent for this pre-check."
          : "Pour un CV, un certificat, une photo ou une carte de premiers soins, une image du document peut être envoyée à Anthropic pour une vérification automatisée préalable (par exemple, pour savoir s’il est lisible). Un membre du personnel de Joblop prend toujours la décision. Les pièces d’identité, les numéros d’assurance sociale, les permis, les autorisations de travail, les documents de santé et les chèques annulés ne sont jamais envoyés pour cette vérification."
      }
    );
  } else {
    blocks.push(
      { kind: "h3", text: en ? "10.4 Information about your business" : "10.4 Renseignements sur votre entreprise" },
      {
        kind: "p",
        text: en
          ? "For employer accounts we also keep your company’s name and contact details, worksite addresses, the people you add to your account, your requests, orders, timesheet approvals, invoices, plan and listing orders and payment records. We use them to provide the service, bill you and meet our tax obligations."
          : "Pour les comptes employeurs, nous conservons aussi le nom et les coordonnées de votre entreprise, les adresses des lieux de travail, les personnes que vous ajoutez à votre compte, vos demandes, commandes, approbations de feuilles de temps, factures, commandes de forfaits et d’annonces et dossiers de paiement. Nous les utilisons pour fournir le service, vous facturer et respecter nos obligations fiscales."
      }
    );
  }
  blocks.push(
    { kind: "h3", text: en ? "10.5 Processing outside Québec" : "10.5 Traitement à l’extérieur du Québec" },
    {
      kind: "p",
      text: en
        ? "Your personal information may be stored or processed outside Québec, including in the United States and other countries where our service providers (such as Render, Brevo, Anthropic, Expo, Google, Apple and Stripe) operate. The laws of those places may protect personal information differently. We share only what each provider needs, and we require them by contract to protect it."
        : "Vos renseignements personnels peuvent être conservés ou traités à l’extérieur du Québec, notamment aux États-Unis et dans d’autres pays où nos fournisseurs de services (comme Render, Brevo, Anthropic, Expo, Google, Apple et Stripe) exercent leurs activités. Les lois de ces endroits peuvent protéger les renseignements personnels différemment. Nous communiquons seulement ce dont chaque fournisseur a besoin et nous exigeons par contrat qu’il les protège."
    },
    { kind: "h3", text: en ? "10.6 Your rights under Québec law" : "10.6 Vos droits selon la loi du Québec" },
    {
      kind: "ul",
      items: en
        ? [
            "Access: ask what personal information we hold about you and get a copy.",
            "Correction: ask us to correct information that is wrong, incomplete or out of date.",
            "Withdrawal of consent: withdraw your consent to a use of your information, subject to legal or contractual limits.",
            "Deletion: ask us to delete your information, or to stop sharing it, when the law allows.",
            "Portability: ask for the information you gave us in a structured, commonly used technological format, for you or for an organization you name.",
            "Automated processing: ask how a decision about you was made and have a person review it.",
            "Complaint: if you are not satisfied with our answer, you may complain to the Commission d’accès à l’information du Québec (www.cai.gouv.qc.ca)."
          ]
        : [
            "Accès : demander quels renseignements personnels nous détenons à votre sujet et en obtenir une copie.",
            "Rectification : nous demander de corriger des renseignements inexacts, incomplets ou périmés.",
            "Retrait du consentement : retirer votre consentement à une utilisation de vos renseignements, sous réserve des limites légales ou contractuelles.",
            "Suppression : nous demander de supprimer vos renseignements, ou de cesser de les communiquer, lorsque la loi le permet.",
            "Portabilité : obtenir les renseignements que vous nous avez fournis dans un format technologique structuré et couramment utilisé, pour vous ou pour une organisation que vous désignez.",
            "Traitement automatisé : demander comment une décision vous concernant a été prise et la faire réviser par une personne.",
            "Plainte : si notre réponse ne vous satisfait pas, vous pouvez porter plainte auprès de la Commission d’accès à l’information du Québec (www.cai.gouv.qc.ca)."
          ]
    },
    {
      kind: "p",
      text: en
        ? `To use any of these rights, write to ${LEGAL_COMPANY.email}. We may ask you to confirm your identity. We answer within 30 days.`
        : `Pour exercer l’un de ces droits, écrivez à ${LEGAL_COMPANY.email}. Nous pouvons vous demander de confirmer votre identité. Nous répondons dans un délai de 30 jours.`
    },
    { kind: "h3", text: en ? "10.7 How long we keep information" : "10.7 Durée de conservation" },
    {
      kind: "p",
      text: en
        ? "We keep your information as long as your account is active. After your account is closed, we keep invoices, payment, pay and tax records for as long as tax law requires (in Québec, generally 6 years after the end of the year they relate to), then delete or anonymize them. Sign-in codes expire after 10 minutes, and a signed-in session ends after 8 hours."
        : "Nous conservons vos renseignements tant que votre compte est actif. Après la fermeture de votre compte, nous conservons les factures et les dossiers de paiement, de paie et fiscaux aussi longtemps que l’exigent les lois fiscales (au Québec, généralement 6 ans après la fin de l’année à laquelle ils se rapportent), puis nous les supprimons ou les anonymisons. Les codes de connexion expirent après 10 minutes et une session ouverte prend fin après 8 heures."
    },
    { kind: "h3", text: en ? "10.8 Cookies and similar storage" : "10.8 Témoins (cookies) et stockage semblable" },
    {
      kind: "ul",
      items: en
        ? [
            "A sign-in cookie that keeps you signed in (needed for the site to work).",
            ...(audience === "employer" ? ["A cookie that remembers which company you are working in (needed for the site to work)."] : []),
            "A language cookie that remembers your language for one year.",
            "If you sign in with Google, a short cookie (10 minutes) that protects the sign-in.",
            "Storage in your browser for drafts and small preferences, which stays on your device.",
            "Google Analytics cookies, only when Google Analytics is turned on (see 10.2)."
          ]
        : [
            "Un témoin de connexion qui vous garde connecté (nécessaire au fonctionnement du site).",
            ...(audience === "employer" ? ["Un témoin qui retient l’entreprise dans laquelle vous travaillez (nécessaire au fonctionnement du site)."] : []),
            "Un témoin de langue qui retient votre langue pendant un an.",
            "Si vous vous connectez avec Google, un témoin de courte durée (10 minutes) qui protège la connexion.",
            "Un stockage dans votre navigateur pour les brouillons et de petites préférences, qui reste sur votre appareil.",
            "Les témoins de Google Analytics, seulement lorsque Google Analytics est activé (voir 10.2)."
          ]
    },
    { kind: "h3", text: en ? "10.9 Messages we send you" : "10.9 Messages que nous vous envoyons" },
    {
      kind: "p",
      text: en
        ? audience === "worker"
          ? "We send sign-in codes and urgent shift notices by text message, and pay notices and replies by email. Job alerts by email are sent only if you sign up for them, at most about once a day, and every alert has an unsubscribe link. The phone app can send push notifications; you can turn them off in your phone’s settings. Reply STOP to stop text messages."
          : "We send sign-in codes by text message, and invoices, receipts, request updates and replies by email. Reply STOP to stop text messages; sign-in codes will then no longer reach you."
        : audience === "worker"
          ? "Nous envoyons les codes de connexion et les avis de quart urgents par message texte, et les avis de paie et les réponses par courriel. Les alertes d’emploi par courriel sont envoyées seulement si vous vous y abonnez, au plus environ une fois par jour, et chaque alerte contient un lien de désabonnement. L’application mobile peut envoyer des notifications poussées; vous pouvez les désactiver dans les réglages de votre téléphone. Répondez STOP pour ne plus recevoir de messages texte."
          : "Nous envoyons les codes de connexion par message texte, et les factures, les reçus, les mises à jour de vos demandes et les réponses par courriel. Répondez STOP pour ne plus recevoir de messages texte; les codes de connexion ne vous parviendront alors plus."
    },
    { kind: "h3", text: en ? "10.10 Age" : "10.10 Âge" },
    {
      kind: "p",
      text: en
        ? "Joblop is only for people 18 years of age or older. Do not create an account if you are under 18."
        : "Joblop s’adresse uniquement aux personnes de 18 ans ou plus. Ne créez pas de compte si vous avez moins de 18 ans."
    },
    { kind: "h3", text: en ? "10.11 Security incidents" : "10.11 Incidents de confidentialité" },
    {
      kind: "p",
      text: en
        ? "If a confidentiality incident involving your personal information creates a risk of serious injury, we will notify you and the Commission d’accès à l’information as the law requires."
        : "Si un incident de confidentialité touchant vos renseignements personnels présente un risque de préjudice sérieux, nous vous en aviserons, ainsi que la Commission d’accès à l’information, comme l’exige la loi."
    },
    { kind: "h3", text: en ? "10.12 Language" : "10.12 Langue" },
    {
      kind: "p",
      text: en
        ? "This policy is published in French and in English, and both versions have the same value. The Arabic page is a summary for convenience only; the French and English versions govern."
        : "La présente politique est publiée en français et en anglais, et les deux versions ont la même valeur. La page en arabe est un résumé fourni pour votre commodité seulement; les versions française et anglaise prévalent."
    }
  );
  return blocks;
}
