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
  findById(reductionId: string): Promise<StoredReduction | null>;
  updateStatus(reductionId: string, status: StoredReduction["status"], now: Date): Promise<StoredReduction>;
  listByStatus(statuses: readonly StoredReduction["status"][], limit: number): Promise<readonly StoredReduction[]>;
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
  // Sets the request's target worker count under employer authority. Reads the
  // current request version internally (optimistic concurrency) so it is safe in the
  // deferred completion path where the version may have advanced. Returns false on
  // conflict/failure.
  setRequestedCapacity(input: {
    actorUserId: string;
    organizationId: string;
    jobRequestId: string;
    newTarget: number;
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
  // Stage 2b.3b-2: the selected country's currency, threaded from CountryProfile.currency at the API
  // composition root. Used ONLY as the preview-label currency when there is NO governed rate (a
  // non-applying, zero-amount obligation that is never persisted). Never an implicit "CAD" default;
  // absent → fail closed (see resolveDisplayCurrency). When a rate exists, its currency wins (that is
  // the value that gets persisted), so this is display-only and byte-identical for Canada.
  countryCurrency?: string | undefined;
  now?: () => Date;
}) {
  const now = deps.now ?? (() => new Date());
  // Fail-closed resolver: only reached when there is no governed rate. Never substitutes CAD.
  const resolveDisplayCurrency = (): string => {
    if (deps.countryCurrency === undefined) {
      throw new EmployerReduceError("invalid", "Currency is not configured for the selected country.");
    }
    return deps.countryCurrency;
  };

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
        currency: rate?.currency ?? resolveDisplayCurrency(),
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
        currency: rate?.currency ?? resolveDisplayCurrency(),
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

      // No confirmed impact (unfilled-only) → set the new target now under employer
      // authority; no platform handoff needed.
      if (!requiresHandoff) {
        const ok = await deps.capacitySetter.setRequestedCapacity({
          actorUserId: input.actorUserId,
          organizationId: input.organizationId,
          jobRequestId: input.jobRequestId,
          newTarget: input.newTarget
        });
        const finalized = await deps.store.updateStatus(reduction.id, ok ? "completed" : "requires_reconciliation", now());
        return { reduction: finalized, preview };
      }

      // Confirmed impact → the employer step records intent only. The platform-
      // governed handoff (cancel the selected assignments) + the target change happen
      // in completeReduction(); no assignment mutation under employer authority.
      return { reduction, preview };
    },

    // Platform-authorized completion: cancels ONLY the selected assignments, then —
    // if all succeed — sets the new target under the INITIATING employer's authority.
    // The request STAYS ACTIVE at the new target. Partial/failed handoff or a failed
    // target change → requires_reconciliation (target unchanged; obligation intact).
    // Idempotent + retryable.
    async completeReduction(input: {
      reductionId: string;
      assignmentCancelPort?: SelectedAssignmentCancelPort;
    }): Promise<{ reduction: StoredReduction; result: SelectedAssignmentCancelResult | null }> {
      const port = input.assignmentCancelPort ?? deps.assignmentCancelPort;
      const reduction = await deps.store.findById(input.reductionId);
      if (!reduction) throw new EmployerReduceError("not_found", "The reduction was not found.");
      if (reduction.status === "completed") return { reduction, result: null };

      let result: SelectedAssignmentCancelResult;
      try {
        result = await port.cancelSelectedAssignments({
          organizationId: reduction.organizationId,
          jobRequestId: reduction.jobRequestId,
          assignmentIds: reduction.selectedAssignmentIds,
          reason: "employer_reduced_capacity"
        });
      } catch {
        const r = await deps.store.updateStatus(reduction.id, "requires_reconciliation", now());
        return { reduction: r, result: null };
      }
      if (result.failed !== 0 || result.cancelled < result.attempted) {
        const r = await deps.store.updateStatus(reduction.id, "requires_reconciliation", now());
        return { reduction: r, result };
      }
      // Selected assignments cancelled → set the new target (initiating employer).
      const ok = await deps.capacitySetter.setRequestedCapacity({
        actorUserId: reduction.initiatedByUserId,
        organizationId: reduction.organizationId,
        jobRequestId: reduction.jobRequestId,
        newTarget: reduction.newTarget
      });
      const finalized = await deps.store.updateStatus(reduction.id, ok ? "completed" : "requires_reconciliation", now());
      return { reduction: finalized, result };
    },

    async listReconciliation(input?: {
      statuses?: readonly StoredReduction["status"][];
      limit?: number;
    }): Promise<readonly StoredReduction[]> {
      return deps.store.listByStatus(input?.statuses ?? ["requires_reconciliation"], input?.limit ?? 100);
    }
  };
}

export type EmployerReduceService = ReturnType<typeof createEmployerReduceService>;

// ── Prisma adapters ──────────────────────────────────────────────────────────

import { CONFIRMED_ASSIGNMENT_STATUSES } from "./employerCancellation";

type PrismaReduceClient = {
  jobRequest: {
    findFirst(args: unknown): Promise<
      | { id: string; organizationId: string; roleDefinitionId: string; numberOfWorkers: number; startAt: Date; status: string; version: number }
      | null
    >;
  };
  assignment: {
    findMany(args: unknown): Promise<
      readonly { id: string; status: string; confirmedStartAt: Date; confirmedEndAt: Date }[]
    >;
  };
  employerContract: {
    findFirst(args: unknown): Promise<
      | { id: string; version: string; currency: string; roleRates: readonly { roleDefinitionId: string; hourlyRateMinor: number }[] }
      | null
    >;
  };
  employerCapacityReduction: {
    findFirst(args: unknown): Promise<ReduceRow | null>;
    findMany(args: unknown): Promise<readonly ReduceRow[]>;
    create(args: unknown): Promise<ReduceRow>;
    update(args: unknown): Promise<ReduceRow>;
  };
};

type ReduceRow = {
  id: string;
  organizationId: string;
  jobRequestId: string;
  status: StoredReduction["status"];
  previousTarget: number;
  newTarget: number;
  affectedConfirmedCount: number;
  selectedAssignmentIds: unknown;
  idempotencyKey: string;
  initiatedByUserId: string;
  obligationAmountMinor: number | null;
  currency: string;
};

function reduceRowToStored(row: ReduceRow): StoredReduction {
  return {
    id: row.id,
    organizationId: row.organizationId,
    jobRequestId: row.jobRequestId,
    status: row.status,
    previousTarget: row.previousTarget,
    newTarget: row.newTarget,
    affectedConfirmed: row.affectedConfirmedCount,
    selectedAssignmentIds: Array.isArray(row.selectedAssignmentIds)
      ? row.selectedAssignmentIds.filter((v): v is string => typeof v === "string")
      : [],
    idempotencyKey: row.idempotencyKey,
    initiatedByUserId: row.initiatedByUserId,
    obligationAmountMinor: row.obligationAmountMinor,
    obligationCurrency: row.obligationAmountMinor === null ? null : row.currency
  };
}

export function createPrismaReduceJobRequestReader(prismaClient: unknown): ReduceJobRequestReader {
  const prisma = prismaClient as PrismaReduceClient;
  return {
    async findJobRequest(organizationId, jobRequestId) {
      const jr = await prisma.jobRequest.findFirst({
        where: { id: jobRequestId, organizationId },
        select: { id: true, organizationId: true, roleDefinitionId: true, numberOfWorkers: true, startAt: true, status: true, version: true }
      });
      if (!jr) return null;
      return {
        id: jr.id,
        organizationId: jr.organizationId,
        roleDefinitionId: jr.roleDefinitionId,
        numberOfWorkers: jr.numberOfWorkers,
        startAt: jr.startAt,
        status: jr.status,
        versionToken: jr.version
      };
    }
  };
}

export function createPrismaConfirmedAssignmentLister(prismaClient: unknown): ConfirmedAssignmentLister {
  const prisma = prismaClient as PrismaReduceClient;
  return {
    async listConfirmedAssignments(organizationId, jobRequestId) {
      const rows = await prisma.assignment.findMany({
        where: { organizationId, jobRequestId, status: { in: [...CONFIRMED_ASSIGNMENT_STATUSES] } },
        select: { id: true, status: true, confirmedStartAt: true, confirmedEndAt: true },
        orderBy: { confirmedStartAt: "asc" }
      });
      // Worker identity is intentionally NOT exposed; the employer selects by
      // assignment schedule/status. (Privacy boundary.)
      return rows.map((r) => ({
        id: r.id,
        status: r.status,
        workerDisplay: null,
        startAt: r.confirmedStartAt.toISOString(),
        endAt: r.confirmedEndAt.toISOString()
      }));
    }
  };
}

export function createPrismaReduceContractRateReader(prismaClient: unknown): ReduceContractRateReader {
  const prisma = prismaClient as PrismaReduceClient;
  return {
    async getGovernedRate(organizationId, roleDefinitionId) {
      const contract = await prisma.employerContract.findFirst({
        where: { organizationId, status: "active" },
        orderBy: { activatedAt: "desc" },
        select: { id: true, version: true, currency: true, roleRates: { where: { roleDefinitionId }, select: { roleDefinitionId: true, hourlyRateMinor: true } } }
      });
      const rate = contract?.roleRates.find((r) => r.roleDefinitionId === roleDefinitionId);
      if (!contract || !rate) return null;
      return { rateMinor: rate.hourlyRateMinor, currency: contract.currency, contractId: contract.id, contractVersion: contract.version };
    }
  };
}

export function createPrismaReduceStore(prismaClient: unknown): ReduceStore {
  const prisma = prismaClient as PrismaReduceClient;
  return {
    async createReduction(input) {
      try {
        const existing = await prisma.employerCapacityReduction.findFirst({ where: { idempotencyKey: input.idempotencyKey } });
        if (existing) return { created: false, reduction: reduceRowToStored(existing) };
        const created = await prisma.employerCapacityReduction.create({
          data: {
            organizationId: input.organizationId,
            jobRequestId: input.jobRequestId,
            initiatedByUserId: input.initiatedByUserId,
            status: input.initialStatus,
            previousTarget: input.previousTarget,
            newTarget: input.newTarget,
            removedUnfilledCapacity: Math.max(0, input.previousTarget - input.newTarget - input.affectedConfirmed),
            affectedConfirmedCount: input.affectedConfirmed,
            selectedAssignmentIds: [...input.selectedAssignmentIds],
            expectedRequestVersion: 0,
            idempotencyKey: input.idempotencyKey,
            ...(input.obligation
              ? {
                  obligationAmountMinor: input.obligation.amountMinor,
                  governedRateMinor: input.obligation.governedRateMinor,
                  currency: input.obligation.currency,
                  minimumShiftHours: input.obligation.minimumShiftHours,
                  cutoffHours: input.obligation.cutoffHours,
                  contractId: input.obligation.contractId,
                  contractVersion: input.obligation.contractVersion
                }
              : {}),
            createdAt: input.now,
            updatedAt: input.now
          }
        });
        return { created: true, reduction: reduceRowToStored(created) };
      } catch (error) {
        if (isReduceUniqueViolation(error)) {
          const existing = await prisma.employerCapacityReduction.findFirst({ where: { idempotencyKey: input.idempotencyKey } });
          if (existing) return { created: false, reduction: reduceRowToStored(existing) };
        }
        throw error;
      }
    },
    async findById(reductionId) {
      const row = await prisma.employerCapacityReduction.findFirst({ where: { id: reductionId } });
      return row ? reduceRowToStored(row) : null;
    },
    async updateStatus(reductionId, status, nowDate) {
      const updated = await prisma.employerCapacityReduction.update({
        where: { id: reductionId },
        data: { status, lastHandoffAt: nowDate, handoffAttempts: { increment: 1 }, updatedAt: nowDate }
      });
      return reduceRowToStored(updated);
    },
    async listByStatus(statuses, limit) {
      const rows = await prisma.employerCapacityReduction.findMany({
        where: { status: { in: [...statuses] } },
        orderBy: { createdAt: "desc" },
        take: limit
      });
      return rows.map(reduceRowToStored);
    }
  };
}

function isReduceUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002";
}
