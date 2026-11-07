import type { PrismaClient } from "@rwos/database";
import type { EmailMessage, EmailSender } from "../mailer/emailSender";

// Client-facing notification capsule — the two emails the owner's flow calls for:
//   1. job code → client when admin approves the request for dispatch.
//   2. "a worker accepted" → client when a worker accepts (assignment confirmed).
// Copy is pure + bilingual (Québec: French default, English when the user's language is "en"), so it
// is fully testable. The dispatcher is best-effort: it resolves the client from the job request's
// creator, sends through the gated email capsule, and NEVER throws into the governed path — a missing
// recipient or an unconfigured mailer is a quiet skip, not a failure. No money, no DB writes.

export type NotificationLanguage = "fr" | "en";

export function resolveLanguage(primaryLanguage: string | null | undefined): NotificationLanguage {
  return primaryLanguage?.toLowerCase().startsWith("en") ? "en" : "fr";
}

export function jobCodeEmail(params: {
  to: string;
  language: NotificationLanguage;
  jobCode: string;
  title: string;
}): EmailMessage {
  const { to, jobCode, title } = params;
  if (params.language === "en") {
    return {
      to,
      subject: `Joblop — your request is approved (${jobCode})`,
      text:
        `Good news — your staffing request "${title}" has been approved and is now open to workers.\n\n` +
        `Your job code is ${jobCode}. Keep it to track this request and find it in your calendar.\n\n` +
        `We'll let you know as soon as a worker accepts.\n\n— Joblop`
    };
  }
  return {
    to,
    subject: `Joblop — votre demande est approuvée (${jobCode})`,
    text:
      `Bonne nouvelle — votre demande de personnel « ${title} » a été approuvée et est maintenant ouverte aux travailleurs.\n\n` +
      `Votre code de mission est ${jobCode}. Conservez-le pour suivre cette demande et la retrouver dans votre calendrier.\n\n` +
      `Nous vous aviserons dès qu'un travailleur l'accepte.\n\n— Joblop`
  };
}

export function workerAcceptedEmail(params: {
  to: string;
  language: NotificationLanguage;
  jobCode: string;
  title: string;
}): EmailMessage {
  const { to, jobCode, title } = params;
  if (params.language === "en") {
    return {
      to,
      subject: `Joblop — a worker accepted (${jobCode})`,
      text:
        `A worker has accepted your request "${title}" (job code ${jobCode}).\n\n` +
        `The shift is now confirmed and appears in the worker's schedule. You'll see it in your calendar too.\n\n— Joblop`
    };
  }
  return {
    to,
    subject: `Joblop — un travailleur a accepté (${jobCode})`,
    text:
      `Un travailleur a accepté votre demande « ${title} » (code de mission ${jobCode}).\n\n` +
      `Le quart est maintenant confirmé et apparaît dans l'horaire du travailleur. Vous le verrez aussi dans votre calendrier.\n\n— Joblop`
  };
}

// An invoice has been sent. The figures are in the attached PDF, and the employer pays in Joblop.
export function invoiceSentEmail(params: {
  to: string;
  language: NotificationLanguage;
  invoiceNumber: string;
  pdf?: Readonly<{ name: string; contentBase64: string }> | null;
}): EmailMessage {
  const attachments = params.pdf ? { attachments: [params.pdf] } : {};
  if (params.language === "en") {
    return {
      to: params.to,
      subject: `Joblop — invoice ${params.invoiceNumber} is ready`,
      text:
        `Your invoice ${params.invoiceNumber} is ready.${params.pdf ? " A copy is attached." : ""}\n\n` +
        `Sign in to Joblop and open Invoices to see it and pay.\n\n— Joblop`,
      ...attachments
    };
  }
  return {
    to: params.to,
    subject: `Joblop — la facture ${params.invoiceNumber} est prête`,
    text:
      `Votre facture ${params.invoiceNumber} est prête.${params.pdf ? " Une copie est jointe." : ""}\n\n` +
      `Connectez-vous à Joblop et ouvrez Factures pour la consulter et la payer.\n\n— Joblop`,
    ...attachments
  };
}

// The employer contact is whoever created the job, the same person who gets its other notices.
export async function notifyClientInvoiceSent(
  prisma: PrismaClient,
  emailSender: EmailSender,
  input: { invoiceId: string; organizationId: string; pdf?: Readonly<{ name: string; contentBase64: string }> | null }
): Promise<"sent" | "skipped" | "error" | "no_recipient"> {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: input.invoiceId, organizationId: input.organizationId },
      select: { invoiceNumber: true, timesheetId: true }
    });
    if (!invoice?.invoiceNumber) return "no_recipient";
    const timesheet = await prisma.timesheet.findFirst({
      where: { id: invoice.timesheetId, organizationId: input.organizationId },
      select: { jobRequestId: true }
    });
    const job = timesheet
      ? await prisma.jobRequest.findUnique({ where: { id: timesheet.jobRequestId }, select: { createdByUserId: true } })
      : null;
    if (!job?.createdByUserId) return "no_recipient";
    const user = await prisma.user.findUnique({
      where: { id: job.createdByUserId },
      select: { emailNormalized: true, primaryLanguage: true }
    });
    if (!user?.emailNormalized) return "no_recipient";
    const result = await emailSender.send(
      invoiceSentEmail({ to: user.emailNormalized, language: resolveLanguage(user.primaryLanguage), invoiceNumber: invoice.invoiceNumber, pdf: input.pdf ?? null })
    );
    return result.status === "sent" ? "sent" : result.status === "error" ? "error" : "skipped";
  } catch {
    return "error";
  }
}

export type ClientNotificationKind = "job_code" | "worker_accepted";

export type ClientNotificationResult =
  | Readonly<{ status: "sent" | "skipped" | "error"; kind: ClientNotificationKind }>
  | Readonly<{ status: "no_recipient"; kind: ClientNotificationKind }>;

// Resolve the client (job request creator) and send one notification. Best-effort, never throws.
export async function notifyClient(
  prisma: PrismaClient,
  emailSender: EmailSender,
  input: { jobRequestId: string; kind: ClientNotificationKind }
): Promise<ClientNotificationResult> {
  const { kind } = input;
  try {
    const job = await prisma.jobRequest.findUnique({
      where: { id: input.jobRequestId },
      select: { jobRequestNumber: true, title: true, createdByUserId: true }
    });
    if (!job?.createdByUserId) return { status: "no_recipient", kind };
    const user = await prisma.user.findUnique({
      where: { id: job.createdByUserId },
      select: { emailNormalized: true, primaryLanguage: true }
    });
    if (!user?.emailNormalized) return { status: "no_recipient", kind };

    const language = resolveLanguage(user.primaryLanguage);
    const copy = { to: user.emailNormalized, language, jobCode: job.jobRequestNumber, title: job.title };
    const message = kind === "job_code" ? jobCodeEmail(copy) : workerAcceptedEmail(copy);
    const result = await emailSender.send(message);
    return { status: result.status === "sent" ? "sent" : result.status === "error" ? "error" : "skipped", kind };
  } catch {
    return { status: "error", kind };
  }
}
