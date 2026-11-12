import type { PrismaClient } from "@rwos/database";
import type { EmailMessage, EmailSender } from "./mailer/emailSender";
import type { SmsSender } from "./mailer/smsSender";
import type { NotificationLanguage } from "./notifications/clientNotifications";
import { sendsText } from "./notifications/noticeChannels";
import { noticeSms } from "./notifications/smsBrand";
import { findOrganizationContact } from "./paymentReceipts";

// Renewal reminders for PAID plans and PAID long-term listings (S3). Plans and listings are paid by
// Interac e-transfer and never renew by themselves, so the company is reminded 7 days and 1 day
// before the paid period ends: by email both times, and by text the day before (when a phone is on
// file and texts are switched on in the sender). Called by POST /internal/plan-reminders/sweep.
//
// Idempotent: each row stores the end date each reminder was sent for (reminder7SentFor /
// reminder1SentFor). The row is claimed with a compare-and-set on that column before sending, so two
// sweeps never send the same reminder twice; a renewal moves the end date, which re-arms both
// reminders. Trials, canceled plans and closed jobs get no reminder. Fail-soft per row.

const DAY_MS = 24 * 60 * 60 * 1000;
const CLOSED_JOB_STATUSES = ["cancelled", "expired", "archived"];
export const DEFAULT_PLAN_REMINDER_BATCH = 200;

export type ReminderStage = 7 | 1;

export type PlanReminderSweepMetrics = Readonly<{
  scanned: number;
  sent7: number;
  sent1: number;
  texted: number;
  skipped: number;
  failed: number;
}>;

/** Which reminder is due for a period ending at `end`, or null. The 1-day one wins near the end. */
export function dueReminderStage(
  end: Date,
  now: Date,
  sent: Readonly<{ reminder7SentFor: Date | null; reminder1SentFor: Date | null }>
): ReminderStage | null {
  const left = end.getTime() - now.getTime();
  if (left <= 0 || left > 7 * DAY_MS) return null;
  const same = (value: Date | null) => value !== null && value.getTime() === end.getTime();
  if (left <= DAY_MS) return same(sent.reminder1SentFor) ? null : 1;
  return same(sent.reminder7SentFor) || same(sent.reminder1SentFor) ? null : 7;
}

const PLAN_LABEL: Record<string, string> = { shift_pro: "Shift Pro", shift_business: "Shift Business" };

function day(at: Date, language: NotificationLanguage): string {
  const locale = language === "en" ? "en-CA" : language === "ar" ? "ar-u-nu-latn" : "fr-CA";
  return at.toLocaleDateString(locale, { timeZone: "America/Toronto", year: "numeric", month: "long", day: "numeric" });
}

export type ReminderSubject = Readonly<{ kind: "plan"; plan: string } | { kind: "listing"; jobTitle: string }>;

export function planEndingEmail(params: {
  to: string;
  language: NotificationLanguage;
  subject: ReminderSubject;
  endsAt: Date;
  stage: ReminderStage;
}): EmailMessage {
  const date = day(params.endsAt, params.language);
  const s = params.subject;
  if (params.language === "en") {
    const when = params.stage === 1 ? "tomorrow" : `on ${date}`;
    if (s.kind === "plan") {
      const name = PLAN_LABEL[s.plan] ?? s.plan;
      return {
        to: params.to,
        subject: `Joblop — your ${name} plan ends ${when}`,
        text:
          `Your ${name} plan is paid until ${date}.\n\n` +
          `Plans do not renew by themselves. To keep your discount, sign in to Joblop, open Plans and press “Renew 1 month — Interac”.\n\n` +
          `If you do nothing, you go back to paying per shift. No charge is made.\n\n— Joblop`
      };
    }
    return {
      to: params.to,
      subject: `Joblop — your job listing ends ${when}`,
      text:
        `Your long-term job “${s.jobTitle}” is listed until ${date}.\n\n` +
        `Listings do not renew by themselves. To keep it visible to workers, sign in to Joblop, open your long-term jobs and press “Renew 1 month”.\n\n` +
        `If you do nothing, workers stop seeing the job. No charge is made.\n\n— Joblop`
    };
  }
  if (params.language === "ar") {
    const whenAr = params.stage === 1 ? "غدًا" : `في ${date}`;
    if (s.kind === "plan") {
      const name = PLAN_LABEL[s.plan] ?? s.plan;
      return {
        to: params.to,
        subject: `Joblop — تنتهي باقتك ${name} ${whenAr}`,
        text:
          `باقتك ${name} مدفوعة حتى ${date}.\n\n` +
          `الباقات لا تتجدد تلقائيًا. للحفاظ على خصمك، سجّل الدخول إلى Joblop وافتح «الباقات» واضغط «تجديد شهر واحد — Interac».\n\n` +
          `إذا لم تفعل شيئًا، تعود إلى الدفع عن كل مناوبة. لا تُقتطع أي رسوم.\n\n— Joblop`
      };
    }
    return {
      to: params.to,
      subject: `Joblop — ينتهي إعلان وظيفتك ${whenAr}`,
      text:
        `وظيفتك طويلة الأمد «${s.jobTitle}» معروضة حتى ${date}.\n\n` +
        `الإعلانات لا تتجدد تلقائيًا. لتبقى ظاهرة للعمال، سجّل الدخول إلى Joblop وافتح وظائفك طويلة الأمد واضغط «تجديد شهر واحد».\n\n` +
        `إذا لم تفعل شيئًا، يتوقف العمال عن رؤية الوظيفة. لا تُقتطع أي رسوم.\n\n— Joblop`
    };
  }
  const when = params.stage === 1 ? "demain" : `le ${date}`;
  if (s.kind === "plan") {
    const name = PLAN_LABEL[s.plan] ?? s.plan;
    return {
      to: params.to,
      subject: `Joblop — votre forfait ${name} se termine ${when}`,
      text:
        `Votre forfait ${name} est payé jusqu’au ${date}.\n\n` +
        `Les forfaits ne se renouvellent pas tout seuls. Pour garder votre rabais, connectez-vous à Joblop, ouvrez Forfaits et appuyez sur « Renouveler 1 mois — Interac ».\n\n` +
        `Si vous ne faites rien, vous revenez au paiement par quart. Aucuns frais ne sont prélevés.\n\n— Joblop`
    };
  }
  return {
    to: params.to,
    subject: `Joblop — votre annonce d’emploi se termine ${when}`,
    text:
      `Votre emploi de longue durée « ${s.jobTitle} » est affiché jusqu’au ${date}.\n\n` +
      `Les annonces ne se renouvellent pas toutes seules. Pour qu’il reste visible aux travailleurs, connectez-vous à Joblop, ouvrez vos emplois de longue durée et appuyez sur « Renouveler 1 mois ».\n\n` +
      `Si vous ne faites rien, les travailleurs ne voient plus l’emploi. Aucuns frais ne sont prélevés.\n\n— Joblop`
  };
}

export function planEndingSmsText(params: { language: NotificationLanguage; subject: ReminderSubject; endsAt: Date }): string {
  const date = day(params.endsAt, params.language);
  const s = params.subject;
  if (params.language === "en") {
    return s.kind === "plan"
      ? noticeSms("en", `your ${PLAN_LABEL[s.plan] ?? s.plan} plan ends tomorrow (${date}). To renew: Joblop > Plans.`)
      : noticeSms("en", `your job listing "${s.jobTitle}" ends tomorrow (${date}). To renew: Joblop > long-term jobs.`);
  }
  if (params.language === "ar") {
    return s.kind === "plan"
      ? noticeSms("ar", `تنتهي باقتك ${PLAN_LABEL[s.plan] ?? s.plan} غدًا (${date}). للتجديد: Joblop > الباقات.`)
      : noticeSms("ar", `ينتهي إعلانك «${s.jobTitle}» غدًا (${date}). للتجديد: Joblop > الوظائف طويلة الأمد.`);
  }
  return s.kind === "plan"
    ? noticeSms("fr", `votre forfait ${PLAN_LABEL[s.plan] ?? s.plan} se termine demain (${date}). Pour renouveler: Joblop > Forfaits.`)
    : noticeSms("fr", `votre annonce "${s.jobTitle}" se termine demain (${date}). Pour renouveler: Joblop > emplois de longue durée.`);
}

type Candidate = Readonly<{
  table: "plan" | "listing";
  id: string;
  organizationId: string;
  end: Date;
  reminder7SentFor: Date | null;
  reminder1SentFor: Date | null;
  subject: ReminderSubject;
}>;

export async function runPlanReminderSweep(deps: {
  prisma: PrismaClient;
  emailSender: EmailSender;
  smsSender?: SmsSender;
  now?: () => Date;
  batchSize?: number;
}): Promise<PlanReminderSweepMetrics> {
  const { prisma } = deps;
  const now = (deps.now ?? (() => new Date()))();
  const take = Math.min(Math.max(deps.batchSize ?? DEFAULT_PLAN_REMINDER_BATCH, 1), 500);
  const horizon = new Date(now.getTime() + 7 * DAY_MS);

  const plans = await prisma.employerPlan.findMany({
    where: { status: "active", source: "purchase", cancelAtPeriodEnd: false, currentPeriodEnd: { gt: now, lte: horizon } },
    select: { id: true, organizationId: true, plan: true, currentPeriodEnd: true, reminder7SentFor: true, reminder1SentFor: true },
    orderBy: { currentPeriodEnd: "asc" },
    take
  });
  const listings = await prisma.jobListing.findMany({
    where: { status: "active", listedUntil: { gt: now, lte: horizon } },
    select: {
      id: true,
      organizationId: true,
      listedUntil: true,
      reminder7SentFor: true,
      reminder1SentFor: true,
      jobRequest: { select: { title: true, status: true } }
    },
    orderBy: { listedUntil: "asc" },
    take
  });

  const candidates: Candidate[] = [
    ...plans
      .filter((p) => p.currentPeriodEnd !== null)
      .map((p) => ({
        table: "plan" as const,
        id: p.id,
        organizationId: p.organizationId,
        end: p.currentPeriodEnd as Date,
        reminder7SentFor: p.reminder7SentFor,
        reminder1SentFor: p.reminder1SentFor,
        subject: { kind: "plan" as const, plan: p.plan }
      })),
    ...listings
      .filter((l) => l.listedUntil !== null && !CLOSED_JOB_STATUSES.includes(l.jobRequest.status))
      .map((l) => ({
        table: "listing" as const,
        id: l.id,
        organizationId: l.organizationId,
        end: l.listedUntil as Date,
        reminder7SentFor: l.reminder7SentFor,
        reminder1SentFor: l.reminder1SentFor,
        subject: { kind: "listing" as const, jobTitle: l.jobRequest.title }
      }))
  ];

  let sent7 = 0;
  let sent1 = 0;
  let texted = 0;
  let skipped = 0;
  let failed = 0;
  for (const item of candidates) {
    try {
      const stage = dueReminderStage(item.end, now, item);
      if (stage === null) {
        skipped += 1;
        continue;
      }
      // Payment already sent for the next month: no need to remind.
      if (await renewalAlreadyClaimed(prisma, item)) {
        skipped += 1;
        continue;
      }
      const column = stage === 1 ? "reminder1SentFor" : "reminder7SentFor";
      const observed = stage === 1 ? item.reminder1SentFor : item.reminder7SentFor;
      const claim = { where: { id: item.id, [column]: observed }, data: { [column]: item.end } };
      const claimed =
        item.table === "plan" ? await prisma.employerPlan.updateMany(claim) : await prisma.jobListing.updateMany(claim);
      if (claimed.count !== 1) {
        skipped += 1;
        continue;
      }
      const contact = await findOrganizationContact(prisma, item.organizationId);
      if (!contact) {
        skipped += 1;
        continue;
      }
      await deps.emailSender.send(planEndingEmail({ to: contact.email, language: contact.language, subject: item.subject, endsAt: item.end, stage }));
      if (stage === 1) sent1 += 1;
      else sent7 += 1;
      if (stage === 1 && deps.smsSender && contact.phone && sendsText("plan_ending", { urgent: true })) {
        const result = await deps.smsSender
          .send({ to: contact.phone, text: planEndingSmsText({ language: contact.language, subject: item.subject, endsAt: item.end }) })
          .catch(() => null);
        if (result && (result as { status?: string }).status === "sent") texted += 1;
      }
    } catch {
      failed += 1;
    }
  }
  return { scanned: candidates.length, sent7, sent1, texted, skipped, failed };
}

async function renewalAlreadyClaimed(prisma: PrismaClient, item: Candidate): Promise<boolean> {
  if (item.table === "plan") {
    const order = await prisma.employerPlanOrder.findFirst({
      where: { organizationId: item.organizationId, status: "payment_claimed", plan: item.subject.kind === "plan" ? item.subject.plan : "" },
      select: { id: true }
    });
    return order !== null;
  }
  const order = await prisma.jobListingOrder.findFirst({ where: { jobListingId: item.id, status: "payment_claimed" }, select: { id: true } });
  return order !== null;
}
