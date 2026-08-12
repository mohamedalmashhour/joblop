import type { PrismaClient } from "@rwos/database";
import { createContractMoney } from "@rwos/shared";
import { createPrismaEmployerContractRepository } from "@rwos/auth";
import type {
  CreatePayrollCalculationInput,
  PayrollCalculationStatus,
  PayrollJurisdiction,
  PayrollJurisdictionResolver,
  PayrollPeriodStatus,
  PayrollRateResolver,
  PayrollReplaySnapshot,
  PayrollRepository,
  PayrollWorkedTimeLine,
  StoredPayrollCalculation,
  StoredPayrollPeriod
} from "@rwos/auth";

// AUTHORITATIVE rate resolver (HR-5.1) — reads the governed EmployerContract that was in force at
// the shift's instant (active OR superseded), and picks the per-role rate. Historical work reads
// the committed rate that governed then, never the current rate. Payroll invents no rate.
export function createPrismaPayrollRateResolver(prisma: PrismaClient): PayrollRateResolver {
  const contracts = createPrismaEmployerContractRepository(prisma);
  return {
    async resolveAt(input) {
      const contract = await contracts.findContractEffectiveAt(input.organizationId, input.instant);
      if (!contract) return null;
      const roleRate = contract.roleRates.find((r) => r.workGroupId === input.workGroupId && r.roleDefinitionId === input.roleDefinitionId);
      if (!roleRate || contract.effectiveFrom === null) return null;
      const currency = contract.currency === "USD" ? "USD" : "CAD";
      return {
        contractId: contract.id,
        contractVersion: contract.version,
        contractEffectiveFrom: contract.effectiveFrom,
        hourlyRate: createContractMoney({ amountMinor: roleRate.hourlyRateMinor, currency }),
        compensationType: "hourly" as const
      };
    }
  };
}

// AUTHORITATIVE jurisdiction resolver — derives country + region from the worksite Residence, never
// from caller input. Country falls back to CA only where Residence.country is null (documented CA
// domain assumption); region comes from the reliably-populated Residence.province.
export function createPrismaPayrollJurisdictionResolver(prisma: PrismaClient): PayrollJurisdictionResolver {
  return {
    async resolve(input): Promise<PayrollJurisdiction | null> {
      const residence = await prisma.residence.findUnique({ where: { id: input.residenceId }, select: { country: true, province: true } });
      if (!residence || !residence.province) return null;
      return { country: (residence.country ?? "CA").toUpperCase(), region: residence.province.toUpperCase() };
    }
  };
}

// HR-5 Prisma-backed payroll repository. The atomic supersede+insert is the concurrency crux:
// creating a new revision version-guards the prior active revision, and the unique
// (period, worker, revision) index makes a duplicate calculation request deterministic — exactly
// one revision N can exist, so a racing duplicate loses rather than silently overwriting.

const RETRYABLE = new Set(["P2034", "40001", "40P01"]);
function isRetryable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && RETRYABLE.has(code);
}
function isUniqueViolation(error: unknown): boolean {
  return !!error && typeof error === "object" && (error as { code?: unknown }).code === "P2002";
}

type CalcRow = {
  id: string; payrollPeriodId: string; organizationId: string; workerIdentityId: string; revision: number;
  status: string; jurisdictionCountry: string; jurisdictionRegion: string; ruleProviderKey: string;
  ruleProviderVersion: string; calculationPolicyVersion: string; workerClassification: string; currency: string; grossPayMinor: number;
  totalDeductionsMinor: number; netPayMinor: number; totalEmployerCostMinor: number; calculationFingerprint: string; synthetic: boolean;
  calculatedAt: Date; supersededById: string | null; version: number;
  familyRootId: string; previousCalculationId: string | null; previousFingerprint: string | null;
  correctionType: string | null; correctionReason: string | null; correlationKey: string | null;
  adjustsCalculationId: string | null; adjustmentNetDirection: string | null; adjustmentNetDeltaMinor: number | null;
};
function mapCalc(row: CalcRow): StoredPayrollCalculation {
  return {
    id: row.id, payrollPeriodId: row.payrollPeriodId, organizationId: row.organizationId,
    workerIdentityId: row.workerIdentityId, revision: row.revision, status: row.status as PayrollCalculationStatus,
    jurisdictionCountry: row.jurisdictionCountry, jurisdictionRegion: row.jurisdictionRegion,
    ruleProviderKey: row.ruleProviderKey, ruleProviderVersion: row.ruleProviderVersion,
    calculationPolicyVersion: row.calculationPolicyVersion, workerClassification: row.workerClassification, currency: row.currency,
    grossPayMinor: row.grossPayMinor, totalDeductionsMinor: row.totalDeductionsMinor,
    netPayMinor: row.netPayMinor, totalEmployerCostMinor: row.totalEmployerCostMinor,
    calculationFingerprint: row.calculationFingerprint, synthetic: row.synthetic, calculatedAt: row.calculatedAt, supersededById: row.supersededById, version: row.version,
    familyRootId: row.familyRootId, previousCalculationId: row.previousCalculationId, previousFingerprint: row.previousFingerprint,
    correctionType: row.correctionType as StoredPayrollCalculation["correctionType"], correctionReason: row.correctionReason, correlationKey: row.correlationKey,
    adjustsCalculationId: row.adjustsCalculationId, adjustmentNetDirection: row.adjustmentNetDirection as StoredPayrollCalculation["adjustmentNetDirection"], adjustmentNetDeltaMinor: row.adjustmentNetDeltaMinor
  };
}
type PeriodRow = {
  id: string; organizationId: string; jurisdictionCountry: string; jurisdictionRegion: string;
  periodStart: Date; periodEnd: Date; timezone: string; status: string; currency: string;
  ruleProviderKey: string; ruleProviderVersion: string; version: number;
};
function mapPeriod(row: PeriodRow): StoredPayrollPeriod {
  return {
    id: row.id, organizationId: row.organizationId, jurisdictionCountry: row.jurisdictionCountry,
    jurisdictionRegion: row.jurisdictionRegion, periodStart: row.periodStart, periodEnd: row.periodEnd,
    timezone: row.timezone, status: row.status as PayrollPeriodStatus, currency: row.currency,
    ruleProviderKey: row.ruleProviderKey, ruleProviderVersion: row.ruleProviderVersion, version: row.version
  };
}

export function createPrismaPayrollRepository(prisma: PrismaClient): PayrollRepository {
  return {
    async findPeriodById(id) {
      const row = await prisma.payrollPeriod.findUnique({ where: { id } });
      return row ? mapPeriod(row) : null;
    },

    async listApprovedWorkedTime(input): Promise<readonly PayrollWorkedTimeLine[]> {
      // Reads approved/locked timesheets ONLY (never raw attendance) and carries the shift window +
      // role/worksite scope so payroll can attribute each shift to the effective contract rate.
      const rows = await prisma.timesheet.findMany({
        where: {
          organizationId: input.organizationId,
          workerIdentityId: input.workerIdentityId,
          status: { in: ["approved", "locked"] },
          scheduledStartAt: { gte: input.from, lt: input.to }
        },
        orderBy: [{ scheduledStartAt: "asc" }, { id: "asc" }],
        select: { id: true, version: true, status: true, payableMinutes: true, billableMinutes: true, scheduledStartAt: true, scheduledEndAt: true, assignmentId: true, workGroupId: true, roleDefinitionId: true, residenceId: true }
      });
      return rows.map((r) => ({
        timesheetId: r.id, timesheetVersion: r.version, timesheetStatus: r.status,
        payableMinutes: r.payableMinutes ?? 0, billableMinutes: r.billableMinutes ?? 0,
        scheduledStartAt: r.scheduledStartAt, scheduledEndAt: r.scheduledEndAt,
        assignmentId: r.assignmentId, workGroupId: r.workGroupId, roleDefinitionId: r.roleDefinitionId, residenceId: r.residenceId
      }));
    },

    async getCalculationForReplay(calculationId): Promise<PayrollReplaySnapshot | null> {
      const c = await prisma.payrollCalculation.findUnique({
        where: { id: calculationId },
        include: { workedTimeRefs: true, earningLines: { orderBy: { sortOrder: "asc" } }, deductionLines: { orderBy: { sortOrder: "asc" } }, employerCostLines: { orderBy: { sortOrder: "asc" } } }
      });
      if (!c) return null;
      return {
        id: c.id, payrollPeriodId: c.payrollPeriodId, organizationId: c.organizationId, workerIdentityId: c.workerIdentityId,
        jurisdiction: { country: c.jurisdictionCountry, region: c.jurisdictionRegion },
        ruleProviderKey: c.ruleProviderKey, ruleProviderVersion: c.ruleProviderVersion, calculationPolicyVersion: c.calculationPolicyVersion,
        workerClassification: c.workerClassification as PayrollReplaySnapshot["workerClassification"], currency: c.currency, calculationFingerprint: c.calculationFingerprint,
        workedTime: c.workedTimeRefs.map((w) => ({ timesheetId: w.timesheetId, timesheetVersion: w.timesheetVersion, payableMinutes: w.payableMinutes, contractId: w.contractId, contractVersion: w.contractVersion, appliedHourlyRateMinor: w.appliedHourlyRateMinor, contractEffectiveFrom: w.contractEffectiveFrom, sourceEffectiveInstant: w.sourceEffectiveInstant })),
        earnings: c.earningLines.map((e) => ({ classification: e.classification, amountMinor: e.amountMinor, sourceContractVersion: e.sourceContractVersion })),
        deductions: c.deductionLines.map((d) => ({ category: d.category, code: d.code, amountMinor: d.amountMinor })),
        employerCosts: c.employerCostLines.map((x) => ({ category: x.category, code: x.code, amountMinor: x.amountMinor })),
        grossPayMinor: c.grossPayMinor, totalDeductionsMinor: c.totalDeductionsMinor, netPayMinor: c.netPayMinor, totalEmployerCostMinor: c.totalEmployerCostMinor
      };
    },

    async findActiveCalculation(payrollPeriodId, workerIdentityId) {
      const row = await prisma.payrollCalculation.findFirst({
        where: { payrollPeriodId, workerIdentityId, status: { not: "superseded" } },
        orderBy: { revision: "desc" }
      });
      return row ? mapCalc(row) : null;
    },

    async listEligibleWorkerIds(input): Promise<readonly string[]> {
      // bounded keyset over DISTINCT workers with approved/locked worked time in the window.
      const rows = await prisma.$queryRawUnsafe<Array<{ worker_identity_id: string }>>(
        `SELECT DISTINCT worker_identity_id FROM timesheets
         WHERE organization_id = $1::uuid AND status IN ('approved','locked')
           AND scheduled_start_at >= $2 AND scheduled_start_at < $3
           AND ($4::uuid IS NULL OR worker_identity_id > $4::uuid)
         ORDER BY worker_identity_id ASC LIMIT $5`,
        input.organizationId, input.from, input.to, input.cursor, input.limit
      );
      return rows.map((r) => r.worker_identity_id);
    },

    async findCalculationById(calculationId) {
      const row = await prisma.payrollCalculation.findUnique({ where: { id: calculationId } });
      return row ? mapCalc(row) : null;
    },

    async findByCorrelationKey(familyRootId, correlationKey) {
      const row = await prisma.payrollCalculation.findFirst({ where: { familyRootId, correlationKey } });
      return row ? mapCalc(row) : null;
    },

    async createCalculationAtomically(input: CreatePayrollCalculationInput) {
      try {
        return await prisma.$transaction(async (tx) => {
          if (input.supersedePriorId && input.expectedPriorVersion !== null) {
            // Version-guarded supersede of the prior active revision. A miss (0 rows) means a
            // concurrent writer already changed it — abort so the caller reports a conflict.
            const superseded = await tx.payrollCalculation.updateMany({
              where: { id: input.supersedePriorId, version: input.expectedPriorVersion, status: { not: "superseded" } },
              data: { status: "superseded", version: { increment: 1 } }
            });
            if (superseded.count !== 1) return null;
          }
          const created = await tx.payrollCalculation.create({
            data: {
              id: input.id, payrollPeriodId: input.payrollPeriodId, organizationId: input.organizationId,
              workerIdentityId: input.workerIdentityId, revision: input.revision,
              familyRootId: input.familyRootId, previousCalculationId: input.previousCalculationId, previousFingerprint: input.previousFingerprint,
              correctionType: input.correctionType, correctionReason: input.correctionReason, correlationKey: input.correlationKey,
              adjustsCalculationId: input.adjustsCalculationId,
              adjustmentNetDirection: input.adjustmentDelta?.netDirection ?? null, adjustmentNetDeltaMinor: input.adjustmentDelta?.netDeltaMinor ?? null,
              adjustmentGrossDirection: input.adjustmentDelta?.grossDirection ?? null, adjustmentGrossDeltaMinor: input.adjustmentDelta?.grossDeltaMinor ?? null,
              adjustmentDeductionsDirection: input.adjustmentDelta?.deductionsDirection ?? null, adjustmentDeductionsDeltaMinor: input.adjustmentDelta?.deductionsDeltaMinor ?? null,
              adjustmentEmployerCostDirection: input.adjustmentDelta?.employerCostDirection ?? null, adjustmentEmployerCostDeltaMinor: input.adjustmentDelta?.employerCostDeltaMinor ?? null,
              jurisdictionCountry: input.jurisdictionCountry, jurisdictionRegion: input.jurisdictionRegion,
              ruleProviderKey: input.ruleProviderKey, ruleProviderVersion: input.ruleProviderVersion,
              calculationPolicyVersion: input.calculationPolicyVersion, workerClassification: input.workerClassification, currency: input.currency,
              grossPayMinor: input.grossPayMinor, totalDeductionsMinor: input.totalDeductionsMinor,
              netPayMinor: input.netPayMinor, totalEmployerCostMinor: input.totalEmployerCostMinor,
              calculationFingerprint: input.calculationFingerprint,
              calculatedAt: input.calculatedAt, createdByUserId: input.createdByUserId,
              workedTimeRefs: {
                create: input.workedTimeRefs.map((w) => ({
                  timesheetId: w.timesheetId, timesheetVersion: w.timesheetVersion,
                  timesheetStatus: w.timesheetStatus, payableMinutes: w.payableMinutes, billableMinutes: w.billableMinutes,
                  scheduledStartAt: w.scheduledStartAt, scheduledEndAt: w.scheduledEndAt,
                  assignmentId: w.assignmentId, workGroupId: w.workGroupId, roleDefinitionId: w.roleDefinitionId, residenceId: w.residenceId,
                  compensationType: w.compensationType, contractId: w.contractId, contractVersion: w.contractVersion,
                  contractEffectiveFrom: w.contractEffectiveFrom, appliedHourlyRateMinor: w.appliedHourlyRateMinor,
                  currency: w.currency, sourceEffectiveInstant: w.sourceEffectiveInstant
                }))
              },
              earningLines: {
                create: input.earnings.map((e, i) => ({
                  classification: e.classification, description: e.description,
                  quantityMinutes: e.quantityMinutes, rateMinor: e.rate?.amountMinor ?? null,
                  amountMinor: e.amount.amountMinor, currency: e.amount.currency,
                  sourceContractId: e.sourceContractId, sourceContractVersion: e.sourceContractVersion, sortOrder: i
                }))
              },
              deductionLines: {
                create: input.deductions.map((d, i) => ({
                  category: d.category, code: d.code, description: d.description,
                  amountMinor: d.amount.amountMinor, currency: d.amount.currency, sortOrder: i
                }))
              },
              employerCostLines: {
                create: input.employerCosts.map((c, i) => ({
                  category: c.category, code: c.code, description: c.description,
                  amountMinor: c.amount.amountMinor, currency: c.amount.currency, sortOrder: i
                }))
              }
            }
          });
          if (input.supersedePriorId) {
            await tx.payrollCalculation.update({ where: { id: input.supersedePriorId }, data: { supersededById: created.id } });
          }
          return mapCalc(created);
        }, { isolationLevel: "Serializable" });
      } catch (error) {
        // A duplicate revision (unique index) or a serialization/write conflict both mean this
        // racer lost — deterministic single-winner, never a silent overwrite.
        if (isUniqueViolation(error) || isRetryable(error)) return null;
        throw error;
      }
    },

    async updateCalculationStatus(input) {
      const data: Record<string, unknown> = { status: input.nextStatus, version: { increment: 1 } };
      if (input.note !== null) data.reviewNote = input.note;
      if (input.nextStatus === "in_review") data.reviewedByUserId = input.actorUserId;
      if (input.nextStatus === "approved") { data.approvedByUserId = input.actorUserId; data.approvedAt = input.now; }
      if (input.nextStatus === "rejected") { data.rejectedByUserId = input.actorUserId; data.rejectedAt = input.now; }
      const res = await prisma.payrollCalculation.updateMany({
        where: { id: input.id, version: input.expectedVersion, status: { in: [...input.allowedFrom] } },
        data
      });
      if (res.count !== 1) return null;
      const row = await prisma.payrollCalculation.findUnique({ where: { id: input.id } });
      return row ? mapCalc(row) : null;
    },

    async updatePeriodStatus(input) {
      const data: Record<string, unknown> = { status: input.nextStatus, version: { increment: 1 } };
      if (input.nextStatus === "approved") { data.approvedByUserId = input.actorUserId; data.approvedAt = input.now; }
      if (input.nextStatus === "locked") { data.lockedByUserId = input.actorUserId; data.lockedAt = input.now; }
      if (input.nextStatus === "review") data.reviewedByUserId = input.actorUserId;
      const res = await prisma.payrollPeriod.updateMany({
        where: { id: input.id, version: input.expectedVersion },
        data
      });
      if (res.count !== 1) return null;
      const row = await prisma.payrollPeriod.findUnique({ where: { id: input.id } });
      return row ? mapPeriod(row) : null;
    },

    async recordAudit(input) {
      const actor = await prisma.auditActorReference.create({
        data: {
          actorType: input.actorUserId ? "user" : "system",
          ...(input.actorUserId ? { userId: input.actorUserId } : {}),
          ...(input.organizationId ? { organizationId: input.organizationId } : {}),
          displayLabel: input.actorUserId ? "Payroll actor" : "Payroll boundary"
        }
      });
      await prisma.auditEvent.create({
        data: {
          actorReferenceId: actor.id, organizationId: input.organizationId,
          entityType: input.entityType, entityId: input.entityId, entityPublicReference: input.entityPublicReference,
          action: input.action, priorState: input.priorState, newState: input.newState, reason: input.reason,
          source: "api", correlationId: input.correlationId, policyVersion: "payroll-foundation-v1", createdAt: input.now
        }
      });
    }
  };
}
