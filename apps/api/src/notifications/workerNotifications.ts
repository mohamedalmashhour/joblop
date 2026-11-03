import type { PrismaClient } from "@rwos/database";
import type { EmailMessage, EmailSender } from "../mailer/emailSender";
import type { SmsSender } from "../mailer/smsSender";
import { resolveLanguage, type NotificationLanguage } from "./clientNotifications";

// Format a shift start in Québec local time, in the worker's language. Kept simple + fail-soft.
function formatShiftWhen(startAt: Date, language: NotificationLanguage): string {
  try {
    return new Intl.DateTimeFormat(language === "en" ? "en-CA" : "fr-CA", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "America/Toronto"
    }).format(startAt);
  } catch {
    return startAt.toISOString();
  }
}

// Worker-facing notification capsule — the end of the owner's flow: "inform the worker that the
// money was transferred to their account." Bilingual (FR default for QC), pure copy + a best-effort
// dispatcher that resolves the worker's email from their identity and sends through the gated mailer.
// It NEVER moves money and NEVER throws into the caller — a missing recipient or unconfigured mailer
// is a quiet skip. The caller only fires this once a real payout transition to "paid" has happened,
// which itself is finance-gated.

function formatMoney(amountMinor: number, currency: string): string {
  return `${(amountMinor / 100).toFixed(2)} ${currency}`;
}

export function payoutPaidEmail(params: {
  to: string;
  language: NotificationLanguage;
  amountMinor: number;
  currency: string;
  // Optional payment reference (Phase 2 test execution records a Stripe TEST transfer id or a
  // synthetic reference); when present it is shown so the worker can reconcile the payment.
  reference?: string | null;
}): EmailMessage {
  const amount = formatMoney(params.amountMinor, params.currency);
  const ref = params.reference?.trim();
  if (params.language === "en") {
    return {
      to: params.to,
      subject: "Joblop — your payment has been sent",
      text:
        `Your payment of ${amount} has been transferred to your account.\n\n` +
        (ref ? `Reference: ${ref}\n\n` : "") +
        `Thanks for the work you did through Joblop. This completes the transaction.\n\n— Joblop`
    };
  }
  return {
    to: params.to,
    subject: "Joblop — votre paiement a été envoyé",
    text:
      `Votre paiement de ${amount} a été transféré dans votre compte.\n\n` +
      (ref ? `Référence : ${ref}\n\n` : "") +
      `Merci pour le travail effectué via Joblop. Ceci complète la transaction.\n\n— Joblop`
  };
}

// The "amount is now registered in your account" notice — fired when the 48h dispute/confirmation
// window closes clean, BEFORE the money is transferred. Distinct from payoutPaidEmail ("sent/paid"):
// this tells the worker the amount is confirmed as theirs and will be transferred on the normal cycle.
export function payoutRegisteredEmail(params: {
  to: string;
  language: NotificationLanguage;
  amountMinor: number;
  currency: string;
}): EmailMessage {
  const amount = formatMoney(params.amountMinor, params.currency);
  if (params.language === "en") {
    return {
      to: params.to,
      subject: "Joblop — your earnings are now confirmed",
      text:
        `${amount} is now registered in your account.\n\n` +
        `This amount is confirmed as yours and will be transferred to you on the normal payment cycle. ` +
        `You will get a second message once the transfer has been sent.\n\n— Joblop`
    };
  }
  return {
    to: params.to,
    subject: "Joblop — vos gains sont maintenant confirmés",
    text:
      `${amount} est maintenant enregistré dans votre compte.\n\n` +
      `Ce montant vous est confirmé et vous sera transféré selon le cycle de paiement habituel. ` +
      `Vous recevrez un second message une fois le transfert effectué.\n\n— Joblop`
  };
}

export function accountPenaltyEmail(params: {
  to: string;
  language: NotificationLanguage;
  penalty: "suspend" | "permanent_close";
  suspensionDays: number;
}): EmailMessage {
  const suspend = params.penalty === "suspend";
  if (params.language === "en") {
    return {
      to: params.to,
      subject: suspend ? "Joblop — your account is suspended" : "Joblop — your account has been closed",
      text: suspend
        ? `Because you cancelled a confirmed job less than 24 hours before it started, your Joblop account is suspended for ${params.suspensionDays} days. It will be reactivated automatically after that. Repeated late cancellations lead to permanent closure.\n\n— Joblop`
        : `Because of repeated late cancellations of confirmed jobs, your Joblop account has been closed.\n\n— Joblop`
    };
  }
  return {
    to: params.to,
    subject: suspend ? "Joblop — votre compte est suspendu" : "Joblop — votre compte a été fermé",
    text: suspend
      ? `Parce que vous avez annulé un travail confirmé moins de 24 heures avant le début, votre compte Joblop est suspendu pour ${params.suspensionDays} jours. Il sera réactivé automatiquement par la suite. Des annulations tardives répétées entraînent une fermeture définitive.\n\n— Joblop`
      : `En raison d'annulations tardives répétées de travaux confirmés, votre compte Joblop a été fermé.\n\n— Joblop`
  };
}

// "You got the job!" — confirmation that a worker is assigned to a shift. Email copy, bilingual.
export function assignedJobEmail(params: {
  to: string;
  language: NotificationLanguage;
  title: string;
  startAt: Date;
}): EmailMessage {
  const when = formatShiftWhen(params.startAt, params.language);
  if (params.language === "en") {
    return {
      to: params.to,
      subject: "Joblop — you got the job!",
      text:
        `Good news — you're confirmed for "${params.title}".\n\n` +
        `When: ${when}\n\n` +
        `Open Joblop to see the full details in your schedule. See you there!\n\n— Joblop`
    };
  }
  return {
    to: params.to,
    subject: "Joblop — vous avez obtenu le travail !",
    text:
      `Bonne nouvelle — vous êtes confirmé(e) pour « ${params.title} ».\n\n` +
      `Quand : ${when}\n\n` +
      `Ouvrez Joblop pour voir tous les détails dans votre horaire. À bientôt !\n\n— Joblop`
  };
}

// Short SMS twin of assignedJobEmail (SMS is billed per message, so keep it tight).
export function assignedJobSmsText(params: {
  language: NotificationLanguage;
  title: string;
  startAt: Date;
}): string {
  const when = formatShiftWhen(params.startAt, params.language);
  return params.language === "en"
    ? `JobLop: you got the job! "${params.title}" — ${when}. Details in the app.`
    : `JobLop : travail obtenu ! « ${params.title} » — ${when}. Détails dans l'app.`;
}

// Pre-shift reminder — "your shift is coming up". Email copy, bilingual.
export function shiftReminderEmail(params: {
  to: string;
  language: NotificationLanguage;
  title: string;
  startAt: Date;
}): EmailMessage {
  const when = formatShiftWhen(params.startAt, params.language);
  if (params.language === "en") {
    return {
      to: params.to,
      subject: "Joblop — reminder: your shift is coming up",
      text:
        `This is a reminder for your upcoming shift "${params.title}".\n\n` +
        `When: ${when}\n\n` +
        `Open Joblop for the full details. Please arrive on time.\n\n— Joblop`
    };
  }
  return {
    to: params.to,
    subject: "Joblop — rappel : votre quart approche",
    text:
      `Rappel pour votre prochain quart « ${params.title} ».\n\n` +
      `Quand : ${when}\n\n` +
      `Ouvrez Joblop pour tous les détails. Merci d'arriver à l'heure.\n\n— Joblop`
  };
}

// Short SMS twin of shiftReminderEmail.
export function shiftReminderSmsText(params: {
  language: NotificationLanguage;
  title: string;
  startAt: Date;
}): string {
  const when = formatShiftWhen(params.startAt, params.language);
  return params.language === "en"
    ? `JobLop reminder: "${params.title}" — ${when}. Details in the app.`
    : `Rappel JobLop : « ${params.title} » — ${when}. Détails dans l'app.`;
}

export type WorkerPayoutNotificationResult = Readonly<{
  status: "sent" | "skipped" | "error" | "no_recipient";
}>;

// Resolve the worker (identity → user) and send the "money transferred" email. Best-effort.
export async function notifyWorkerPayoutPaid(
  prisma: PrismaClient,
  emailSender: EmailSender,
  input: { workerIdentityId: string; amountMinor: number; currency: string; reference?: string | null }
): Promise<WorkerPayoutNotificationResult> {
  try {
    const identity = await prisma.workerIdentity.findUnique({
      where: { id: input.workerIdentityId },
      select: { user: { select: { emailNormalized: true, primaryLanguage: true } } }
    });
    const email = identity?.user?.emailNormalized;
    if (!email) return { status: "no_recipient" };
    const message = payoutPaidEmail({
      to: email,
      language: resolveLanguage(identity?.user?.primaryLanguage),
      amountMinor: input.amountMinor,
      currency: input.currency,
      reference: input.reference ?? null
    });
    const result = await emailSender.send(message);
    return { status: result.status === "sent" ? "sent" : result.status === "error" ? "error" : "skipped" };
  } catch {
    return { status: "error" };
  }
}

// Resolve the worker (identity → user) and send the "registered in your account" email. Best-effort.
export async function notifyWorkerPayoutRegistered(
  prisma: PrismaClient,
  emailSender: EmailSender,
  input: { workerIdentityId: string; amountMinor: number; currency: string }
): Promise<WorkerPayoutNotificationResult> {
  try {
    const identity = await prisma.workerIdentity.findUnique({
      where: { id: input.workerIdentityId },
      select: { user: { select: { emailNormalized: true, primaryLanguage: true } } }
    });
    const email = identity?.user?.emailNormalized;
    if (!email) return { status: "no_recipient" };
    const message = payoutRegisteredEmail({
      to: email,
      language: resolveLanguage(identity?.user?.primaryLanguage),
      amountMinor: input.amountMinor,
      currency: input.currency
    });
    const result = await emailSender.send(message);
    return { status: result.status === "sent" ? "sent" : result.status === "error" ? "error" : "skipped" };
  } catch {
    return { status: "error" };
  }
}

// Notify a worker their account was suspended / closed for a late cancellation. Best-effort.
export async function notifyWorkerAccountPenalty(
  prisma: PrismaClient,
  emailSender: EmailSender,
  input: { workerIdentityId: string; penalty: "suspend" | "permanent_close"; suspensionDays: number }
): Promise<WorkerPayoutNotificationResult> {
  try {
    const identity = await prisma.workerIdentity.findUnique({
      where: { id: input.workerIdentityId },
      select: { user: { select: { emailNormalized: true, primaryLanguage: true } } }
    });
    const email = identity?.user?.emailNormalized;
    if (!email) return { status: "no_recipient" };
    const message = accountPenaltyEmail({
      to: email,
      language: resolveLanguage(identity?.user?.primaryLanguage),
      penalty: input.penalty,
      suspensionDays: input.suspensionDays
    });
    const result = await emailSender.send(message);
    return { status: result.status === "sent" ? "sent" : result.status === "error" ? "error" : "skipped" };
  } catch {
    return { status: "error" };
  }
}

// "You got the job!" — notify a worker (by userId) that they are confirmed for a shift. Sends email
// AND, when enabled + a phone is on file, SMS. Best-effort: resolves the user + job, never throws.
export async function notifyWorkerAssigned(
  prisma: PrismaClient,
  emailSender: EmailSender,
  smsSender: SmsSender | undefined,
  input: { userId: string; jobRequestId: string }
): Promise<WorkerPayoutNotificationResult> {
  try {
    const [user, job] = await Promise.all([
      prisma.user.findUnique({
        where: { id: input.userId },
        select: { emailNormalized: true, phone: true, primaryLanguage: true }
      }),
      prisma.jobRequest.findUnique({
        where: { id: input.jobRequestId },
        select: { title: true, startAt: true }
      })
    ]);
    const email = user?.emailNormalized;
    if (!email || !job) return { status: "no_recipient" };
    const language = resolveLanguage(user?.primaryLanguage);
    const result = await emailSender.send(
      assignedJobEmail({ to: email, language, title: job.title, startAt: job.startAt })
    );
    if (smsSender && user?.phone) {
      await smsSender
        .send({ to: user.phone, text: assignedJobSmsText({ language, title: job.title, startAt: job.startAt }) })
        .catch(() => undefined);
    }
    return { status: result.status === "sent" ? "sent" : result.status === "error" ? "error" : "skipped" };
  } catch {
    return { status: "error" };
  }
}
