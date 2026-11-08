import type { PrismaClient } from "@rwos/database";
import type { EmailMessage, EmailSender } from "../mailer/emailSender";
import type { SmsSender } from "../mailer/smsSender";
import { sendsText } from "./noticeChannels";
import { resolveLanguage, type NotificationLanguage } from "./clientNotifications";
import { workerJobAddress, WORKSITE_ADDRESS_SELECT } from "../worksiteAddress";
import { pushToWorkers, type PushSender } from "./pushSender";

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
  address?: string | null;
}): EmailMessage {
  const when = formatShiftWhen(params.startAt, params.language);
  if (params.language === "en") {
    return {
      to: params.to,
      subject: "Joblop — you got the job!",
      text:
        `Good news — you're confirmed for "${params.title}".\n\n` +
        `When: ${when}\n\n` +
        (params.address ? `Where: ${params.address}\n\n` : "") +
        `Open Joblop to see the full details in your schedule. See you there!\n\n— Joblop`
    };
  }
  return {
    to: params.to,
    subject: "Joblop — vous avez obtenu le travail !",
    text:
      `Bonne nouvelle — vous êtes confirmé(e) pour « ${params.title} ».\n\n` +
      `Quand : ${when}\n\n` +
      (params.address ? `Où : ${params.address}\n\n` : "") +
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
  input: { workerIdentityId: string; amountMinor: number; currency: string; reference?: string | null },
  // Only the paths that just moved the payout to "paid" pass this, so a retried email never re-pushes.
  pushSender?: PushSender
): Promise<WorkerPayoutNotificationResult> {
  try {
    const identity = await prisma.workerIdentity.findUnique({
      where: { id: input.workerIdentityId },
      select: { userId: true, user: { select: { emailNormalized: true, primaryLanguage: true } } }
    });
    if (identity?.userId) await pushToWorkers(pushSender, [identity.userId], "payout_paid");
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
  input: { userId: string; jobRequestId: string },
  pushSender?: PushSender
): Promise<WorkerPayoutNotificationResult> {
  try {
    const [user, job] = await Promise.all([
      prisma.user.findUnique({
        where: { id: input.userId },
        select: { emailNormalized: true, phone: true, primaryLanguage: true }
      }),
      prisma.jobRequest.findUnique({
        where: { id: input.jobRequestId },
        select: { title: true, startAt: true, roleDefinition: { select: { displayLabel: true } }, residence: { select: WORKSITE_ADDRESS_SELECT }, calendarProfile: { select: { addressSummary: true } } }
      })
    ]);
    if (job) {
      await pushToWorkers(pushSender, [input.userId], "shift_confirmed", {
        role: job.roleDefinition?.displayLabel?.trim() || job.title,
        jobRequestId: input.jobRequestId
      });
    }
    const email = user?.emailNormalized;
    if (!email || !job) return { status: "no_recipient" };
    const language = resolveLanguage(user?.primaryLanguage);
    const result = await emailSender.send(
      assignedJobEmail({ to: email, language, title: job.title, startAt: job.startAt, address: workerJobAddress(job.calendarProfile?.addressSummary, job.residence) })
    );
    if (smsSender && user?.phone && sendsText("shift_confirmed")) {
      await smsSender
        .send({ to: user.phone, text: assignedJobSmsText({ language, title: job.title, startAt: job.startAt }) })
        .catch(() => undefined);
    }
    return { status: result.status === "sent" ? "sent" : result.status === "error" ? "error" : "skipped" };
  } catch {
    return { status: "error" };
  }
}

// ── Shift cancelled / shift changed ──────────────────────────────────────────────────────────────
// A worker who holds a shift (or was sent an offer for it) must hear at once when it is cancelled
// or changed, so they do not travel to a shift that is gone or arrive at the wrong time or place.
// Urgent, so by text always, plus email (noticeChannels: shift_cancelled / shift_changed).

// What a worker needs to recognise the shift: role, when, and the area (city level, never the street).
export type ShiftNoticeDetails = Readonly<{
  role: string;
  startAt: Date;
  endAt: Date;
  timeZone: string;
  area: string | null;
}>;

function formatInZone(date: Date, language: NotificationLanguage, timeZone: string, options: Intl.DateTimeFormatOptions): string {
  const locale = language === "en" ? "en-CA" : "fr-CA";
  try {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(date);
  } catch {
    try {
      return new Intl.DateTimeFormat(locale, { ...options, timeZone: "America/Toronto" }).format(date);
    } catch {
      return date.toISOString();
    }
  }
}

function shiftDate(shift: Pick<ShiftNoticeDetails, "startAt" | "timeZone">, language: NotificationLanguage): string {
  return formatInZone(shift.startAt, language, shift.timeZone, { dateStyle: "medium" });
}

function shiftDateTime(shift: Pick<ShiftNoticeDetails, "startAt" | "timeZone">, language: NotificationLanguage): string {
  return formatInZone(shift.startAt, language, shift.timeZone, { dateStyle: "medium", timeStyle: "short" });
}

function timeRange(startAt: Date, endAt: Date, language: NotificationLanguage, timeZone: string): string {
  const opts: Intl.DateTimeFormatOptions = { timeStyle: "short" };
  return `${formatInZone(startAt, language, timeZone, opts)}–${formatInZone(endAt, language, timeZone, opts)}`;
}

function calendarLine(workerWebOrigin: string | null | undefined, language: NotificationLanguage): string {
  const origin = workerWebOrigin?.trim().replace(/\/+$/, "");
  if (origin) return language === "en" ? `See your calendar: ${origin}/jobs-calendar` : `Voir votre calendrier : ${origin}/jobs-calendar`;
  return language === "en" ? "Open Joblop to see your calendar." : "Ouvrez Joblop pour voir votre calendrier.";
}

export type ShiftCancelledCopyInput = Readonly<{
  language: NotificationLanguage;
  shift: ShiftNoticeDetails;
  cancelledBy: "employer" | "staff";
  // True when the worker had only been sent an offer for the shift, not assigned to it.
  offerOnly?: boolean;
  // Hours of late-cancellation pay owed to this worker. Set ONLY when the cancel path actually
  // records that compensation (the employer cancel-confirm path, inside 24 h, with a governed rate).
  compensationHours?: number;
  reasonText?: string | null;
  workerWebOrigin?: string | null;
}>;

export function shiftCancelledSmsText(input: Pick<ShiftCancelledCopyInput, "language" | "shift" | "offerOnly">): string {
  const { language, shift } = input;
  const when = shiftDateTime(shift, language);
  if (language === "en") {
    const where = shift.area ? ` at ${shift.area}` : "";
    return input.offerOnly
      ? `Joblop: the shift you were offered, ${shift.role} on ${when}${where}, was cancelled. Check your calendar.`
      : `Joblop: your shift ${shift.role} on ${when}${where} was cancelled. Check your calendar.`;
  }
  const where = shift.area ? ` à ${shift.area}` : "";
  return input.offerOnly
    ? `Joblop : le quart qui vous était offert, ${shift.role} le ${when}${where}, a été annulé. Consultez votre calendrier.`
    : `Joblop : votre quart ${shift.role} le ${when}${where} a été annulé. Consultez votre calendrier.`;
}

export function shiftCancelledEmail(input: ShiftCancelledCopyInput & { to: string }): EmailMessage {
  const { language, shift } = input;
  const when = shiftDateTime(shift, language);
  const reason = input.reasonText?.trim();
  const hours = input.compensationHours && input.compensationHours > 0 ? input.compensationHours : null;
  if (language === "en") {
    const where = shift.area ? ` at ${shift.area}` : "";
    const who = input.cancelledBy === "employer" ? "by the employer" : "by Joblop";
    return {
      to: input.to,
      subject: "Joblop — your shift was cancelled",
      text:
        (input.offerOnly
          ? `The shift you were offered, "${shift.role}" on ${when}${where}, was cancelled ${who}. The offer no longer applies.\n\n`
          : `Your shift "${shift.role}" on ${when}${where} was cancelled ${who}. You do not need to go.\n\n`) +
        (reason ? `Reason: ${reason}\n\n` : "") +
        (hours
          ? `Because the employer cancelled less than 24 hours before the start, you are owed ${hours} hours of pay under Joblop's late-cancellation rule. Joblop has recorded it for payment.\n\n`
          : "") +
        `${calendarLine(input.workerWebOrigin, language)}\n\n` +
        `If you were already on your way, contact Joblop.\n\n— Joblop`
    };
  }
  const where = shift.area ? ` à ${shift.area}` : "";
  const who = input.cancelledBy === "employer" ? "par l'employeur" : "par Joblop";
  return {
    to: input.to,
    subject: "Joblop — votre quart a été annulé",
    text:
      (input.offerOnly
        ? `Le quart qui vous était offert, « ${shift.role} » le ${when}${where}, a été annulé ${who}. L'offre ne s'applique plus.\n\n`
        : `Votre quart « ${shift.role} » le ${when}${where} a été annulé ${who}. Vous n'avez pas à vous présenter.\n\n`) +
      (reason ? `Raison : ${reason}\n\n` : "") +
      (hours
        ? `Comme l'employeur a annulé moins de 24 heures avant le début, ${hours} heures de paie vous sont dues selon la règle d'annulation tardive de Joblop. Joblop les a enregistrées pour paiement.\n\n`
        : "") +
      `${calendarLine(input.workerWebOrigin, language)}\n\n` +
      `Si vous étiez déjà en route, communiquez avec Joblop.\n\n— Joblop`
  };
}

// What changed on a shift, as data; turned into a short plain sentence in the worker's language.
export type ShiftChangeSummary = Readonly<{
  // New start/end. `dateChanged` says the day moved (else only the time did).
  newStartAt?: Date;
  newEndAt?: Date;
  dateChanged?: boolean;
  newRole?: string;
  newPlace?: string;
  // A pending change was settled: "final" = it now applies; "withdrawn" = the original details stay.
  outcome?: "final" | "withdrawn";
}>;

export function describeShiftChange(change: ShiftChangeSummary, language: NotificationLanguage, timeZone: string): string {
  const en = language === "en";
  const parts: string[] = [];
  if (change.newStartAt && change.newEndAt) {
    const range = timeRange(change.newStartAt, change.newEndAt, language, timeZone);
    if (change.dateChanged) {
      const day = formatInZone(change.newStartAt, language, timeZone, { dateStyle: "medium" });
      parts.push(en ? `new date ${day}, ${range}` : `nouvelle date ${day}, ${range}`);
    } else {
      parts.push(en ? `new time ${range}` : `nouvel horaire ${range}`);
    }
  }
  if (change.newRole) parts.push(en ? `new role ${change.newRole}` : `nouveau poste ${change.newRole}`);
  if (change.newPlace) parts.push(en ? `new place ${change.newPlace}` : `nouveau lieu ${change.newPlace}`);
  if (change.outcome === "final") parts.push(en ? "the change is now final" : "le changement est maintenant confirmé");
  if (change.outcome === "withdrawn") {
    parts.push(en ? "the change was dropped, your original details stay" : "le changement est abandonné, vos détails d'origine restent");
  }
  return parts.join("; ") || (en ? "details updated" : "détails mis à jour");
}

export function shiftChangedSmsText(input: { language: NotificationLanguage; shift: ShiftNoticeDetails; summary: ShiftChangeSummary }): string {
  const { language, shift } = input;
  const what = describeShiftChange(input.summary, language, shift.timeZone);
  return language === "en"
    ? `Joblop: your shift ${shift.role} on ${shiftDate(shift, language)} changed: ${what}. Open your calendar to see the new details.`
    : `Joblop : votre quart ${shift.role} le ${shiftDate(shift, language)} a changé : ${what}. Ouvrez votre calendrier pour voir les nouveaux détails.`;
}

export function shiftChangedEmail(input: {
  to: string;
  language: NotificationLanguage;
  shift: ShiftNoticeDetails;
  summary: ShiftChangeSummary;
  workerWebOrigin?: string | null;
}): EmailMessage {
  const { language, shift } = input;
  const what = describeShiftChange(input.summary, language, shift.timeZone);
  const when = shiftDateTime(shift, language);
  if (language === "en") {
    const where = shift.area ? ` at ${shift.area}` : "";
    return {
      to: input.to,
      subject: "Joblop — your shift has changed",
      text:
        `Your shift "${shift.role}" on ${when}${where} has changed: ${what}.\n\n` +
        `${calendarLine(input.workerWebOrigin, language)}\n\n` +
        `If you can no longer work this shift, contact Joblop.\n\n— Joblop`
    };
  }
  const where = shift.area ? ` à ${shift.area}` : "";
  return {
    to: input.to,
    subject: "Joblop — votre quart a changé",
    text:
      `Votre quart « ${shift.role} » le ${when}${where} a changé : ${what}.\n\n` +
      `${calendarLine(input.workerWebOrigin, language)}\n\n` +
      `Si vous ne pouvez plus faire ce quart, communiquez avec Joblop.\n\n— Joblop`
  };
}

// One worker to tell. `offerOnly` / `compensationHours` only apply to cancellations.
export type ShiftNoticeWorker = Readonly<{ userId: string; offerOnly?: boolean; compensationHours?: number }>;

export type ShiftNoticeResult = Readonly<{ sent: number; skipped: number; failed: number }>;

type ShiftNoticeRecipient = Readonly<{ worker: ShiftNoticeWorker; email: string | null; phone: string | null; language: NotificationLanguage }>;

async function loadShiftNoticeContext(
  prisma: PrismaClient,
  jobRequestId: string,
  workers: readonly ShiftNoticeWorker[]
): Promise<{ shift: ShiftNoticeDetails; recipients: ShiftNoticeRecipient[] } | null> {
  // One notice per worker, even when they appear twice (e.g. an offer and its assignment).
  const unique = [...new Map(workers.map((w) => [w.userId, w] as const)).values()];
  if (unique.length === 0) return null;
  const [job, users] = await Promise.all([
    prisma.jobRequest.findUnique({
      where: { id: jobRequestId },
      select: {
        title: true,
        startAt: true,
        endAt: true,
        timezone: true,
        roleDefinition: { select: { displayLabel: true } },
        residence: { select: { city: true, region: true, province: true } }
      }
    }),
    prisma.user.findMany({
      where: { id: { in: unique.map((w) => w.userId) } },
      select: { id: true, emailNormalized: true, phone: true, primaryLanguage: true }
    })
  ]);
  if (!job) return null;
  const byId = new Map(users.map((u) => [u.id, u] as const));
  const shift: ShiftNoticeDetails = {
    role: job.roleDefinition?.displayLabel?.trim() || job.title,
    startAt: job.startAt,
    endAt: job.endAt,
    timeZone: job.timezone || "America/Toronto",
    area: job.residence?.city?.trim() || job.residence?.region?.trim() || job.residence?.province?.trim() || null
  };
  const recipients = unique.map((worker) => {
    const user = byId.get(worker.userId);
    return {
      worker,
      email: user?.emailNormalized ?? null,
      phone: user?.phone ?? null,
      language: resolveLanguage(user?.primaryLanguage)
    };
  });
  return { shift, recipients };
}

async function deliverShiftNotice(
  recipient: ShiftNoticeRecipient,
  emailSender: EmailSender,
  smsSender: SmsSender | undefined,
  textAllowed: boolean,
  build: () => { email: EmailMessage | null; sms: string }
): Promise<"sent" | "skipped" | "failed"> {
  try {
    const { email, sms } = build();
    let delivered = false;
    let failed = false;
    if (email) {
      const result = await emailSender.send(email).catch(() => ({ status: "error" }) as const);
      if (result.status === "sent") delivered = true;
      if (result.status === "error") failed = true;
    }
    if (smsSender && recipient.phone && textAllowed) {
      const result = await smsSender.send({ to: recipient.phone, text: sms }).catch(() => ({ status: "error" }) as const);
      if (result.status === "sent") delivered = true;
      if (result.status === "error") failed = true;
    }
    return failed ? "failed" : delivered ? "sent" : "skipped";
  } catch {
    return "failed";
  }
}

function tally(outcomes: readonly ("sent" | "skipped" | "failed")[]): ShiftNoticeResult {
  return {
    sent: outcomes.filter((o) => o === "sent").length,
    skipped: outcomes.filter((o) => o === "skipped").length,
    failed: outcomes.filter((o) => o === "failed").length
  };
}

// Tell each worker who held (or was sent an offer for) the shift that it was cancelled: text always
// + email. Best-effort; never throws into the request path. The caller collects the workers BEFORE
// the cancel changes any status, and calls this only after the cancel succeeded.
export async function notifyWorkersShiftCancelled(
  prisma: PrismaClient,
  emailSender: EmailSender,
  smsSender: SmsSender | undefined,
  input: {
    jobRequestId: string;
    workers: readonly ShiftNoticeWorker[];
    cancelledBy: "employer" | "staff";
    reasonText?: string | null;
    workerWebOrigin?: string | null;
  },
  pushSender?: PushSender
): Promise<ShiftNoticeResult> {
  try {
    const context = await loadShiftNoticeContext(prisma, input.jobRequestId, input.workers);
    if (!context) return { sent: 0, skipped: input.workers.length, failed: 0 };
    await pushToWorkers(pushSender, context.recipients.map((r) => r.worker.userId), "shift_cancelled", {
      role: context.shift.role,
      jobRequestId: input.jobRequestId
    });
    const outcomes = await Promise.all(
      context.recipients.map((recipient) =>
        deliverShiftNotice(recipient, emailSender, smsSender, sendsText("shift_cancelled"), () => {
          const copy = {
            language: recipient.language,
            shift: context.shift,
            cancelledBy: input.cancelledBy,
            offerOnly: recipient.worker.offerOnly === true,
            compensationHours: recipient.worker.compensationHours ?? 0,
            reasonText: input.reasonText ?? null,
            workerWebOrigin: input.workerWebOrigin ?? null
          };
          return {
            email: recipient.email ? shiftCancelledEmail({ ...copy, to: recipient.email }) : null,
            sms: shiftCancelledSmsText(copy)
          };
        })
      )
    );
    return tally(outcomes);
  } catch {
    return { sent: 0, skipped: 0, failed: input.workers.length };
  }
}

// Tell each worker assigned to the shift what changed on it: text always + email. Best-effort.
export async function notifyWorkersShiftChanged(
  prisma: PrismaClient,
  emailSender: EmailSender,
  smsSender: SmsSender | undefined,
  input: {
    jobRequestId: string;
    workers: readonly ShiftNoticeWorker[];
    summary: ShiftChangeSummary;
    workerWebOrigin?: string | null;
  },
  pushSender?: PushSender
): Promise<ShiftNoticeResult> {
  try {
    const context = await loadShiftNoticeContext(prisma, input.jobRequestId, input.workers);
    if (!context) return { sent: 0, skipped: input.workers.length, failed: 0 };
    await pushToWorkers(pushSender, context.recipients.map((r) => r.worker.userId), "shift_changed", {
      role: context.shift.role,
      jobRequestId: input.jobRequestId
    });
    const outcomes = await Promise.all(
      context.recipients.map((recipient) =>
        deliverShiftNotice(recipient, emailSender, smsSender, sendsText("shift_changed"), () => ({
          email: recipient.email
            ? shiftChangedEmail({
                to: recipient.email,
                language: recipient.language,
                shift: context.shift,
                summary: input.summary,
                workerWebOrigin: input.workerWebOrigin ?? null
              })
            : null,
          sms: shiftChangedSmsText({ language: recipient.language, shift: context.shift, summary: input.summary })
        }))
      )
    );
    return tally(outcomes);
  } catch {
    return { sent: 0, skipped: 0, failed: input.workers.length };
  }
}
