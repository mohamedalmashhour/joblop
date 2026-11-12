import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@rwos/database";
import {
  isJobBonusFunding,
  isJobBonusKind,
  isWithinPlatformShare,
  jobBonusPlatformCap,
  suggestJobBonus,
  validateJobBonusAmount,
  type JobBonusFunding,
  type JobBonusKind,
  type JobBonusSuggestion
} from "@rwos/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { EmailSender } from "./mailer/emailSender";
import { notifyClient } from "./notifications/clientNotifications";

// JOB BONUS routes. When an approved job is still not filled, staff can:
//   1. offer a bonus to the employer (offered_to_employer → employer_accepted | employer_declined);
//      an accepted bonus is billed to the employer on the invoice for each shift;
//   2. approve a bonus paid by Joblop (approved), capped at the platform's share unless urgentOverride.
// Staff can cancel. At most ONE active bonus (employer_accepted | approved) per job: the write that
// would create a second one locks the job row first, so two racing writers cannot both succeed.
// Every step is audited (entityType "job_bonus"); the suggestion itself is not stored.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIVE = ["employer_accepted", "approved"] as const;
const MAX_REASON_LENGTH = 500;
const SUGGESTION_WINDOW_HOURS = 48;

type Tx = Prisma.TransactionClient;

export type JobBonusRouteDeps = Readonly<{
  prisma: PrismaClient;
  emailSender: EmailSender;
  /** Staff (HR_ADMINISTRATOR or PLATFORM_ADMINISTRATOR). Sends the 401/403 itself and returns null. */
  requireStaff(request: FastifyRequest, reply: FastifyReply): Promise<string | null>;
  /** Any signed-in user. Sends the 401 itself and returns null. */
  requireUser(request: FastifyRequest, reply: FastifyReply): Promise<string | null>;
  /** True when the user is an active owner/administrator member of the organization. */
  isOrganizationManager(userId: string, organizationId: string): Promise<boolean>;
  now?: () => Date;
}>;

const BONUS_SELECT = {
  id: true,
  jobRequestId: true,
  organizationId: true,
  kind: true,
  fundedBy: true,
  status: true,
  amountMinor: true,
  currency: true,
  suggestedBySystem: true,
  urgentOverride: true,
  reason: true,
  createdByUserId: true,
  decidedByUserId: true,
  offeredAt: true,
  respondedAt: true,
  approvedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true
} as const;

type BonusRow = Prisma.JobBonusGetPayload<{ select: typeof BONUS_SELECT }>;

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function serializeJobBonus(b: BonusRow) {
  return {
    id: b.id,
    jobRequestId: b.jobRequestId,
    organizationId: b.organizationId,
    kind: b.kind,
    fundedBy: b.fundedBy,
    status: b.status,
    amountMinor: b.amountMinor,
    currency: b.currency,
    suggestedBySystem: b.suggestedBySystem,
    urgentOverride: b.urgentOverride,
    reason: b.reason,
    createdByUserId: b.createdByUserId,
    decidedByUserId: b.decidedByUserId,
    offeredAt: iso(b.offeredAt),
    respondedAt: iso(b.respondedAt),
    approvedAt: iso(b.approvedAt),
    cancelledAt: iso(b.cancelledAt),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString()
  };
}

type PricedJob = Readonly<{
  status: string;
  startAt: Date;
  endAt: Date;
  pricingSnapshot: Readonly<{ workerHourlyRateMinor: number; platformHourlyMarginMinor: number }> | null;
}>;

/** The system suggestion for a job, or null when the job is not approved for dispatch and priced. */
export function jobBonusSuggestionFor(job: PricedJob, now: Date): JobBonusSuggestion | null {
  if (job.status !== "approved_for_dispatch" || !job.pricingSnapshot) return null;
  return suggestJobBonus({
    workerHourlyRateMinor: job.pricingSnapshot.workerHourlyRateMinor,
    platformHourlyMarginMinor: job.pricingSnapshot.platformHourlyMarginMinor,
    startAt: job.startAt,
    endAt: job.endAt,
    now
  });
}

/** Coverage helper: suggest only for approved jobs with places left that start within 48 hours. */
export function coverageBonusSuggestion(job: PricedJob, placesLeft: number, now: Date): JobBonusSuggestion | null {
  if (placesLeft <= 0) return null;
  const hoursToStart = (job.startAt.getTime() - now.getTime()) / 3_600_000;
  if (hoursToStart < 0 || hoursToStart > SUGGESTION_WINDOW_HOURS) return null;
  return jobBonusSuggestionFor(job, now);
}

/** Public (worker-facing) view: the job's ACTIVE bonus only, with no funding information. */
export async function activeBonusByJob(
  prisma: PrismaClient,
  jobRequestIds: readonly string[]
): Promise<Map<string, { kind: JobBonusKind; amountMinor: number }>> {
  const out = new Map<string, { kind: JobBonusKind; amountMinor: number }>();
  const ids = [...new Set(jobRequestIds)];
  if (ids.length === 0) return out;
  const rows = await prisma.jobBonus.findMany({
    where: { jobRequestId: { in: ids }, status: { in: [...ACTIVE] } },
    orderBy: [{ createdAt: "desc" }],
    select: { jobRequestId: true, kind: true, amountMinor: true }
  });
  for (const r of rows) if (!out.has(r.jobRequestId)) out.set(r.jobRequestId, { kind: r.kind, amountMinor: r.amountMinor });
  return out;
}

/** Staff view: the latest non-cancelled bonus per job. */
export async function latestBonusByJob(
  prisma: PrismaClient,
  jobRequestIds: readonly string[]
): Promise<Map<string, { id: string; kind: JobBonusKind; amountMinor: number; fundedBy: JobBonusFunding; status: string }>> {
  const out = new Map<string, { id: string; kind: JobBonusKind; amountMinor: number; fundedBy: JobBonusFunding; status: string }>();
  const ids = [...new Set(jobRequestIds)];
  if (ids.length === 0) return out;
  const rows = await prisma.jobBonus.findMany({
    where: { jobRequestId: { in: ids }, status: { not: "cancelled" } },
    orderBy: [{ createdAt: "desc" }],
    select: { id: true, jobRequestId: true, kind: true, amountMinor: true, fundedBy: true, status: true }
  });
  for (const r of rows) {
    if (!out.has(r.jobRequestId)) out.set(r.jobRequestId, { id: r.id, kind: r.kind, amountMinor: r.amountMinor, fundedBy: r.fundedBy, status: r.status });
  }
  return out;
}

async function recordBonusAudit(
  tx: Tx,
  input: { bonus: BonusRow; action: string; priorState: string | null; actorUserId: string; reason: string | null; now: Date }
) {
  const actor = await tx.auditActorReference.create({
    data: { actorType: "user", userId: input.actorUserId, organizationId: input.bonus.organizationId, displayLabel: "Job bonus actor" }
  });
  await tx.auditEvent.create({
    data: {
      actorReferenceId: actor.id,
      organizationId: input.bonus.organizationId,
      entityType: "job_bonus",
      entityId: input.bonus.id,
      entityPublicReference: input.bonus.jobRequestId,
      action: input.action,
      priorState: input.priorState,
      newState: input.bonus.status,
      reason: input.reason,
      source: "api",
      correlationId: randomUUID(),
      policyVersion: "job-bonus-v1",
      createdAt: input.now
    }
  });
}

// Serialize bonus writes for one job (row lock on the job request) inside the transaction.
async function lockJob(tx: Tx, jobRequestId: string) {
  await tx.$queryRaw`SELECT id FROM job_requests WHERE id = ${jobRequestId}::uuid FOR UPDATE`;
}

async function hasActiveBonus(tx: Tx, jobRequestId: string, exceptId?: string) {
  const found = await tx.jobBonus.findFirst({
    where: { jobRequestId, status: { in: [...ACTIVE] }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true }
  });
  return found !== null;
}

class BonusConflict extends Error {
  constructor(readonly code: string, readonly status: number, message: string) {
    super(message);
  }
}

const auditReason = (bonus: BonusRow) =>
  `${bonus.fundedBy}:${bonus.kind}:${bonus.amountMinor}${bonus.urgentOverride ? ":urgent_override" : ""}${bonus.reason ? `:${bonus.reason}` : ""}`.slice(0, 1000);

const BONUS_JOB_SELECT = {
  id: true,
  organizationId: true,
  status: true,
  openClaim: true,
  startAt: true,
  endAt: true,
  pricingSnapshot: { select: { workerHourlyRateMinor: true, platformHourlyMarginMinor: true, currency: true } }
} as const;

type BonusJob = Prisma.JobRequestGetPayload<{ select: typeof BONUS_JOB_SELECT }>;

const loadBonusJob = (prisma: PrismaClient, jobRequestId: string) =>
  prisma.jobRequest.findUnique({ where: { id: jobRequestId }, select: BONUS_JOB_SELECT });

// Create one bonus (offer to the employer, or a Joblop-funded approval) with its audit row, then email
// the employer an offer. Shared by the staff route and the brain so both run the exact same steps.
async function insertBonus(
  prisma: PrismaClient,
  emailSender: EmailSender,
  input: {
    job: BonusJob;
    kind: JobBonusKind;
    fundedBy: JobBonusFunding;
    amount: number;
    suggestedBySystem: boolean;
    urgentOverride: boolean;
    reason: string | null;
    actor: string;
    at: Date;
  }
): Promise<BonusRow> {
  const { job, kind, fundedBy, amount, actor, at } = input;
  const jobRequestId = job.id;
  const bonus = await prisma.$transaction(async (tx) => {
    await lockJob(tx, jobRequestId);
    if (fundedBy === "platform" && (await hasActiveBonus(tx, jobRequestId))) {
      throw new BonusConflict("RWOS_BONUS_ACTIVE_EXISTS", 409, "This job already has an active bonus. Cancel it first.");
    }
    const created = await tx.jobBonus.create({
      data: {
        jobRequestId,
        organizationId: job.organizationId,
        kind,
        fundedBy,
        status: fundedBy === "employer" ? "offered_to_employer" : "approved",
        amountMinor: amount,
        currency: job.pricingSnapshot?.currency || "CAD",
        suggestedBySystem: input.suggestedBySystem,
        urgentOverride: input.urgentOverride,
        reason: input.reason,
        createdByUserId: actor,
        ...(fundedBy === "employer" ? { offeredAt: at } : { approvedAt: at, decidedByUserId: actor })
      },
      select: BONUS_SELECT
    });
    await recordBonusAudit(tx, {
      bonus: created,
      action: fundedBy === "employer" ? "bonus.offered" : "bonus.approved",
      priorState: null,
      actorUserId: actor,
      reason: auditReason(created),
      now: at
    });
    return created;
  });
  if (bonus.fundedBy === "employer") {
    // Best-effort email; never fails the request.
    await notifyClient(prisma, emailSender, {
      jobRequestId,
      kind: "bonus_offer",
      bonus: { kind: bonus.kind, amountMinor: bonus.amountMinor }
    }).catch(() => undefined);
  }
  return bonus;
}

// Cancel a bonus that is still in one of the allowed states, with its audit row.
async function cancelBonus(
  prisma: PrismaClient,
  input: { bonusId: string; actor: string; at: Date; allowedFrom: readonly ("offered_to_employer" | "employer_accepted" | "approved")[] }
): Promise<BonusRow> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.jobBonus.findUnique({ where: { id: input.bonusId }, select: BONUS_SELECT });
    if (!current) throw new BonusConflict("RWOS_BONUS_NOT_FOUND", 404, "That bonus was not found.");
    const updated = await tx.jobBonus.updateMany({
      where: { id: input.bonusId, status: { in: [...input.allowedFrom] } },
      data: { status: "cancelled", cancelledAt: input.at }
    });
    if (updated.count !== 1) {
      throw new BonusConflict("RWOS_BONUS_NOT_CANCELLABLE", 409, "Only an offered, accepted or approved bonus can be cancelled.");
    }
    const row = await tx.jobBonus.findUniqueOrThrow({ where: { id: input.bonusId }, select: BONUS_SELECT });
    await recordBonusAudit(tx, { bonus: row, action: "bonus.cancelled", priorState: current.status, actorUserId: input.actor, reason: auditReason(row), now: input.at });
    return row;
  });
}

export type BrainBonusOfferResult =
  | Readonly<{ status: "offered"; bonusId: string; kind: JobBonusKind; amountMinor: number }>
  | Readonly<{ status: "not_open" | "not_on_job_board" | "already_has_bonus" | "employer_declined" | "no_suggestion" }>;

/**
 * Offer the system-suggested hourly bonus to the employer of an approved, priced job (the policy is to
 * offer the employer first). Same validation, insert, audit and email as the staff route. Nothing is
 * charged: the employer accepts or declines in Joblop.
 */
export async function offerSuggestedBonusToEmployer(
  prisma: PrismaClient,
  emailSender: EmailSender,
  input: { jobRequestId: string; actorUserId: string; reason: string; now: Date }
): Promise<BrainBonusOfferResult> {
  const job = await loadBonusJob(prisma, input.jobRequestId);
  if (!job || job.status !== "approved_for_dispatch" || !job.pricingSnapshot) return { status: "not_open" };
  // A bonus only helps workers who can see the job: never for a job that is not on the job board.
  if (!job.openClaim) return { status: "not_on_job_board" };
  const existing = await prisma.jobBonus.findFirst({
    where: { jobRequestId: job.id, status: { in: ["offered_to_employer", "employer_declined", ...ACTIVE] } },
    select: { status: true }
  });
  // The employer is asked once: after a "no" it is for staff (or the platform-funded path) to decide.
  if (existing) return { status: existing.status === "employer_declined" ? "employer_declined" : "already_has_bonus" };
  const suggestion = jobBonusSuggestionFor(job, input.now);
  if (!suggestion || validateJobBonusAmount("hourly", suggestion.amountMinor) !== "ok") return { status: "no_suggestion" };
  const bonus = await insertBonus(prisma, emailSender, {
    job,
    kind: "hourly",
    fundedBy: "employer",
    amount: suggestion.amountMinor,
    suggestedBySystem: true,
    urgentOverride: false,
    reason: input.reason.slice(0, MAX_REASON_LENGTH),
    actor: input.actorUserId,
    at: input.now
  });
  return { status: "offered", bonusId: bonus.id, kind: bonus.kind, amountMinor: bonus.amountMinor };
}

/** Withdraw an offer the employer has not answered yet (the brain's undo). False when it is too late. */
export async function withdrawBonusOffer(
  prisma: PrismaClient,
  input: { bonusId: string; actorUserId: string; now: Date }
): Promise<boolean> {
  try {
    await cancelBonus(prisma, { bonusId: input.bonusId, actor: input.actorUserId, at: input.now, allowedFrom: ["offered_to_employer"] });
    return true;
  } catch (error) {
    if (error instanceof BonusConflict) return false;
    throw error;
  }
}

export function registerJobBonusRoutes(app: FastifyInstance, deps: JobBonusRouteDeps) {
  const { prisma } = deps;
  const now = deps.now ?? (() => new Date());
  const param = (params: unknown, key: string) => {
    const v = params && typeof params === "object" ? (params as Record<string, unknown>)[key] : undefined;
    return typeof v === "string" ? v : "";
  };
  const notFound = (reply: FastifyReply) =>
    reply.code(404).send({ error: "RWOS_JOB_REQUEST_NOT_FOUND", message: "That job request was not found." });
  const bonusNotFound = (reply: FastifyReply) =>
    reply.code(404).send({ error: "RWOS_BONUS_NOT_FOUND", message: "That bonus was not found." });

  const loadJob = (jobRequestId: string) => loadBonusJob(prisma, jobRequestId);

  // ── Staff ──

  app.get("/platform/job-requests/:jobRequestId/bonus-suggestion", async (request, reply) => {
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    const jobRequestId = param(request.params, "jobRequestId");
    if (!UUID.test(jobRequestId)) return notFound(reply);
    const job = await loadJob(jobRequestId);
    if (!job) return notFound(reply);
    return reply.code(200).header("cache-control", "no-store").send({ suggestion: jobBonusSuggestionFor(job, now()) });
  });

  app.get("/platform/job-requests/:jobRequestId/bonuses", async (request, reply) => {
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    const jobRequestId = param(request.params, "jobRequestId");
    if (!UUID.test(jobRequestId)) return notFound(reply);
    const job = await prisma.jobRequest.findUnique({ where: { id: jobRequestId }, select: { id: true } });
    if (!job) return notFound(reply);
    const rows = await prisma.jobBonus.findMany({
      where: { jobRequestId },
      orderBy: [{ createdAt: "desc" }],
      select: BONUS_SELECT
    });
    return reply.code(200).header("cache-control", "no-store").send({ bonuses: rows.map(serializeJobBonus) });
  });

  app.post("/platform/job-requests/:jobRequestId/bonuses", async (request, reply) => {
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    const jobRequestId = param(request.params, "jobRequestId");
    if (!UUID.test(jobRequestId)) return notFound(reply);
    const body = request.body && typeof request.body === "object" ? (request.body as Record<string, unknown>) : {};
    const { kind, fundedBy, amountMinor } = body;
    if (!isJobBonusKind(kind)) {
      return reply.code(400).send({ error: "RWOS_BONUS_INVALID_KIND", message: "kind must be hourly, transport or one_time." });
    }
    if (!isJobBonusFunding(fundedBy)) {
      return reply.code(400).send({ error: "RWOS_BONUS_INVALID_FUNDING", message: "fundedBy must be employer or platform." });
    }
    if (validateJobBonusAmount(kind, amountMinor) !== "ok") {
      return reply.code(400).send({
        error: "RWOS_BONUS_INVALID_AMOUNT",
        message: "amountMinor must be whole cents: 25 to 50000 per hour, or 100 to 200000 for transport / one-time."
      });
    }
    const amount = amountMinor as number;
    if (body.reason !== undefined && body.reason !== null && typeof body.reason !== "string") {
      return reply.code(400).send({ error: "RWOS_BONUS_INVALID_REASON", message: "reason must be text." });
    }
    const reasonRaw = typeof body.reason === "string" ? body.reason.trim() : "";
    if (reasonRaw.length > MAX_REASON_LENGTH) {
      return reply.code(400).send({ error: "RWOS_BONUS_INVALID_REASON", message: `reason must be at most ${MAX_REASON_LENGTH} characters.` });
    }
    if (body.urgentOverride !== undefined && typeof body.urgentOverride !== "boolean") {
      return reply.code(400).send({ error: "RWOS_BONUS_INVALID_OVERRIDE", message: "urgentOverride must be true or false." });
    }
    const urgentOverrideRequested = body.urgentOverride === true;

    const job = await loadJob(jobRequestId);
    if (!job) return notFound(reply);
    if (job.status !== "approved_for_dispatch" || !job.pricingSnapshot) {
      return reply.code(409).send({ error: "RWOS_BONUS_JOB_NOT_OPEN", message: "A bonus can only be added to an approved, priced job." });
    }
    const at = now();
    const suggestion = jobBonusSuggestionFor(job, at);
    const suggestedBySystem =
      !!suggestion &&
      ((kind === "hourly" && amount === suggestion.amountMinor) ||
        (kind === "one_time" && amount === suggestion.oneTimeEquivalentMinor));

    // Platform-funded: never more than the platform's share unless staff record an urgent override.
    let urgentOverride = false;
    if (fundedBy === "platform") {
      const cap = jobBonusPlatformCap({
        platformHourlyMarginMinor: job.pricingSnapshot.platformHourlyMarginMinor,
        startAt: job.startAt,
        endAt: job.endAt
      });
      if (!isWithinPlatformShare(kind, amount, cap)) {
        if (!urgentOverrideRequested) {
          return reply.code(422).send({
            error: "RWOS_BONUS_OVER_PLATFORM_SHARE",
            message: "This bonus is more than Joblop's share for this job. Pass urgentOverride: true for an urgent case.",
            platformCapHourlyMinor: cap.hourlyMinor,
            platformCapShiftMinor: cap.shiftMinor
          });
        }
        // Recorded only when the override was actually needed to go past the cap.
        urgentOverride = true;
      }
    }

    try {
      const bonus = await insertBonus(prisma, deps.emailSender, {
        job,
        kind,
        fundedBy,
        amount,
        suggestedBySystem,
        urgentOverride,
        reason: reasonRaw.length > 0 ? reasonRaw : null,
        actor,
        at
      });
      return reply.code(201).send({ bonus: serializeJobBonus(bonus) });
    } catch (error) {
      if (error instanceof BonusConflict) return reply.code(error.status).send({ error: error.code, message: error.message });
      throw error;
    }
  });

  app.post("/platform/bonuses/:bonusId/cancel", async (request, reply) => {
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    const bonusId = param(request.params, "bonusId");
    if (!UUID.test(bonusId)) return bonusNotFound(reply);
    try {
      const bonus = await cancelBonus(prisma, {
        bonusId,
        actor,
        at: now(),
        allowedFrom: ["offered_to_employer", "employer_accepted", "approved"]
      });
      return reply.code(200).send({ bonus: serializeJobBonus(bonus) });
    } catch (error) {
      if (error instanceof BonusConflict) return reply.code(error.status).send({ error: error.code, message: error.message });
      throw error;
    }
  });

  // ── Employer ──

  app.get("/employer/job-requests/:jobRequestId/bonus-offer", async (request, reply) => {
    const userId = await deps.requireUser(request, reply);
    if (!userId) return;
    const jobRequestId = param(request.params, "jobRequestId");
    if (!UUID.test(jobRequestId)) return notFound(reply);
    const job = await prisma.jobRequest.findUnique({ where: { id: jobRequestId }, select: { organizationId: true } });
    // Same answer for a missing job and someone else's job: no information leak.
    if (!job || !(await deps.isOrganizationManager(userId, job.organizationId))) return notFound(reply);
    const offer = await prisma.jobBonus.findFirst({
      where: { jobRequestId, status: "offered_to_employer" },
      orderBy: [{ createdAt: "desc" }],
      select: { id: true, kind: true, amountMinor: true, currency: true, reason: true }
    });
    return reply
      .code(200)
      .header("cache-control", "no-store")
      .send({ offer: offer ? { bonusId: offer.id, kind: offer.kind, amountMinor: offer.amountMinor, currency: offer.currency, reason: offer.reason } : null });
  });

  const respond = (decision: "accept" | "decline") => async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = await deps.requireUser(request, reply);
    if (!userId) return;
    const bonusId = param(request.params, "bonusId");
    if (!UUID.test(bonusId)) return bonusNotFound(reply);
    const existing = await prisma.jobBonus.findUnique({ where: { id: bonusId }, select: { jobRequestId: true, organizationId: true } });
    if (!existing || !(await deps.isOrganizationManager(userId, existing.organizationId))) return bonusNotFound(reply);
    try {
      const bonus = await prisma.$transaction(async (tx) => {
        await lockJob(tx, existing.jobRequestId);
        const current = await tx.jobBonus.findUnique({ where: { id: bonusId }, select: BONUS_SELECT });
        if (!current || current.status !== "offered_to_employer") {
          throw new BonusConflict("RWOS_BONUS_NOT_OFFERED", 409, "This bonus is no longer waiting for your answer.");
        }
        if (decision === "accept" && (await hasActiveBonus(tx, current.jobRequestId, current.id))) {
          throw new BonusConflict("RWOS_BONUS_ACTIVE_EXISTS", 409, "This job already has an active bonus.");
        }
        const at = now();
        const row = await tx.jobBonus.update({
          where: { id: bonusId },
          data: { status: decision === "accept" ? "employer_accepted" : "employer_declined", respondedAt: at, decidedByUserId: userId },
          select: BONUS_SELECT
        });
        await recordBonusAudit(tx, {
          bonus: row,
          action: decision === "accept" ? "bonus.employer_accepted" : "bonus.employer_declined",
          priorState: current.status,
          actorUserId: userId,
          reason: auditReason(row),
          now: at
        });
        return row;
      });
      return reply.code(200).send({ bonus: serializeJobBonus(bonus) });
    } catch (error) {
      if (error instanceof BonusConflict) return reply.code(error.status).send({ error: error.code, message: error.message });
      throw error;
    }
  };

  app.post("/employer/bonuses/:bonusId/accept", respond("accept"));
  app.post("/employer/bonuses/:bonusId/decline", respond("decline"));
}
