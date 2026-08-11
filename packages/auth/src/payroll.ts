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

import { randomUUID } from "node:crypto";
import {
  addMoney,
  createContractMoney,
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
export type PayrollWorkedTimeLine = Readonly<{
  timesheetId: string;
  timesheetVersion: number;
  timesheetStatus: string;
  payableMinutes: number;
  billableMinutes: number;
}>;

// A governed rate snapshot handed to payroll (payroll does not invent rates).
export type PayrollRateSnapshot = Readonly<{ hourlyRate: ContractMoney }>;

export type PayrollEarningDraft = Readonly<{ classification: string; description: string; quantityMinutes: number | null; rate: ContractMoney | null; amount: ContractMoney }>;
export type PayrollDeductionDraft = Readonly<{ category: PayrollDeductionCategory; code: string; description: string; amount: ContractMoney }>;
export type PayrollEmployerCostDraft = Readonly<{ category: string; code: string; description: string; amount: ContractMoney }>;

export type PayrollRuleInput = Readonly<{
  jurisdiction: PayrollJurisdiction;
  currency: MoneyEngineCurrency;
  rate: PayrollRateSnapshot;
  workedTime: readonly PayrollWorkedTimeLine[];
  workerClassification: PayrollWorkerClassification;
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

const SYNTHETIC_CONFIGS: Readonly<Record<string, SyntheticJurisdictionConfig>> = {
  "CA/QC": { overtimeThresholdMinutes: 2400, overtimeMultiplierBps: 15000, vacationPayBps: 600, federalTaxBps: 1500, provincialTaxBps: 1400, socialInsuranceBps: 600, employerContributionBps: 1400 },
  "CA/ON": { overtimeThresholdMinutes: 2640, overtimeMultiplierBps: 15000, vacationPayBps: 400, federalTaxBps: 1500, provincialTaxBps: 900, socialInsuranceBps: 600, employerContributionBps: 1000 }
};

export function createSyntheticPayrollRuleProvider(): PayrollRuleProvider {
  return {
    key: "synthetic-fixture",
    version: "synthetic-2026.08",
    supports: (j) => payrollJurisdictionKey(j) in SYNTHETIC_CONFIGS,
    evaluate: (input) => {
      const cfg = SYNTHETIC_CONFIGS[payrollJurisdictionKey(input.jurisdiction)];
      if (!cfg) {
        throw new PayrollError("invalid", `unsupported_jurisdiction:${payrollJurisdictionKey(input.jurisdiction)}`);
      }
      const currency = input.currency;
      if (input.rate.hourlyRate.currency !== currency) {
        throw new PayrollError("invalid", "currency_mismatch:rate");
      }
      const totalMinutes = input.workedTime.reduce((sum, w) => sum + w.payableMinutes, 0);
      const regularMinutes = Math.min(totalMinutes, cfg.overtimeThresholdMinutes);
      const overtimeMinutes = Math.max(0, totalMinutes - cfg.overtimeThresholdMinutes);

      const regularAmount = proRateMinutesAtHourlyRate(input.rate.hourlyRate, regularMinutes);
      const overtimeRate = createContractMoney({ amountMinor: Math.floor((input.rate.hourlyRate.amountMinor * cfg.overtimeMultiplierBps) / 10000), currency });
      const overtimeAmount = proRateMinutesAtHourlyRate(overtimeRate, overtimeMinutes);

      const workedEarnings = addMoney(regularAmount, overtimeAmount);
      const vacationAmount = percentOfBps(workedEarnings, cfg.vacationPayBps);

      const earnings: PayrollEarningDraft[] = [
        { classification: "regular", description: "Regular worked time (synthetic)", quantityMinutes: regularMinutes, rate: input.rate.hourlyRate, amount: regularAmount }
      ];
      if (overtimeMinutes > 0) {
        earnings.push({ classification: "overtime", description: "Overtime worked time (synthetic)", quantityMinutes: overtimeMinutes, rate: overtimeRate, amount: overtimeAmount });
      }
      earnings.push({ classification: "vacation_pay", description: "Vacation pay accrual (synthetic)", quantityMinutes: null, rate: null, amount: vacationAmount });

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

export type StoredPayrollCalculation = Readonly<{
  id: string; payrollPeriodId: string; organizationId: string; workerIdentityId: string; revision: number;
  status: PayrollCalculationStatus; jurisdictionCountry: string; jurisdictionRegion: string;
  ruleProviderKey: string; ruleProviderVersion: string; calculationPolicyVersion: string; currency: string;
  grossPayMinor: number; totalDeductionsMinor: number; netPayMinor: number; totalEmployerCostMinor: number;
  synthetic: boolean; calculatedAt: Date; supersededById: string | null; version: number;
}>;

export type CreatePayrollCalculationInput = Readonly<{
  payrollPeriodId: string; organizationId: string; workerIdentityId: string; revision: number;
  jurisdictionCountry: string; jurisdictionRegion: string; ruleProviderKey: string; ruleProviderVersion: string;
  calculationPolicyVersion: string; currency: string;
  grossPayMinor: number; totalDeductionsMinor: number; netPayMinor: number; totalEmployerCostMinor: number;
  calculatedAt: Date; createdByUserId: string;
  workedTimeRefs: readonly PayrollWorkedTimeLine[];
  earnings: readonly PayrollEarningDraft[];
  deductions: readonly PayrollDeductionDraft[];
  employerCosts: readonly PayrollEmployerCostDraft[];
  supersedePriorId: string | null; expectedPriorVersion: number | null;
}>;

export type PayrollWorkedTimeRateResolver = Readonly<{
  resolve(input: { organizationId: string; workerIdentityId: string; jurisdiction: PayrollJurisdiction }): Promise<{ rate: PayrollRateSnapshot; workerClassification: PayrollWorkerClassification }>;
}>;

export interface PayrollRepository {
  findPeriodById(id: string): Promise<StoredPayrollPeriod | null>;
  listApprovedWorkedTime(input: { organizationId: string; workerIdentityId: string; from: Date; to: Date }): Promise<readonly PayrollWorkedTimeLine[]>;
  findActiveCalculation(payrollPeriodId: string, workerIdentityId: string): Promise<StoredPayrollCalculation | null>;
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
  rateResolver: PayrollWorkedTimeRateResolver;
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

export function createPayrollService(deps: PayrollDeps) {
  const now = deps.now ?? (() => new Date());
  const policyVersion = deps.calculationPolicyVersion ?? "payroll-foundation-v1";

  function resolveProvider(jurisdiction: PayrollJurisdiction): PayrollRuleProvider {
    const provider = deps.ruleProviders.find((p) => p.supports(jurisdiction));
    if (!provider) throw new PayrollError("invalid", `unsupported_jurisdiction:${payrollJurisdictionKey(jurisdiction)}`);
    return provider;
  }

  // Calculate (or recalculate) a worker's payroll for a period. Always creates a NEW revision and
  // supersedes the prior active one — an approved calculation is never overwritten.
  async function calculate(input: { actorUserId: string; payrollPeriodId: string; workerIdentityId: string; correlationId: string }): Promise<StoredPayrollCalculation> {
    const period = await deps.repository.findPeriodById(input.payrollPeriodId);
    if (!period) throw new PayrollError("not_found", "payroll_period_not_found");
    if (period.status === "approved" || period.status === "locked") {
      throw new PayrollError("conflict", `period_not_open_for_calculation:${period.status}`);
    }

    const jurisdiction: PayrollJurisdiction = { country: period.jurisdictionCountry, region: period.jurisdictionRegion };
    const provider = resolveProvider(jurisdiction);
    if (!isSupportedCurrency(period.currency)) throw new PayrollError("invalid", `unsupported_currency:${period.currency}`);
    const currency = period.currency as MoneyEngineCurrency;

    const workedTime = await deps.repository.listApprovedWorkedTime({ organizationId: period.organizationId, workerIdentityId: input.workerIdentityId, from: period.periodStart, to: period.periodEnd });
    if (workedTime.length === 0) throw new PayrollError("invalid", "no_approved_worked_time");

    const { rate, workerClassification } = await deps.rateResolver.resolve({ organizationId: period.organizationId, workerIdentityId: input.workerIdentityId, jurisdiction });
    if (rate.hourlyRate.currency !== currency) throw new PayrollError("invalid", "currency_mismatch:rate_vs_period");

    const result = provider.evaluate({ jurisdiction, currency, rate, workedTime, workerClassification });
    assertResultCurrency(result, currency);
    const totals = computePayrollTotals(result, currency);

    const prior = await deps.repository.findActiveCalculation(period.id, input.workerIdentityId);
    const revision = (prior?.revision ?? 0) + 1;
    const at = now();

    const created = await deps.repository.createCalculationAtomically({
      payrollPeriodId: period.id, organizationId: period.organizationId, workerIdentityId: input.workerIdentityId, revision,
      jurisdictionCountry: period.jurisdictionCountry, jurisdictionRegion: period.jurisdictionRegion,
      ruleProviderKey: provider.key, ruleProviderVersion: provider.version, calculationPolicyVersion: policyVersion, currency,
      grossPayMinor: totals.gross.amountMinor, totalDeductionsMinor: totals.totalDeductions.amountMinor, netPayMinor: totals.net.amountMinor, totalEmployerCostMinor: totals.totalEmployerCost.amountMinor,
      calculatedAt: at, createdByUserId: input.actorUserId,
      workedTimeRefs: workedTime, earnings: result.earnings, deductions: result.deductions, employerCosts: result.employerCosts,
      supersedePriorId: prior?.id ?? null, expectedPriorVersion: prior?.version ?? null
    });
    if (!created) throw new PayrollError("conflict", "calculation_superseded_concurrently");

    await deps.repository.recordAudit({ entityType: "payroll_calculation", entityId: created.id, entityPublicReference: period.id, organizationId: period.organizationId, action: prior ? "payroll.recalculated" : "payroll.calculated", priorState: prior ? `revision:${prior.revision}` : null, newState: `revision:${revision}`, reason: `synthetic:${provider.key}@${provider.version}`, actorUserId: input.actorUserId, correlationId: input.correlationId, now: at });
    return created;
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

  return { calculate, recalculate: calculate, transitionCalculation, transitionPeriod, resolveProvider };
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
