// Hybrid auto-offer — DIRECT WORKER CLAIM.
//
// Boundary rules (do not violate):
//   - This is the OPEN path only. A job is claimable solely when it was approved+priced with the
//     `openClaim` flag set, which auto-opens a DispatchReview in `offer_preparation`. The manual
//     admin shortlist → offer → accept path is untouched and still owns non-open jobs.
//   - First eligible worker to claim a slot wins INSTANTLY. Contention and capacity are decided by
//     the EXISTING first-come arbiter `createAssignmentFromAcceptedOfferAtomically` (per-job and
//     per-worker advisory locks + `activeAssignments >= numberOfWorkers` guard). This module mints
//     a correctly-formed accepted-offer chain and hands it to that arbiter UNCHANGED — it never
//     weakens the locks, the capacity guard, or the conflict re-check.
//   - Eligibility is SERVER-AUTHORITATIVE. The browser cannot declare itself eligible, priced, or
//     open.
//   - No money execution. The offer carries a human-readable compensation summary from the
//     immutable pricing snapshot; it never moves money and is independent of FINANCE_LIVE_ENABLED.
//   - No real admin/platform permission is granted to the worker. The API endpoint authorizes the
//     worker to claim their OWN eligible, open job; this internal orchestration then mints the
//     governed chain with the worker as the recorded actor. It is a scoped internal path, not an
//     elevation.

import { randomUUID } from "node:crypto";
import type {
  AssignmentRepository,
  AttendanceRepository,
  DispatchRepository,
  StoredJobRequest,
  WorkerOfferRepository
} from "@rwos/auth";
import type { createPrismaClient } from "@rwos/database";
import { isLongTermListingJob, longTermPaySentence } from "./longTermWorkerPay";

type PrismaClient = ReturnType<typeof createPrismaClient>;

// Assignment states that occupy a slot (mirrors the arbiter's own `activeAssignmentStates`).
const ACTIVE_ASSIGNMENT_STATUSES = [
  "pending_validation",
  "confirmed",
  "worker_acknowledged",
  "ready_for_attendance",
  "in_attendance_window",
  "attendance_handoff"
] as const;

// A worker already holding a live offer for this request should not double-claim.
const ACTIVE_OFFER_STATUSES = ["draft", "approved", "sent", "delivered", "viewed", "accepted"] as const;

export type ClaimResult =
  | { status: "assigned"; assignmentId: string; workerOfferId: string }
  | { status: "full" }
  | { status: "not_found" }
  | { status: "not_open" }
  | { status: "ineligible"; reasons: readonly string[] };

export type EnsureOpenClaimDispatchResult = {
  dispatchReviewId: string;
  created: boolean;
};

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function formatRateMinor(minor: number, currency: string): string {
  const major = (minor / 100).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${major} ${currency}/hr`;
}

// Idempotently open a DispatchReview in `offer_preparation` for an open-claim job. Called right
// after approve+price succeeds, with the admin as actor. Reuses an existing offer_preparation
// dispatch if one is already open (so a re-approve / retry does not create duplicates).
export async function ensureOpenClaimDispatch(
  prisma: PrismaClient,
  deps: { dispatchRepository: DispatchRepository },
  input: { jobRequest: StoredJobRequest; actorUserId: string; now: Date }
): Promise<EnsureOpenClaimDispatchResult> {
  const existing = await prisma.dispatchReview.findFirst({
    where: { jobRequestId: input.jobRequest.id, state: "offer_preparation" },
    orderBy: { createdAt: "desc" }
  });
  if (existing) return { dispatchReviewId: existing.id, created: false };

  // Create a governed dispatch (audited as dispatch.created), then open it straight to
  // offer_preparation. Open-claim skips the human shortlist boundary by design: the worker self-
  // selects, and the authoritative capacity guard is the assignment arbiter, not a shortlist.
  const created = await deps.dispatchRepository.createDispatchReviewWithAudit({
    jobRequest: input.jobRequest,
    operationalOwnerUserId: null,
    priority: "normal",
    actorUserId: input.actorUserId,
    correlationId: `open_claim_dispatch_${randomUUID()}`,
    now: input.now
  });
  const opened = await deps.dispatchRepository.updateDispatchReview({
    dispatchReviewId: created.id,
    expectedVersion: created.version,
    actorUserId: input.actorUserId,
    state: "offer_preparation",
    // Required headcount governs the open target; the arbiter enforces the hard cap.
    preparedOfferCount: input.jobRequest.numberOfWorkers,
    startedAt: input.now,
    now: input.now
  });
  // The row was just created, so the version-guarded update effectively always succeeds; guard the
  // audit on it anyway so the trail never claims a transition that did not land.
  if (!opened) {
    throw new Error("open_claim_dispatch_transition_failed");
  }
  await deps.dispatchRepository.recordDispatchAuditEvent({
    action: "dispatch.offer_preparation",
    organizationId: created.organizationId,
    dispatchReviewId: created.id,
    jobRequestId: created.jobRequestId,
    actorUserId: input.actorUserId,
    priorState: created.state,
    newState: "offer_preparation",
    reason: "open_claim_boundary",
    correlationId: `open_claim_dispatch_${randomUUID()}`,
    createdAt: input.now
  });
  return { dispatchReviewId: opened.id, created: true };
}

// Put a claimed shift on the worker's schedule: the same steps staff run after creating an assignment
// (ready for attendance, attendance handoff, attendance record), so the worker can check in. A claim
// has no staff member behind it and the worker holds no platform permission, so this runs the
// repository steps directly as part of the scoped claim path, with the worker as the recorded actor.
export async function placeClaimedShiftOnSchedule(
  deps: {
    assignmentRepository: AssignmentRepository;
    attendanceRepository: AttendanceRepository;
    now?: () => Date;
  },
  input: { assignmentId: string; actorUserId: string }
): Promise<void> {
  const { assignmentRepository, attendanceRepository } = deps;
  const at = (deps.now ?? (() => new Date()))();
  const correlationId = `open_claim_${randomUUID()}`;

  const claimed = await assignmentRepository.findAssignmentById(input.assignmentId);
  if (!claimed) throw new Error("claimed_assignment_not_found");
  const ready = await assignmentRepository.updateAssignment({
    assignmentId: claimed.id,
    expectedVersion: claimed.version,
    actorUserId: input.actorUserId,
    status: "ready_for_attendance",
    readyForAttendanceAt: at,
    now: at
  });
  if (!ready) throw new Error("claimed_assignment_changed");
  const handedOff = await assignmentRepository.updateAssignment({
    assignmentId: ready.id,
    expectedVersion: ready.version,
    actorUserId: input.actorUserId,
    status: "attendance_handoff",
    attendanceHandoffAt: at,
    now: at
  });
  if (!handedOff) throw new Error("claimed_assignment_changed");

  const assignmentAudit = {
    organizationId: handedOff.organizationId,
    assignmentId: handedOff.id,
    workerOfferId: handedOff.workerOfferId,
    jobRequestId: handedOff.jobRequestId,
    actorUserId: input.actorUserId,
    reason: "open_claim",
    correlationId,
    createdAt: at
  };
  await assignmentRepository.recordAssignmentAuditEvent({
    ...assignmentAudit,
    action: "assignment.ready_for_attendance",
    priorState: claimed.status,
    newState: ready.status
  });
  await assignmentRepository.recordAssignmentAuditEvent({
    ...assignmentAudit,
    action: "assignment.attendance_handoff",
    priorState: ready.status,
    newState: handedOff.status
  });

  const attendance = await attendanceRepository.createAttendanceFromAssignment({
    assignment: handedOff,
    actorUserId: input.actorUserId,
    verificationMethod: "none",
    now: at
  });
  await attendanceRepository.recordAttendanceAuditEvent({
    action: "attendance.created",
    organizationId: attendance.organizationId,
    attendanceRecordId: attendance.id,
    assignmentId: attendance.assignmentId,
    actorUserId: input.actorUserId,
    priorState: null,
    newState: attendance.status,
    reason: "open_claim",
    correlationId,
    createdAt: at
  });
}

// Worker direct-claim orchestration. Returns a discriminated result; the endpoint maps it to HTTP.
export async function claimOpenJob(
  deps: {
    prisma: PrismaClient;
    assignmentRepository: AssignmentRepository;
    workerOfferRepository: WorkerOfferRepository;
    now?: () => Date;
  },
  input: { userId: string; jobRequestId: string }
): Promise<ClaimResult> {
  const { prisma, assignmentRepository, workerOfferRepository } = deps;
  const at = (deps.now ?? (() => new Date()))();

  // 1. Worker identity must exist and be active.
  const workerIdentity = await prisma.workerIdentity.findUnique({ where: { userId: input.userId } });
  if (!workerIdentity) return { status: "ineligible", reasons: ["not_a_worker"] };
  if (workerIdentity.status !== "active") return { status: "ineligible", reasons: ["worker_inactive"] };

  // 2. Job must exist, be open-claim, approved_for_dispatch, residence active, and priced.
  const job = await prisma.jobRequest.findUnique({
    where: { id: input.jobRequestId },
    include: {
      residence: { select: { status: true } },
      pricingSnapshot: { select: { workerHourlyRateMinor: true, currency: true } }
    }
  });
  if (!job) return { status: "not_found" };
  if (!job.openClaim) return { status: "not_open" };
  if (job.status !== "approved_for_dispatch" || job.residence.status !== "active") {
    return { status: "not_open" };
  }
  if (!job.pricingSnapshot) return { status: "not_open" };

  // 3. The open-claim dispatch must be open (offer_preparation).
  const dispatch = await prisma.dispatchReview.findFirst({
    where: { jobRequestId: job.id, state: "offer_preparation" },
    orderBy: { createdAt: "desc" }
  });
  if (!dispatch) return { status: "not_open" };

  // 4. Server-authoritative eligibility pre-checks (cheap, before minting):
  //    already assigned to this job? already holds an active offer? job already full?
  const [mineAssigned, mineActiveOffer, activeAssignments] = await Promise.all([
    prisma.assignment.count({
      where: { jobRequestId: job.id, workerIdentityId: workerIdentity.id, status: { in: [...ACTIVE_ASSIGNMENT_STATUSES] } }
    }),
    prisma.workerOffer.count({
      where: { jobRequestId: job.id, workerIdentityId: workerIdentity.id, status: { in: [...ACTIVE_OFFER_STATUSES] } }
    }),
    prisma.assignment.count({
      where: { jobRequestId: job.id, status: { in: [...ACTIVE_ASSIGNMENT_STATUSES] } }
    })
  ]);
  if (mineAssigned > 0) return { status: "ineligible", reasons: ["already_assigned"] };
  if (mineActiveOffer > 0) return { status: "ineligible", reasons: ["active_offer_exists"] };
  if (activeAssignments >= job.numberOfWorkers) return { status: "full" };

  // 5. Mint the accepted-offer chain atomically: offer(accepted) + terms(priced) + response(accepted).
  //    The unique index worker_offers_dispatch_worker_key makes this idempotent per (dispatch,
  //    worker): a concurrent double-tap or a prior lost race surfaces as P2002.
  // Long-term listing (employer plans flag): the employer's own pay offer, never "0.00 CAD/hr".
  const compensationSummary = isLongTermListingJob(job)
    ? longTermPaySentence(job, "en")
    : formatRateMinor(job.pricingSnapshot.workerHourlyRateMinor, job.pricingSnapshot.currency);
  const offerExpiresAt = new Date(at.getTime() + 24 * 60 * 60 * 1000);
  let minted: { offerId: string; offerVersion: number };
  try {
    minted = await prisma.$transaction(async (tx) => {
      const offer = await tx.workerOffer.create({
        data: {
          dispatchReviewId: dispatch.id,
          jobRequestId: job.id,
          organizationId: job.organizationId,
          residenceId: job.residenceId,
          departmentId: job.departmentId,
          workerIdentityId: workerIdentity.id,
          status: "accepted",
          expiresAt: offerExpiresAt,
          respondedAt: at,
          createdByUserId: input.userId,
          createdAt: at,
          updatedAt: at
        }
      });
      const terms = await tx.workerOfferTermsVersion.create({
        data: {
          workerOfferId: offer.id,
          versionNumber: 1,
          workerVisibleTitle: job.title,
          workerVisibleSummary: job.description,
          timezone: job.timezone,
          startAt: job.startAt,
          endAt: job.endAt,
          workGroupId: job.workGroupId,
          roleDefinitionId: job.roleDefinitionId,
          compensationSummary,
          policySummary: null,
          createdByUserId: input.userId,
          createdAt: at
        }
      });
      const updated = await tx.workerOffer.update({
        where: { id: offer.id },
        data: { currentTermsVersionId: terms.id, updatedByUserId: input.userId, updatedAt: at }
      });
      await tx.workerOfferResponse.create({
        data: {
          workerOfferId: offer.id,
          workerIdentityId: workerIdentity.id,
          termsVersionId: terms.id,
          responseType: "accepted",
          reason: "open_claim",
          createdAt: at
        }
      });
      return { offerId: updated.id, offerVersion: updated.version };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      // The worker already engaged this dispatch. Reflect authoritative state.
      const nowAssigned = await prisma.assignment.count({
        where: { jobRequestId: job.id, workerIdentityId: workerIdentity.id, status: { in: [...ACTIVE_ASSIGNMENT_STATUSES] } }
      });
      if (nowAssigned > 0) return { status: "ineligible", reasons: ["already_assigned"] };
      return { status: "full" };
    }
    throw error;
  }

  await workerOfferRepository
    .recordWorkerOfferAuditEvent({
      action: "worker_offer.created",
      organizationId: job.organizationId,
      workerOfferId: minted.offerId,
      dispatchReviewId: dispatch.id,
      jobRequestId: job.id,
      actorUserId: input.userId,
      priorState: null,
      newState: "accepted",
      reason: "open_claim",
      correlationId: `open_claim_${randomUUID()}`,
      createdAt: at
    })
    .catch(() => {
      /* audit is best-effort; never blocks the claim */
    });

  // 6. Hand the chain to the UNCHANGED first-come arbiter. It takes the per-job + per-worker
  //    advisory locks and re-checks capacity and conflicts. Exactly one concurrent claim wins each
  //    slot; the rest fail with job_capacity_reached.
  const result = await assignmentRepository.createAssignmentFromAcceptedOfferAtomically({
    workerOfferId: minted.offerId,
    expectedDispatchReviewId: dispatch.id,
    expectedOfferVersion: minted.offerVersion,
    actorUserId: input.userId,
    correlationId: `open_claim_${randomUUID()}`,
    now: at
  });
  if (result.ok) {
    return { status: "assigned", assignmentId: result.assignment.id, workerOfferId: minted.offerId };
  }

  // Lost the race (or failed a final guard): retire the minted offer so it is not a lingering
  // active offer. The row is kept (terminal cancelled) — the unique index then makes a retry a
  // deterministic no-op rather than a new offer.
  await prisma.workerOffer
    .update({
      where: { id: minted.offerId },
      data: { status: "cancelled", cancelledAt: at, cancelledByUserId: input.userId, updatedAt: at }
    })
    .catch(() => {
      /* compensation is best-effort */
    });

  if (result.reason === "job_capacity_reached") return { status: "full" };
  if (result.reason === "worker_schedule_conflict") {
    return { status: "ineligible", reasons: ["worker_schedule_conflict"] };
  }
  // Any other arbiter guard failing means the chain was not assignable; surface as not_open so the
  // worker UI re-fetches rather than treating it as a hard client error.
  return { status: "not_open" };
}
