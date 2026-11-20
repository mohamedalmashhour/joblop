// HR-5 Payroll / Finance FOUNDATION — TEST / SYNTHETIC. No money execution.
//
// Rules:
//   - Payroll CONSUMES approved/locked worked time (ApprovedWorkedTime). It NEVER recomputes
//     attendance from raw check-in/out. Attendance/Timesheet stays the workforce-time authority.
//   - Jurisdiction is modelled explicitly by country + region. Statutory/employer/vacation/overtime
//     rules live behind a provider seam (PayrollRuleProvider), NOT hard-coded in business logic.
//   - Money is governed integer minor units with an explicit currency (@rwos/shared). No floats;
//     percentages are integer basis points. Cross-currency arithmetic is rejected.
//   - A calculation is an immutable snapshot/revision. Recalculation creates a NEW revision and
//     supersedes the prior one — an approved calculation is never overwritten.
//   - HR-5 stops at ApprovedPayrollCalculation. No `paid` state, no banking, no remittance.

import { createHash, randomUUID } from "node:crypto";
import {
  createContractMoney,
  fullJitterBackoffMs,
  proRateMinutesAtHourlyRate,
  subtractMoney,
  sumMoney,
  type ContractMoney,
  type MoneyEngineCurrency
} from "@rwos/shared";

// ── Domain vocabulary ──

export type PayrollDeductionCategory = "statutory" | "benefit" | "voluntary" | "garnishment" | "other";
export type PayrollWorkerClassification = "employee" | "contractor" | "temporary_worker";
export type PayrollPeriodStatus = "open" | "calculating" | "review" | "approved" | "locked";
export type PayrollCalculationStatus = "calculated" | "in_review" | "approved" | "rejected" | "superseded" | "locked";

export type PayrollJurisdiction = Readonly<{ country: string; region: string }>;
export const payrollJurisdictionKey = (j: PayrollJurisdiction) => `${j.country}/${j.region}`;

// The approved worked-time a calculation consumes — snapshotted with its version so a later
// attendance/timesheet change can never silently re-base an existing calculation.
// One approved timesheet (shift) — carries the shift window + governed role/worksite scope so
// payroll can attribute it to the rate effective at its start instant. Read from approved/locked
// timesheets only (never raw attendance).
export type PayrollWorkedTimeLine = Readonly<{
  timesheetId: string;
  timesheetVersion: number;
  timesheetStatus: string;
  payableMinutes: number;
  billableMinutes: number;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  assignmentId: string;
  workGroupId: string;
  roleDefinitionId: string;
  residenceId: string;
  // Job bonus earned on this shift (0/absent when none): hourly bonus x actual payable hours, or the
  // fixed transport/one-time amount once per timesheet. Taxable earnings.
  bonusMinor?: number;
}>;

// The governed EmployerContract rate resolved as effective at a specific instant for a role scope.
// This is the immutable compensation snapshot payroll captures — payroll never invents a rate.
export type PayrollRateResolution = Readonly<{
  contractId: string;
  contractVersion: string;
  contractEffectiveFrom: Date;
  hourlyRate: ContractMoney;
  compensationType: "hourly";
}>;

// Resolves the committed contract rate in force at `instant`. Historical work always reads the
// rate that governed then (active OR superseded contract), never the current rate.
export type PayrollRateResolver = Readonly<{
  resolveAt(input: { organizationId: string; workGroupId: string; roleDefinitionId: string; assignmentId: string; instant: Date }): Promise<PayrollRateResolution | null>;
}>;

// Derives the authoritative payroll jurisdiction from the worksite (Residence), never caller input.
export type PayrollJurisdictionResolver = Readonly<{
  resolve(input: { residenceId: string }): Promise<PayrollJurisdiction | null>;
}>;

export type PayrollEarningDraft = Readonly<{ classification: string; description: string; quantityMinutes: number | null; rate: ContractMoney | null; amount: ContractMoney; sourceContractId: string | null; sourceContractVersion: string | null }>;
export type PayrollDeductionDraft = Readonly<{ category: PayrollDeductionCategory; code: string; description: string; amount: ContractMoney }>;
export type PayrollEmployerCostDraft = Readonly<{ category: string; code: string; description: string; amount: ContractMoney }>;

// A worked-time SEGMENT: contiguous minutes attributed to one committed contract-version rate. The
// service produces one segment per distinct contract version applied within the period.
export type PayrollRuleSegment = Readonly<{
  contractId: string;
  contractVersion: string;
  hourlyRate: ContractMoney;
  payableMinutes: number;
}>;

export type PayrollRuleInput = Readonly<{
  jurisdiction: PayrollJurisdiction;
  currency: MoneyEngineCurrency;
  segments: readonly PayrollRuleSegment[];
  workerClassification: PayrollWorkerClassification;
  // Total job bonus earned in the period (taxable earnings). Omitted or 0 → no bonus line.
  bonus?: ContractMoney;
  // The date the rates are resolved against (effective-dated rate table). Optional; when omitted the
  // most recent rate entry for the jurisdiction is used.
  asOf?: Date;
}>;

export type PayrollRuleResult = Readonly<{
  earnings: readonly PayrollEarningDraft[];
  deductions: readonly PayrollDeductionDraft[];
  employerCosts: readonly PayrollEmployerCostDraft[];
}>;

// The provider seam. A real jurisdiction pack (CRA/Revenu Québec, US state, …) swaps in behind
// this — the payroll core never learns tax law directly.
export interface PayrollRuleProvider {
  readonly key: string;
  readonly version: string;
  supports(jurisdiction: PayrollJurisdiction): boolean;
  evaluate(input: PayrollRuleInput): PayrollRuleResult;
}

// ── Errors (mapped to HTTP by the API, mirroring the attendance/timesheet mapping) ──

export type PayrollErrorCode = "denied" | "not_found" | "invalid" | "conflict";
export class PayrollError extends Error {
  readonly code: PayrollErrorCode;
  readonly reason: string;
  constructor(code: PayrollErrorCode, reason: string) {
    super(reason);
    this.code = code;
    this.reason = reason;
    this.name = "PayrollError";
  }
}

// ── Pure totals ──

// floor(amount * bps / 10000) — integer minor units only, no floating-point path.
function percentOfBps(amount: ContractMoney, bps: number): ContractMoney {
  return createContractMoney({ amountMinor: Math.floor((amount.amountMinor * bps) / 10000), currency: amount.currency });
}

export type PayrollTotals = Readonly<{ gross: ContractMoney; totalDeductions: ContractMoney; net: ContractMoney; totalEmployerCost: ContractMoney }>;

// Total a rule result into gross / deductions / net / employer-cost. Currency is asserted by the
// Money engine on every add; net is gross - deductions (never negative).
export function computePayrollTotals(result: PayrollRuleResult, currency: MoneyEngineCurrency): PayrollTotals {
  const zero = createContractMoney({ amountMinor: 0, currency });
  const gross = result.earnings.length ? sumMoney(result.earnings.map((e) => e.amount)) : zero;
  const totalDeductions = result.deductions.length ? sumMoney(result.deductions.map((d) => d.amount)) : zero;
  const totalEmployerCost = result.employerCosts.length ? sumMoney(result.employerCosts.map((c) => c.amount)) : zero;
  const net = subtractMoney(gross, totalDeductions);
  return { gross, totalDeductions, net, totalEmployerCost };
}

// ── SYNTHETIC / TEST rule provider ──
//
// Fixture jurisdiction configs. CA/QC and CA/ON are DELIBERATELY DIFFERENT governed configs — this
// proves payroll does not treat "Canada" as one universal formula. These numbers are SYNTHETIC and
// carry NO statutory authority. Real jurisdiction packs replace this provider entirely.
type SyntheticJurisdictionConfig = Readonly<{
  overtimeThresholdMinutes: number;
  overtimeMultiplierBps: number; // 15000 = 1.5x
  vacationPayBps: number;
  federalTaxBps: number;
  provincialTaxBps: number;
  socialInsuranceBps: number;
  employerContributionBps: number;
}>;

// Effective-dated rate table. Each jurisdiction has one or more entries ordered by effectiveFrom; the
// entry in force at the pay-period date (input.asOf) is applied. The CURRENT entries are SYNTHETIC
// placeholders with NO statutory authority. A Québec CPA adds real, effective-dated entries
// (source: "statutory") here: past periods keep their rates, and periods on/after a new entry's
// effectiveFrom pick up the real rates. See docs/finance/TWO_CHANNEL_PAYROLL_DESIGN.md.
type JurisdictionRateEntry = SyntheticJurisdictionConfig &
  Readonly<{ effectiveFrom: Date; source: "synthetic" | "statutory"; note?: string }>;

const JURISDICTION_RATE_TABLE: Readonly<Record<string, readonly JurisdictionRateEntry[]>> = {
  "CA/QC": [
    {
      effectiveFrom: new Date("2000-01-01T00:00:00.000Z"),
      source: "synthetic",
      note: "Placeholder — replace with CPA-validated CA/QC rates (QPP, QPIP, income tax, employer contribution).",
      overtimeThresholdMinutes: 2400, overtimeMultiplierBps: 15000, vacationPayBps: 600, federalTaxBps: 1500, provincialTaxBps: 1400, socialInsuranceBps: 600, employerContributionBps: 1400
    }
    // CPA: add the real CA/QC rates as a new dated entry, e.g.
    // { effectiveFrom: new Date("2026-01-01T00:00:00.000Z"), source: "statutory", note: "CRA/RQ 2026",
    //   overtimeThresholdMinutes: …, overtimeMultiplierBps: …, vacationPayBps: …, federalTaxBps: …,
    //   provincialTaxBps: …, socialInsuranceBps: …, employerContributionBps: … }
  ],
  "CA/ON": [
    {
      effectiveFrom: new Date("2000-01-01T00:00:00.000Z"),
      source: "synthetic",
      note: "Placeholder — replace with CPA-validated CA/ON rates.",
      overtimeThresholdMinutes: 2640, overtimeMultiplierBps: 15000, vacationPayBps: 400, federalTaxBps: 1500, provincialTaxBps: 900, socialInsuranceBps: 600, employerContributionBps: 1000
    }
  ]
};

// Resolve the rate entry in force for a jurisdiction at `asOf` (defaults to the most recent entry).
export function resolveRateEntry(jurisdictionKey: string, asOf?: Date): JurisdictionRateEntry | null {
  const entries = JURISDICTION_RATE_TABLE[jurisdictionKey];
  if (!entries || entries.length === 0) return null;
  const at = asOf ?? new Date(8_640_000_000_000_000);
  const inForce = entries.filter((e) => e.effectiveFrom.getTime() <= at.getTime());
  const pool = inForce.length > 0 ? inForce : entries; // before the first entry, fall back to the earliest
  return pool.reduce((latest, e) => (e.effectiveFrom.getTime() > latest.effectiveFrom.getTime() ? e : latest));
}

export function createSyntheticPayrollRuleProvider(): PayrollRuleProvider {
  return {
    key: "synthetic-fixture",
    version: "synthetic-2026.08",
    supports: (j) => resolveRateEntry(payrollJurisdictionKey(j)) !== null,
    evaluate: (input) => {
      const cfg = resolveRateEntry(payrollJurisdictionKey(input.jurisdiction), input.asOf);
      if (!cfg) {
        throw new PayrollError("invalid", `unsupported_jurisdiction:${payrollJurisdictionKey(input.jurisdiction)}`);
      }
      const currency = input.currency;
      if (input.segments.some((s) => s.hourlyRate.currency !== currency)) {
        throw new PayrollError("invalid", "currency_mismatch:rate");
      }
      if (input.segments.length === 0) {
        throw new PayrollError("invalid", "no_worked_time_segments");
      }
      // One REGULAR earning line per contract-version segment, at that committed rate — this is the
      // explainable per-rate provenance when a rate change splits a period across contract versions.
      const earnings: PayrollEarningDraft[] = input.segments.map((s) => ({
        classification: "regular",
        description: "Regular worked time (synthetic)",
        quantityMinutes: s.payableMinutes,
        rate: s.hourlyRate,
        amount: proRateMinutesAtHourlyRate(s.hourlyRate, s.payableMinutes),
        sourceContractId: s.contractId,
        sourceContractVersion: s.contractVersion
      }));

      // Overtime premium (synthetic): minutes over the jurisdiction threshold earn an extra 0.5x, at
      // the rate of the LAST segment (by effective order). Documented synthetic rule; base hours are
      // already in the regular lines above.
      const totalMinutes = input.segments.reduce((sum, s) => sum + s.payableMinutes, 0);
      const overtimeMinutes = Math.max(0, totalMinutes - cfg.overtimeThresholdMinutes);
      if (overtimeMinutes > 0) {
        const lastRate = input.segments[input.segments.length - 1]!.hourlyRate;
        const premiumRate = createContractMoney({ amountMinor: Math.floor((lastRate.amountMinor * (cfg.overtimeMultiplierBps - 10000)) / 10000), currency });
        earnings.push({ classification: "overtime_premium", description: "Overtime premium (synthetic)", quantityMinutes: overtimeMinutes, rate: premiumRate, amount: proRateMinutesAtHourlyRate(premiumRate, overtimeMinutes), sourceContractId: null, sourceContractVersion: null });
      }

      // Job bonus: taxable earnings, added BEFORE vacation pay and deductions. Only when non-zero, so
      // a calculation without a bonus is byte-identical to before (same lines, same fingerprint).
      if (input.bonus && input.bonus.amountMinor > 0) {
        if (input.bonus.currency !== currency) throw new PayrollError("invalid", "currency_mismatch:bonus");
        earnings.push({ classification: "bonus", description: "Job bonus", quantityMinutes: null, rate: null, amount: input.bonus, sourceContractId: null, sourceContractVersion: null });
      }

      const workedEarnings = sumMoney(earnings.map((e) => e.amount));
      const vacationAmount = percentOfBps(workedEarnings, cfg.vacationPayBps);
      earnings.push({ classification: "vacation_pay", description: "Vacation pay accrual (synthetic)", quantityMinutes: null, rate: null, amount: vacationAmount, sourceContractId: null, sourceContractVersion: null });

      const gross = sumMoney(earnings.map((e) => e.amount));

      // Contractors take no statutory deductions in this synthetic model — demonstrates
      // classification affecting the rule result without encoding real law.
      const deductions: PayrollDeductionDraft[] = input.workerClassification === "contractor" ? [] : [
        { category: "statutory", code: "federal_tax", description: "Federal tax (synthetic)", amount: percentOfBps(gross, cfg.federalTaxBps) },
        { category: "statutory", code: "provincial_tax", description: "Provincial/regional tax (synthetic)", amount: percentOfBps(gross, cfg.provincialTaxBps) },
        { category: "statutory", code: "social_insurance", description: "Social insurance (synthetic)", amount: percentOfBps(gross, cfg.socialInsuranceBps) }
      ];

      const employerCosts: PayrollEmployerCostDraft[] = input.workerClassification === "contractor" ? [] : [
        { category: "employer_statutory", code: "employer_contribution", description: "Employer contribution (synthetic)", amount: percentOfBps(gross, cfg.employerContributionBps) }
      ];

      return { earnings, deductions, employerCosts };
    }
  };
}

// ── Service ports ──

export type StoredPayrollPeriod = Readonly<{
  id: string; organizationId: string; jurisdictionCountry: string; jurisdictionRegion: string;
  periodStart: Date; periodEnd: Date; timezone: string; status: PayrollPeriodStatus; currency: string;
  ruleProviderKey: string; ruleProviderVersion: string; version: number;
}>;

export type PayrollCorrectionType = "pre_lock_revision" | "post_lock_adjustment";
export type PayrollDeltaDirection = "credit" | "debit";

export type StoredPayrollCalculation = Readonly<{
  id: string; payrollPeriodId: string; organizationId: string; workerIdentityId: string; revision: number;
  status: PayrollCalculationStatus; jurisdictionCountry: string; jurisdictionRegion: string;
  ruleProviderKey: string; ruleProviderVersion: string; calculationPolicyVersion: string; workerClassification: string; currency: string;
  grossPayMinor: number; totalDeductionsMinor: number; netPayMinor: number; totalEmployerCostMinor: number;
  calculationFingerprint: string; synthetic: boolean; calculatedAt: Date; supersededById: string | null; version: number;
  familyRootId: string; previousCalculationId: string | null; previousFingerprint: string | null;
  correctionType: PayrollCorrectionType | null; correctionReason: string | null; correlationKey: string | null;
  adjustsCalculationId: string | null; adjustmentNetDirection: PayrollDeltaDirection | null; adjustmentNetDeltaMinor: number | null;
}>;

// Everything needed to REPLAY a calculation from its own immutable snapshot (no live re-reads).
export type PayrollReplaySnapshot = Readonly<{
  id: string; payrollPeriodId: string; organizationId: string; workerIdentityId: string;
  jurisdiction: PayrollJurisdiction; ruleProviderKey: string; ruleProviderVersion: string; calculationPolicyVersion: string;
  workerClassification: PayrollWorkerClassification; currency: string; calculationFingerprint: string;
  workedTime: readonly Readonly<{ timesheetId: string; timesheetVersion: number; payableMinutes: number; contractId: string; contractVersion: string; appliedHourlyRateMinor: number; contractEffectiveFrom: Date; sourceEffectiveInstant: Date; bonusMinor?: number }>[];
  earnings: readonly Readonly<{ classification: string; amountMinor: number; sourceContractVersion: string | null }>[];
  deductions: readonly Readonly<{ category: string; code: string; amountMinor: number }>[];
  employerCosts: readonly Readonly<{ category: string; code: string; amountMinor: number }>[];
  grossPayMinor: number; totalDeductionsMinor: number; netPayMinor: number; totalEmployerCostMinor: number;
}>;

// An immutable per-timesheet time+rate snapshot persisted with the calculation.
export type PayrollWorkedTimeSnapshot = PayrollWorkedTimeLine & Readonly<{
  compensationType: "hourly";
  contractId: string;
  contractVersion: string;
  contractEffectiveFrom: Date;
  appliedHourlyRateMinor: number;
  currency: string;
  sourceEffectiveInstant: Date;
}>;

export type PayrollAdjustmentDelta = Readonly<{
  netDirection: PayrollDeltaDirection; netDeltaMinor: number;
  grossDirection: PayrollDeltaDirection; grossDeltaMinor: number;
  deductionsDirection: PayrollDeltaDirection; deductionsDeltaMinor: number;
  employerCostDirection: PayrollDeltaDirection; employerCostDeltaMinor: number;
}>;

export type CreatePayrollCalculationInput = Readonly<{
  id: string; payrollPeriodId: string; organizationId: string; workerIdentityId: string; revision: number;
  familyRootId: string; previousCalculationId: string | null; previousFingerprint: string | null;
  correctionType: PayrollCorrectionType | null; correctionReason: string | null; correlationKey: string | null;
  adjustsCalculationId: string | null; adjustmentDelta: PayrollAdjustmentDelta | null;
  jurisdictionCountry: string; jurisdictionRegion: string; ruleProviderKey: string; ruleProviderVersion: string;
  calculationPolicyVersion: string; workerClassification: string; currency: string;
  grossPayMinor: number; totalDeductionsMinor: number; netPayMinor: number; totalEmployerCostMinor: number;
  calculationFingerprint: string;
  calculatedAt: Date; createdByUserId: string;
  workedTimeRefs: readonly PayrollWorkedTimeSnapshot[];
  earnings: readonly PayrollEarningDraft[];
  deductions: readonly PayrollDeductionDraft[];
  employerCosts: readonly PayrollEmployerCostDraft[];
  supersedePriorId: string | null; expectedPriorVersion: number | null;
}>;

export interface PayrollRepository {
  findPeriodById(id: string): Promise<StoredPayrollPeriod | null>;
  listApprovedWorkedTime(input: { organizationId: string; workerIdentityId: string; from: Date; to: Date }): Promise<readonly PayrollWorkedTimeLine[]>;
  findActiveCalculation(payrollPeriodId: string, workerIdentityId: string): Promise<StoredPayrollCalculation | null>;
  // Bounded keyset selection of workers with approved/locked worked time in the period window.
  listEligibleWorkerIds(input: { organizationId: string; from: Date; to: Date; limit: number; cursor: string | null }): Promise<readonly string[]>;
  findCalculationById(calculationId: string): Promise<StoredPayrollCalculation | null>;
  findByCorrelationKey(familyRootId: string, correlationKey: string): Promise<StoredPayrollCalculation | null>;
  getCalculationForReplay(calculationId: string): Promise<PayrollReplaySnapshot | null>;
  // Atomically supersede the prior active revision (version-guarded) and insert the new one.
  // Returns null if the prior revision was concurrently changed (optimistic-concurrency miss).
  createCalculationAtomically(input: CreatePayrollCalculationInput): Promise<StoredPayrollCalculation | null>;
  // Version-guarded AND allowed-from-guarded transition. Returns null on a version miss, a missing
  // row, or an illegal transition (current status not in allowedFrom) — all reported as a conflict.
  updateCalculationStatus(input: { id: string; expectedVersion: number; allowedFrom: readonly PayrollCalculationStatus[]; nextStatus: PayrollCalculationStatus; actorUserId: string; note: string | null; now: Date }): Promise<StoredPayrollCalculation | null>;
  updatePeriodStatus(input: { id: string; expectedVersion: number; nextStatus: PayrollPeriodStatus; actorUserId: string; now: Date }): Promise<StoredPayrollPeriod | null>;
  recordAudit(input: { entityType: string; entityId: string; entityPublicReference: string | null; organizationId: string | null; action: string; priorState: string | null; newState: string | null; reason: string | null; actorUserId: string | null; correlationId: string; now: Date }): Promise<void>;
}

export type PayrollDeps = Readonly<{
  repository: PayrollRepository;
  ruleProviders: readonly PayrollRuleProvider[];
  rateResolver: PayrollRateResolver;
  jurisdictionResolver: PayrollJurisdictionResolver;
  classificationResolver?: Readonly<{ resolve(workerIdentityId: string): Promise<PayrollWorkerClassification> }>;
  calculationPolicyVersion?: string;
  now?: () => Date;
}>;

const CALC_TRANSITIONS: Readonly<Record<string, readonly PayrollCalculationStatus[]>> = {
  review: ["calculated"],
  approve: ["calculated", "in_review"],
  reject: ["calculated", "in_review"],
  lock: ["approved"]
};
const CALC_NEXT: Readonly<Record<string, PayrollCalculationStatus>> = { review: "in_review", approve: "approved", reject: "rejected", lock: "locked" };
const BULK_WORKER_RETRIES = 8;
const bulkRetrySleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createPayrollService(deps: PayrollDeps) {
  const now = deps.now ?? (() => new Date());
  const policyVersion = deps.calculationPolicyVersion ?? "payroll-foundation-v1";

  function resolveProviderForCalc(jurisdiction: PayrollJurisdiction): PayrollRuleProvider {
    const provider = deps.ruleProviders.find((p) => p.supports(jurisdiction));
    if (!provider) throw new PayrollError("invalid", `unsupported_payroll_jurisdiction:${payrollJurisdictionKey(jurisdiction)}`);
    return provider;
  }

  // Resolve the whole calculation deterministically from AUTHORITATIVE inputs: approved worked time
  // + jurisdiction derived from the worksite + the committed contract rate effective at each shift.
  // Pure of persistence — used by both calculate() and replay/verify().
  async function resolveCalculation(period: StoredPayrollPeriod, workerIdentityId: string): Promise<{
    jurisdiction: PayrollJurisdiction; provider: PayrollRuleProvider; currency: MoneyEngineCurrency; workerClassification: PayrollWorkerClassification;
    snapshots: readonly PayrollWorkedTimeSnapshot[]; result: PayrollRuleResult; totals: PayrollTotals; fingerprint: string;
  }> {
    if (!isSupportedCurrency(period.currency)) throw new PayrollError("invalid", `unsupported_currency:${period.currency}`);
    const currency = period.currency as MoneyEngineCurrency;

    const workedTime = await deps.repository.listApprovedWorkedTime({ organizationId: period.organizationId, workerIdentityId, from: period.periodStart, to: period.periodEnd });
    if (workedTime.length === 0) throw new PayrollError("invalid", "no_approved_worked_time");

    // Jurisdiction is DERIVED from the worksite (Residence), never trusted from the caller. Work
    // spanning multiple jurisdictions fails safely rather than guessing one.
    const derived = new Map<string, PayrollJurisdiction>();
    for (const wt of workedTime) {
      const j = await deps.jurisdictionResolver.resolve({ residenceId: wt.residenceId });
      if (!j) throw new PayrollError("invalid", `unsupported_payroll_jurisdiction:worksite:${wt.residenceId}`);
      derived.set(payrollJurisdictionKey(j), j);
    }
    if (derived.size > 1) throw new PayrollError("invalid", `ambiguous_multi_jurisdiction:${[...derived.keys()].sort().join(",")}`);
    const jurisdiction = [...derived.values()][0]!;
    // A caller cannot pick a jurisdiction that disagrees with the authoritative worksite.
    if (jurisdiction.country !== period.jurisdictionCountry || jurisdiction.region !== period.jurisdictionRegion) {
      throw new PayrollError("invalid", `jurisdiction_mismatch_period_vs_worksite:period=${period.jurisdictionCountry}/${period.jurisdictionRegion},worksite=${payrollJurisdictionKey(jurisdiction)}`);
    }
    const provider = resolveProviderForCalc(jurisdiction);

    // Per-timesheet rate resolution + intra-shift boundary detection.
    const snapshots: PayrollWorkedTimeSnapshot[] = [];
    for (const wt of workedTime) {
      const scope = { organizationId: period.organizationId, workGroupId: wt.workGroupId, roleDefinitionId: wt.roleDefinitionId, assignmentId: wt.assignmentId };
      const startRate = await deps.rateResolver.resolveAt({ ...scope, instant: wt.scheduledStartAt });
      if (!startRate) throw new PayrollError("invalid", `missing_rate:${wt.timesheetId}`);
      const endRate = await deps.rateResolver.resolveAt({ ...scope, instant: wt.scheduledEndAt });
      if (!endRate) throw new PayrollError("invalid", `missing_rate:${wt.timesheetId}`);
      // A rate/contract boundary strictly inside an approved shift cannot be split — ApprovedWorkedTime
      // has only aggregate minutes. Fail with governed provenance rather than guessing the split.
      if (endRate.contractId !== startRate.contractId) {
        throw new PayrollError("invalid", `rate_boundary_inside_approved_shift:${JSON.stringify({ timesheetId: wt.timesheetId, assignmentId: wt.assignmentId, shiftStart: wt.scheduledStartAt.toISOString(), shiftEnd: wt.scheduledEndAt.toISOString(), oldContractId: startRate.contractId, oldContractVersion: startRate.contractVersion, newContractId: endRate.contractId, newContractVersion: endRate.contractVersion, boundaryAt: endRate.contractEffectiveFrom.toISOString() })}`);
      }
      if (startRate.hourlyRate.currency !== currency) throw new PayrollError("invalid", "currency_mismatch:rate_vs_period");
      snapshots.push({ ...wt, compensationType: "hourly", contractId: startRate.contractId, contractVersion: startRate.contractVersion, contractEffectiveFrom: startRate.contractEffectiveFrom, appliedHourlyRateMinor: startRate.hourlyRate.amountMinor, currency, sourceEffectiveInstant: wt.scheduledStartAt });
    }

    // Segment by committed contract version (ordered by effectiveFrom) — one earning segment per rate.
    const bySegment = new Map<string, { contractId: string; contractVersion: string; effectiveFrom: Date; hourlyRateMinor: number; payableMinutes: number }>();
    for (const s of snapshots) {
      const seg = bySegment.get(s.contractId) ?? { contractId: s.contractId, contractVersion: s.contractVersion, effectiveFrom: s.contractEffectiveFrom, hourlyRateMinor: s.appliedHourlyRateMinor, payableMinutes: 0 };
      seg.payableMinutes += s.payableMinutes;
      bySegment.set(s.contractId, seg);
    }
    const segments: PayrollRuleSegment[] = [...bySegment.values()]
      .sort((a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime())
      .map((seg) => ({ contractId: seg.contractId, contractVersion: seg.contractVersion, hourlyRate: createContractMoney({ amountMinor: seg.hourlyRateMinor, currency }), payableMinutes: seg.payableMinutes }));

    const workerClassification = deps.classificationResolver ? await deps.classificationResolver.resolve(workerIdentityId) : "employee";
    const bonus = bonusMoney(snapshots, currency);
    const result = provider.evaluate({ jurisdiction, currency, segments, workerClassification, asOf: period.periodEnd, ...(bonus ? { bonus } : {}) });
    assertResultCurrency(result, currency);
    const totals = computePayrollTotals(result, currency);
    const fingerprint = buildCalculationFingerprint({ period, workerIdentityId, jurisdiction, provider, policyVersion, workerClassification, snapshots, result, totals });
    return { jurisdiction, provider, currency, workerClassification, snapshots, result, totals, fingerprint };
  }

  type ResolvedCalc = Awaited<ReturnType<typeof resolveCalculation>>;

  // Persist a governed revision (or post-lock adjustment). The prior active revision is version-
  // guarded superseded for the pre-lock chain; a post-lock adjustment does NOT supersede the locked
  // original (it stays authoritative for what was locked) — it links to it and supersedes any prior
  // adjustment. Returns null on an optimistic-concurrency miss (reported as a conflict upstream).
  async function persistRevision(args: {
    period: StoredPayrollPeriod; resolved: ResolvedCalc; actorUserId: string; correlationId: string; workerIdentityId: string;
    prior: StoredPayrollCalculation | null; correctionType: PayrollCorrectionType | null; correctionReason: string | null;
    correlationKey: string | null; adjustsCalculationId: string | null; adjustmentDelta: PayrollAdjustmentDelta | null;
    supersedePriorId: string | null; expectedPriorVersion: number | null; action: string;
  }): Promise<StoredPayrollCalculation | null> {
    const { period, resolved, prior } = args;
    const id = newPayrollId();
    const familyRootId = prior?.familyRootId ?? id;
    const revision = (prior?.revision ?? 0) + 1;
    const at = now();
    const created = await deps.repository.createCalculationAtomically({
      id, payrollPeriodId: period.id, organizationId: period.organizationId, workerIdentityId: args.workerIdentityId, revision,
      familyRootId, previousCalculationId: prior?.id ?? null, previousFingerprint: prior?.calculationFingerprint ?? null,
      correctionType: args.correctionType, correctionReason: args.correctionReason, correlationKey: args.correlationKey,
      adjustsCalculationId: args.adjustsCalculationId, adjustmentDelta: args.adjustmentDelta,
      jurisdictionCountry: resolved.jurisdiction.country, jurisdictionRegion: resolved.jurisdiction.region,
      ruleProviderKey: resolved.provider.key, ruleProviderVersion: resolved.provider.version, calculationPolicyVersion: policyVersion, workerClassification: resolved.workerClassification, currency: resolved.currency,
      grossPayMinor: resolved.totals.gross.amountMinor, totalDeductionsMinor: resolved.totals.totalDeductions.amountMinor, netPayMinor: resolved.totals.net.amountMinor, totalEmployerCostMinor: resolved.totals.totalEmployerCost.amountMinor,
      calculationFingerprint: resolved.fingerprint,
      calculatedAt: at, createdByUserId: args.actorUserId,
      workedTimeRefs: resolved.snapshots, earnings: resolved.result.earnings, deductions: resolved.result.deductions, employerCosts: resolved.result.employerCosts,
      supersedePriorId: args.supersedePriorId, expectedPriorVersion: args.expectedPriorVersion
    });
    if (created) {
      await deps.repository.recordAudit({ entityType: "payroll_calculation", entityId: created.id, entityPublicReference: familyRootId, organizationId: period.organizationId, action: args.action, priorState: prior ? `revision:${prior.revision}:${prior.status}` : null, newState: `revision:${revision}:${args.correctionType ?? "calculated"}`, reason: args.correctionReason ?? `synthetic:${resolved.provider.key}@${resolved.provider.version}`, actorUserId: args.actorUserId, correlationId: args.correlationId, now: at });
    }
    return created;
  }

  // Calculate (or recalculate) a worker's payroll for a period. Creates a NEW revision superseding
  // the prior active one. Refuses once the active revision is LOCKED — a post-lock change must go
  // through requestCorrection (a governed adjustment), never a silent recalc.
  async function calculate(input: { actorUserId: string; payrollPeriodId: string; workerIdentityId: string; correlationId: string }): Promise<StoredPayrollCalculation> {
    const period = await deps.repository.findPeriodById(input.payrollPeriodId);
    if (!period) throw new PayrollError("not_found", "payroll_period_not_found");
    if (period.status === "approved" || period.status === "locked") {
      throw new PayrollError("conflict", `period_not_open_for_calculation:${period.status}`);
    }
    const resolved = await resolveCalculation(period, input.workerIdentityId);
    const prior = await deps.repository.findActiveCalculation(period.id, input.workerIdentityId);
    if (prior?.status === "locked") throw new PayrollError("conflict", "calculation_locked_use_correction");
    // Idempotency: identical authoritative inputs (same fingerprint) do not create a new revision.
    if (prior && prior.calculationFingerprint === resolved.fingerprint) return prior;

    const created = await persistRevision({
      period, resolved, actorUserId: input.actorUserId, correlationId: input.correlationId, workerIdentityId: input.workerIdentityId,
      prior, correctionType: null, correctionReason: null, correlationKey: null, adjustsCalculationId: null, adjustmentDelta: null,
      supersedePriorId: prior?.id ?? null, expectedPriorVersion: prior?.version ?? null, action: prior ? "payroll.recalculated" : "payroll.calculated"
    });
    if (!created) throw new PayrollError("conflict", "calculation_superseded_concurrently");
    return created;
  }

  // A governed correction. It NEVER accepts financial amounts — it recomputes from the current
  // authoritative inputs (approved worked time + committed contract rates + worksite jurisdiction).
  // Pre-lock → a new revision; post-lock → an explicit linked adjustment with a signed delta.
  async function requestCorrection(input: { actorUserId: string; calculationId: string; expectedVersion: number; reason: string; correlationKey?: string | null; correlationId: string }): Promise<{ outcome: "created" | "no_change" | "duplicate"; calculation: StoredPayrollCalculation }> {
    if (!input.reason || input.reason.trim().length === 0) throw new PayrollError("invalid", "correction_reason_required");
    const target = await deps.repository.findCalculationById(input.calculationId);
    if (!target) throw new PayrollError("not_found", "correction_target_not_found");
    // Idempotency FIRST: a repeated correction submission with the same key returns the existing
    // result — even though the original target is now superseded and its version has moved on.
    if (input.correlationKey) {
      const existing = await deps.repository.findByCorrelationKey(target.familyRootId, input.correlationKey);
      if (existing) return { outcome: "duplicate", calculation: existing };
    }
    // The reviewer must be acting on the exact revision they loaded.
    if (target.version !== input.expectedVersion) throw new PayrollError("conflict", "stale_expected_revision");
    if (target.status === "superseded" || target.status === "rejected") throw new PayrollError("conflict", `correction_target_not_current:${target.status}`);

    const period = await deps.repository.findPeriodById(target.payrollPeriodId);
    if (!period) throw new PayrollError("not_found", "payroll_period_not_found");
    const resolved = await resolveCalculation(period, target.workerIdentityId);

    const isPostLock = target.status === "locked" || target.correctionType === "post_lock_adjustment";
    // No-change: recomputed inputs identical to the target → governed NO_CHANGE, no new revision.
    if (!isPostLock && resolved.fingerprint === target.calculationFingerprint) return { outcome: "no_change", calculation: target };

    if (isPostLock) {
      const original = target.status === "locked" ? target : (await deps.repository.findCalculationById(target.adjustsCalculationId!))!;
      const delta = computeAdjustmentDelta(original, resolved.totals);
      // A recomputation identical to the locked original is a zero-delta no-op.
      if (delta.netDeltaMinor === 0 && delta.grossDeltaMinor === 0 && delta.deductionsDeltaMinor === 0 && delta.employerCostDeltaMinor === 0 && target.status === "locked") {
        return { outcome: "no_change", calculation: target };
      }
      const created = await persistRevision({
        period, resolved, actorUserId: input.actorUserId, correlationId: input.correlationId, workerIdentityId: target.workerIdentityId,
        prior: target, correctionType: "post_lock_adjustment", correctionReason: input.reason, correlationKey: input.correlationKey ?? null,
        adjustsCalculationId: original.id, adjustmentDelta: delta,
        // adjustments supersede a prior adjustment (version-guarded), but never the locked original
        supersedePriorId: target.status === "locked" ? null : target.id, expectedPriorVersion: target.status === "locked" ? null : target.version,
        action: "payroll.post_lock_adjustment_created"
      });
      if (!created) throw new PayrollError("conflict", "correction_superseded_concurrently");
      return { outcome: "created", calculation: created };
    }

    const created = await persistRevision({
      period, resolved, actorUserId: input.actorUserId, correlationId: input.correlationId, workerIdentityId: target.workerIdentityId,
      prior: target, correctionType: "pre_lock_revision", correctionReason: input.reason, correlationKey: input.correlationKey ?? null,
      adjustsCalculationId: null, adjustmentDelta: null, supersedePriorId: target.id, expectedPriorVersion: target.version, action: "payroll.correction_created"
    });
    if (!created) throw new PayrollError("conflict", "correction_superseded_concurrently");
    return { outcome: "created", calculation: created };
  }

  // Deterministic VERIFY replay. Recomputes the result FROM THE STORED IMMUTABLE SNAPSHOT (worked-time
  // refs + applied rates + exact historical provider version), NOT from live re-reads, and compares
  // it byte-for-byte to what was stored. Creates NO revision. Proves the calculation is reproducible
  // and has not drifted.
  async function verifyCalculation(input: { calculationId: string }): Promise<{ ok: boolean; storedFingerprint: string; recomputedFingerprint: string; totalsMatch: boolean }> {
    const s = await deps.repository.getCalculationForReplay(input.calculationId);
    if (!s) throw new PayrollError("not_found", "payroll_calculation_not_found");
    // Resolve the EXACT historical provider version — never "latest".
    const provider = deps.ruleProviders.find((p) => p.key === s.ruleProviderKey && p.version === s.ruleProviderVersion);
    if (!provider) throw new PayrollError("invalid", `unavailable_historical_provider_version:${s.ruleProviderKey}@${s.ruleProviderVersion}`);
    if (!isSupportedCurrency(s.currency)) throw new PayrollError("invalid", `unsupported_currency:${s.currency}`);
    const currency = s.currency as MoneyEngineCurrency;

    // Rebuild segments from the stored per-timesheet snapshots, ordered by effective instant.
    const bySeg = new Map<string, { contractId: string; contractVersion: string; effectiveFrom: Date; rateMinor: number; minutes: number }>();
    for (const w of s.workedTime) {
      const seg = bySeg.get(w.contractId) ?? { contractId: w.contractId, contractVersion: w.contractVersion, effectiveFrom: w.contractEffectiveFrom, rateMinor: w.appliedHourlyRateMinor, minutes: 0 };
      seg.minutes += w.payableMinutes;
      bySeg.set(w.contractId, seg);
    }
    const segments: PayrollRuleSegment[] = [...bySeg.values()].sort((a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime()).map((seg) => ({ contractId: seg.contractId, contractVersion: seg.contractVersion, hourlyRate: createContractMoney({ amountMinor: seg.rateMinor, currency }), payableMinutes: seg.minutes }));

    const bonus = bonusMoney(s.workedTime, currency);
    const result = provider.evaluate({ jurisdiction: s.jurisdiction, currency, segments, workerClassification: s.workerClassification, ...(bonus ? { bonus } : {}) });
    const totals = computePayrollTotals(result, currency);
    const totalsMatch = totals.gross.amountMinor === s.grossPayMinor && totals.totalDeductions.amountMinor === s.totalDeductionsMinor && totals.net.amountMinor === s.netPayMinor && totals.totalEmployerCost.amountMinor === s.totalEmployerCostMinor;
    const recomputedFingerprint = canonicalFingerprint({
      periodId: s.payrollPeriodId, workerIdentityId: s.workerIdentityId, jurisdiction: s.jurisdiction,
      providerKey: s.ruleProviderKey, providerVersion: s.ruleProviderVersion, policyVersion: s.calculationPolicyVersion,
      workerClassification: s.workerClassification, currency: s.currency,
      workedTime: s.workedTime.map((w) => ({ timesheetId: w.timesheetId, timesheetVersion: w.timesheetVersion, payableMinutes: w.payableMinutes, contractId: w.contractId, contractVersion: w.contractVersion, appliedHourlyRateMinor: w.appliedHourlyRateMinor, sourceEffectiveInstant: w.sourceEffectiveInstant.toISOString(), bonusMinor: w.bonusMinor ?? 0 })),
      earnings: result.earnings.map((e) => ({ classification: e.classification, amountMinor: e.amount.amountMinor, sourceContractVersion: e.sourceContractVersion })),
      deductions: result.deductions.map((d) => ({ category: d.category, code: d.code, amountMinor: d.amount.amountMinor })),
      employerCosts: result.employerCosts.map((c) => ({ category: c.category, code: c.code, amountMinor: c.amount.amountMinor })),
      totals: { grossPayMinor: totals.gross.amountMinor, totalDeductionsMinor: totals.totalDeductions.amountMinor, netPayMinor: totals.net.amountMinor, totalEmployerCostMinor: totals.totalEmployerCost.amountMinor }
    });
    return { ok: totalsMatch && recomputedFingerprint === s.calculationFingerprint, storedFingerprint: s.calculationFingerprint, recomputedFingerprint, totalsMatch };
  }

  async function transitionCalculation(input: { actorUserId: string; calculationId: string; expectedVersion: number; action: "review" | "approve" | "reject" | "lock"; note?: string | null; correlationId: string }): Promise<StoredPayrollCalculation> {
    const allowedFrom = CALC_TRANSITIONS[input.action];
    const nextStatus = CALC_NEXT[input.action];
    if (!allowedFrom || !nextStatus) throw new PayrollError("invalid", `unknown_action:${input.action}`);

    const updated = await deps.repository.updateCalculationStatus({ id: input.calculationId, expectedVersion: input.expectedVersion, allowedFrom, nextStatus, actorUserId: input.actorUserId, note: input.note ?? null, now: now() });
    if (updated === null) throw new PayrollError("conflict", "calculation_version_conflict_transition_or_missing");
    await deps.repository.recordAudit({ entityType: "payroll_calculation", entityId: updated.id, entityPublicReference: updated.payrollPeriodId, organizationId: updated.organizationId, action: `payroll.${input.action}`, priorState: null, newState: nextStatus, reason: input.note ?? null, actorUserId: input.actorUserId, correlationId: input.correlationId, now: now() });
    return updated;
  }

  async function transitionPeriod(input: { actorUserId: string; payrollPeriodId: string; expectedVersion: number; nextStatus: PayrollPeriodStatus; correlationId: string }): Promise<StoredPayrollPeriod> {
    const updated = await deps.repository.updatePeriodStatus({ id: input.payrollPeriodId, expectedVersion: input.expectedVersion, nextStatus: input.nextStatus, actorUserId: input.actorUserId, now: now() });
    if (updated === null) throw new PayrollError("conflict", "period_version_conflict_or_missing");
    await deps.repository.recordAudit({ entityType: "payroll_period", entityId: updated.id, entityPublicReference: null, organizationId: updated.organizationId, action: `payroll_period.${input.nextStatus}`, priorState: null, newState: input.nextStatus, reason: null, actorUserId: input.actorUserId, correlationId: input.correlationId, now: now() });
    return updated;
  }

  // Bounded BULK calculation for a period. Calculation-only — never approves/locks/pays. Selects
  // eligible workers by keyset (bounded page), calls the SAME single-worker engine with per-worker
  // failure isolation and small bounded concurrency, and returns a bounded summary. Idempotent:
  // a worker whose inputs are unchanged returns no_change (no duplicate revision).
  async function calculatePeriodBulk(input: { actorUserId: string; payrollPeriodId: string; limit: number; cursor: string | null; correlationId: string }): Promise<{
    attempted: number; calculated: number; noChange: number; failed: number; conflicts: number; nextCursor: string | null;
    results: readonly { workerIdentityId: string; outcome: "calculated" | "no_change" | "conflict" | "failed"; reason?: string; calculationId?: string; revision?: number }[];
  }> {
    const period = await deps.repository.findPeriodById(input.payrollPeriodId);
    if (!period) throw new PayrollError("not_found", "payroll_period_not_found");
    if (period.status === "approved" || period.status === "locked") throw new PayrollError("conflict", `period_not_open_for_calculation:${period.status}`);
    const limit = Math.min(Math.max(input.limit, 1), 500);
    const ids = await deps.repository.listEligibleWorkerIds({ organizationId: period.organizationId, from: period.periodStart, to: period.periodEnd, limit: limit + 1, cursor: input.cursor });
    const hasMore = ids.length > limit;
    const batch = ids.slice(0, limit);

    const results: { workerIdentityId: string; outcome: "calculated" | "no_change" | "conflict" | "failed"; reason?: string; calculationId?: string; revision?: number }[] = [];
    const POOL = 4; // bounded concurrency — never an unbounded Promise.all over the population
    for (let i = 0; i < batch.length; i += POOL) {
      const slice = batch.slice(i, i + POOL);
      const settled = await Promise.all(slice.map(async (workerIdentityId) => {
        // The repository already re-runs a revision write that PostgreSQL cancelled as a
        // serialization failure. A conflict that still reaches here is a real race (a concurrent
        // single-worker calculation or a duplicate bulk request moved this worker on), so re-run
        // the whole calculation: it re-reads the prior revision and converges on no_change or a
        // new revision. The wait is randomised so pool peers that collided do not retry in
        // lockstep and collide again. A genuine domain failure (missing rate, unsupported
        // jurisdiction, …) is NOT retried.
        for (let attempt = 0; ; attempt += 1) {
          try {
            const prior = await deps.repository.findActiveCalculation(period.id, workerIdentityId);
            const calc = await calculate({ actorUserId: input.actorUserId, payrollPeriodId: period.id, workerIdentityId, correlationId: input.correlationId });
            const outcome = prior && prior.id === calc.id ? ("no_change" as const) : ("calculated" as const);
            return { workerIdentityId, outcome, calculationId: calc.id, revision: calc.revision };
          } catch (error) {
            const retryable = (error instanceof PayrollError && error.code === "conflict") || !(error instanceof PayrollError);
            if (retryable && attempt < BULK_WORKER_RETRIES) { await bulkRetrySleep(fullJitterBackoffMs(attempt, 10, 250)); continue; }
            if (error instanceof PayrollError) return { workerIdentityId, outcome: error.code === "conflict" ? ("conflict" as const) : ("failed" as const), reason: error.reason };
            return { workerIdentityId, outcome: "failed" as const, reason: "unexpected_error" };
          }
        }
      }));
      results.push(...settled);
    }
    const tally = (o: string) => results.filter((r) => r.outcome === o).length;
    await deps.repository.recordAudit({ entityType: "payroll_period", entityId: period.id, entityPublicReference: null, organizationId: period.organizationId, action: "payroll.bulk_calculated", priorState: null, newState: `attempted:${results.length}`, reason: `calculated:${tally("calculated")},no_change:${tally("no_change")},failed:${tally("failed")},conflicts:${tally("conflict")}`, actorUserId: input.actorUserId, correlationId: input.correlationId, now: now() });
    return { attempted: results.length, calculated: tally("calculated"), noChange: tally("no_change"), failed: tally("failed"), conflicts: tally("conflict"), nextCursor: hasMore ? (batch[batch.length - 1] ?? null) : null, results };
  }

  return { calculate, recalculate: calculate, calculatePeriodBulk, requestCorrection, verifyCalculation, transitionCalculation, transitionPeriod, resolveProvider: resolveProviderForCalc };
}

// A signed delta (corrected - original) expressed as DIRECTION + non-negative absolute minor units —
// never negative Money. credit = corrected is higher; debit = corrected is lower. Proven algebraically:
// original + governed(directional delta) = corrected.
function computeAdjustmentDelta(original: StoredPayrollCalculation, corrected: PayrollTotals): PayrollAdjustmentDelta {
  const dir = (o: number, c: number): { direction: PayrollDeltaDirection; deltaMinor: number } =>
    c >= o ? { direction: "credit", deltaMinor: c - o } : { direction: "debit", deltaMinor: o - c };
  const net = dir(original.netPayMinor, corrected.net.amountMinor);
  const gross = dir(original.grossPayMinor, corrected.gross.amountMinor);
  const ded = dir(original.totalDeductionsMinor, corrected.totalDeductions.amountMinor);
  const emp = dir(original.totalEmployerCostMinor, corrected.totalEmployerCost.amountMinor);
  return {
    netDirection: net.direction, netDeltaMinor: net.deltaMinor,
    grossDirection: gross.direction, grossDeltaMinor: gross.deltaMinor,
    deductionsDirection: ded.direction, deductionsDeltaMinor: ded.deltaMinor,
    employerCostDirection: emp.direction, employerCostDeltaMinor: emp.deltaMinor
  };
}

// Apply a governed directional delta back onto an original amount — used to PROVE reconstruction:
// applyDelta(original, direction, delta) === corrected.
export function applyPayrollDelta(originalMinor: number, direction: PayrollDeltaDirection, deltaMinor: number): number {
  return direction === "credit" ? originalMinor + deltaMinor : originalMinor - deltaMinor;
}

// ── Deterministic fingerprint ──
//
// A stable SHA-256 over the canonical immutable inputs + outputs. Detects accidental drift and
// proves a replay reproduced the same result. Excludes unstable fields (ids, timestamps, request
// ids). NOT a cryptographic financial signature.
type FingerprintArgs = Readonly<{
  periodId: string; workerIdentityId: string; jurisdiction: PayrollJurisdiction;
  providerKey: string; providerVersion: string; policyVersion: string; workerClassification: string; currency: string;
  workedTime: readonly Readonly<{ timesheetId: string; timesheetVersion: number; payableMinutes: number; contractId: string; contractVersion: string; appliedHourlyRateMinor: number; sourceEffectiveInstant: string; bonusMinor: number }>[];
  earnings: readonly Readonly<{ classification: string; amountMinor: number; sourceContractVersion: string | null }>[];
  deductions: readonly Readonly<{ category: string; code: string; amountMinor: number }>[];
  employerCosts: readonly Readonly<{ category: string; code: string; amountMinor: number }>[];
  totals: Readonly<{ grossPayMinor: number; totalDeductionsMinor: number; netPayMinor: number; totalEmployerCostMinor: number }>;
}>;

function canonicalFingerprint(args: FingerprintArgs): string {
  const canonical = {
    v: 1,
    period: args.periodId,
    worker: args.workerIdentityId,
    jurisdiction: `${args.jurisdiction.country}/${args.jurisdiction.region}`,
    provider: `${args.providerKey}@${args.providerVersion}`,
    policy: args.policyVersion,
    classification: args.workerClassification,
    currency: args.currency,
    // worked-time sorted by timesheetId for stability
    // The bonus is appended ONLY when non-zero, so every calculation without a bonus keeps exactly
    // the fingerprint it had before job bonuses existed (stored fingerprints still verify).
    workedTime: [...args.workedTime].sort((a, b) => a.timesheetId.localeCompare(b.timesheetId)).map((w) => {
      const tuple: (string | number)[] = [w.timesheetId, w.timesheetVersion, w.payableMinutes, w.contractId, w.contractVersion, w.appliedHourlyRateMinor, w.sourceEffectiveInstant];
      if (w.bonusMinor > 0) tuple.push(w.bonusMinor);
      return tuple;
    }),
    earnings: args.earnings.map((e) => [e.classification, e.amountMinor, e.sourceContractVersion]),
    deductions: args.deductions.map((d) => [d.category, d.code, d.amountMinor]),
    employerCosts: args.employerCosts.map((c) => [c.category, c.code, c.amountMinor]),
    totals: [args.totals.grossPayMinor, args.totals.totalDeductionsMinor, args.totals.netPayMinor, args.totals.totalEmployerCostMinor]
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function buildCalculationFingerprint(input: {
  period: StoredPayrollPeriod; workerIdentityId: string; jurisdiction: PayrollJurisdiction; provider: PayrollRuleProvider;
  policyVersion: string; workerClassification: string; snapshots: readonly PayrollWorkedTimeSnapshot[]; result: PayrollRuleResult; totals: PayrollTotals;
}): string {
  return canonicalFingerprint({
    periodId: input.period.id, workerIdentityId: input.workerIdentityId, jurisdiction: input.jurisdiction,
    providerKey: input.provider.key, providerVersion: input.provider.version, policyVersion: input.policyVersion,
    workerClassification: input.workerClassification, currency: input.period.currency,
    workedTime: input.snapshots.map((w) => ({ timesheetId: w.timesheetId, timesheetVersion: w.timesheetVersion, payableMinutes: w.payableMinutes, contractId: w.contractId, contractVersion: w.contractVersion, appliedHourlyRateMinor: w.appliedHourlyRateMinor, sourceEffectiveInstant: w.sourceEffectiveInstant.toISOString(), bonusMinor: w.bonusMinor ?? 0 })),
    earnings: input.result.earnings.map((e) => ({ classification: e.classification, amountMinor: e.amount.amountMinor, sourceContractVersion: e.sourceContractVersion })),
    deductions: input.result.deductions.map((d) => ({ category: d.category, code: d.code, amountMinor: d.amount.amountMinor })),
    employerCosts: input.result.employerCosts.map((c) => ({ category: c.category, code: c.code, amountMinor: c.amount.amountMinor })),
    totals: { grossPayMinor: input.totals.gross.amountMinor, totalDeductionsMinor: input.totals.totalDeductions.amountMinor, netPayMinor: input.totals.net.amountMinor, totalEmployerCostMinor: input.totals.totalEmployerCost.amountMinor }
  });
}

// Sum of the per-timesheet job bonuses, or null when there is none (keeps zero-bonus results identical).
function bonusMoney(lines: readonly Readonly<{ bonusMinor?: number }>[], currency: MoneyEngineCurrency): ContractMoney | null {
  const total = lines.reduce((sum, l) => sum + (l.bonusMinor ?? 0), 0);
  if (!Number.isSafeInteger(total) || total < 0) throw new PayrollError("invalid", "invalid_bonus_amount");
  return total > 0 ? createContractMoney({ amountMinor: total, currency }) : null;
}

function isSupportedCurrency(currency: string): currency is MoneyEngineCurrency {
  return currency === "CAD" || currency === "USD";
}

function assertResultCurrency(result: PayrollRuleResult, currency: MoneyEngineCurrency) {
  const all = [...result.earnings, ...result.deductions, ...result.employerCosts];
  if (all.some((line) => line.amount.currency !== currency)) {
    throw new PayrollError("invalid", "currency_mismatch:line");
  }
}

export function newPayrollId(): string {
  return randomUUID();
}
