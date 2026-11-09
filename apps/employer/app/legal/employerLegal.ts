// DRAFT — must be reviewed by a Québec lawyer before relying on it.
// Employer Terms of Service and Privacy Policy. Built on the approved worker text of October 26,
// 2026 (apps/worker/app/legal/content.tsx): same structure and, where it fits employers, the same
// words. Every employer-specific change is listed in docs/legal/LEGAL_REVIEW_NOTES.md.
// Prices and rules match apps/employer/app/pricing/pricingContent.ts and the code it cites.
import { AI_FEATURES_ARABIC_SUMMARY, LEGAL_COMPANY, LEGAL_EFFECTIVE_DATE, privacyAdditions, type LegalBlock } from "@rwos/shared";

const ENTITY = LEGAL_COMPANY.legalName;
const CONTACT = LEGAL_COMPANY.email;

// ---------------------------------------------------------------------------------------------
// Privacy Policy
// ---------------------------------------------------------------------------------------------

const privacyEn: readonly LegalBlock[] = [
  {
    kind: "p",
    text: "Joblop is a staffing and job-matching platform operating in Québec and across Canada. This Privacy Policy explains what personal information we collect from employers and the people who use an employer account, how we use it, who we share it with, and the choices and rights you have. We handle personal information in accordance with Québec’s Act respecting the protection of personal information in the private sector (Law 25) and Canada’s PIPEDA."
  },
  { kind: "h2", text: "1. Information we collect" },
  { kind: "h3", text: "Account information" },
  {
    kind: "ul",
    items: [
      "Your name and email address (for invoices, receipts and messages from Joblop)",
      "Mobile number (to sign you in with a texted code)",
      "Your role in the company and the people you add to the company account"
    ]
  },
  { kind: "h3", text: "Company and worksite information" },
  {
    kind: "ul",
    items: [
      "Company name, address and contact details",
      "Worksite addresses and their map location, used to show jobs to nearby workers and to calculate travel charges",
      "Job requests, schedules, instructions and the long-term job listings you publish"
    ]
  },
  { kind: "h3", text: "Work and billing activity" },
  {
    kind: "ul",
    items: [
      "Orders, assignments, attendance and timesheet approvals",
      "Invoices, plan and listing orders, and records of your payments"
    ]
  },
  { kind: "h3", text: "Usage and device information" },
  {
    kind: "ul",
    items: [
      "Site activity (pages viewed, features used)",
      "Standard technical data (IP address, device/browser type) needed to deliver and secure the service"
    ]
  },
  {
    kind: "p",
    text: "We do not collect payment card details on our own servers. We do not knowingly collect information from anyone under 18; Joblop is intended for adults."
  },
  { kind: "h2", text: "2. How we use your information" },
  {
    kind: "ul",
    items: [
      "Create and secure your account and sign you in",
      "Match your requests with available workers near your worksite",
      "Operate scheduling, timesheets and work records",
      "Bill you, send invoices and receipts by email, and record payments",
      "Answer your messages through Contact Joblop",
      "Send service communications (e.g., confirmations and notices about your requests)",
      "Maintain, secure, debug and improve the platform",
      "Comply with legal obligations, including tax obligations"
    ]
  },
  { kind: "p", text: "We do not sell your personal information." },
  { kind: "h2", text: "3. Who we share information with" },
  {
    kind: "p",
    text: "Workers assigned to your shifts see the information they need to do the work, such as the company name, the worksite address, the schedule and your instructions. We also share limited personal information with service providers who process it only on our instructions to run the platform; they are listed in section 10.2, together with Google Analytics (usage analytics, only when turned on) and Render / Neon (secure hosting and database)."
  },
  {
    kind: "p",
    text: "We may also disclose information when required by law, to protect our rights or users’ safety, or in connection with a corporate transaction, with notice where required."
  },
  {
    kind: "p",
    text: "All the above categories exclude text messaging originator opt-in data and consent; this information won't be shared with any third parties."
  },
  { kind: "h2", text: "4. How long we keep it" },
  {
    kind: "p",
    text: "We keep personal information for as long as your account is active and as needed to provide the service, then for any period required to meet legal, tax or record-keeping obligations, after which it is deleted or anonymized."
  },
  { kind: "h2", text: "5. Security" },
  {
    kind: "p",
    text: "Data is encrypted in transit (HTTPS/TLS) and protected by access controls. You sign in with a code sent to your mobile number. No system is perfectly secure, but we take reasonable technical and organizational measures to protect your information."
  },
  { kind: "h2", text: "6. Your rights" },
  {
    kind: "p",
    text: `Subject to applicable law (including Québec Law 25 and PIPEDA), you may access the personal information we hold about you, correct inaccurate information, request deletion of your account and associated personal information, and withdraw consent to optional communications. To exercise any of these rights, contact ${CONTACT}. We will respond within the timelines required by law.`
  },
  { kind: "h2", text: "7. International processing" },
  {
    kind: "p",
    text: "Some service providers may process data outside Québec/Canada (e.g., in the United States). Where that happens, we take steps required by applicable law to protect your information."
  },
  { kind: "h2", text: "8. Changes to this policy" },
  {
    kind: "p",
    text: "We may update this policy from time to time. Material changes will be posted on this page with a new version and effective date."
  },
  { kind: "h2", text: "9. Contact" },
  { kind: "p", text: `Questions or requests: ${CONTACT} — ${ENTITY}` },
  { kind: "h3", text: "Closing your employer account" },
  {
    kind: "p",
    text: `To close your employer account and delete its personal information, email ${CONTACT} from the email address on the account, with the subject “Delete my account”. Tell us the company name so we can confirm it is you. We aim to finish within 30 days and confirm by email. Invoices, payment and tax records are kept for as long as tax law requires.`
  }
];

const privacyFr: readonly LegalBlock[] = [
  {
    kind: "p",
    text: "Joblop est une plateforme de placement de personnel et de jumelage d’emplois qui exerce ses activités au Québec et ailleurs au Canada. La présente politique de confidentialité explique quels renseignements personnels nous recueillons auprès des employeurs et des personnes qui utilisent un compte employeur, comment nous les utilisons, avec qui nous les communiquons, ainsi que les choix et les droits dont vous disposez. Nous traitons les renseignements personnels conformément à la Loi sur la protection des renseignements personnels dans le secteur privé du Québec (Loi 25) et à la LPRPDE du Canada."
  },
  { kind: "h2", text: "1. Renseignements que nous recueillons" },
  { kind: "h3", text: "Renseignements de compte" },
  {
    kind: "ul",
    items: [
      "Votre nom et votre adresse courriel (pour les factures, les reçus et les messages de Joblop)",
      "Numéro de cellulaire (pour vous connecter avec un code envoyé par texto)",
      "Votre rôle dans l’entreprise et les personnes que vous ajoutez au compte de l’entreprise"
    ]
  },
  { kind: "h3", text: "Renseignements sur l’entreprise et les lieux de travail" },
  {
    kind: "ul",
    items: [
      "Nom, adresse et coordonnées de l’entreprise",
      "Adresses des lieux de travail et leur position sur la carte, utilisées pour montrer les emplois aux travailleurs à proximité et pour calculer les frais de déplacement",
      "Demandes de travail, horaires, consignes et annonces d’emplois à long terme que vous publiez"
    ]
  },
  { kind: "h3", text: "Activité de travail et de facturation" },
  {
    kind: "ul",
    items: [
      "Commandes, affectations, présences et approbations de feuilles de temps",
      "Factures, commandes de forfaits et d’annonces, et dossiers de vos paiements"
    ]
  },
  { kind: "h3", text: "Renseignements d’utilisation et d’appareil" },
  {
    kind: "ul",
    items: [
      "Activité sur le site (pages consultées, fonctions utilisées)",
      "Données techniques courantes (adresse IP, type d’appareil ou de navigateur) nécessaires pour fournir et sécuriser le service"
    ]
  },
  {
    kind: "p",
    text: "Nous ne recueillons pas de renseignements de carte de paiement sur nos propres serveurs. Nous ne recueillons pas sciemment de renseignements auprès de personnes de moins de 18 ans; Joblop s’adresse aux adultes."
  },
  { kind: "h2", text: "2. Comment nous utilisons vos renseignements" },
  {
    kind: "ul",
    items: [
      "Créer et sécuriser votre compte et vous connecter",
      "Jumeler vos demandes à des travailleurs disponibles près de votre lieu de travail",
      "Gérer les horaires, les feuilles de temps et les dossiers de travail",
      "Vous facturer, envoyer les factures et les reçus par courriel et enregistrer les paiements",
      "Répondre à vos messages au moyen de « Joindre Joblop »",
      "Envoyer des communications de service (p. ex. confirmations et avis concernant vos demandes)",
      "Maintenir, sécuriser, déboguer et améliorer la plateforme",
      "Respecter nos obligations légales, y compris fiscales"
    ]
  },
  { kind: "p", text: "Nous ne vendons pas vos renseignements personnels." },
  { kind: "h2", text: "3. Avec qui nous communiquons des renseignements" },
  {
    kind: "p",
    text: "Les travailleurs affectés à vos quarts voient les renseignements dont ils ont besoin pour faire le travail, comme le nom de l’entreprise, l’adresse du lieu de travail, l’horaire et vos consignes. Nous communiquons aussi des renseignements personnels limités à des fournisseurs de services qui les traitent uniquement selon nos instructions pour faire fonctionner la plateforme; ils sont énumérés à la section 10.2, avec Google Analytics (statistiques d’utilisation, seulement lorsqu’il est activé) et Render / Neon (hébergement et base de données sécurisés)."
  },
  {
    kind: "p",
    text: "Nous pouvons aussi communiquer des renseignements lorsque la loi l’exige, pour protéger nos droits ou la sécurité des utilisateurs, ou dans le cadre d’une transaction commerciale, avec un avis lorsque la loi l’exige."
  },
  {
    kind: "p",
    text: "Toutes les catégories ci-dessus excluent les données d’adhésion et le consentement de l’expéditeur des messages texte; ces renseignements ne seront communiqués à aucun tiers."
  },
  { kind: "h2", text: "4. Durée de conservation" },
  {
    kind: "p",
    text: "Nous conservons les renseignements personnels tant que votre compte est actif et aussi longtemps que nécessaire pour fournir le service, puis pendant toute période requise pour respecter nos obligations légales, fiscales ou de tenue de dossiers, après quoi ils sont supprimés ou anonymisés."
  },
  { kind: "h2", text: "5. Sécurité" },
  {
    kind: "p",
    text: "Les données sont chiffrées en transit (HTTPS/TLS) et protégées par des contrôles d’accès. Vous vous connectez avec un code envoyé à votre numéro de cellulaire. Aucun système n’est parfaitement sûr, mais nous prenons des mesures techniques et organisationnelles raisonnables pour protéger vos renseignements."
  },
  { kind: "h2", text: "6. Vos droits" },
  {
    kind: "p",
    text: `Sous réserve des lois applicables (y compris la Loi 25 du Québec et la LPRPDE), vous pouvez accéder aux renseignements personnels que nous détenons à votre sujet, faire corriger des renseignements inexacts, demander la suppression de votre compte et des renseignements personnels qui y sont associés, et retirer votre consentement aux communications facultatives. Pour exercer l’un de ces droits, écrivez à ${CONTACT}. Nous répondrons dans les délais prévus par la loi.`
  },
  { kind: "h2", text: "7. Traitement à l’extérieur du Québec" },
  {
    kind: "p",
    text: "Certains fournisseurs de services peuvent traiter des données à l’extérieur du Québec ou du Canada (p. ex. aux États-Unis). Le cas échéant, nous prenons les mesures exigées par les lois applicables pour protéger vos renseignements."
  },
  { kind: "h2", text: "8. Modifications de la présente politique" },
  {
    kind: "p",
    text: "Nous pouvons mettre à jour la présente politique de temps à autre. Les modifications importantes seront publiées sur cette page avec une nouvelle version et une nouvelle date d’entrée en vigueur."
  },
  { kind: "h2", text: "9. Nous joindre" },
  { kind: "p", text: `Questions ou demandes : ${CONTACT} — ${ENTITY}` },
  { kind: "h3", text: "Fermer votre compte employeur" },
  {
    kind: "p",
    text: `Pour fermer votre compte employeur et supprimer ses renseignements personnels, écrivez à ${CONTACT} à partir de l’adresse courriel du compte, avec l’objet « Supprimer mon compte ». Indiquez le nom de l’entreprise afin que nous puissions confirmer qu’il s’agit bien de vous. Nous visons à terminer dans un délai de 30 jours et vous le confirmerons par courriel. Les factures et les dossiers de paiement et fiscaux sont conservés aussi longtemps que l’exigent les lois fiscales.`
  }
];

// ---------------------------------------------------------------------------------------------
// Terms of Service
// ---------------------------------------------------------------------------------------------

const termsEn: readonly LegalBlock[] = [
  {
    kind: "p",
    text: "Welcome to Joblop. By creating an employer account or using the Joblop employer website, you agree to these Terms of Service on behalf of yourself and the business you represent. If you do not agree, do not use the service."
  },
  { kind: "h2", text: "1. Who can use Joblop" },
  {
    kind: "p",
    text: "You must be at least 18 years old and authorized to bind the business you register. You agree to provide accurate information and to keep your account and mobile number secure. You are responsible for activity under your account, including by the people you add to it."
  },
  { kind: "h2", text: "2. What Joblop is" },
  {
    kind: "p",
    text: "Joblop is a platform that connects employers with workers for staffing and shift work in Québec and across Canada. For short-term shifts (up to 4 weeks), Joblop finds workers for your requests, pays those workers and invoices you. For long-term jobs (contracts over 4 weeks), Joblop only publishes your paid listing: you hire the worker, you pay them directly, and you are their employer."
  },
  { kind: "h2", text: "3. Your responsibilities" },
  {
    kind: "ul",
    items: [
      "Provide truthful company, worksite and job information, including the real duties, schedule and requirements",
      "Comply with applicable laws, including employment, human-rights and workplace health-and-safety laws",
      "Provide a safe workplace, the safety training and equipment the work requires, and supervision at the worksite",
      "Confirm or correct timesheets promptly",
      "Not misuse the platform: no fraud, harassment, scraping, interference, or posting unlawful, misleading, discriminatory or infringing content"
    ]
  },
  { kind: "h2", text: "4. Employers and workers" },
  {
    kind: "p",
    text: "Employers are responsible for the accuracy of their job requests and for meeting their legal obligations toward workers at the worksite. Workers are responsible for performing accepted work as agreed. Joblop does not guarantee that a worker will be found for every request, or any particular outcome or availability."
  },
  { kind: "h2", text: "5. Partner job listings" },
  {
    kind: "p",
    text: "Joblop also shows workers job listings from third-party partner sources. Those listings are controlled by third parties; Joblop does not control and is not responsible for their content or accuracy."
  },
  { kind: "h2", text: "6. Fees and payments" },
  {
    kind: "p",
    text: "Prices are shown on the Pricing page before you order, and section 15 explains how they work. Taxes (GST and QST) are added. Payment-processing features, where offered, are provided through a third-party processor subject to its own terms."
  },
  { kind: "h2", text: "7. Content you provide" },
  {
    kind: "p",
    text: "You keep ownership of the content you submit (such as job descriptions and your company name and logo). You grant Joblop a limited licence to host, display and process that content solely to provide the service (for example, to show your job to workers)."
  },
  { kind: "h2", text: "8. Availability and changes" },
  {
    kind: "p",
    text: "We may modify, suspend or discontinue features at any time. We aim to keep the service available but do not guarantee uninterrupted operation."
  },
  { kind: "h2", text: "9. Disclaimers and limitation of liability" },
  {
    kind: "p",
    text: "The service is provided “as is” and “as available” without warranties of any kind, to the extent permitted by law. To the maximum extent permitted by applicable law, Joblop is not liable for indirect, incidental or consequential damages (such as lost profits), or for the conduct of any worker or third party. Joblop’s total liability for any claim is limited to the amounts you paid Joblop for the services related to the claim in the 3 months before it arose. Nothing in these Terms limits liability that the law does not allow to be limited, such as for intentional or gross fault, or for bodily or moral injury."
  },
  { kind: "h2", text: "10. Termination" },
  {
    kind: "p",
    text: `You may stop using Joblop and ask us to close your account at any time by emailing ${CONTACT} with the subject “Delete my account”. Amounts already owed remain payable. We may suspend or terminate access for breach of these Terms, unpaid invoices or misuse of the platform.`
  },
  { kind: "h2", text: "11. Governing law" },
  {
    kind: "p",
    text: "These Terms are governed by the laws of the Province of Québec and the federal laws of Canada applicable there. The courts of Québec have jurisdiction."
  },
  { kind: "h2", text: "12. Changes to these Terms" },
  {
    kind: "p",
    text: "We may update these Terms from time to time. Material changes will be posted here with a new version and effective date; continued use after changes means you accept them. A price change never applies to a month or an order you have already paid for."
  },
  { kind: "h2", text: "13. Text messages (SMS)" },
  {
    kind: "p",
    text: `By providing your mobile phone number, you agree to receive text messages from JobLop (9375-7649 Québec inc.) at the number provided — account messages such as sign-in codes and important notices about your requests — sent using an automated system. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe at any time, or HELP for help. Because you sign in with a texted code, replying STOP stops sign-in codes too. For assistance, contact ${CONTACT}. Carriers are not liable for delayed or undelivered messages. See our Privacy Policy for how we handle your personal information.`
  },
  { kind: "h2", text: "14. Contact" },
  { kind: "p", text: `Questions: ${CONTACT} — ${ENTITY}, ${LEGAL_COMPANY.address}.` },
  { kind: "h2", id: "pricing-terms", text: `15. Prices, plans and listings (effective ${LEGAL_EFFECTIVE_DATE})` },
  {
    kind: "p",
    text: "This section adds to sections 1 to 14. If anything in this section is different from sections 1 to 14, this section applies. It says the same thing as the Pricing page."
  },
  { kind: "h3", text: "15.1 Short-term shifts" },
  {
    kind: "ul",
    items: [
      "You pay the hourly rate in your contract with Joblop. Joblop’s service fee is already included in that rate.",
      "Each shift is billed for at least 6 hours per worker, even if the worker works less.",
      "Urgent request: an urgent fee of 15% of your hourly rate, for each billed hour. Immediate request: 30% of your hourly rate, for each billed hour. Urgent and immediate shifts also cost C$5.00 more per billed hour.",
      "Worksite more than 25 km from greater Montréal: a travel charge of C$0.25 per km plus driving time at C$25 an hour, counted both ways.",
      "GST (5%) and QST (9.975%) are added to the total.",
      "We email you an invoice after the work is done, based on the confirmed timesheet.",
      "Joblop pays the workers for these shifts. Pay Joblop’s invoice; do not pay the worker for a short-term shift booked through Joblop."
    ]
  },
  { kind: "h3", text: "15.2 Optional plans" },
  {
    kind: "ul",
    items: [
      "Shift Pro costs C$49 per month plus taxes. Shift Business costs C$149 per month plus taxes. Each plan lowers the hourly price of short-term shifts and halves the urgent fee, as shown on the Plans page.",
      "You can try a plan free for 14 days, once per company.",
      "Plans are paid in advance, one month at a time. Canceling stops the next month; the month already paid stays active until it ends."
    ]
  },
  { kind: "h3", text: "15.3 Long-term job listings" },
  {
    kind: "ul",
    items: [
      "C$99 per job listing per month plus taxes, paid in advance.",
      "Your first 2 weeks are free, once per company. After that, your first paid month is 50% off.",
      "Canceling stops the next month.",
      "You hire the worker and pay them directly. You are the worker’s employer for these jobs, and Joblop is not. There is no hourly billing, timesheet or worker invoice from Joblop for these jobs."
    ]
  },
  { kind: "h3", text: "15.4 Canceling a shift" },
  {
    kind: "p",
    text: "A shift can be canceled at no charge 24 hours or more before it starts. Later than that, each confirmed worker is billed 6 hours."
  },
  { kind: "h3", text: "15.5 How you pay" },
  {
    kind: "p",
    text: "Pay by Interac e-transfer. We show you the amount with taxes and where to send it. Card payments, when they are available, are processed by Stripe."
  },
  { kind: "h3", text: "15.6 AI and voice typing" },
  {
    kind: "p",
    text: "Contact Joblop may answer first with an AI assistant; a person handles anything that needs a decision. The optional “Speak” button on the request form uses your browser’s speech service (Google or Apple); see the Privacy Policy, section 10.2."
  },
  { kind: "h3", text: "15.7 Language" },
  {
    kind: "p",
    text: "These Terms are published in French and in English, and both versions have the same value. The Arabic page is a summary for convenience only."
  }
];

const termsFr: readonly LegalBlock[] = [
  {
    kind: "p",
    text: "Bienvenue chez Joblop. En créant un compte employeur ou en utilisant le site Web employeur de Joblop, vous acceptez les présentes conditions d’utilisation en votre nom et au nom de l’entreprise que vous représentez. Si vous ne les acceptez pas, n’utilisez pas le service."
  },
  { kind: "h2", text: "1. Qui peut utiliser Joblop" },
  {
    kind: "p",
    text: "Vous devez avoir au moins 18 ans et être autorisé à engager l’entreprise que vous inscrivez. Vous acceptez de fournir des renseignements exacts et de garder votre compte et votre numéro de cellulaire en sécurité. Vous êtes responsable des activités effectuées avec votre compte, y compris par les personnes que vous y ajoutez."
  },
  { kind: "h2", text: "2. Ce qu’est Joblop" },
  {
    kind: "p",
    text: "Joblop est une plateforme qui met en relation des employeurs et des travailleurs pour du placement de personnel et du travail par quarts au Québec et ailleurs au Canada. Pour les quarts à court terme (jusqu’à 4 semaines), Joblop trouve des travailleurs pour vos demandes, paie ces travailleurs et vous facture. Pour les emplois à long terme (contrats de plus de 4 semaines), Joblop publie seulement votre annonce payée : vous embauchez le travailleur, vous le payez directement et vous êtes son employeur."
  },
  { kind: "h2", text: "3. Vos responsabilités" },
  {
    kind: "ul",
    items: [
      "Fournir des renseignements véridiques sur l’entreprise, le lieu de travail et l’emploi, y compris les tâches, l’horaire et les exigences réels",
      "Respecter les lois applicables, y compris les lois sur l’emploi, sur les droits de la personne et sur la santé et la sécurité au travail",
      "Fournir un lieu de travail sécuritaire, la formation et l’équipement de sécurité requis par le travail, et une supervision sur place",
      "Confirmer ou corriger rapidement les feuilles de temps",
      "Ne pas faire un mauvais usage de la plateforme : aucune fraude, aucun harcèlement, aucune extraction automatisée de données, aucune interférence, et aucune publication de contenu illégal, trompeur, discriminatoire ou contrefait"
    ]
  },
  { kind: "h2", text: "4. Employeurs et travailleurs" },
  {
    kind: "p",
    text: "Les employeurs sont responsables de l’exactitude de leurs demandes de travail et du respect de leurs obligations légales envers les travailleurs sur le lieu de travail. Les travailleurs sont responsables d’effectuer le travail accepté comme convenu. Joblop ne garantit pas qu’un travailleur sera trouvé pour chaque demande, ni aucun résultat ou disponibilité en particulier."
  },
  { kind: "h2", text: "5. Offres d’emploi partenaires" },
  {
    kind: "p",
    text: "Joblop montre aussi aux travailleurs des offres d’emploi provenant de sources partenaires tierces. Ces offres sont contrôlées par des tiers; Joblop ne contrôle pas leur contenu ni leur exactitude et n’en est pas responsable."
  },
  { kind: "h2", text: "6. Frais et paiements" },
  {
    kind: "p",
    text: "Les prix sont affichés sur la page Tarifs avant votre commande, et la section 15 explique leur fonctionnement. Les taxes (TPS et TVQ) s’ajoutent. Les fonctions de traitement des paiements, lorsqu’elles sont offertes, sont fournies par un service de paiement tiers soumis à ses propres conditions."
  },
  { kind: "h2", text: "7. Contenu que vous fournissez" },
  {
    kind: "p",
    text: "Vous demeurez propriétaire du contenu que vous soumettez (comme les descriptions d’emploi, le nom et le logo de votre entreprise). Vous accordez à Joblop une licence limitée pour héberger, afficher et traiter ce contenu uniquement afin de fournir le service (par exemple, pour montrer votre emploi aux travailleurs)."
  },
  { kind: "h2", text: "8. Disponibilité et modifications" },
  {
    kind: "p",
    text: "Nous pouvons modifier, suspendre ou cesser des fonctions en tout temps. Nous visons à garder le service accessible, mais ne garantissons pas un fonctionnement ininterrompu."
  },
  { kind: "h2", text: "9. Avis de non-responsabilité et limitation de responsabilité" },
  {
    kind: "p",
    text: "Le service est fourni « tel quel » et « selon sa disponibilité », sans garantie d’aucune sorte, dans la mesure permise par la loi. Dans toute la mesure permise par les lois applicables, Joblop n’est pas responsable des dommages indirects, accessoires ou consécutifs (comme une perte de profits), ni de la conduite d’un travailleur ou d’un tiers. La responsabilité totale de Joblop pour toute réclamation est limitée aux sommes que vous avez payées à Joblop pour les services liés à la réclamation au cours des 3 mois précédant sa survenance. Rien dans les présentes conditions ne limite une responsabilité que la loi ne permet pas de limiter, comme celle découlant d’une faute intentionnelle ou lourde, ou d’un préjudice corporel ou moral."
  },
  { kind: "h2", text: "10. Résiliation" },
  {
    kind: "p",
    text: `Vous pouvez cesser d’utiliser Joblop et nous demander de fermer votre compte en tout temps en écrivant à ${CONTACT} avec l’objet « Supprimer mon compte ». Les sommes déjà dues restent payables. Nous pouvons suspendre ou résilier l’accès en cas de manquement aux présentes conditions, de factures impayées ou de mauvais usage de la plateforme.`
  },
  { kind: "h2", text: "11. Droit applicable" },
  {
    kind: "p",
    text: "Les présentes conditions sont régies par les lois de la province de Québec et les lois fédérales du Canada qui s’y appliquent. Les tribunaux du Québec sont compétents."
  },
  { kind: "h2", text: "12. Modifications des présentes conditions" },
  {
    kind: "p",
    text: "Nous pouvons mettre à jour les présentes conditions de temps à autre. Les modifications importantes seront publiées ici avec une nouvelle version et une nouvelle date d’entrée en vigueur; continuer d’utiliser le service après les modifications signifie que vous les acceptez. Un changement de prix ne s’applique jamais à un mois ou à une commande déjà payés."
  },
  { kind: "h2", text: "13. Messages texte (SMS)" },
  {
    kind: "p",
    text: `En fournissant votre numéro de cellulaire, vous acceptez de recevoir des messages texte de JobLop (9375-7649 Québec inc.) au numéro fourni — des messages liés à votre compte, comme des codes de connexion et des avis importants concernant vos demandes — envoyés au moyen d’un système automatisé. La fréquence des messages varie. Des frais de messagerie et de données peuvent s’appliquer. Répondez STOP pour vous désabonner en tout temps, ou HELP pour obtenir de l’aide. Comme vous vous connectez avec un code reçu par texto, répondre STOP arrête aussi les codes de connexion. Pour de l’aide, écrivez à ${CONTACT}. Les fournisseurs de services sans fil ne sont pas responsables des messages retardés ou non livrés. Consultez notre politique de confidentialité pour savoir comment nous traitons vos renseignements personnels.`
  },
  { kind: "h2", text: "14. Nous joindre" },
  { kind: "p", text: `Questions : ${CONTACT} — ${ENTITY}, ${LEGAL_COMPANY.address}.` },
  { kind: "h2", id: "pricing-terms", text: `15. Prix, forfaits et annonces (en vigueur le ${LEGAL_EFFECTIVE_DATE})` },
  {
    kind: "p",
    text: "La présente section s’ajoute aux sections 1 à 14. Si un élément de la présente section diffère des sections 1 à 14, la présente section s’applique. Elle dit la même chose que la page Tarifs."
  },
  { kind: "h3", text: "15.1 Quarts à court terme" },
  {
    kind: "ul",
    items: [
      "Vous payez le tarif horaire prévu dans votre contrat avec Joblop. Les frais de service de Joblop sont déjà inclus dans ce tarif.",
      "Chaque quart est facturé au moins 6 heures par travailleur, même si le travailleur travaille moins.",
      "Demande urgente : des frais d’urgence de 15 % de votre tarif horaire, pour chaque heure facturée. Demande immédiate : 30 % de votre tarif horaire, pour chaque heure facturée. Les quarts urgents et immédiats coûtent aussi 5,00 $ CA de plus par heure facturée.",
      "Lieu de travail à plus de 25 km du Grand Montréal : des frais de déplacement de 0,25 $ CA par km plus le temps de route à 25 $ CA l’heure, aller et retour.",
      "La TPS (5 %) et la TVQ (9,975 %) s’ajoutent au total.",
      "Nous vous envoyons la facture par courriel une fois le travail fait, selon la feuille de temps confirmée.",
      "Joblop paie les travailleurs pour ces quarts. Payez la facture de Joblop; ne payez pas le travailleur pour un quart à court terme réservé au moyen de Joblop."
    ]
  },
  { kind: "h3", text: "15.2 Forfaits optionnels" },
  {
    kind: "ul",
    items: [
      "Shift Pro coûte 49 $ CA par mois plus taxes. Shift Business coûte 149 $ CA par mois plus taxes. Chaque forfait réduit le prix horaire des quarts à court terme et réduit de moitié les frais d’urgence, comme l’indique la page Forfaits.",
      "Vous pouvez essayer un forfait gratuitement pendant 14 jours, une fois par entreprise.",
      "Les forfaits sont payés d’avance, un mois à la fois. L’annulation arrête le mois suivant; le mois déjà payé reste actif jusqu’à sa fin."
    ]
  },
  { kind: "h3", text: "15.3 Annonces d’emplois à long terme" },
  {
    kind: "ul",
    items: [
      "99 $ CA par annonce d’emploi par mois plus taxes, payé d’avance.",
      "Vos 2 premières semaines sont gratuites, une fois par entreprise. Ensuite, votre premier mois payé est à 50 % de rabais.",
      "L’annulation arrête le mois suivant.",
      "Vous embauchez le travailleur et le payez directement. Vous êtes l’employeur du travailleur pour ces emplois, et Joblop ne l’est pas. Aucune facturation à l’heure, feuille de temps ou facture de travailleur de Joblop pour ces emplois."
    ]
  },
  { kind: "h3", text: "15.4 Annuler un quart" },
  {
    kind: "p",
    text: "Un quart peut être annulé sans frais 24 heures ou plus avant son début. Plus tard, 6 heures sont facturées pour chaque travailleur confirmé."
  },
  { kind: "h3", text: "15.5 Comment payer" },
  {
    kind: "p",
    text: "Payez par virement Interac. Nous vous montrons le montant avec les taxes et où l’envoyer. Les paiements par carte, lorsqu’ils seront offerts, seront traités par Stripe."
  },
  { kind: "h3", text: "15.6 IA et saisie vocale" },
  {
    kind: "p",
    text: "« Joindre Joblop » peut répondre en premier au moyen d’un assistant IA; une personne s’occupe de tout ce qui exige une décision. Le bouton facultatif « Parler » du formulaire de demande utilise le service vocal de votre navigateur (Google ou Apple); voir la politique de confidentialité, section 10.2."
  },
  { kind: "h3", text: "15.7 Langue" },
  {
    kind: "p",
    text: "Les présentes conditions sont publiées en français et en anglais, et les deux versions ont la même valeur. La page en arabe est un résumé fourni pour votre commodité seulement."
  }
];

// ---------------------------------------------------------------------------------------------
// Arabic summaries (French and English govern)
// ---------------------------------------------------------------------------------------------

const AR_NOTICE =
  "هذه الصفحة ملخّص باللغة العربية للتسهيل فقط. النصّان الفرنسي والإنجليزي هما المعتمدان، وفي حال أي اختلاف يُعتمد النص الفرنسي أو الإنجليزي.";

const privacyAr: readonly LegalBlock[] = [
  { kind: "p", text: AR_NOTICE },
  { kind: "h2", text: "ملخّص سياسة الخصوصية لأصحاب العمل" },
  {
    kind: "ul",
    items: [
      "نجمع اسمك وبريدك الإلكتروني ورقم جوالك، وبيانات شركتك وعناوين مواقع العمل، والطلبات والفواتير وسجلات الدفع.",
      "نستخدمها لتسجيل دخولك برمز يُرسل برسالة نصية، ولإيجاد عمّال لطلباتك، ولإرسال الفواتير والإيصالات بالبريد الإلكتروني، وللوفاء بالتزاماتنا الضريبية.",
      "يرى العمّال المكلّفون بمناوباتك ما يحتاجونه فقط: اسم الشركة وعنوان الموقع والجدول والتعليمات.",
      "زر «تحدّث» اختياري: عند استخدامه يرسل متصفحك صوتك إلى خدمة الكلام لدى Google أو Apple لتحويله إلى نص.",
      "نستعين بمزوّدي خدمات مثل Render وBrevo وAnthropic وGoogle وOpenStreetMap وStripe، وقد تُعالج بياناتك خارج كيبيك، بما في ذلك في الولايات المتحدة.",
      AI_FEATURES_ARABIC_SUMMARY.employer,
      "لك الحق في الاطلاع على بياناتك وتصحيحها وسحب موافقتك وحذفها ونقلها، وتقديم شكوى إلى لجنة الوصول إلى المعلومات في كيبيك.",
      `لإغلاق حسابك أو لأي سؤال: ${CONTACT} — مسؤول حماية المعلومات الشخصية، ${ENTITY}، ${LEGAL_COMPANY.address}.`
    ]
  }
];

const termsAr: readonly LegalBlock[] = [
  { kind: "p", text: AR_NOTICE },
  { kind: "h2", text: "ملخّص شروط الاستخدام لأصحاب العمل" },
  {
    kind: "ul",
    items: [
      "المناوبات القصيرة (حتى 4 أسابيع): تدفع السعر بالساعة الوارد في عقدك مع جوب‑لوب (رسوم خدمة جوب‑لوب مشمولة)، بحد أدنى 6 ساعات لكل مناوبة، وتُضاف الضرائب. جوب‑لوب تدفع للعمّال وترسل لك الفاتورة بالبريد الإلكتروني.",
      "رسوم الاستعجال: 15% (عاجل) أو 30% (فوري) من السعر بالساعة، و5 دولارات كندية إضافية لكل ساعة مفوترة. رسوم تنقّل خارج نطاق 25 كم من مونتريال الكبرى.",
      "الإلغاء مجاني قبل 24 ساعة أو أكثر من بدء المناوبة؛ بعد ذلك تُفوتر 6 ساعات لكل عامل مؤكد.",
      "الباقات الاختيارية: Shift Pro بسعر 49 دولاراً و Shift Business بسعر 149 دولاراً شهرياً مع الضرائب، وتجربة مجانية 14 يوماً مرة واحدة لكل شركة. الإلغاء يوقف الشهر التالي.",
      "الوظائف طويلة الأمد: 99 دولاراً لكل إعلان شهرياً مع الضرائب، أول أسبوعين مجاناً مرة واحدة، ثم خصم 50% على أول شهر مدفوع. أنت من يوظّف العامل ويدفع له، وأنت صاحب العمل.",
      "الدفع بتحويل Interac الإلكتروني. تخضع هذه الشروط لقوانين كيبيك."
    ]
  }
];

export type EmployerLegalLanguage = "en" | "fr" | "ar";

export const employerPrivacy: Readonly<Record<EmployerLegalLanguage, readonly LegalBlock[]>> = {
  en: [...privacyEn, ...privacyAdditions("employer", "en")],
  fr: [...privacyFr, ...privacyAdditions("employer", "fr")],
  ar: privacyAr
};

export const employerTerms: Readonly<Record<EmployerLegalLanguage, readonly LegalBlock[]>> = {
  en: termsEn,
  fr: termsFr,
  ar: termsAr
};

/** The full English text shown under the Arabic summary. */
export const employerArabicFullText = {
  privacy: employerPrivacy.en,
  terms: employerTerms.en
} as const;
