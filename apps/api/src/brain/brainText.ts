import type { BrainMode, SummaryCopy } from "@rwos/brain";
import type { EmailMessage } from "../mailer/emailSender";
import type { WorkerLanguage } from "../notifications/workerLanguage";

// Every word the Joblop brain sends, in plain short English and French. Messages to workers and
// employers never carry money: no rates, no Joblop share, nothing about the other side's pay.

const LOCALE: Record<WorkerLanguage, string> = { en: "en-CA", fr: "fr-CA", ar: "ar" };

function formatWhen(at: Date, language: WorkerLanguage, timeZone: string, style: "time" | "date"): string {
  const options: Intl.DateTimeFormatOptions = style === "time" ? { timeStyle: "short" } : { dateStyle: "medium" };
  try {
    return new Intl.DateTimeFormat(LOCALE[language], { ...options, timeZone }).format(at);
  } catch {
    return new Intl.DateTimeFormat(LOCALE[language], options).format(at);
  }
}

/** Worker SMS: the shift started and there is no check-in yet. */
export function checkInReminderSmsText(params: { language: WorkerLanguage; title: string; startAt: Date; timezone: string }): string {
  const time = formatWhen(params.startAt, params.language, params.timezone, "time");
  if (params.language === "en") {
    return `Joblop: your shift "${params.title}" started at ${time}. Please check in now in the app. Can't make it? Tell us right away.`;
  }
  // Arabic workers get French, like other texts with no Arabic version yet.
  return `Joblop : votre quart « ${params.title} » a commencé à ${time}. Faites votre arrivée dans l'app maintenant. Empêchement? Dites-le-nous tout de suite.`;
}

/** Employer email: hours from a finished shift are waiting for their confirmation. */
export function timesheetReminderEmail(params: {
  to: string;
  language: "en" | "fr";
  jobCode: string;
  title: string;
  shiftStart: Date;
  timezone: string;
}): EmailMessage {
  const day = formatWhen(params.shiftStart, params.language, params.timezone, "date");
  if (params.language === "en") {
    return {
      to: params.to,
      subject: `Joblop — please confirm the hours (${params.jobCode})`,
      text:
        `Please confirm the worker's hours for "${params.title}" on ${day} (job code ${params.jobCode}).\n\n` +
        `Sign in to Joblop and open Timesheets. If something is wrong, you can say so there.\n\n— Joblop`
    };
  }
  return {
    to: params.to,
    subject: `Joblop — veuillez confirmer les heures (${params.jobCode})`,
    text:
      `Veuillez confirmer les heures du travailleur pour « ${params.title} » le ${day} (code de mission ${params.jobCode}).\n\n` +
      `Connectez-vous à Joblop et ouvrez Feuilles de temps. Si quelque chose ne va pas, vous pouvez le signaler là.\n\n— Joblop`
  };
}

export const RULE_TITLES: Record<string, { en: string; fr: string }> = {
  job_unfilled_soon: { en: "Approved job starting soon with open places", fr: "Mission approuvée bientôt, places libres" },
  worker_not_checked_in: { en: "Worker not checked in 10 min after start", fr: "Travailleur sans arrivée 10 min après le début" },
  delivery_failed: { en: "Email or text that failed", fr: "Courriel ou texto non envoyé" },
  request_waiting_review: { en: "Request waiting for staff review", fr: "Demande en attente de révision" },
  timesheet_unconfirmed: { en: "Hours not confirmed by employer after 24 h", fr: "Heures non confirmées par l'employeur après 24 h" },
  timesheet_ready: { en: "Hours ready for approval", fr: "Heures prêtes à approuver" },
  invoice_overdue: { en: "Overdue invoice", fr: "Facture en retard" },
  job_missing_info: { en: "Job submitted with missing information", fr: "Mission soumise avec des informations manquantes" },
  // Phase 2: one row per action card the assistant showed (resolved at once; not a problem).
  assistant: { en: "Assistant action cards shown", fr: "Cartes d'action de l'assistant affichées" }
};

export const ACTION_TITLES: Record<string, { en: string; fr: string }> = {
  resend_failed_message: { en: "Re-send a failed email or text", fr: "Renvoyer un courriel ou texto non envoyé" },
  remind_worker_check_in: { en: "Text a worker to check in", fr: "Texter un travailleur pour qu'il fasse son arrivée" },
  remind_employer_timesheet: { en: "Email an employer to confirm hours", fr: "Écrire à un employeur pour confirmer les heures" },
  offer_employer_bonus: { en: "Offer the employer a bonus for an unfilled job", fr: "Proposer une prime à l'employeur pour une mission non pourvue" },
  auto_approve_request: { en: "Approve a request that passes every check", fr: "Approuver une demande qui passe toutes les vérifications" },
  auto_approve_timesheet: { en: "Approve hours with check-in and check-out and no problems", fr: "Approuver des heures avec arrivée, départ et aucun problème" },
  daily_summary_email: { en: "Daily summary email to staff", fr: "Résumé quotidien par courriel au personnel" },
  // Phase 2: actions a person confirmed on an assistant card.
  "assistant.claim_open_job": { en: "Assistant: worker claimed a job", fr: "Assistant : un travailleur a pris une mission" },
  "assistant.cancel_my_shift": { en: "Assistant: worker cancelled a shift", fr: "Assistant : un travailleur a annulé un quart" },
  "assistant.confirm_shift": { en: "Assistant: worker confirmed a shift", fr: "Assistant : un travailleur a confirmé un quart" },
  "assistant.create_draft_request": { en: "Assistant: employer created a draft request", fr: "Assistant : un employeur a créé un brouillon" },
  "assistant.submit_draft": { en: "Assistant: employer submitted a request", fr: "Assistant : un employeur a soumis une demande" },
  "assistant.confirm_timesheet": { en: "Assistant: employer confirmed hours", fr: "Assistant : un employeur a confirmé des heures" },
  "assistant.duplicate_request": { en: "Assistant: employer copied a request", fr: "Assistant : un employeur a copié une demande" },
  "assistant.brain_do_it": { en: "Assistant: staff ran a Brain action", fr: "Assistant : le personnel a lancé une action du cerveau" },
  "assistant.approve_request": { en: "Assistant: staff approved a request", fr: "Assistant : le personnel a approuvé une demande" },
  "assistant.approve_timesheet": { en: "Assistant: staff approved hours", fr: "Assistant : le personnel a approuvé des heures" }
};

const title = (table: Record<string, { en: string; fr: string }>, key: string, language: "en" | "fr") => table[key]?.[language] ?? key;

const MODE_LINE: Record<"en" | "fr", Record<BrainMode, string>> = {
  en: {
    off: "The brain is OFF (kill switch): it only lists problems.",
    watch: "The brain is in WATCH mode: it records what it would have done and does nothing.",
    live: "The brain is LIVE: it acts only where its switch is on."
  },
  fr: {
    off: "Le cerveau est ARRÊTÉ (arrêt d'urgence) : il ne fait que lister les problèmes.",
    watch: "Le cerveau est en mode OBSERVATION : il note ce qu'il aurait fait et ne fait rien.",
    live: "Le cerveau est ACTIF : il agit seulement là où son interrupteur est allumé."
  }
};

export function summaryCopy(language: "en" | "fr"): SummaryCopy {
  const en = language === "en";
  return {
    subject: en ? "Joblop brain — daily summary" : "Cerveau Joblop — résumé quotidien",
    intro: en ? "Here is what the brain found and did in the last 24 hours." : "Voici ce que le cerveau a trouvé et fait au cours des 24 dernières heures.",
    modeLine: (mode) => MODE_LINE[language][mode],
    foundHeading: en ? "Found" : "Trouvé",
    doneHeading: en ? "Done" : "Fait",
    simulatedHeading: en ? "Would have done (watch mode)" : "Aurait fait (mode observation)",
    failedHeading: en ? "Failed" : "Échoué",
    needsHeading: en ? "Needs a person" : "Demande une personne",
    none: en ? "nothing" : "rien",
    openLine: (count) => (en ? `Open issues now: ${count}. Open the Brain page in the staff site.` : `Problèmes ouverts : ${count}. Ouvrez la page Cerveau du site du personnel.`),
    ruleTitle: (key) => title(RULE_TITLES, key, language),
    actionTitle: (key) => title(ACTION_TITLES, key, language),
    closing: "— Joblop"
  };
}
