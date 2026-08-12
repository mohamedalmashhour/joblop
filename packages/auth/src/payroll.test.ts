import { describe, expect, it } from "vitest";
import { createContractMoney } from "@rwos/shared";
import {
  applyPayrollDelta,
  computePayrollTotals,
  createPayrollService,
  createSyntheticPayrollRuleProvider,
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
  async listEligibleWorkerIds(input: { limit: number; cursor: string | null }) {
    const ids = [...new Set(this.workedTime.map(() => this.workerId))].filter((w) => !input.cursor || w > input.cursor).sort().slice(0, input.limit);
    return ids;
  }
  workerId = "w";
  async findCalculationById(id: string) { return this.calcs.find((c) => c.id === id) ?? null; }
  async findByCorrelationKey(familyRootId: string, correlationKey: string) { return this.calcs.find((c) => c.familyRootId === familyRootId && c.correlationKey === correlationKey) ?? null; }
  async getCalculationForReplay(id: string) { return this.replay.get(id) ?? null; }
  async createCalculationAtomically(input: CreatePayrollCalculationInput) {
    // idempotency unique (family, correlationKey)
    if (input.correlationKey && this.calcs.some((c) => c.familyRootId === input.familyRootId && c.correlationKey === input.correlationKey)) return null;
    if (input.supersedePriorId && input.expectedPriorVersion !== null) {
      const prior = this.calcs.find((c) => c.id === input.supersedePriorId);
      if (!prior || prior.version !== input.expectedPriorVersion || prior.status === "superseded") return null;
      if (prior.status === "locked") throw new Error("locked immutable");
      this.calcs = this.calcs.map((c) => (c.id === prior.id ? { ...c, status: "superseded", version: c.version + 1 } : c));
    }
    if (this.calcs.some((c) => c.payrollPeriodId === input.payrollPeriodId && c.workerIdentityId === input.workerIdentityId && c.revision === input.revision)) return null;
    const id = input.id;
    const created: StoredPayrollCalculation = {
      id, payrollPeriodId: input.payrollPeriodId, organizationId: input.organizationId, workerIdentityId: input.workerIdentityId, revision: input.revision, status: "calculated",
      jurisdictionCountry: input.jurisdictionCountry, jurisdictionRegion: input.jurisdictionRegion, ruleProviderKey: input.ruleProviderKey, ruleProviderVersion: input.ruleProviderVersion,
      calculationPolicyVersion: input.calculationPolicyVersion, workerClassification: input.workerClassification, currency: input.currency,
      grossPayMinor: input.grossPayMinor, totalDeductionsMinor: input.totalDeductionsMinor, netPayMinor: input.netPayMinor, totalEmployerCostMinor: input.totalEmployerCostMinor,
      calculationFingerprint: input.calculationFingerprint, synthetic: true, calculatedAt: input.calculatedAt, supersededById: null, version: 1,
      familyRootId: input.familyRootId, previousCalculationId: input.previousCalculationId, previousFingerprint: input.previousFingerprint,
      correctionType: input.correctionType, correctionReason: input.correctionReason, correlationKey: input.correlationKey,
      adjustsCalculationId: input.adjustsCalculationId, adjustmentNetDirection: input.adjustmentDelta?.netDirection ?? null, adjustmentNetDeltaMinor: input.adjustmentDelta?.netDeltaMinor ?? null
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

  it("recalculate after a changed input creates revision 2 superseding revision 1 (never overwritten)", async () => {
    const contracts: FakeContract[] = [{ contractId: "c4", version: "v4", effectiveFrom: new Date("2026-08-01T00:00:00Z"), rateMinor: 3000 }];
    const repo = new FakePayrollRepository(makePeriod(), [{ timesheetId: "t1", scheduledStartAt: aug10, scheduledEndAt: aug10End, payableMinutes: 480, residenceId: "res-qc" }]);
    const svc = service(repo, contracts);
    const first = await svc.calculate({ actorUserId: "u", payrollPeriodId: "period-1", workerIdentityId: "w", correlationId: "c1" });
    contracts[0]!.rateMinor = 3200; // a changed authoritative input
    const second = await svc.recalculate({ actorUserId: "u", payrollPeriodId: "period-1", workerIdentityId: "w", correlationId: "c2" });
    expect(second.revision).toBe(2);
    expect(repo.calcs.find((c) => c.id === first.id)!.status).toBe("superseded");
  });
});

describe("payroll corrections, adjustments & idempotency (Chunk 3)", () => {
  // one contract, mutable rate so a governed rate change alters the recomputed result
  function setup(rateMinor = 3000) {
    const contracts: FakeContract[] = [{ contractId: "c1", version: "v1", effectiveFrom: new Date("2026-08-01T00:00:00Z"), rateMinor }];
    const repo = new FakePayrollRepository(makePeriod(), [{ timesheetId: "t1", scheduledStartAt: aug10, scheduledEndAt: aug10End, payableMinutes: 480, residenceId: "res-qc" }]);
    const svc = service(repo, contracts);
    return { contracts, repo, svc };
  }
  const correct = (svc: ReturnType<typeof service>, id: string, version: number, reason: string, key?: string) =>
    svc.requestCorrection({ actorUserId: "u", calculationId: id, expectedVersion: version, reason, correlationKey: key ?? null, correlationId: "c" });

  it("(A,B,C,E) pre-lock correction (changed rate) creates revision 2; rev1 unchanged; rev2 authoritative", async () => {
    const { contracts, repo, svc } = setup(3000);
    const rev1 = await svc.calculate({ actorUserId: "u", payrollPeriodId: "period-1", workerIdentityId: "w", correlationId: "c" });
    const grossRev1 = rev1.grossPayMinor;
    contracts[0]!.rateMinor = 3500; // governed rate correction upstream
    const res = await correct(svc, rev1.id, rev1.version, "rate corrected");
    expect(res.outcome).toBe("created");
    expect(res.calculation.revision).toBe(2);
    expect(res.calculation.correctionType).toBe("pre_lock_revision");
    expect(repo.calcs.find((c) => c.id === rev1.id)!.grossPayMinor).toBe(grossRev1); // rev1 immutable
    expect(repo.calcs.find((c) => c.id === rev1.id)!.status).toBe("superseded");
    expect((await repo.findActiveCalculation("period-1", "w"))!.id).toBe(res.calculation.id); // rev2 authoritative
    expect(res.calculation.grossPayMinor).toBeGreaterThan(grossRev1);
  });

  it("(D) identical correction (no input change) returns no_change, no new revision", async () => {
    const { repo, svc } = setup(3000);
    const rev1 = await svc.calculate({ actorUserId: "u", payrollPeriodId: "period-1", workerIdentityId: "w", correlationId: "c" });
    const res = await correct(svc, rev1.id, rev1.version, "no real change");
    expect(res.outcome).toBe("no_change");
    expect(repo.calcs.filter((c) => c.familyRootId === rev1.familyRootId)).toHaveLength(1);
  });

  it("(F,P) after correction, replay of the OLD revision still verifies; fingerprints differ", async () => {
    const { contracts, svc } = setup(3000);
    const rev1 = await svc.calculate({ actorUserId: "u", payrollPeriodId: "period-1", workerIdentityId: "w", correlationId: "c" });
    const fp1 = rev1.calculationFingerprint;
    contracts[0]!.rateMinor = 3500;
    const rev2 = (await correct(svc, rev1.id, rev1.version, "rate corrected")).calculation;
    const v1 = await svc.verifyCalculation({ calculationId: rev1.id });
    expect(v1.ok).toBe(true); // historical revision still reproduces
    expect(rev2.calculationFingerprint).not.toBe(fp1);
    expect(rev2.previousFingerprint).toBe(fp1); // fingerprint chain
  });

  it("(G,H,I) post-lock correction with higher rate creates a linked CREDIT adjustment; locked original unchanged", async () => {
    const { contracts, repo, svc } = setup(3000);
    const rev1 = await svc.calculate({ actorUserId: "u", payrollPeriodId: "period-1", workerIdentityId: "w", correlationId: "c" });
    const approved = await svc.transitionCalculation({ actorUserId: "u", calculationId: rev1.id, expectedVersion: rev1.version, action: "approve", correlationId: "c" });
    await svc.transitionCalculation({ actorUserId: "u", calculationId: rev1.id, expectedVersion: approved.version, action: "lock", correlationId: "c" });
    const lockedGross = repo.calcs.find((c) => c.id === rev1.id)!.grossPayMinor;
    contracts[0]!.rateMinor = 3500; // upstream correction after lock
    const locked = repo.calcs.find((c) => c.id === rev1.id)!;
    const res = await correct(svc, locked.id, locked.version, "post-lock rate correction");
    expect(res.outcome).toBe("created");
    expect(res.calculation.correctionType).toBe("post_lock_adjustment");
    expect(res.calculation.adjustsCalculationId).toBe(rev1.id);
    expect(res.calculation.adjustmentNetDirection).toBe("credit"); // corrected net higher
    expect(res.calculation.adjustmentNetDeltaMinor).toBeGreaterThan(0);
    expect(repo.calcs.find((c) => c.id === rev1.id)!.grossPayMinor).toBe(lockedGross); // locked original untouched
    expect(repo.calcs.find((c) => c.id === rev1.id)!.status).toBe("locked");
  });

  it("(J,K) post-lock correction with lower rate is a DEBIT adjustment; delta is a non-negative absolute", async () => {
    const { contracts, repo, svc } = setup(3500);
    const rev1 = await svc.calculate({ actorUserId: "u", payrollPeriodId: "period-1", workerIdentityId: "w", correlationId: "c" });
    const approved = await svc.transitionCalculation({ actorUserId: "u", calculationId: rev1.id, expectedVersion: rev1.version, action: "approve", correlationId: "c" });
    await svc.transitionCalculation({ actorUserId: "u", calculationId: rev1.id, expectedVersion: approved.version, action: "lock", correlationId: "c" });
    contracts[0]!.rateMinor = 3000;
    const locked = repo.calcs.find((c) => c.id === rev1.id)!;
    const res = await correct(svc, locked.id, locked.version, "post-lock reduction");
    expect(res.calculation.adjustmentNetDirection).toBe("debit");
    expect(res.calculation.adjustmentNetDeltaMinor).toBeGreaterThanOrEqual(0); // absolute, never negative
    // algebra: locked net + governed(debit delta) == corrected net
    expect(applyPayrollDelta(locked.netPayMinor, "debit", res.calculation.adjustmentNetDeltaMinor!)).toBe(res.calculation.netPayMinor);
  });

  it("(L) stale expected revision is rejected with a conflict", async () => {
    const { svc } = setup();
    const rev1 = await svc.calculate({ actorUserId: "u", payrollPeriodId: "period-1", workerIdentityId: "w", correlationId: "c" });
    await expect(correct(svc, rev1.id, rev1.version + 5, "x")).rejects.toMatchObject({ code: "conflict", reason: "stale_expected_revision" });
  });

  it("(M) correction without a reason is rejected", async () => {
    const { svc } = setup();
    const rev1 = await svc.calculate({ actorUserId: "u", payrollPeriodId: "period-1", workerIdentityId: "w", correlationId: "c" });
    await expect(correct(svc, rev1.id, rev1.version, "  ")).rejects.toMatchObject({ code: "invalid", reason: "correction_reason_required" });
  });

  it("(N) verify fails closed when the exact historical provider version is unavailable", async () => {
    const contracts: FakeContract[] = [{ contractId: "c1", version: "v1", effectiveFrom: new Date("2026-08-01T00:00:00Z"), rateMinor: 3000 }];
    const repo = new FakePayrollRepository(makePeriod(), [{ timesheetId: "t1", scheduledStartAt: aug10, scheduledEndAt: aug10End, payableMinutes: 480, residenceId: "res-qc" }]);
    const svc = service(repo, contracts);
    const rev1 = await svc.calculate({ actorUserId: "u", payrollPeriodId: "period-1", workerIdentityId: "w", correlationId: "c" });
    // a service whose provider registry lacks the historical version must NOT silently use latest
    const svcNoProvider = createPayrollService({ repository: repo, ruleProviders: [], rateResolver: new FakeRateResolver(contracts), jurisdictionResolver: new FakeJurisdictionResolver(QC) });
    await expect(svcNoProvider.verifyCalculation({ calculationId: rev1.id })).rejects.toMatchObject({ code: "invalid" });
  });

  it("(O) duplicate correction submission with the same correlation key is idempotent", async () => {
    const { contracts, repo, svc } = setup(3000);
    const rev1 = await svc.calculate({ actorUserId: "u", payrollPeriodId: "period-1", workerIdentityId: "w", correlationId: "c" });
    contracts[0]!.rateMinor = 3500;
    const first = await correct(svc, rev1.id, rev1.version, "rate corrected", "idem-key-1");
    expect(first.outcome).toBe("created");
    // a retry of the same correction against the (now superseded) target with the same key: the key
    // already committed -> duplicate, no second revision.
    const retry = await correct(svc, rev1.id, rev1.version, "rate corrected", "idem-key-1");
    expect(retry.outcome).toBe("duplicate");
    expect(retry.calculation.id).toBe(first.calculation.id);
    expect(repo.calcs.filter((c) => c.familyRootId === rev1.familyRootId)).toHaveLength(2); // rev1 + rev2 only
  });

  it("plain calculate() refuses once the active revision is LOCKED (must use correction)", async () => {
    const { svc, repo } = setup();
    const rev1 = await svc.calculate({ actorUserId: "u", payrollPeriodId: "period-1", workerIdentityId: "w", correlationId: "c" });
    const approved = await svc.transitionCalculation({ actorUserId: "u", calculationId: rev1.id, expectedVersion: rev1.version, action: "approve", correlationId: "c" });
    await svc.transitionCalculation({ actorUserId: "u", calculationId: rev1.id, expectedVersion: approved.version, action: "lock", correlationId: "c" });
    void repo;
    await expect(svc.calculate({ actorUserId: "u", payrollPeriodId: "period-1", workerIdentityId: "w", correlationId: "c" })).rejects.toMatchObject({ code: "conflict", reason: "calculation_locked_use_correction" });
  });
});

describe("payroll bulk calculation (Chunk 5)", () => {
  it("bulk calculate uses the same engine, is bounded, and is idempotent on re-run (no duplicate revisions)", async () => {
    const contracts: FakeContract[] = [{ contractId: "c1", version: "v1", effectiveFrom: new Date("2026-08-01T00:00:00Z"), rateMinor: 3000 }];
    const repo = new FakePayrollRepository(makePeriod(), [{ timesheetId: "t1", scheduledStartAt: aug10, scheduledEndAt: aug10End, payableMinutes: 480, residenceId: "res-qc" }]);
    const svc = service(repo, contracts);
    const first = await svc.calculatePeriodBulk({ actorUserId: "u", payrollPeriodId: "period-1", limit: 100, cursor: null, correlationId: "b1" });
    expect(first.attempted).toBe(1);
    expect(first.calculated).toBe(1);
    expect(first.failed).toBe(0);
    // re-run with unchanged inputs -> no_change, no duplicate revision
    const second = await svc.calculatePeriodBulk({ actorUserId: "u", payrollPeriodId: "period-1", limit: 100, cursor: null, correlationId: "b2" });
    expect(second.noChange).toBe(1);
    expect(second.calculated).toBe(0);
    expect(repo.calcs.filter((c) => c.status !== "superseded")).toHaveLength(1); // one authoritative revision
  });

  it("bulk calculate isolates a failing worker (governed reason) without corrupting the period", async () => {
    const repo = new FakePayrollRepository(makePeriod(), []); // no worked time -> the worker fails governed
    repo.workedTime = []; // eligible list empty -> attempted 0; simulate a failing worker instead
    const contracts: FakeContract[] = [{ contractId: "c1", version: "v1", effectiveFrom: new Date("2026-08-01T00:00:00Z"), rateMinor: 3000 }];
    // force one eligible worker whose calculate() fails (no worked time -> no_approved_worked_time)
    repo.listEligibleWorkerIds = async () => ["wX"];
    const svc = service(repo, contracts);
    const res = await svc.calculatePeriodBulk({ actorUserId: "u", payrollPeriodId: "period-1", limit: 100, cursor: null, correlationId: "b3" });
    expect(res.attempted).toBe(1);
    expect(res.failed).toBe(1);
    expect(res.results[0]!.reason).toBe("no_approved_worked_time");
  });
});

describe("payroll jurisdiction key", () => {
  it("formats country/region", () => { expect(payrollJurisdictionKey({ country: "CA", region: "QC" })).toBe("CA/QC"); });
});
