// Employer cancellation — governed two-step (Option A).
//
// The employer INITIATES and CONFIRMS cancellation; this service records the
// auditable cancellation intent + the employer<->JobLop COMMERCIAL cancellation
// obligation, then hands off to the platform-authorized assignment-cancel path to
// transition confirmed assignments to `employer_cancelled`. Employer-facing code
// never directly mutates platform-governed assignments.
//
// This service NEVER executes payment, marks anything paid, or creates worker
// deductions. The obligation is a commercial financial-intent record for later
// governed Finance handling. See docs/design/cancellation-obligation.md.

export type EmployerCancellationCause =
  | "EMPLOYER_CANCELLED"
  | "WORKER_CANCELLED"
  | "WORKER_NO_SHOW"
  | "PLATFORM_UNABLE_TO_FILL"
  | "PLATFORM_CANCELLED"
  | "MUTUALLY_CANCELLED";

// Only this cause carries the employer late-cancellation obligation.
const OBLIGATION_CAUSES: readonly EmployerCancellationCause[] = ["EMPLOYER_CANCELLED"];

export const LATE_CANCELLATION_CUTOFF_HOURS = 48;
export const LATE_CANCELLATION_CHARGE_HOURS = 6;

const CONTRACT_MANAGER_ROLES: readonly string[] = [
  "ORGANIZATION_OWNER",
  "ORGANIZATION_ADMINISTRATOR"
];

export type EmployerCancellationErrorCode =
  | "denied"
  | "not_found"
  | "invalid"
  | "conflict";

export class EmployerCancellationError extends Error {
  readonly code: EmployerCancellationErrorCode;
  constructor(code: EmployerCancellationErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "EmployerCancellationError";
  }
}

// ── Ports (kept structural so the service is unit-testable with fakes) ──

export type CancellationMembershipReader = Readonly<{
  listMemberships(userId: string): Promise<
    readonly Readonly<{ organizationId: string; status: string; roleKeys: readonly string[] }>[]
  >;
}>;

export type CancellationJobRequest = Readonly<{
  id: string;
  organizationId: string;
  roleDefinitionId: string;
  startAt: Date;
  status: string;
}>;

export type CancellationJobRequestReader = Readonly<{
  findJobRequest(
    organizationId: string,
    jobRequestId: string
  ): Promise<CancellationJobRequest | null>;
}>;

export type ConfirmedAssignmentReader = Readonly<{
  // Authoritative count of currently-confirmed (active) assignments for a request.
  countConfirmedAssignments(organizationId: string, jobRequestId: string): Promise<number>;
}>;

export type GovernedRate = Readonly<{
  rateMinor: number;
  currency: string;
  contractId: string | null;
  contractVersion: string | null;
}>;

export type ContractRateReader = Readonly<{
  // The governed hourly rate for a role from the active signed contract, or null.
  getGovernedRate(organizationId: string, roleDefinitionId: string): Promise<GovernedRate | null>;
}>;

export type StoredCancellation = Readonly<{
  id: string;
  organizationId: string;
  jobRequestId: string;
  cause: EmployerCancellationCause;
  status:
    | "requested"
    | "assignment_cancellation_pending"
    | "completed"
    | "failed"
    | "requires_reconciliation";
  affectedConfirmedWorkers: number;
  idempotencyKey: string;
  obligation: StoredObligation | null;
}>;

export type StoredObligation = Readonly<{
  id: string;
  amountMinor: number;
  currency: string;
  status: "RECORDED" | "VOIDED" | "ADJUSTED";
}>;

export type CancellationStore = Readonly<{
  // Idempotent create: if a cancellation already exists for this (jobRequestId) or
  // idempotencyKey, return the existing one and created:false.
  createCancellation(input: {
    organizationId: string;
    jobRequestId: string;
    cause: EmployerCancellationCause;
    initialStatus: StoredCancellation["status"];
    affectedConfirmedWorkers: number;
    idempotencyKey: string;
    initiatedByUserId: string;
    obligation: {
      confirmedWorkerCount: number;
      governedRateMinor: number;
      currency: string;
      minimumShiftHours: number;
      cutoffHours: number;
      contractId: string | null;
      contractVersion: string | null;
      amountMinor: number;
    } | null;
    now: Date;
  }): Promise<{ created: boolean; cancellation: StoredCancellation }>;
  findById(cancellationId: string): Promise<StoredCancellation | null>;
  updateStatus(
    cancellationId: string,
    status: StoredCancellation["status"],
    now: Date
  ): Promise<StoredCancellation>;
}>;

export type AssignmentCancelResult = Readonly<{
  attempted: number;
  cancelled: number;
  failed: number;
}>;

export type AssignmentCancelPort = Readonly<{
  // Platform-authorized handoff: transitions confirmed assignments for the request
  // to `employer_cancelled`. Idempotent + retryable — already-cancelled assignments
  // count as cancelled, not failed.
  cancelConfirmedAssignments(input: {
    organizationId: string;
    jobRequestId: string;
    reason: string;
  }): Promise<AssignmentCancelResult>;
}>;

// ── Preview + confirm DTOs ──

export type CancellationPreview = Readonly<{
  jobRequestId: string;
  shiftStartAt: string;
  cause: EmployerCancellationCause;
  hoursBeforeStart: number;
  withinCutoff: boolean;
  affectedConfirmedWorkers: number;
  governedRateMinor: number | null;
  currency: string;
  minimumShiftHours: number;
  cutoffHours: number;
  obligationApplies: boolean;
  obligationAmountMinor: number;
  requiresPlatformHandoff: boolean;
}>;

async function assertManager(
  membershipReader: CancellationMembershipReader,
  actorUserId: string,
  organizationId: string
) {
  const memberships = await membershipReader.listMemberships(actorUserId);
  const ok = memberships.some(
    (m) =>
      m.organizationId === organizationId &&
      m.status === "active" &&
      m.roleKeys.some((r) => CONTRACT_MANAGER_ROLES.includes(r))
  );
  if (!ok) {
    throw new EmployerCancellationError(
      "denied",
      "An active organization owner or administrator is required to cancel a request."
    );
  }
}

// Authoritative obligation math (server-side). Mirrors @rwos/shared
// computeLateCancellationObligation; the rate/count are always server-derived.
function computeObligationMinor(input: {
  cause: EmployerCancellationCause;
  hoursBeforeStart: number;
  governedRateMinor: number | null;
  confirmedWorkers: number;
}): { applies: boolean; amountMinor: number } {
  const employerCause = OBLIGATION_CAUSES.includes(input.cause);
  const withinCutoff = input.hoursBeforeStart < LATE_CANCELLATION_CUTOFF_HOURS;
  if (
    !employerCause ||
    !withinCutoff ||
    input.confirmedWorkers <= 0 ||
    input.governedRateMinor === null
  ) {
    return { applies: false, amountMinor: 0 };
  }
  return {
    applies: true,
    amountMinor: LATE_CANCELLATION_CHARGE_HOURS * input.governedRateMinor * input.confirmedWorkers
  };
}

export function createEmployerCancellationService(deps: {
  membershipReader: CancellationMembershipReader;
  jobRequestReader: CancellationJobRequestReader;
  confirmedAssignmentReader: ConfirmedAssignmentReader;
  contractRateReader: ContractRateReader;
  store: CancellationStore;
  assignmentCancelPort: AssignmentCancelPort;
  now?: () => Date;
}) {
  const now = deps.now ?? (() => new Date());

  async function derive(actorUserId: string, organizationId: string, jobRequestId: string) {
    await assertManager(deps.membershipReader, actorUserId, organizationId);
    const jobRequest = await deps.jobRequestReader.findJobRequest(organizationId, jobRequestId);
    if (!jobRequest || jobRequest.organizationId !== organizationId) {
      throw new EmployerCancellationError("not_found", "The staffing request was not found.");
    }
    const [confirmedWorkers, rate] = await Promise.all([
      deps.confirmedAssignmentReader.countConfirmedAssignments(organizationId, jobRequestId),
      deps.contractRateReader.getGovernedRate(organizationId, jobRequest.roleDefinitionId)
    ]);
    const hoursBeforeStart =
      (jobRequest.startAt.getTime() - now().getTime()) / (1000 * 60 * 60);
    return { jobRequest, confirmedWorkers, rate, hoursBeforeStart };
  }

  function toPreview(
    jobRequest: CancellationJobRequest,
    cause: EmployerCancellationCause,
    confirmedWorkers: number,
    rate: GovernedRate | null,
    hoursBeforeStart: number
  ): CancellationPreview {
    const governedRateMinor = rate?.rateMinor ?? null;
    const { applies, amountMinor } = computeObligationMinor({
      cause,
      hoursBeforeStart,
      governedRateMinor,
      confirmedWorkers
    });
    return {
      jobRequestId: jobRequest.id,
      shiftStartAt: jobRequest.startAt.toISOString(),
      cause,
      hoursBeforeStart,
      withinCutoff: hoursBeforeStart < LATE_CANCELLATION_CUTOFF_HOURS,
      affectedConfirmedWorkers: confirmedWorkers,
      governedRateMinor,
      currency: rate?.currency ?? "CAD",
      minimumShiftHours: LATE_CANCELLATION_CHARGE_HOURS,
      cutoffHours: LATE_CANCELLATION_CUTOFF_HOURS,
      obligationApplies: applies,
      obligationAmountMinor: amountMinor,
      requiresPlatformHandoff: confirmedWorkers > 0
    };
  }

  return {
    // READ-ONLY authoritative consequence. The browser supplies no amount/rate/count.
    async previewCancellation(input: {
      actorUserId: string;
      organizationId: string;
      jobRequestId: string;
      cause?: EmployerCancellationCause;
    }): Promise<CancellationPreview> {
      const cause = input.cause ?? "EMPLOYER_CANCELLED";
      const { jobRequest, confirmedWorkers, rate, hoursBeforeStart } = await derive(
        input.actorUserId,
        input.organizationId,
        input.jobRequestId
      );
      return toPreview(jobRequest, cause, confirmedWorkers, rate, hoursBeforeStart);
    },

    // Re-derives everything at confirm time (never trusts a stale preview), records
    // the intent + obligation, then hands off confirmed-assignment cancellation to
    // the platform. Idempotent by idempotencyKey.
    async confirmCancellation(input: {
      actorUserId: string;
      organizationId: string;
      jobRequestId: string;
      idempotencyKey: string;
      cause?: EmployerCancellationCause;
    }): Promise<{ cancellation: StoredCancellation; preview: CancellationPreview }> {
      const cause = input.cause ?? "EMPLOYER_CANCELLED";
      if (!input.idempotencyKey.trim()) {
        throw new EmployerCancellationError("invalid", "An idempotency key is required.");
      }
      const { jobRequest, confirmedWorkers, rate, hoursBeforeStart } = await derive(
        input.actorUserId,
        input.organizationId,
        input.jobRequestId
      );
      const preview = toPreview(jobRequest, cause, confirmedWorkers, rate, hoursBeforeStart);
      const currentTime = now();

      // Zero confirmed workers → no platform handoff needed; completes directly.
      const requiresHandoff = confirmedWorkers > 0;
      const initialStatus: StoredCancellation["status"] = requiresHandoff
        ? "assignment_cancellation_pending"
        : "completed";

      const { cancellation } = await deps.store.createCancellation({
        organizationId: input.organizationId,
        jobRequestId: input.jobRequestId,
        cause,
        initialStatus,
        affectedConfirmedWorkers: confirmedWorkers,
        idempotencyKey: input.idempotencyKey,
        initiatedByUserId: input.actorUserId,
        obligation: preview.obligationApplies
          ? {
              confirmedWorkerCount: confirmedWorkers,
              governedRateMinor: preview.governedRateMinor ?? 0,
              currency: preview.currency,
              minimumShiftHours: preview.minimumShiftHours,
              cutoffHours: preview.cutoffHours,
              contractId: rate?.contractId ?? null,
              contractVersion: rate?.contractVersion ?? null,
              amountMinor: preview.obligationAmountMinor
            }
          : null,
        now: currentTime
      });

      // Governed two-step: the employer step ONLY records intent + obligation. The
      // status is already `assignment_cancellation_pending` (confirmed workers) or
      // `completed` (zero workers) from createCancellation. No assignment mutation
      // happens under employer authority — the platform completes the handoff via
      // completeHandoff(). Idempotent replay returns the existing record unchanged.
      return { cancellation, preview };
    },

    // Platform-authorized step: transitions the confirmed assignments to
    // employer_cancelled via the injected platform assignment.cancel port, then
    // reconciles the cancellation lifecycle. Idempotent + retryable: a cancellation
    // already `completed` is returned unchanged; a `requires_reconciliation` one can
    // be retried. Employer-facing code never calls this.
    async completeHandoff(input: {
      cancellationId: string;
      // The platform-gated endpoint injects a port bound to its authorized actor;
      // tests/default use the port from deps.
      assignmentCancelPort?: AssignmentCancelPort;
    }): Promise<{ cancellation: StoredCancellation; result: AssignmentCancelResult | null }> {
      const port = input.assignmentCancelPort ?? deps.assignmentCancelPort;
      const cancellation = await deps.store.findById(input.cancellationId);
      if (!cancellation) {
        throw new EmployerCancellationError("not_found", "The cancellation was not found.");
      }
      if (cancellation.status === "completed") {
        return { cancellation, result: null };
      }
      if (cancellation.affectedConfirmedWorkers <= 0) {
        const completed = await deps.store.updateStatus(cancellation.id, "completed", now());
        return { cancellation: completed, result: { attempted: 0, cancelled: 0, failed: 0 } };
      }

      let result: AssignmentCancelResult;
      try {
        result = await port.cancelConfirmedAssignments({
          organizationId: cancellation.organizationId,
          jobRequestId: cancellation.jobRequestId,
          reason: "employer_cancelled"
        });
      } catch {
        const reconciled = await deps.store.updateStatus(
          cancellation.id,
          "requires_reconciliation",
          now()
        );
        return { cancellation: reconciled, result: null };
      }

      const nextStatus: StoredCancellation["status"] =
        result.failed === 0 && result.cancelled >= result.attempted
          ? "completed"
          : "requires_reconciliation";
      const updated = await deps.store.updateStatus(cancellation.id, nextStatus, now());
      return { cancellation: updated, result };
    }
  };
}

export type EmployerCancellationService = ReturnType<typeof createEmployerCancellationService>;

// ── Prisma adapters ──────────────────────────────────────────────────────────

// Assignment statuses that count as an affected "confirmed worker" — exactly the
// states the platform assignment.cancel path can transition to employer_cancelled.
export const CONFIRMED_ASSIGNMENT_STATUSES: readonly string[] = [
  "confirmed",
  "worker_acknowledged",
  "ready_for_attendance",
  "in_attendance_window"
];

type PrismaCancellationClient = {
  jobRequest: {
    findFirst(args: unknown): Promise<
      | { id: string; organizationId: string; roleDefinitionId: string; startAt: Date; status: string }
      | null
    >;
  };
  assignment: { count(args: unknown): Promise<number> };
  employerContract: {
    findFirst(args: unknown): Promise<
      | {
          id: string;
          version: string;
          currency: string;
          roleRates: readonly { roleDefinitionId: string; hourlyRateMinor: number }[];
        }
      | null
    >;
  };
  employerRequestCancellation: {
    findFirst(args: unknown): Promise<StoredCancellationRow | null>;
    findUnique(args: unknown): Promise<StoredCancellationRow | null>;
    update(args: unknown): Promise<StoredCancellationRow>;
  };
  $transaction<T>(fn: (tx: PrismaCancellationTx) => Promise<T>): Promise<T>;
};

type PrismaCancellationTx = {
  employerRequestCancellation: {
    findFirst(args: unknown): Promise<StoredCancellationRow | null>;
    create(args: unknown): Promise<StoredCancellationRow>;
  };
  employerCancellationObligation: { create(args: unknown): Promise<unknown> };
};

type StoredCancellationRow = {
  id: string;
  organizationId: string;
  jobRequestId: string;
  cause: EmployerCancellationCause;
  status: StoredCancellation["status"];
  affectedConfirmedWorkers: number;
  idempotencyKey: string;
  obligation: { id: string; amountMinor: number; currency: string; status: StoredObligation["status"] } | null;
};

function rowToCancellation(row: StoredCancellationRow): StoredCancellation {
  return {
    id: row.id,
    organizationId: row.organizationId,
    jobRequestId: row.jobRequestId,
    cause: row.cause,
    status: row.status,
    affectedConfirmedWorkers: row.affectedConfirmedWorkers,
    idempotencyKey: row.idempotencyKey,
    obligation: row.obligation
  };
}

const CANCELLATION_INCLUDE = {
  obligation: { select: { id: true, amountMinor: true, currency: true, status: true } }
};

export function createPrismaCancellationJobRequestReader(
  prismaClient: unknown
): CancellationJobRequestReader {
  const prisma = prismaClient as PrismaCancellationClient;
  return {
    async findJobRequest(organizationId, jobRequestId) {
      const jobRequest = await prisma.jobRequest.findFirst({
        where: { id: jobRequestId, organizationId },
        select: { id: true, organizationId: true, roleDefinitionId: true, startAt: true, status: true }
      });
      return jobRequest ?? null;
    }
  };
}

export function createPrismaConfirmedAssignmentReader(
  prismaClient: unknown
): ConfirmedAssignmentReader {
  const prisma = prismaClient as PrismaCancellationClient;
  return {
    async countConfirmedAssignments(organizationId, jobRequestId) {
      return prisma.assignment.count({
        where: {
          organizationId,
          jobRequestId,
          status: { in: [...CONFIRMED_ASSIGNMENT_STATUSES] }
        }
      });
    }
  };
}

export function createPrismaContractRateReader(prismaClient: unknown): ContractRateReader {
  const prisma = prismaClient as PrismaCancellationClient;
  return {
    async getGovernedRate(organizationId, roleDefinitionId) {
      const contract = await prisma.employerContract.findFirst({
        where: { organizationId, status: "active" },
        orderBy: { activatedAt: "desc" },
        select: {
          id: true,
          version: true,
          currency: true,
          roleRates: {
            where: { roleDefinitionId },
            select: { roleDefinitionId: true, hourlyRateMinor: true }
          }
        }
      });
      const rate = contract?.roleRates.find((r) => r.roleDefinitionId === roleDefinitionId);
      if (!contract || !rate) return null;
      return {
        rateMinor: rate.hourlyRateMinor,
        currency: contract.currency,
        contractId: contract.id,
        contractVersion: contract.version
      };
    }
  };
}

export function createPrismaCancellationStore(prismaClient: unknown): CancellationStore {
  const prisma = prismaClient as PrismaCancellationClient;
  return {
    async createCancellation(input) {
      try {
        return await prisma.$transaction(async (tx) => {
          const existing = await tx.employerRequestCancellation.findFirst({
            where: {
              OR: [{ jobRequestId: input.jobRequestId }, { idempotencyKey: input.idempotencyKey }]
            },
            include: CANCELLATION_INCLUDE
          });
          if (existing) return { created: false, cancellation: rowToCancellation(existing) };

          const created = await tx.employerRequestCancellation.create({
            data: {
              organizationId: input.organizationId,
              jobRequestId: input.jobRequestId,
              cause: input.cause,
              status: input.initialStatus,
              affectedConfirmedWorkers: input.affectedConfirmedWorkers,
              idempotencyKey: input.idempotencyKey,
              initiatedByUserId: input.initiatedByUserId,
              initiatedAt: input.now,
              ...(input.obligation
                ? {
                    obligation: {
                      create: {
                        organizationId: input.organizationId,
                        jobRequestId: input.jobRequestId,
                        cause: input.cause,
                        confirmedWorkerCount: input.obligation.confirmedWorkerCount,
                        governedRateMinor: input.obligation.governedRateMinor,
                        currency: input.obligation.currency,
                        minimumShiftHours: input.obligation.minimumShiftHours,
                        cutoffHours: input.obligation.cutoffHours,
                        contractId: input.obligation.contractId,
                        contractVersion: input.obligation.contractVersion,
                        amountMinor: input.obligation.amountMinor,
                        computedByUserId: input.initiatedByUserId,
                        computedAt: input.now
                      }
                    }
                  }
                : {})
            },
            include: CANCELLATION_INCLUDE
          });
          return { created: true, cancellation: rowToCancellation(created) };
        });
      } catch (error) {
        // Unique-constraint race (job_request_id / idempotency_key) → the other
        // writer won; return the authoritative existing record.
        if (isUniqueViolation(error)) {
          const existing = await prisma.employerRequestCancellation.findFirst({
            where: {
              OR: [{ jobRequestId: input.jobRequestId }, { idempotencyKey: input.idempotencyKey }]
            },
            include: CANCELLATION_INCLUDE
          });
          if (existing) return { created: false, cancellation: rowToCancellation(existing) };
        }
        throw error;
      }
    },
    async findById(cancellationId) {
      const row = await prisma.employerRequestCancellation.findUnique({
        where: { id: cancellationId },
        include: CANCELLATION_INCLUDE
      });
      return row ? rowToCancellation(row) : null;
    },
    async updateStatus(cancellationId, status, nowDate) {
      const updated = await prisma.employerRequestCancellation.update({
        where: { id: cancellationId },
        data: { status, lastHandoffAt: nowDate, handoffAttempts: { increment: 1 }, updatedAt: nowDate },
        include: CANCELLATION_INCLUDE
      });
      return rowToCancellation(updated);
    }
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
