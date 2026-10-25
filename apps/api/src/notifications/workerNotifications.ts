import type { PrismaClient } from "@rwos/database";
import type { EmailMessage, EmailSender } from "../mailer/emailSender";
import { resolveLanguage, type NotificationLanguage } from "./clientNotifications";

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
}): EmailMessage {
  const amount = formatMoney(params.amountMinor, params.currency);
  if (params.language === "en") {
    return {
      to: params.to,
      subject: "JobLop — your payment has been sent",
      text:
        `Your payment of ${amount} has been transferred to your account.\n\n` +
        `Thanks for the work you did through JobLop. This completes the transaction.\n\n— JobLop`
    };
  }
  return {
    to: params.to,
    subject: "JobLop — votre paiement a été envoyé",
    text:
      `Votre paiement de ${amount} a été transféré dans votre compte.\n\n` +
      `Merci pour le travail effectué via JobLop. Ceci complète la transaction.\n\n— JobLop`
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
      subject: suspend ? "JobLop — your account is suspended" : "JobLop — your account has been closed",
      text: suspend
        ? `Because you cancelled a confirmed job less than 24 hours before it started, your JobLop account is suspended for ${params.suspensionDays} days. It will be reactivated automatically after that. Repeated late cancellations lead to permanent closure.\n\n— JobLop`
        : `Because of repeated late cancellations of confirmed jobs, your JobLop account has been closed.\n\n— JobLop`
    };
  }
  return {
    to: params.to,
    subject: suspend ? "JobLop — votre compte est suspendu" : "JobLop — votre compte a été fermé",
    text: suspend
      ? `Parce que vous avez annulé un travail confirmé moins de 24 heures avant le début, votre compte JobLop est suspendu pour ${params.suspensionDays} jours. Il sera réactivé automatiquement par la suite. Des annulations tardives répétées entraînent une fermeture définitive.\n\n— JobLop`
      : `En raison d'annulations tardives répétées de travaux confirmés, votre compte JobLop a été fermé.\n\n— JobLop`
  };
}

export type WorkerPayoutNotificationResult = Readonly<{
  status: "sent" | "skipped" | "error" | "no_recipient";
}>;

// Resolve the worker (identity → user) and send the "money transferred" email. Best-effort.
export async function notifyWorkerPayoutPaid(
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
    const message = payoutPaidEmail({
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
