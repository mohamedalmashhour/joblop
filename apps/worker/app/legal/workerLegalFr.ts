// DRAFT — must be reviewed by a Québec lawyer before relying on it.
// French translation of the approved worker Privacy Policy, Terms of Service and account-deletion
// page (English text in ./content.tsx, "Last updated October 26, 2026"). The translation follows the
// English clause by clause; nothing is added or removed here. New clauses live in ./workerLegalUpdates.ts.
import { LEGAL_CONTACT_EMAIL, type LegalBlock } from "@rwos/shared";
import { activeCountry } from "../country";

const ENTITY = activeCountry().legalEntityName;
const CONTACT = LEGAL_CONTACT_EMAIL;

export const privacyPolicyFr: readonly LegalBlock[] = [
  {
    kind: "p",
    text: "Joblop est une plateforme de placement de personnel et de jumelage d’emplois qui exerce ses activités au Québec et ailleurs au Canada. La présente politique de confidentialité explique quels renseignements personnels nous recueillons, comment nous les utilisons, avec qui nous les communiquons, ainsi que les choix et les droits dont vous disposez. Nous traitons les renseignements personnels conformément à la Loi sur la protection des renseignements personnels dans le secteur privé du Québec (Loi 25) et à la LPRPDE du Canada."
  },
  { kind: "h2", text: "1. Renseignements que nous recueillons" },
  { kind: "h3", text: "Renseignements de compte" },
  {
    kind: "ul",
    items: [
      "Adresse courriel (pour créer et sécuriser votre compte et vous connecter)",
      "Mot de passe (conservé uniquement sous forme de hachage salé — nous ne conservons jamais votre mot de passe en clair)",
      "Nom affiché",
      "Numéro de cellulaire — facultatif; recueilli seulement si vous choisissez de le fournir (pour les alertes de quart et la récupération du compte)"
    ]
  },
  { kind: "h3", text: "Renseignements de profil et de localisation" },
  {
    kind: "ul",
    items: [
      "Adresse postale (rue, ville, province, code postal)",
      "Géolocalisation approximative (latitude/longitude) utilisée pour vous jumeler à du travail à proximité et, pour les travailleurs, pour vérifier l’arrivée et le départ sur un lieu de travail lorsque vous choisissez de pointer",
      "Préférences de travail, disponibilités, rôles et compétences que vous inscrivez"
    ]
  },
  { kind: "h3", text: "Activité de travail" },
  {
    kind: "ul",
    items: [
      "Demandes de travail, affectations, feuilles de temps et historique de travail créés au moyen de la plateforme",
      "Contenu que vous créez avec le générateur de CV (les renseignements de votre curriculum vitæ)"
    ]
  },
  { kind: "h3", text: "Renseignements d’utilisation et d’appareil" },
  {
    kind: "ul",
    items: [
      "Activité dans l’application et sur le site (pages consultées, recherches effectuées, fonctions utilisées)",
      "Données techniques courantes (adresse IP, type d’appareil ou de navigateur) nécessaires pour fournir et sécuriser le service"
    ]
  },
  {
    kind: "p",
    text: "Votre numéro de cellulaire est facultatif — nous le recueillons seulement si vous choisissez de le fournir, et nous l’utilisons pour les alertes de quart et la récupération du compte. Nous ne recueillons pas de numéros d’identification gouvernementaux ni de renseignements de carte de paiement au moyen de l’application. Nous ne recueillons pas sciemment de renseignements auprès de personnes de moins de 18 ans; Joblop s’adresse aux adultes."
  },
  { kind: "h2", text: "2. Comment nous utilisons vos renseignements" },
  {
    kind: "ul",
    items: [
      "Créer et sécuriser votre compte et vous connecter",
      "Jumeler les travailleurs à des emplois et les employeurs à des travailleurs disponibles près d’eux",
      "Gérer les horaires, les feuilles de temps et les dossiers de travail",
      "Fournir les résultats de recherche JobScanner et le générateur de CV assisté par IA",
      "Envoyer des communications de service (p. ex. confirmations, alertes auxquelles vous vous abonnez)",
      "Maintenir, sécuriser, déboguer et améliorer la plateforme",
      "Respecter nos obligations légales"
    ]
  },
  { kind: "p", text: "Nous ne vendons pas vos renseignements personnels." },
  { kind: "h2", text: "3. Avec qui nous communiquons des renseignements (fournisseurs de services)" },
  {
    kind: "p",
    text: "Nous communiquons des renseignements personnels limités à des fournisseurs de services qui les traitent uniquement selon nos instructions pour faire fonctionner la plateforme :"
  },
  {
    kind: "table",
    head: ["Fournisseur", "Fin", "Données concernées"],
    rows: [
      ["Google Analytics", "Statistiques d’utilisation", "Activité dans l’application et sur le site, données d’appareil"],
      ["Brevo", "Envoi des courriels de service auxquels vous avez consenti", "Adresse courriel, contenu du message"],
      ["Anthropic (Claude)", "Générateur de CV assisté par IA", "Le contenu du CV que vous choisissez de générer"],
      ["Adzuna", "Offres d’emploi partenaires JobScanner", "Vos termes de recherche (p. ex. poste, ville)"],
      ["Render / Neon", "Hébergement et base de données sécurisés", "Toutes les données conservées, chiffrées"]
    ]
  },
  {
    kind: "p",
    text: "Les résultats JobScanner sont des offres d’emploi externes provenant de sources partenaires; lorsque vous postulez, vous pouvez être dirigé vers le site source, qui a ses propres pratiques de confidentialité. Nous pouvons aussi communiquer des renseignements lorsque la loi l’exige, pour protéger nos droits ou la sécurité des utilisateurs, ou dans le cadre d’une transaction commerciale, avec un avis lorsque la loi l’exige."
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
    text: "Les données sont chiffrées en transit (HTTPS/TLS) et protégées par des contrôles d’accès. Les mots de passe sont conservés uniquement sous forme de hachage salé. Aucun système n’est parfaitement sûr, mais nous prenons des mesures techniques et organisationnelles raisonnables pour protéger vos renseignements."
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
    text: "Nous pouvons mettre à jour la présente politique de temps à autre. Les modifications importantes seront publiées sur cette page avec une nouvelle date de « Dernière mise à jour »."
  },
  { kind: "h2", text: "9. Nous joindre" },
  { kind: "p", text: `Questions ou demandes : ${CONTACT} — ${ENTITY}` }
];

export const termsOfServiceFr: readonly LegalBlock[] = [
  {
    kind: "p",
    text: "Bienvenue chez Joblop. En créant un compte ou en utilisant l’application ou le site Web Joblop, vous acceptez les présentes conditions d’utilisation. Si vous ne les acceptez pas, n’utilisez pas le service."
  },
  { kind: "h2", text: "1. Qui peut utiliser Joblop" },
  {
    kind: "p",
    text: "Vous devez avoir au moins 18 ans et être capable de conclure un contrat valide. Vous acceptez de fournir des renseignements exacts et de garder vos identifiants de compte en sécurité. Vous êtes responsable des activités effectuées avec votre compte."
  },
  { kind: "h2", text: "2. Ce qu’est Joblop" },
  {
    kind: "p",
    text: "Joblop est une plateforme qui met en relation des travailleurs et des employeurs pour du placement de personnel et du travail par quarts au Québec et ailleurs au Canada, et qui offre des outils de soutien comme la recherche d’emploi (JobScanner) et un générateur de CV assisté par IA. Joblop facilite les mises en relation et la planification; la relation de travail et les obligations qui en découlent existent entre le travailleur et l’employeur."
  },
  { kind: "h2", text: "3. Vos responsabilités" },
  {
    kind: "ul",
    items: [
      "Fournir des renseignements véridiques sur votre profil, vos disponibilités et votre travail",
      "Respecter les lois applicables, y compris les lois sur l’emploi et sur la santé et la sécurité au travail",
      "Honorer les engagements que vous acceptez au moyen de la plateforme (quarts, affectations)",
      "Ne pas faire un mauvais usage de la plateforme : aucune fraude, aucun harcèlement, aucune extraction automatisée de données, aucune interférence, et aucune publication de contenu illégal, trompeur ou contrefait"
    ]
  },
  { kind: "h2", text: "4. Employeurs et travailleurs" },
  {
    kind: "p",
    text: "Les employeurs sont responsables de l’exactitude de leurs demandes de travail et du respect de leurs obligations légales envers les travailleurs. Les travailleurs sont responsables d’effectuer le travail accepté comme convenu. Joblop n’est pas l’employeur des travailleurs, sauf indication expresse dans une entente écrite distincte, et ne garantit aucun emploi, travailleur, résultat, salaire ou disponibilité en particulier."
  },
  { kind: "h2", text: "5. JobScanner et offres de tiers" },
  {
    kind: "p",
    text: "JobScanner présente des offres d’emploi provenant de sources partenaires tierces. Ces offres et les sites sur lesquels vous postulez sont contrôlés par des tiers; Joblop ne contrôle pas leur contenu, leur exactitude ni leurs décisions d’embauche et n’en est pas responsable."
  },
  { kind: "h2", text: "6. Frais et paiements" },
  {
    kind: "p",
    text: "Joblop ne prélève aucune part de la paie d’un travailleur pour une candidature faite au moyen de la plateforme. Les frais qui peuvent s’appliquer à certains services seront indiqués avant que vous les engagiez. Les fonctions de traitement des paiements, lorsqu’elles sont offertes, sont fournies par un service de paiement tiers soumis à ses propres conditions."
  },
  { kind: "h2", text: "7. Contenu que vous fournissez" },
  {
    kind: "p",
    text: "Vous demeurez propriétaire du contenu que vous soumettez (comme votre CV). Vous accordez à Joblop une licence limitée pour héberger, afficher et traiter ce contenu uniquement afin de vous fournir le service (par exemple, pour montrer votre profil à un employeur potentiel ou pour générer un CV)."
  },
  { kind: "h2", text: "8. Disponibilité et modifications" },
  {
    kind: "p",
    text: "Nous pouvons modifier, suspendre ou cesser des fonctions en tout temps. Nous visons à garder le service accessible, mais ne garantissons pas un fonctionnement ininterrompu."
  },
  { kind: "h2", text: "9. Avis de non-responsabilité et limitation de responsabilité" },
  {
    kind: "p",
    text: "Le service est fourni « tel quel » et « selon sa disponibilité », sans garantie d’aucune sorte, dans la mesure permise par la loi. Dans toute la mesure permise par les lois applicables, Joblop n’est pas responsable des dommages indirects, accessoires ou consécutifs, ni de la conduite d’un travailleur, d’un employeur ou d’un tiers."
  },
  { kind: "h2", text: "10. Résiliation" },
  {
    kind: "p",
    text: `Vous pouvez cesser d’utiliser Joblop et demander la suppression de votre compte en tout temps (écrivez à ${CONTACT}). Nous pouvons suspendre ou résilier l’accès en cas de manquement aux présentes conditions ou de mauvais usage de la plateforme.`
  },
  { kind: "h2", text: "11. Droit applicable" },
  {
    kind: "p",
    text: "Les présentes conditions sont régies par les lois de la province de Québec et les lois fédérales du Canada qui s’y appliquent. Les tribunaux du Québec sont compétents, sous réserve des droits impératifs que vous confère la protection du consommateur."
  },
  { kind: "h2", text: "12. Modifications des présentes conditions" },
  {
    kind: "p",
    text: "Nous pouvons mettre à jour les présentes conditions de temps à autre. Les modifications importantes seront publiées ici avec une nouvelle date de « Dernière mise à jour »; continuer d’utiliser le service après les modifications signifie que vous les acceptez."
  },
  { kind: "h2", text: "13. Messages texte (SMS)" },
  {
    kind: "p",
    text: `En fournissant votre numéro de cellulaire, vous acceptez de recevoir des messages texte de JobLop (9375-7649 Québec inc.) au numéro fourni — des messages liés à votre compte et à vos emplois, comme des codes de vérification, des codes de connexion, des confirmations d’offres d’emploi et d’affectations et des rappels de quart — envoyés au moyen d’un système automatisé. Ce consentement n’est pas une condition d’utilisation du service. La fréquence des messages varie. Des frais de messagerie et de données peuvent s’appliquer. Répondez STOP pour vous désabonner en tout temps, ou HELP pour obtenir de l’aide. Pour de l’aide, écrivez à ${CONTACT}. Les fournisseurs de services sans fil ne sont pas responsables des messages retardés ou non livrés. Consultez notre politique de confidentialité pour savoir comment nous traitons vos renseignements personnels.`
  },
  { kind: "h2", text: "14. Nous joindre" },
  { kind: "p", text: `Questions : ${CONTACT} — ${ENTITY}` }
];

export const accountDeletionFr: readonly LegalBlock[] = [
  {
    kind: "p",
    text: `Vous pouvez nous demander en tout temps de supprimer votre compte Joblop et les renseignements personnels qui y sont associés. Joblop est exploitée par ${ENTITY}`
  },
  { kind: "h2", text: "Comment demander la suppression" },
  {
    kind: "ol",
    items: [
      `Écrivez à ${CONTACT} à partir de l’adresse courriel de votre compte Joblop, avec l’objet « Supprimer mon compte ».`,
      "Indiquez-nous le nom inscrit au compte afin que nous puissions confirmer qu’il s’agit bien de vous.",
      "Nous vérifions la demande et supprimons votre compte. Nous visons à terminer la suppression dans un délai de 30 jours et nous vous le confirmerons par courriel."
    ]
  },
  { kind: "h2", text: "Ce qui est supprimé" },
  {
    kind: "p",
    text: "Votre compte et ses renseignements personnels sont supprimés, notamment : votre courriel et vos identifiants de connexion, votre nom affiché, votre adresse postale et votre géolocalisation approximative, vos préférences de travail, disponibilités et rôles, le contenu de votre CV et les données d’utilisation liées à votre compte."
  },
  { kind: "h2", text: "Ce qui peut être conservé" },
  {
    kind: "p",
    text: "Nous pouvons conserver un ensemble limité de dossiers que la loi nous oblige à garder — par exemple les dossiers de travail effectué, les feuilles de temps et les dossiers fiscaux — pendant la période exigée par la loi, après quoi ils sont supprimés ou anonymisés. Nous ne vendons pas vos renseignements personnels."
  },
  { kind: "h2", text: "Questions" },
  { kind: "p", text: `Écrivez à ${CONTACT}. Consultez notre politique de confidentialité pour savoir comment nous traitons vos données.` }
];
