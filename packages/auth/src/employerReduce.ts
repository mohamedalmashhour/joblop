// Employer Reduce Workers — governed capacity reduction with PARTIAL cancellation.
//
// Reduce is NOT whole-request Cancel: it lowers the required-worker target and, only
// when the new target falls below confirmed capacity, cancels the SPECIFIC confirmed
// assignments the employer selects — the request stays active with remaining valid
// assignments. Unfilled positions never create an obligation. The obligation for the
// affected confirmed assignments (if <48h) is 6h × governed rate × selected count.
//
// Reuses the governed two-step boundary: employer selects + confirms → intent +
// obligation recorded → platform cancels the SELECTED assignments → reconcile → set
// new target. No payment execution; no worker-facing money.

const CONTRACT_MANAGER_ROLES: readonly string[] = ["ORGANIZATION_OWNER", "ORGANIZATION_ADMINISTRATOR"];
export const REDUCE_CUTOFF_HOURS = 48;
export const REDUCE_CHARGE_HOURS = 6;

export type EmployerReduceErrorCode = "denied" | "not_found" | "invalid" | "conflict";
export class EmployerReduceError extends Error {
  readonly code: EmployerReduceErrorCode;
  constructor(code: EmployerReduceErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "EmployerReduceError";
  }
}

// ── Ports (structural, for unit-testing with fakes) ──

export type ReduceMembershipReader = Readonly<{
  listMemberships(userId: string): Promise<
    readonly Readonly<{ organizationId: string; status: string; roleKeys: readonly string[] }>[]
  >;
}>;

export type ReduceJobRequest = Readonly<{
  id: string;
  organizationId: string;
  roleDefinitionId: string;
  numberOfWorkers: number;
  startAt: Date;
  status: string;
  versionToken: number;
}>;

export type ReduceJobRequestReader = Readonly<{
  findJobRequest(organizationId: string, jobRequestId: string): Promise<ReduceJobRequest | null>;
}>;

export type ConfirmedAssignment = Readonly<{
  id: string;
  status: string;
  workerDisplay: string | null;
  startAt: string;
  endAt: string;
}>;

export type ConfirmedAssignmentLister = Readonly<{
  listConfirmedAssignments(organizationId: string, jobRequestId: string): Promise<readonly ConfirmedAssignment[]>;
}>;

export type ReduceGovernedRate = Readonly<{
  rateMinor: number;
  currency: string;
  contractId: string | null;
  contractVersion: string | null;
}>;
export type ReduceContractRateReader = Readonly<{
  getGovernedRate(organizationId: string, roleDefinitionId: string): Promise<ReduceGovernedRate | null>;
}>;

export type StoredReduction = Readonly<{
  id: string;
  organizationId: string;
  jobRequestId: string;
  status: "requested" | "assignment_cancellation_pending" | "completed" | "requires_reconciliation";
  previousTarget: number;
  newTarget: number;
  affectedConfirmed: number;
  selectedAssignmentIds: readonly string[];
  idempotencyKey: string;
  initiatedByUserId: string;
  obligationAmountMinor: number | null;
  obligationCurrency: string | null;
}>;

export type ReduceStore = Readonly<{
  createReduction(input: {
    organizationId: string;
    jobRequestId: string;
    initialStatus: StoredReduction["status"];
    previousTarget: number;
    newTarget: number;
    affectedConfirmed: number;
    selectedAssignmentIds: readonly string[];
    idempotencyKey: string;
    initiatedByUserId: string;
    obligation: {
      amountMinor: number;
      currency: string;
      governedRateMinor: number;
      minimumShiftHours: number;
      cutoffHours: number;
      contractId: string | null;
      contractVersion: string | null;
    } | null;
    now: Date;
  }): Promise<{ created: boolean; reduction: StoredReduction }>;
  updateStatus(reductionId: string, status: StoredReduction["status"], now: Date): Promise<StoredReduction>;
}>;

export type SelectedAssignmentCancelResult = Readonly<{ attempted: number; cancelled: number; failed: number }>;
export type SelectedAssignmentCancelPort = Readonly<{
  cancelSelectedAssignments(input: {
    organizationId: string;
    jobRequestId: string;
    assignmentIds: readonly string[];
    reason: string;
  }): Promise<SelectedAssignmentCancelResult>;
}>;

export type CapacitySetterPort = Readonly<{
  // Sets the request's target worker count under employer authority (optimistic
  // concurrency). Returns false on version conflict/failure.
  setRequestedCapacity(input: {
    actorUserId: string;
    organizationId: string;
    jobRequestId: string;
    newTarget: number;
    expectedVersion: number;
  }): Promise<boolean>;
}>;

// ── DTOs ──

export type ReducePreview = Readonly<{
  jobRequestId: string;
  previousTarget: number;
  newTarget: number;
  confirmedWorkers: number;
  unfilledCapacity: number;
  unfilledRemoved: number;
  affectedConfirmed: number;
  requiresConfirmedSelection: boolean;
  eligibleAssignments: readonly ConfirmedAssignment[];
  withinCutoff: boolean;
  governedRateMinor: number | null;
  currency: string;
  obligationApplies: boolean;
  obligationAmountMinor: number;
}>;

async function assertManager(reader: ReduceMembershipReader, actorUserId: string, organizationId: string) {
  const memberships = await reader.listMemberships(actorUserId);
  const ok = memberships.some(
    (m) => m.organizationId === organizationId && m.status === "active" && m.roleKeys.some((r) => CONTRACT_MANAGER_ROLES.includes(r))
  );
  if (!ok) throw new EmployerReduceError("denied", "An active organization owner or administrator is required to reduce capacity.");
}

export function createEmployerReduceService(deps: {
  membershipReader: ReduceMembershipReader;
  jobRequestReader: ReduceJobRequestReader;
  confirmedAssignmentLister: ConfirmedAssignmentLister;
  contractRateReader: ReduceContractRateReader;
  store: ReduceStore;
  assignmentCancelPort: SelectedAssignmentCancelPort;
  capacitySetter: CapacitySetterPort;
  now?: () => Date;
}) {
  const now = deps.now ?? (() => new Date());

  async function derive(actorUserId: string, organizationId: string, jobRequestId: string) {
    await assertManager(deps.membershipReader, actorUserId, organizationId);
    const jobRequest = await deps.jobRequestReader.findJobRequest(organizationId, jobRequestId);
    if (!jobRequest || jobRequest.organizationId !== organizationId) {
      throw new EmployerReduceError("not_found", "The staffing request was not found.");
    }
    const [confirmed, rate] = await Promise.all([
      deps.confirmedAssignmentLister.listConfirmedAssignments(organizationId, jobRequestId),
      deps.contractRateReader.getGovernedRate(organizationId, jobRequest.roleDefinitionId)
    ]);
    return { jobRequest, confirmed, rate };
  }

  function plan(requestedTarget: number, confirmedWorkers: number, newTarget: number) {
    const unfilledCapacity = Math.max(0, requestedTarget - confirmedWorkers);
    if (!Number.isInteger(newTarget) || newTarget < 1) {
      throw new EmployerReduceError("invalid", "Reduce to zero uses the whole-request Cancel workflow.");
    }
    if (newTarget >= requestedTarget) {
      throw new EmployerReduceError("invalid", "The new target must be lower than the current requested capacity.");
    }
    const reduction = requestedTarget - newTarget;
    const unfilledRemoved = Math.min(unfilledCapacity, reduction);
    const affectedConfirmed = Math.max(0, confirmedWorkers - newTarget);
    return { unfilledCapacity, unfilledRemoved, affectedConfirmed };
  }

  function obligation(affectedCount: number, hoursBeforeStart: number, rate: ReduceGovernedRate | null) {
    const withinCutoff = hoursBeforeStart < REDUCE_CUTOFF_HOURS;
    const applies = withinCutoff && affectedCount > 0 && rate !== null;
    return {
      withinCutoff,
      applies,
      amountMinor: applies ? REDUCE_CHARGE_HOURS * rate!.rateMinor * affectedCount : 0
    };
  }

  return {
    async reducePreview(input: {
      actorUserId: string;
      organizationId: string;
      jobRequestId: string;
      newTarget: number;
    }): Promise<ReducePreview> {
      const { jobRequest, confirmed, rate } = await derive(input.actorUserId, input.organizationId, input.jobRequestId);
      const p = plan(jobRequest.numberOfWorkers, confirmed.length, input.newTarget);
      const hoursBeforeStart = (jobRequest.startAt.getTime() - now().getTime()) / 3_600_000;
      const ob = obligation(p.affectedConfirmed, hoursBeforeStart, rate);
      return {
        jobRequestId: jobRequest.id,
        previousTarget: jobRequest.numberOfWorkers,
        newTarget: input.newTarget,
        confirmedWorkers: confirmed.length,
        unfilledCapacity: p.unfilledCapacity,
        unfilledRemoved: p.unfilledRemoved,
        affectedConfirmed: p.affectedConfirmed,
        requiresConfirmedSelection: p.affectedConfirmed > 0,
        eligibleAssignments: confirmed,
        withinCutoff: ob.withinCutoff,
        governedRateMinor: rate?.rateMinor ?? null,
        currency: rate?.currency ?? "CAD",
        obligationApplies: ob.applies,
        obligationAmountMinor: ob.amountMinor
      };
    },

    async reduceConfirm(input: {
      actorUserId: string;
      organizationId: string;
      jobRequestId: string;
      newTarget: number;
      selectedAssignmentIds: readonly string[];
      expectedVersion: number;
      idempotencyKey: string;
    }): Promise<{ reduction: StoredReduction; preview: ReducePreview }> {
      if (!input.idempotencyKey.trim()) throw new EmployerReduceError("invalid", "An idempotency key is required.");
      const { jobRequest, confirmed, rate } = await derive(input.actorUserId, input.organizationId, input.jobRequestId);
      const p = plan(jobRequest.numberOfWorkers, confirmed.length, input.newTarget);
      const hoursBeforeStart = (jobRequest.startAt.getTime() - now().getTime()) / 3_600_000;
      const ob = obligation(p.affectedConfirmed, hoursBeforeStart, rate);

      // Selection validation: the employer must select EXACTLY the affected count,
      // and every id must be an eligible confirmed assignment of THIS request.
      const eligibleIds = new Set(confirmed.map((a) => a.id));
      const selected = [...new Set(input.selectedAssignmentIds)];
      if (selected.length !== input.selectedAssignmentIds.length) {
        throw new EmployerReduceError("invalid", "Duplicate assignment selection.");
      }
      if (selected.length !== p.affectedConfirmed) {
        throw new EmployerReduceError("invalid", `Select exactly ${p.affectedConfirmed} confirmed assignment(s).`);
      }
      for (const id of selected) {
        if (!eligibleIds.has(id)) {
          throw new EmployerReduceError("invalid", "A selected assignment is not an eligible confirmed assignment of this request.");
        }
      }

      const currentTime = now();
      const requiresHandoff = p.affectedConfirmed > 0;
      const initialStatus: StoredReduction["status"] = requiresHandoff ? "assignment_cancellation_pending" : "requested";

      const preview: ReducePreview = {
        jobRequestId: jobRequest.id,
        previousTarget: jobRequest.numberOfWorkers,
        newTarget: input.newTarget,
        confirmedWorkers: confirmed.length,
        unfilledCapacity: p.unfilledCapacity,
        unfilledRemoved: p.unfilledRemoved,
        affectedConfirmed: p.affectedConfirmed,
        requiresConfirmedSelection: requiresHandoff,
        eligibleAssignments: confirmed,
        withinCutoff: ob.withinCutoff,
        governedRateMinor: rate?.rateMinor ?? null,
        currency: rate?.currency ?? "CAD",
        obligationApplies: ob.applies,
        obligationAmountMinor: ob.amountMinor
      };

      const { created, reduction } = await deps.store.createReduction({
        organizationId: input.organizationId,
        jobRequestId: input.jobRequestId,
        initialStatus,
        previousTarget: jobRequest.numberOfWorkers,
        newTarget: input.newTarget,
        affectedConfirmed: p.affectedConfirmed,
        selectedAssignmentIds: selected,
        idempotencyKey: input.idempotencyKey,
        initiatedByUserId: input.actorUserId,
        obligation: ob.applies
          ? {
              amountMinor: ob.amountMinor,
              currency: preview.currency,
              governedRateMinor: rate?.rateMinor ?? 0,
              minimumShiftHours: REDUCE_CHARGE_HOURS,
              cutoffHours: REDUCE_CUTOFF_HOURS,
              contractId: rate?.contractId ?? null,
              contractVersion: rate?.contractVersion ?? null
            }
          : null,
        now: currentTime
      });
      if (!created) return { reduction, preview }; // idempotent replay

      // No confirmed impact → just set the new target now (unfilled-only reduction).
      if (!requiresHandoff) {
        const ok = await deps.capacitySetter.setRequestedCapacity({
          actorUserId: input.actorUserId,
          organizationId: input.organizationId,
          jobRequestId: input.jobRequestId,
          newTarget: input.newTarget,
          expectedVersion: input.expectedVersion
        });
        const finalized = await deps.store.updateStatus(reduction.id, ok ? "completed" : "requires_reconciliation", now());
        return { reduction: finalized, preview };
      }

      // Confirmed impact → platform cancels ONLY the selected assignments.
      let result: SelectedAssignmentCancelResult;
      try {
        result = await deps.assignmentCancelPort.cancelSelectedAssignments({
          organizationId: input.organizationId,
          jobRequestId: input.jobRequestId,
          assignmentIds: selected,
          reason: "employer_reduced_capacity"
        });
      } catch {
        const r = await deps.store.updateStatus(reduction.id, "requires_reconciliation", now());
        return { reduction: r, preview };
      }
      if (result.failed !== 0 || result.cancelled < result.attempted) {
        const r = await deps.store.updateStatus(reduction.id, "requires_reconciliation", now());
        return { reduction: r, preview };
      }
      // All selected assignments cancelled → set the new target. Request stays ACTIVE.
      const ok = await deps.capacitySetter.setRequestedCapacity({
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        jobRequestId: input.jobRequestId,
        newTarget: input.newTarget,
        expectedVersion: input.expectedVersion
      });
      const finalized = await deps.store.updateStatus(reduction.id, ok ? "completed" : "requires_reconciliation", now());
      return { reduction: finalized, preview };
    }
  };
}

export type EmployerReduceService = ReturnType<typeof createEmployerReduceService>;
