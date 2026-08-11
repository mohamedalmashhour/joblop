import { describe, expect, it } from "vitest";
import { createContractMoney } from "@rwos/shared";
import {
  computePayrollTotals,
  createPayrollService,
  createSyntheticPayrollRuleProvider,
  PayrollError,
  payrollJurisdictionKey,
  type CreatePayrollCalculationInput,
  type PayrollRepository,
  type PayrollWorkedTimeLine,
  type StoredPayrollCalculation,
  type StoredPayrollPeriod
} from "./payroll";

const provider = createSyntheticPayrollRuleProvider();
const cad = (amountMinor: number) => createContractMoney({ amountMinor, currency: "CAD" });
const worked = (payableMinutes: number): PayrollWorkedTimeLine => ({ timesheetId: "ts-1", timesheetVersion: 1, timesheetStatus: "approved", payableMinutes, billableMinutes: payableMinutes });

describe("synthetic payroll rule provider", () => {
  it("supports CA/QC and CA/ON as SEPARATE governed configs — not one universal Canada formula", () => {
    expect(provider.supports({ country: "CA", region: "QC" })).toBe(true);
    expect(provider.supports({ country: "CA", region: "ON" })).toBe(true);
    expect(provider.supports({ country: "CA", region: "BC" })).toBe(false);
    expect(provider.supports({ country: "US", region: "NY" })).toBe(false);

    const input = { currency: "CAD" as const, rate: { hourlyRate: cad(3000) }, workedTime: [worked(2400)], workerClassification: "employee" as const };
    const qc = provider.evaluate({ ...input, jurisdiction: { country: "CA", region: "QC" } });
    const on = provider.evaluate({ ...input, jurisdiction: { country: "CA", region: "ON" } });

    const qcVacation = qc.earnings.find((e) => e.classification === "vacation_pay")!.amount.amountMinor;
    const onVacation = on.earnings.find((e) => e.classification === "vacation_pay")!.amount.amountMinor;
    // QC 6% vs ON 4% vacation pay accrual — jurisdictions genuinely diverge.
    expect(qcVacation).toBeGreaterThan(onVacation);

    const qcProv = qc.deductions.find((d) => d.code === "provincial_tax")!.amount.amountMinor;
    const onProv = on.deductions.find((d) => d.code === "provincial_tax")!.amount.amountMinor;
    expect(qcProv).toBeGreaterThan(onProv);

    const qcEmployer = qc.employerCosts[0]!.amount.amountMinor;
    const onEmployer = on.employerCosts[0]!.amount.amountMinor;
    expect(qcEmployer).toBeGreaterThan(onEmployer);
  });

  it("splits regular vs overtime past the jurisdiction threshold; all amounts are integer minor units", () => {
    const result = provider.evaluate({ jurisdiction: { country: "CA", region: "QC" }, currency: "CAD", rate: { hourlyRate: cad(3000) }, workedTime: [worked(3000)], workerClassification: "employee" });
    const regular = result.earnings.find((e) => e.classification === "regular")!;
    const overtime = result.earnings.find((e) => e.classification === "overtime")!;
    expect(regular.quantityMinutes).toBe(2400); // capped at QC threshold
    expect(overtime.quantityMinutes).toBe(600);
    for (const line of [...result.earnings, ...result.deductions, ...result.employerCosts]) {
      expect(Number.isInteger(line.amount.amountMinor)).toBe(true);
      expect(line.amount.currency).toBe("CAD");
    }
  });

  it("contractor classification takes no statutory deductions or employer contributions (synthetic)", () => {
    const result = provider.evaluate({ jurisdiction: { country: "CA", region: "ON" }, currency: "CAD", rate: { hourlyRate: cad(3000) }, workedTime: [worked(1200)], workerClassification: "contractor" });
    expect(result.deductions).toHaveLength(0);
    expect(result.employerCosts).toHaveLength(0);
    const totals = computePayrollTotals(result, "CAD");
    expect(totals.net.amountMinor).toBe(totals.gross.amountMinor); // no deductions -> net == gross
  });

  it("net = gross - deductions, and totals are currency-consistent", () => {
    const result = provider.evaluate({ jurisdiction: { country: "CA", region: "QC" }, currency: "CAD", rate: { hourlyRate: cad(3000) }, workedTime: [worked(2400)], workerClassification: "employee" });
    const totals = computePayrollTotals(result, "CAD");
    expect(totals.gross.amountMinor - totals.totalDeductions.amountMinor).toBe(totals.net.amountMinor);
    expect(totals.net.currency).toBe("CAD");
    // employer cost is tracked SEPARATELY from worker deductions/net
    expect(totals.totalEmployerCost.amountMinor).toBeGreaterThan(0);
  });
});

// ── In-memory fake repository to exercise the service (revision/supersede/concurrency intent) ──

class FakePayrollRepository implements PayrollRepository {
  period: StoredPayrollPeriod;
  calcs: StoredPayrollCalculation[] = [];
  workedTime: PayrollWorkedTimeLine[] = [worked(2400)];
  audits: string[] = [];
  private seq = 0;
  constructor(period: StoredPayrollPeriod) { this.period = period; }
  async findPeriodById(id: string) { return id === this.period.id ? this.period : null; }
  async listApprovedWorkedTime() { return this.workedTime; }
  async findActiveCalculation(periodId: string, workerId: string) {
    return this.calcs.filter((c) => c.payrollPeriodId === periodId && c.workerIdentityId === workerId && c.status !== "superseded").sort((a, b) => b.revision - a.revision)[0] ?? null;
  }
  async createCalculationAtomically(input: CreatePayrollCalculationInput) {
    if (input.supersedePriorId && input.expectedPriorVersion !== null) {
      const prior = this.calcs.find((c) => c.id === input.supersedePriorId);
      if (!prior || prior.version !== input.expectedPriorVersion || prior.status === "superseded") return null;
      this.calcs = this.calcs.map((c) => (c.id === prior.id ? { ...c, status: "superseded", version: c.version + 1 } : c));
    }
    if (this.calcs.some((c) => c.payrollPeriodId === input.payrollPeriodId && c.workerIdentityId === input.workerIdentityId && c.revision === input.revision)) return null;
    const created: StoredPayrollCalculation = {
      id: `calc-${++this.seq}`, payrollPeriodId: input.payrollPeriodId, organizationId: input.organizationId,
      workerIdentityId: input.workerIdentityId, revision: input.revision, status: "calculated",
      jurisdictionCountry: input.jurisdictionCountry, jurisdictionRegion: input.jurisdictionRegion,
      ruleProviderKey: input.ruleProviderKey, ruleProviderVersion: input.ruleProviderVersion,
      calculationPolicyVersion: input.calculationPolicyVersion, currency: input.currency,
      grossPayMinor: input.grossPayMinor, totalDeductionsMinor: input.totalDeductionsMinor,
      netPayMinor: input.netPayMinor, totalEmployerCostMinor: input.totalEmployerCostMinor,
      synthetic: true, calculatedAt: input.calculatedAt, supersededById: null, version: 1
    };
    this.calcs.push(created);
    return created;
  }
  async updateCalculationStatus(input: { id: string; expectedVersion: number; allowedFrom: readonly string[]; nextStatus: string }) {
    const found = this.calcs.find((c) => c.id === input.id);
    if (!found || found.version !== input.expectedVersion || !input.allowedFrom.includes(found.status)) return null;
    const updated = { ...found, status: input.nextStatus as StoredPayrollCalculation["status"], version: found.version + 1 };
    this.calcs = this.calcs.map((c) => (c.id === found.id ? updated : c));
    return updated;
  }
  async updatePeriodStatus() { return this.period; }
  async recordAudit(input: { action: string }) { this.audits.push(input.action); }
}

function makePeriod(): StoredPayrollPeriod {
  return { id: "period-1", organizationId: "org-1", jurisdictionCountry: "CA", jurisdictionRegion: "QC", periodStart: new Date("2026-08-01T00:00:00Z"), periodEnd: new Date("2026-08-15T00:00:00Z"), timezone: "America/Toronto", status: "calculating", currency: "CAD", ruleProviderKey: "synthetic-fixture", ruleProviderVersion: "synthetic-2026.08", version: 1 };
}
const rateResolver = { async resolve() { return { rate: { hourlyRate: cad(3000) }, workerClassification: "employee" as const }; } };
const service = (repo: PayrollRepository) => createPayrollService({ repository: repo, ruleProviders: [provider], rateResolver });

describe("payroll calculation service", () => {
  it("calculate creates revision 1; recalculate creates revision 2 and supersedes the prior (never overwrites)", async () => {
    const repo = new FakePayrollRepository(makePeriod());
    const svc = service(repo);
    const first = await svc.calculate({ actorUserId: "u1", payrollPeriodId: "period-1", workerIdentityId: "w1", correlationId: "c1" });
    expect(first.revision).toBe(1);
    expect(first.grossPayMinor).toBeGreaterThan(0);

    const second = await svc.recalculate({ actorUserId: "u1", payrollPeriodId: "period-1", workerIdentityId: "w1", correlationId: "c2" });
    expect(second.revision).toBe(2);
    const prior = repo.calcs.find((c) => c.id === first.id)!;
    expect(prior.status).toBe("superseded"); // old revision preserved, not overwritten
    expect(repo.audits).toContain("payroll.calculated");
    expect(repo.audits).toContain("payroll.recalculated");
  });

  it("rejects calculation on an approved/locked period, and when there is no approved worked time", async () => {
    const lockedRepo = new FakePayrollRepository({ ...makePeriod(), status: "locked" });
    await expect(service(lockedRepo).calculate({ actorUserId: "u1", payrollPeriodId: "period-1", workerIdentityId: "w1", correlationId: "c" })).rejects.toMatchObject({ code: "conflict" });

    const emptyRepo = new FakePayrollRepository(makePeriod());
    emptyRepo.workedTime = [];
    await expect(service(emptyRepo).calculate({ actorUserId: "u1", payrollPeriodId: "period-1", workerIdentityId: "w1", correlationId: "c" })).rejects.toMatchObject({ code: "invalid", reason: "no_approved_worked_time" });
  });

  it("rejects an unsupported jurisdiction", async () => {
    const repo = new FakePayrollRepository({ ...makePeriod(), jurisdictionRegion: "BC" });
    await expect(service(repo).calculate({ actorUserId: "u1", payrollPeriodId: "period-1", workerIdentityId: "w1", correlationId: "c" })).rejects.toBeInstanceOf(PayrollError);
  });

  it("review -> approve transition is version-guarded; a stale version is a conflict", async () => {
    const repo = new FakePayrollRepository(makePeriod());
    const svc = service(repo);
    const calc = await svc.calculate({ actorUserId: "u1", payrollPeriodId: "period-1", workerIdentityId: "w1", correlationId: "c1" });
    const approved = await svc.transitionCalculation({ actorUserId: "u1", calculationId: calc.id, expectedVersion: calc.version, action: "approve", correlationId: "c2" });
    expect(approved.status).toBe("approved");
    // replaying the same version now conflicts
    await expect(svc.transitionCalculation({ actorUserId: "u1", calculationId: calc.id, expectedVersion: calc.version, action: "approve", correlationId: "c3" })).rejects.toMatchObject({ code: "conflict" });
  });
});

describe("payroll jurisdiction key", () => {
  it("formats country/region", () => {
    expect(payrollJurisdictionKey({ country: "CA", region: "QC" })).toBe("CA/QC");
  });
});
