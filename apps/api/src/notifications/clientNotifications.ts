import type { PrismaClient } from "@rwos/database";
import type { EmailMessage, EmailSender } from "../mailer/emailSender";

// Client-facing notification capsule — the two emails the owner's flow calls for:
//   1. job code → client when admin approves the request for dispatch.
//   2. "a worker accepted" → client when a worker accepts (assignment confirmed).
// Copy is pure + bilingual (Québec: French default, English when the user's language is "en"), so it
// is fully testable. The dispatcher is best-effort: it resolves the client from the job request's
// creator, sends through the gated email capsule, and NEVER throws into the governed path — a missing
// recipient or an unconfigured mailer is a quiet skip, not a failure. No money, no DB writes.

export type NotificationLanguage = "fr" | "en" | "ar";

// The person's own language: English, Arabic, or French (the Québec default).
export function resolveLanguage(primaryLanguage: string | null | undefined): NotificationLanguage {
  const value = primaryLanguage?.toLowerCase() ?? "";
  if (value.startsWith("en")) return "en";
  if (value.startsWith("ar")) return "ar";
  return "fr";
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
  if (params.language === "ar") {
    return {
      to,
      subject: `Joblop — تمت الموافقة على طلبك (${jobCode})`,
      text:
        `خبر سار: تمت الموافقة على طلب العمال «${title}» وأصبح الآن متاحًا للعمال.\n\n` +
        `رمز المهمة هو ${jobCode}. احتفظ به لمتابعة هذا الطلب والعثور عليه في تقويمك.\n\n` +
        `سنُعلمك فور قبول أحد العمال.\n\n— Joblop`
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
  if (params.language === "ar") {
    return {
      to,
      subject: `Joblop — قبل أحد العمال طلبك (${jobCode})`,
      text:
        `قبل أحد العمال طلبك «${title}» (رمز المهمة ${jobCode}).\n\n` +
        `المناوبة مؤكدة الآن وتظهر في جدول العامل، وستراها في تقويمك أيضًا.\n\n— Joblop`
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

// A booked worker cancelled their shift. The place is open again and Joblop is looking for someone.
export function workerCancelledEmail(params: {
  to: string;
  language: NotificationLanguage;
  jobCode: string;
  title: string;
}): EmailMessage {
  const { to, jobCode, title } = params;
  if (params.language === "en") {
    return {
      to,
      subject: `Joblop — a worker cancelled (${jobCode})`,
      text:
        `The worker booked for your request "${title}" (job code ${jobCode}) has cancelled.\n\n` +
        `The place is open again and Joblop is looking for another worker. You don't need to do anything; we'll tell you when someone takes it.\n\n— Joblop`
    };
  }
  if (params.language === "ar") {
    return {
      to,
      subject: `Joblop — ألغى أحد العمال مناوبته (${jobCode})`,
      text:
        `ألغى العامل المحجوز لطلبك «${title}» (رمز المهمة ${jobCode}) مناوبته.\n\n` +
        `أصبح المكان متاحًا من جديد وJoblop تبحث عن عامل آخر. لا داعي لأي إجراء منك، وسنُعلمك عندما يأخذه أحد.\n\n— Joblop`
    };
  }
  return {
    to,
    subject: `Joblop — un travailleur a annulé (${jobCode})`,
    text:
      `Le travailleur réservé pour votre demande « ${title} » (code de mission ${jobCode}) a annulé.\n\n` +
      `La place est de nouveau ouverte et Joblop cherche un autre travailleur. Vous n'avez rien à faire; nous vous avertirons quand quelqu'un la prendra.\n\n— Joblop`
  };
}

export type BonusOfferKind = "hourly" | "transport" | "one_time";

function formatCad(amountMinor: number, language: NotificationLanguage): string {
  const dollars = (amountMinor / 100).toFixed(2);
  return language === "fr" ? `${dollars.replace(".", ",")} $` : `$${dollars}`;
}

// Joblop suggests a bonus to help fill an approved job that is still open. The employer accepts or
// declines in Joblop; an accepted bonus is added to the invoice for this job (taxes apply).
export function bonusOfferEmail(params: {
  to: string;
  language: NotificationLanguage;
  jobCode: string;
  title: string;
  bonusKind: BonusOfferKind;
  amountMinor: number;
}): EmailMessage {
  const { to, jobCode, title } = params;
  const amount = formatCad(params.amountMinor, params.language);
  if (params.language === "en") {
    const what =
      params.bonusKind === "hourly"
        ? `${amount} more per hour worked`
        : params.bonusKind === "transport"
          ? `${amount} transport money per worker per shift`
          : `a one-time ${amount} per worker per shift`;
    return {
      to,
      subject: `Joblop — a bonus could help fill your request (${jobCode})`,
      text:
        `Your request "${title}" (job code ${jobCode}) still has open places.

` +
        `To attract workers faster, Joblop suggests a bonus: ${what}.

` +
        `If you accept, the bonus is added to the invoice for this job (taxes apply). If you decline, nothing changes.

` +
        `Sign in to Joblop and open this request to accept or decline.

— Joblop`
    };
  }
  if (params.language === "ar") {
    const whatAr =
      params.bonusKind === "hourly"
        ? `${amount} إضافية عن كل ساعة عمل`
        : params.bonusKind === "transport"
          ? `${amount} بدل نقل لكل عامل عن كل مناوبة`
          : `مبلغ ${amount} لمرة واحدة لكل عامل عن كل مناوبة`;
    return {
      to,
      subject: `Joblop — مكافأة قد تساعد في تغطية طلبك (${jobCode})`,
      text:
        `ما زالت هناك أماكن شاغرة في طلبك «${title}» (رمز المهمة ${jobCode}).\n\n` +
        `لجذب العمال بسرعة أكبر، تقترح Joblop مكافأة: ${whatAr}.\n\n` +
        `إذا قبلت، تُضاف المكافأة إلى فاتورة هذه المهمة (مع الضرائب). وإذا رفضت، لا يتغير شيء.\n\n` +
        `سجّل الدخول إلى Joblop وافتح هذا الطلب للقبول أو الرفض.\n\n— Joblop`
    };
  }
  const what =
    params.bonusKind === "hourly"
      ? `${amount} de plus par heure travaillée`
      : params.bonusKind === "transport"
        ? `${amount} pour le transport, par travailleur et par quart`
        : `un montant unique de ${amount} par travailleur et par quart`;
  return {
    to,
    subject: `Joblop — une prime pourrait aider à combler votre demande (${jobCode})`,
    text:
      `Votre demande « ${title} » (code de mission ${jobCode}) a encore des places libres.

` +
      `Pour attirer des travailleurs plus vite, Joblop suggère une prime : ${what}.

` +
      `Si vous acceptez, la prime est ajoutée à la facture de cette mission (taxes applicables). Si vous refusez, rien ne change.

` +
      `Connectez-vous à Joblop et ouvrez cette demande pour accepter ou refuser.

— Joblop`
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
  if (params.language === "ar") {
    return {
      to: params.to,
      subject: `Joblop — الفاتورة ${params.invoiceNumber} جاهزة`,
      text:
        `فاتورتك ${params.invoiceNumber} جاهزة.${params.pdf ? " نسخة منها مرفقة." : ""}\n\n` +
        `سجّل الدخول إلى Joblop وافتح «الفواتير» للاطلاع عليها ودفعها.\n\n— Joblop`,
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

export type ClientNotificationKind = "job_code" | "worker_accepted" | "worker_cancelled" | "bonus_offer";

export type ClientNotificationInput =
  | Readonly<{ jobRequestId: string; kind: "job_code" | "worker_accepted" | "worker_cancelled" }>
  | Readonly<{ jobRequestId: string; kind: "bonus_offer"; bonus: Readonly<{ kind: BonusOfferKind; amountMinor: number }> }>;

export type ClientNotificationResult =
  | Readonly<{ status: "sent" | "skipped" | "error"; kind: ClientNotificationKind }>
  | Readonly<{ status: "no_recipient"; kind: ClientNotificationKind }>;

// Resolve the client (job request creator) and send one notification. Best-effort, never throws.
export async function notifyClient(
  prisma: PrismaClient,
  emailSender: EmailSender,
  input: ClientNotificationInput
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
    let message: EmailMessage;
    switch (input.kind) {
      case "job_code":
        message = jobCodeEmail(copy);
        break;
      case "worker_accepted":
        message = workerAcceptedEmail(copy);
        break;
      case "worker_cancelled":
        message = workerCancelledEmail(copy);
        break;
      case "bonus_offer":
        message = bonusOfferEmail({ ...copy, bonusKind: input.bonus.kind, amountMinor: input.bonus.amountMinor });
        break;
      default: {
        const unreachable: never = input;
        return { status: "skipped", kind: (unreachable as { kind: ClientNotificationKind }).kind };
      }
    }
    const result = await emailSender.send(message);
    return { status: result.status === "sent" ? "sent" : result.status === "error" ? "error" : "skipped", kind };
  } catch {
    return { status: "error", kind };
  }
}
