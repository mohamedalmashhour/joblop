import type { PrismaClient } from "@rwos/database";
import { createContractMoney } from "@rwos/shared";
import type {
  CreatePayrollCalculationInput,
  PayrollCalculationStatus,
  PayrollPeriodStatus,
  PayrollRepository,
  PayrollWorkedTimeLine,
  PayrollWorkedTimeRateResolver,
  StoredPayrollCalculation,
  StoredPayrollPeriod
} from "@rwos/auth";

// SYNTHETIC / TEST rate resolver. A real system reads a governed worker-terms rate snapshot;
// this fixture returns a fixed CAD hourly rate + classification so the payroll foundation is
// exercisable without wiring worker contracts. Currency deliberately CAD — a USD period will
// (correctly) be rejected as a currency mismatch.
export function createFixturePayrollRateResolver(): PayrollWorkedTimeRateResolver {
  return {
    async resolve() {
      return { rate: { hourlyRate: createContractMoney({ amountMinor: 3000, currency: "CAD" }) }, workerClassification: "employee" as const };
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
  ruleProviderVersion: string; calculationPolicyVersion: string; currency: string; grossPayMinor: number;
  totalDeductionsMinor: number; netPayMinor: number; totalEmployerCostMinor: number; synthetic: boolean;
  calculatedAt: Date; supersededById: string | null; version: number;
};
function mapCalc(row: CalcRow): StoredPayrollCalculation {
  return {
    id: row.id, payrollPeriodId: row.payrollPeriodId, organizationId: row.organizationId,
    workerIdentityId: row.workerIdentityId, revision: row.revision, status: row.status as PayrollCalculationStatus,
    jurisdictionCountry: row.jurisdictionCountry, jurisdictionRegion: row.jurisdictionRegion,
    ruleProviderKey: row.ruleProviderKey, ruleProviderVersion: row.ruleProviderVersion,
    calculationPolicyVersion: row.calculationPolicyVersion, currency: row.currency,
    grossPayMinor: row.grossPayMinor, totalDeductionsMinor: row.totalDeductionsMinor,
    netPayMinor: row.netPayMinor, totalEmployerCostMinor: row.totalEmployerCostMinor,
    synthetic: row.synthetic, calculatedAt: row.calculatedAt, supersededById: row.supersededById, version: row.version
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
      const rows = await prisma.timesheet.findMany({
        where: {
          organizationId: input.organizationId,
          workerIdentityId: input.workerIdentityId,
          status: { in: ["approved", "locked"] },
          scheduledStartAt: { gte: input.from, lt: input.to }
        },
        orderBy: [{ scheduledStartAt: "asc" }, { id: "asc" }]
      });
      return rows.map((r) => ({
        timesheetId: r.id, timesheetVersion: r.version, timesheetStatus: r.status,
        payableMinutes: r.payableMinutes ?? 0, billableMinutes: r.billableMinutes ?? 0
      }));
    },

    async findActiveCalculation(payrollPeriodId, workerIdentityId) {
      const row = await prisma.payrollCalculation.findFirst({
        where: { payrollPeriodId, workerIdentityId, status: { not: "superseded" } },
        orderBy: { revision: "desc" }
      });
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
              payrollPeriodId: input.payrollPeriodId, organizationId: input.organizationId,
              workerIdentityId: input.workerIdentityId, revision: input.revision,
              jurisdictionCountry: input.jurisdictionCountry, jurisdictionRegion: input.jurisdictionRegion,
              ruleProviderKey: input.ruleProviderKey, ruleProviderVersion: input.ruleProviderVersion,
              calculationPolicyVersion: input.calculationPolicyVersion, currency: input.currency,
              grossPayMinor: input.grossPayMinor, totalDeductionsMinor: input.totalDeductionsMinor,
              netPayMinor: input.netPayMinor, totalEmployerCostMinor: input.totalEmployerCostMinor,
              calculatedAt: input.calculatedAt, createdByUserId: input.createdByUserId,
              workedTimeRefs: {
                create: input.workedTimeRefs.map((w) => ({
                  timesheetId: w.timesheetId, timesheetVersion: w.timesheetVersion,
                  timesheetStatus: w.timesheetStatus, payableMinutes: w.payableMinutes, billableMinutes: w.billableMinutes
                }))
              },
              earningLines: {
                create: input.earnings.map((e, i) => ({
                  classification: e.classification, description: e.description,
                  quantityMinutes: e.quantityMinutes, rateMinor: e.rate?.amountMinor ?? null,
                  amountMinor: e.amount.amountMinor, currency: e.amount.currency, sortOrder: i
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
      const data: Record<string, unknown> = { status: input.nextStatus, version: { increment: 1 }, updatedByUserId: input.actorUserId };
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
