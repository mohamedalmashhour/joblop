import { describe, expect, it } from "vitest";
import { createContractMoney } from "@rwos/shared";
import {
  computePayrollTotals,
  createPayrollService,
  createSyntheticPayrollRuleProvider,
  PayrollError,
  payrollJurisdictionKey,
  type CreatePayrollCalculationInput,
  type PayrollJurisdiction,
  type PayrollJurisdictionResolver,
  type PayrollRateResolver,
  type PayrollReplaySnapshot,
  type PayrollRepository,
  type StoredPayrollCalculation,
  type StoredPayrollPeriod
} from "./payroll";

const provider = createSyntheticPayrollRuleProvider();
const cad = (amountMinor: number) => createContractMoney({ amountMinor, currency: "CAD" });
const seg = (contractId: string, contractVersion: string, rateMinor: number, payableMinutes: number) => ({ contractId, contractVersion, hourlyRate: cad(rateMinor), payableMinutes });

describe("synthetic payroll rule provider (segmented)", () => {
  it("CA/QC and CA/ON are SEPARATE governed configs — not one universal Canada formula", () => {
    expect(provider.supports({ country: "CA", region: "QC" })).toBe(true);
    expect(provider.supports({ country: "CA", region: "BC" })).toBe(false);
    const input = { currency: "CAD" as const, segments: [seg("c1", "v1", 3000, 2400)], workerClassification: "employee" as const };
    const qc = provider.evaluate({ ...input, jurisdiction: { country: "CA", region: "QC" } });
    const on = provider.evaluate({ ...input, jurisdiction: { country: "CA", region: "ON" } });
    expect(qc.earnings.find((e) => e.classification === "vacation_pay")!.amount.amountMinor).toBeGreaterThan(on.earnings.find((e) => e.classification === "vacation_pay")!.amount.amountMinor);
    expect(qc.deductions.find((d) => d.code === "provincial_tax")!.amount.amountMinor).toBeGreaterThan(on.deductions.find((d) => d.code === "provincial_tax")!.amount.amountMinor);
  });

  it("produces one regular earning line PER contract-version segment (rate-change provenance)", () => {
    const result = provider.evaluate({ jurisdiction: { country: "CA", region: "QC" }, currency: "CAD", segments: [seg("c4", "v4", 3000, 480), seg("c5", "v5", 3500, 480)], workerClassification: "employee" });
    const regulars = result.earnings.filter((e) => e.classification === "regular");
    expect(regulars).toHaveLength(2);
    expect(regulars.map((r) => r.sourceContractVersion).sort()).toEqual(["v4", "v5"]);
    // $30 * 8h = 24000 ; $35 * 8h = 28000
    expect(regulars.find((r) => r.sourceContractVersion === "v4")!.amount.amountMinor).toBe(24000);
    expect(regulars.find((r) => r.sourceContractVersion === "v5")!.amount.amountMinor).toBe(28000);
  });

  it("contractor takes no deductions; net = gross - deductions; integer minor units", () => {
    const result = provider.evaluate({ jurisdiction: { country: "CA", region: "ON" }, currency: "CAD", segments: [seg("c1", "v1", 3000, 1200)], workerClassification: "contractor" });
    expect(result.deductions).toHaveLength(0);
    const totals = computePayrollTotals(result, "CAD");
    expect(totals.net.amountMinor).toBe(totals.gross.amountMinor);
    for (const line of [...result.earnings, ...result.deductions, ...result.employerCosts]) expect(Number.isInteger(line.amount.amountMinor)).toBe(true);
  });
});

// ── Fake repository + resolvers to exercise the service (rate authority, jurisdiction, replay) ──

type FakeContract = { contractId: string; version: string; effectiveFrom: Date; rateMinor: number };

class FakeRateResolver implements PayrollRateResolver {
  constructor(private contracts: FakeContract[]) {}
  async resolveAt(input: { instant: Date }) {
    const c = this.contracts.filter((x) => x.effectiveFrom.getTime() <= input.instant.getTime()).sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0];
    if (!c) return null;
    return { contractId: c.contractId, contractVersion: c.version, contractEffectiveFrom: c.effectiveFrom, hourlyRate: cad(c.rateMinor), compensationType: "hourly" as const };
  }
}
class FakeJurisdictionResolver implements PayrollJurisdictionResolver {
  constructor(private byResidence: Record<string, PayrollJurisdiction>) {}
  async resolve(input: { residenceId: string }) { return this.byResidence[input.residenceId] ?? null; }
}

type WT = { timesheetId: string; scheduledStartAt: Date; scheduledEndAt: Date; payableMinutes: number; residenceId: string };

class FakePayrollRepository implements PayrollRepository {
  period: StoredPayrollPeriod;
  workedTime: WT[];
  calcs: StoredPayrollCalculation[] = [];
  replay = new Map<string, PayrollReplaySnapshot>();
  audits: string[] = [];
  private seq = 0;
  constructor(period: StoredPayrollPeriod, workedTime: WT[]) { this.period = period; this.workedTime = workedTime; }
  async findPeriodById(id: string) { return id === this.period.id ? this.period : null; }
  async listApprovedWorkedTime() {
    return this.workedTime.map((w) => ({ timesheetId: w.timesheetId, timesheetVersion: 1, timesheetStatus: "approved", payableMinutes: w.payableMinutes, billableMinutes: w.payableMinutes, scheduledStartAt: w.scheduledStartAt, scheduledEndAt: w.scheduledEndAt, assignmentId: `a-${w.timesheetId}`, workGroupId: "wg", roleDefinitionId: "role", residenceId: w.residenceId }));
  }
  async findActiveCalculation(periodId: string, workerId: string) {
    return this.calcs.filter((c) => c.payrollPeriodId === periodId && c.workerIdentityId === workerId && c.status !== "superseded").sort((a, b) => b.revision - a.revision)[0] ?? null;
  }
  async getCalculationForReplay(id: string) { return this.replay.get(id) ?? null; }
  async createCalculationAtomically(input: CreatePayrollCalculationInput) {
    if (input.supersedePriorId && input.expectedPriorVersion !== null) {
      const prior = this.calcs.find((c) => c.id === input.supersedePriorId);
      if (!prior || prior.version !== input.expectedPriorVersion || prior.status === "superseded") return null;
      this.calcs = this.calcs.map((c) => (c.id === prior.id ? { ...c, status: "superseded", version: c.version + 1 } : c));
    }
    if (this.calcs.some((c) => c.payrollPeriodId === input.payrollPeriodId && c.workerIdentityId === input.workerIdentityId && c.revision === input.revision)) return null;
    const id = `calc-${++this.seq}`;
    const created: StoredPayrollCalculation = {
      id, payrollPeriodId: input.payrollPeriodId, organizationId: input.organizationId, workerIdentityId: input.workerIdentityId, revision: input.revision, status: "calculated",
      jurisdictionCountry: input.jurisdictionCountry, jurisdictionRegion: input.jurisdictionRegion, ruleProviderKey: input.ruleProviderKey, ruleProviderVersion: input.ruleProviderVersion,
      calculationPolicyVersion: input.calculationPolicyVersion, workerClassification: input.workerClassification, currency: input.currency,
      grossPayMinor: input.grossPayMinor, totalDeductionsMinor: input.totalDeductionsMinor, netPayMinor: input.netPayMinor, totalEmployerCostMinor: input.totalEmployerCostMinor,
      calculationFingerprint: input.calculationFingerprint, synthetic: true, calculatedAt: input.calculatedAt, supersededById: null, version: 1
    };
    this.calcs.push(created);
    this.replay.set(id, {
      id, payrollPeriodId: input.payrollPeriodId, organizationId: input.organizationId, workerIdentityId: input.workerIdentityId,
      jurisdiction: { country: input.jurisdictionCountry, region: input.jurisdictionRegion }, ruleProviderKey: input.ruleProviderKey, ruleProviderVersion: input.ruleProviderVersion,
      calculationPolicyVersion: input.calculationPolicyVersion, workerClassification: input.workerClassification as PayrollReplaySnapshot["workerClassification"], currency: input.currency, calculationFingerprint: input.calculationFingerprint,
      workedTime: input.workedTimeRefs.map((w) => ({ timesheetId: w.timesheetId, timesheetVersion: w.timesheetVersion, payableMinutes: w.payableMinutes, contractId: w.contractId, contractVersion: w.contractVersion, appliedHourlyRateMinor: w.appliedHourlyRateMinor, contractEffectiveFrom: w.contractEffectiveFrom, sourceEffectiveInstant: w.sourceEffectiveInstant })),
      earnings: input.earnings.map((e) => ({ classification: e.classification, amountMinor: e.amount.amountMinor, sourceContractVersion: e.sourceContractVersion })),
      deductions: input.deductions.map((d) => ({ category: d.category, code: d.code, amountMinor: d.amount.amountMinor })),
      employerCosts: input.employerCosts.map((c) => ({ category: c.category, code: c.code, amountMinor: c.amount.amountMinor })),
      grossPayMinor: input.grossPayMinor, totalDeductionsMinor: input.totalDeductionsMinor, netPayMinor: input.netPayMinor, totalEmployerCostMinor: input.totalEmployerCostMinor
    });
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

function makePeriod(over: Partial<StoredPayrollPeriod> = {}): StoredPayrollPeriod {
  return { id: "period-1", organizationId: "org-1", jurisdictionCountry: "CA", jurisdictionRegion: "QC", periodStart: new Date("2026-08-01T00:00:00Z"), periodEnd: new Date("2026-08-31T00:00:00Z"), timezone: "America/Toronto", status: "calculating", currency: "CAD", ruleProviderKey: "synthetic-fixture", ruleProviderVersion: "synthetic-2026.08", version: 1, ...over };
}
const QC = { "res-qc": { country: "CA", region: "QC" } } as const;
function service(repo: PayrollRepository, contracts: FakeContract[], jur: Record<string, PayrollJurisdiction> = QC) {
  return createPayrollService({ repository: repo, ruleProviders: [provider], rateResolver: new FakeRateResolver(contracts), jurisdictionResolver: new FakeJurisdictionResolver(jur) });
}

const aug10 = new Date("2026-08-10T13:00:00Z");
const aug10End = new Date("2026-08-10T21:00:00Z");
const aug20 = new Date("2026-08-20T13:00:00Z");
const aug20End = new Date("2026-08-20T21:00:00Z");
// contract v4 effective Aug 1 ($30), v5 effective Aug 16 ($35)
const twoContracts: FakeContract[] = [
  { contractId: "c4", version: "v4", effectiveFrom: new Date("2026-08-01T00:00:00Z"), rateMinor: 3000 },
  { contractId: "c5", version: "v5", effectiveFrom: new Date("2026-08-16T00:00:00Z"), rateMinor: 3500 }
];

describe("payroll service — rate authority + jurisdiction + segmentation", () => {
  it("(A,B,H) historical rate: Aug 10 shift uses v4 ($30), Aug 20 shift uses v5 ($35) — never 'current' rate", async () => {
    const repo = new FakePayrollRepository(makePeriod(), [
      { timesheetId: "t-aug10", scheduledStartAt: aug10, scheduledEndAt: aug10End, payableMinutes: 480, residenceId: "res-qc" },
      { timesheetId: "t-aug20", scheduledStartAt: aug20, scheduledEndAt: aug20End, payableMinutes: 480, residenceId: "res-qc" }
    ]);
    const calc = await service(repo, twoContracts).calculate({ actorUserId: "u", payrollPeriodId: "period-1", workerIdentityId: "w", correlationId: "c" });
    const snap = repo.replay.get(calc.id)!;
    const v4 = snap.workedTime.find((w) => w.timesheetId === "t-aug10")!;
    const v5 = snap.workedTime.find((w) => w.timesheetId === "t-aug20")!;
    expect(v4.contractVersion).toBe("v4"); expect(v4.appliedHourlyRateMinor).toBe(3000);
    expect(v5.contractVersion).toBe("v5"); expect(v5.appliedHourlyRateMinor).toBe(3500);
  });

  it("(C) two shifts in one period under two contracts produce two regular earning lines", async () => {
    const repo = new FakePayrollRepository(makePeriod(), [
      { timesheetId: "t-aug10", scheduledStartAt: aug10, scheduledEndAt: aug10End, payableMinutes: 480, residenceId: "res-qc" },
      { timesheetId: "t-aug20", scheduledStartAt: aug20, scheduledEndAt: aug20End, payableMinutes: 480, residenceId: "res-qc" }
    ]);
    const calc = await service(repo, twoContracts).calculate({ actorUserId: "u", payrollPeriodId: "period-1", workerIdentityId: "w", correlationId: "c" });
    const versions = repo.replay.get(calc.id)!.earnings.filter((e) => e.classification === "regular").map((e) => e.sourceContractVersion).sort();
    expect(versions).toEqual(["v4", "v5"]);
  });

  it("(F) cross-midnight shift with NO internal rate boundary succeeds", async () => {
    const repo = new FakePayrollRepository(makePeriod(), [{ timesheetId: "t-overnight", scheduledStartAt: new Date("2026-08-10T22:00:00Z"), scheduledEndAt: new Date("2026-08-11T06:00:00Z"), payableMinutes: 480, residenceId: "res-qc" }]);
    const calc = await service(repo, twoContracts).calculate({ actorUserId: "u", payrollPeriodId: "period-1", workerIdentityId: "w", correlationId: "c" });
    expect(calc.grossPayMinor).toBeGreaterThan(0);
  });

  it("(G) shift straddling a rate boundary is detected and FAILS with governed reason (no guess)", async () => {
    // shift Aug 15 22:00 -> Aug 16 02:00 crosses the v5 effective instant (Aug 16 00:00)
    const repo = new FakePayrollRepository(makePeriod(), [{ timesheetId: "t-cross", scheduledStartAt: new Date("2026-08-15T22:00:00Z"), scheduledEndAt: new Date("2026-08-16T02:00:00Z"), payableMinutes: 240, residenceId: "res-qc" }]);
    await expect(service(repo, twoContracts).calculate({ actorUserId: "u", payrollPeriodId: "period-1", workerIdentityId: "w", correlationId: "c" }))
      .rejects.toMatchObject({ code: "invalid" });
    await expect(service(repo, twoContracts).calculate({ actorUserId: "u", payrollPeriodId: "period-1", workerIdentityId: "w", correlationId: "c" }))
      .rejects.toThrow(/rate_boundary_inside_approved_shift/);
  });

  it("(I) caller cannot override jurisdiction — period jurisdiction must match the worksite", async () => {
    // period declares CA/ON but worksite residence derives CA/QC -> mismatch fails safely
    const repo = new FakePayrollRepository(makePeriod({ jurisdictionRegion: "ON" }), [{ timesheetId: "t1", scheduledStartAt: aug10, scheduledEndAt: aug10End, payableMinutes: 480, residenceId: "res-qc" }]);
    await expect(service(repo, twoContracts).calculate({ actorUserId: "u", payrollPeriodId: "period-1", workerIdentityId: "w", correlationId: "c" }))
      .rejects.toThrow(/jurisdiction_mismatch_period_vs_worksite/);
  });

  it("(J) approved time spanning multiple jurisdictions fails safely as ambiguous", async () => {
    const repo = new FakePayrollRepository(makePeriod(), [
      { timesheetId: "t-qc", scheduledStartAt: aug10, scheduledEndAt: aug10End, payableMinutes: 480, residenceId: "res-qc" },
      { timesheetId: "t-on", scheduledStartAt: aug20, scheduledEndAt: aug20End, payableMinutes: 480, residenceId: "res-on" }
    ]);
    const jur = { "res-qc": { country: "CA", region: "QC" }, "res-on": { country: "CA", region: "ON" } };
    await expect(service(repo, twoContracts, jur).calculate({ actorUserId: "u", payrollPeriodId: "period-1", workerIdentityId: "w", correlationId: "c" }))
      .rejects.toThrow(/ambiguous_multi_jurisdiction/);
  });

  it("missing rate (no contract effective) fails with governed reason", async () => {
    const repo = new FakePayrollRepository(makePeriod(), [{ timesheetId: "t1", scheduledStartAt: new Date("2026-07-01T13:00:00Z"), scheduledEndAt: new Date("2026-07-01T21:00:00Z"), payableMinutes: 480, residenceId: "res-qc" }]);
    // period covers July? adjust period to include the shift but contracts start Aug -> no rate
    repo.period = makePeriod({ periodStart: new Date("2026-07-01T00:00:00Z") });
    await expect(service(repo, twoContracts).calculate({ actorUserId: "u", payrollPeriodId: "period-1", workerIdentityId: "w", correlationId: "c" }))
      .rejects.toThrow(/missing_rate/);
  });

  it("(D,K) later rate change does not alter the stored calc; replay is byte-for-byte deterministic", async () => {
    const contracts: FakeContract[] = [{ contractId: "c4", version: "v4", effectiveFrom: new Date("2026-08-01T00:00:00Z"), rateMinor: 3000 }];
    const repo = new FakePayrollRepository(makePeriod(), [{ timesheetId: "t-aug10", scheduledStartAt: aug10, scheduledEndAt: aug10End, payableMinutes: 480, residenceId: "res-qc" }]);
    const svc = service(repo, contracts);
    const calc = await svc.calculate({ actorUserId: "u", payrollPeriodId: "period-1", workerIdentityId: "w", correlationId: "c" });
    const grossBefore = calc.grossPayMinor;
    const fpBefore = repo.replay.get(calc.id)!.calculationFingerprint;

    // a NEW contract is activated later — the stored snapshot must not change
    contracts.push({ contractId: "c9", version: "v9", effectiveFrom: new Date("2026-08-25T00:00:00Z"), rateMinor: 9999 });
    const verify = await svc.verifyCalculation({ calculationId: calc.id });
    expect(verify.ok).toBe(true);
    expect(verify.totalsMatch).toBe(true);
    expect(verify.recomputedFingerprint).toBe(fpBefore);
    expect(repo.replay.get(calc.id)!.grossPayMinor).toBe(grossBefore);
  });

  it("recalculate creates revision 2 superseding revision 1 (approved calc never overwritten)", async () => {
    const contracts: FakeContract[] = [{ contractId: "c4", version: "v4", effectiveFrom: new Date("2026-08-01T00:00:00Z"), rateMinor: 3000 }];
    const repo = new FakePayrollRepository(makePeriod(), [{ timesheetId: "t1", scheduledStartAt: aug10, scheduledEndAt: aug10End, payableMinutes: 480, residenceId: "res-qc" }]);
    const svc = service(repo, contracts);
    const first = await svc.calculate({ actorUserId: "u", payrollPeriodId: "period-1", workerIdentityId: "w", correlationId: "c1" });
    const second = await svc.recalculate({ actorUserId: "u", payrollPeriodId: "period-1", workerIdentityId: "w", correlationId: "c2" });
    expect(second.revision).toBe(2);
    expect(repo.calcs.find((c) => c.id === first.id)!.status).toBe("superseded");
  });
});

describe("payroll jurisdiction key", () => {
  it("formats country/region", () => { expect(payrollJurisdictionKey({ country: "CA", region: "QC" })).toBe("CA/QC"); });
});
