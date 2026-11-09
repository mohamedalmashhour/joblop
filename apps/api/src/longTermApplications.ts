import type { PrismaClient } from "@rwos/database";
import type { EmailMessage, EmailSender } from "./mailer/emailSender";
import { resolveWorkerLanguage, type WorkerLanguage } from "./notifications/workerLanguage";

// Long-term jobs: workers press "Apply" (a governed WorkerJobInterest, the same record as express
// interest) and the EMPLOYER chooses. Long-term listings have no shifts and no timesheets; the
// employer hires and pays the worker directly, so the choice is theirs, not Joblop dispatch's.
//
// The employer sees each applicant's first name, city, verified certificates and profile summary.
// The worker's phone and email are shown only after the employer chooses "Contact" or "Hire"
// (employerContactRevealedAt). Every choice tells the worker, in their language.

export const EMPLOYER_APPLICANT_ACTIONS = ["contact", "shortlist", "hire", "not_selected"] as const;
export type EmployerApplicantAction = (typeof EMPLOYER_APPLICANT_ACTIONS)[number];
export type EmployerDecision = "shortlisted" | "hired" | "not_selected";

export function isEmployerApplicantAction(value: unknown): value is EmployerApplicantAction {
  return typeof value === "string" && (EMPLOYER_APPLICANT_ACTIONS as readonly string[]).includes(value);
}

// Interest statuses an employer can still decide on (withdrawn / closed ones are not shown).
const DECIDABLE_STATUSES = ["submitted", "under_review", "shortlisted", "offer_accepted", "not_selected"] as const;

export type ApplicantDecisionResult =
  | { status: "ok"; decision: EmployerDecision | null; contactRevealed: boolean; notify: EmployerDecision | null; workerUserId: string; jobRequestId: string }
  | { status: "not_found" }
  | { status: "not_long_term" };

/**
 * Apply the employer's choice. Scoped to this employer's own long-term job. "contact" only reveals
 * the worker's contact details; "hire" reveals them too. Idempotent: repeating a choice changes
 * nothing and does not notify the worker twice.
 */
export async function applyEmployerApplicantAction(
  prisma: Pick<PrismaClient, "workerJobInterest" | "jobRequest">,
  input: Readonly<{
    organizationId: string;
    jobRequestId: string;
    interestId: string;
    action: EmployerApplicantAction;
    actorUserId: string;
    now?: Date;
  }>
): Promise<ApplicantDecisionResult> {
  const at = input.now ?? new Date();
  const job = await prisma.jobRequest.findFirst({
    where: { id: input.jobRequestId, organizationId: input.organizationId },
    select: { id: true, jobLength: true }
  });
  if (!job) return { status: "not_found" };
  if (job.jobLength !== "long_term") return { status: "not_long_term" };
  const interest = await prisma.workerJobInterest.findFirst({
    where: { id: input.interestId, organizationId: input.organizationId, jobRequestId: input.jobRequestId, status: { in: [...DECIDABLE_STATUSES] } },
    select: { id: true, employerDecision: true, employerContactRevealedAt: true, worker: { select: { userId: true } } }
  });
  if (!interest) return { status: "not_found" };

  const decision: EmployerDecision | null =
    input.action === "hire" ? "hired" : input.action === "shortlist" ? "shortlisted" : input.action === "not_selected" ? "not_selected" : null;
  const reveal = input.action === "contact" || input.action === "hire";
  const changedDecision = decision !== null && decision !== interest.employerDecision;
  const status = decision === "hired" ? "offer_accepted" : decision === "shortlisted" ? "shortlisted" : decision === "not_selected" ? "not_selected" : undefined;

  if (changedDecision || (reveal && !interest.employerContactRevealedAt)) {
    await prisma.workerJobInterest.update({
      where: { id: interest.id },
      data: {
        ...(changedDecision ? { employerDecision: decision, employerDecidedAt: at, employerDecidedByUserId: input.actorUserId } : {}),
        ...(changedDecision && status ? { status } : {}),
        ...(reveal && !interest.employerContactRevealedAt ? { employerContactRevealedAt: at } : {})
      }
    });
  }
  return {
    status: "ok",
    decision: decision ?? (interest.employerDecision as EmployerDecision | null),
    contactRevealed: reveal || interest.employerContactRevealedAt !== null,
    notify: changedDecision ? decision : null,
    workerUserId: interest.worker.userId,
    jobRequestId: job.id
  };
}

// ── Worker notice (EN / FR / AR) ───────────────────────────────────────────────────────────────

export function applicationDecisionEmail(input: {
  to: string;
  language: WorkerLanguage;
  decision: EmployerDecision;
  jobTitle: string;
  employerName: string;
}): EmailMessage {
  const { language, decision, jobTitle, employerName } = input;
  const text = {
    shortlisted: {
      en: [`Joblop — you're on the shortlist`, `Good news: ${employerName} shortlisted you for "${jobTitle}". They may contact you soon.`],
      fr: [`Joblop — vous êtes sur la courte liste`, `Bonne nouvelle : ${employerName} vous a retenu pour la courte liste de « ${jobTitle} ». L'employeur pourrait vous contacter bientôt.`],
      ar: [`Joblop — أنت في القائمة المختصرة`, `خبر سار: أدرجك ${employerName} في القائمة المختصرة لوظيفة «${jobTitle}». قد يتواصل معك قريباً.`]
    },
    hired: {
      en: [`Joblop — you're hired`, `${employerName} chose you for "${jobTitle}". They will contact you directly. This is a long-term job: the employer pays you directly.`],
      fr: [`Joblop — vous êtes embauché`, `${employerName} vous a choisi pour « ${jobTitle} ». L'employeur vous contactera directement. C'est un emploi à long terme : l'employeur vous paie directement.`],
      ar: [`Joblop — تم توظيفك`, `اختارك ${employerName} لوظيفة «${jobTitle}». سيتواصل معك مباشرة. هذه وظيفة طويلة الأمد: صاحب العمل يدفع لك مباشرة.`]
    },
    not_selected: {
      en: [`Joblop — update on your application`, `${employerName} chose another candidate for "${jobTitle}". Thank you for applying; other jobs are waiting for you on Joblop.`],
      fr: [`Joblop — suivi de votre candidature`, `${employerName} a choisi une autre personne pour « ${jobTitle} ». Merci d'avoir postulé; d'autres emplois vous attendent sur Joblop.`],
      ar: [`Joblop — تحديث بشأن طلبك`, `اختار ${employerName} مرشحاً آخر لوظيفة «${jobTitle}». شكراً لتقديمك؛ وظائف أخرى بانتظارك على جوب‑لوب.`]
    }
  }[decision][language];
  return { to: input.to, subject: text[0] ?? "Joblop", text: `${text[1] ?? ""}\n\n— Joblop` };
}

/** Best-effort: email the worker the employer's choice in their language. Never throws. */
export async function notifyApplicationDecision(
  prisma: PrismaClient,
  emailSender: EmailSender,
  input: Readonly<{ workerUserId: string; jobRequestId: string; decision: EmployerDecision }>
): Promise<void> {
  try {
    const [user, worker, job] = await Promise.all([
      prisma.user.findUnique({ where: { id: input.workerUserId }, select: { emailNormalized: true, primaryLanguage: true } }),
      prisma.workerIdentity.findUnique({ where: { userId: input.workerUserId }, select: { preferredLanguage: true } }),
      prisma.jobRequest.findUnique({ where: { id: input.jobRequestId }, select: { title: true, organization: { select: { displayName: true } } } })
    ]);
    if (!user?.emailNormalized || !job) return;
    const language = resolveWorkerLanguage(worker?.preferredLanguage, user.primaryLanguage);
    await emailSender.send(
      applicationDecisionEmail({ to: user.emailNormalized, language, decision: input.decision, jobTitle: job.title, employerName: job.organization.displayName })
    );
  } catch {
    /* a notice never blocks the employer's choice */
  }
}
