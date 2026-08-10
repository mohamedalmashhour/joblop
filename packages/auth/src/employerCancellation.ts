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

      const { created, cancellation } = await deps.store.createCancellation({
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

      // Idempotent replay: an existing record is returned unchanged (no duplicate
      // obligation, no second handoff).
      if (!created) {
        return { cancellation, preview };
      }
      if (!requiresHandoff) {
        return { cancellation, preview };
      }

      // Platform-authorized handoff. Never mutate assignments in employer code.
      let result: AssignmentCancelResult;
      try {
        result = await deps.assignmentCancelPort.cancelConfirmedAssignments({
          organizationId: input.organizationId,
          jobRequestId: input.jobRequestId,
          reason: "employer_cancelled"
        });
      } catch {
        const reconciled = await deps.store.updateStatus(
          cancellation.id,
          "requires_reconciliation",
          now()
        );
        return { cancellation: reconciled, preview };
      }

      const nextStatus: StoredCancellation["status"] =
        result.failed === 0 && result.cancelled >= result.attempted ? "completed" : "requires_reconciliation";
      const updated = await deps.store.updateStatus(cancellation.id, nextStatus, now());
      return { cancellation: updated, preview };
    }
  };
}

export type EmployerCancellationService = ReturnType<typeof createEmployerCancellationService>;
