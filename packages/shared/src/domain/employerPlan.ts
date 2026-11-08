// Employer fixed plans — an optional monthly plan an employer organization can take to lower its
// hourly price. Plans are split by JOB LENGTH (the "track"), which the employer picks when posting:
//  - short_term (shifts, a few hours up to 4 weeks): pay_per_shift (free, default), shift_pro,
//    shift_business.
//  - long_term (contract over 4 weeks, usually the same worker): pay_per_contract (free, default),
//    contract_plus.
// An organization can hold one plan per track at the same time. The plan applied to a job is the
// organization's active plan for that job's track.
//
// Money rule (owner decision): the WORKER's hourly pay never changes because of a plan. The plan
// discount comes only out of the platform's share (E − W). The platform always keeps at least
// EMPLOYER_PLAN_MIN_PLATFORM_KEEP_PPM of the contract rate; when the margin is at or below that
// floor the discount is 0. Allowances are unaffected. Paid short-term plans also halve the
// urgent/immediate surcharge, which the platform keeps, so halving it never touches the worker.
//
// Job-length rules (only when the API flag EMPLOYER_PLANS_ENABLED is on): short_term keeps today's
// rules (20% default share, 6-hour minimum, urgent surcharge). long_term defaults the share to 15%
// unless staff set one, bills actual hours (no 6-hour minimum) and has no urgent surcharge.
//
// Everything here is pure and deterministic. All amounts are integer minor units (cents) and all
// rates are parts-per-million (1_000_000 ppm = 100%). Rounding is half-up to whole minor units.

import { DEFAULT_PLATFORM_MARGIN_PPM, resolveMarginPpm, workerAmountMinor } from "./platformPricing";
import type { EngagementType } from "./engagementPremium";

// ── Job length (track) ──────────────────────────────────────────────────────────────────────────

export const JOB_LENGTHS = ["short_term", "long_term"] as const;
export type JobLength = (typeof JOB_LENGTHS)[number];
export const DEFAULT_JOB_LENGTH: JobLength = "short_term";

export function isJobLength(value: unknown): value is JobLength {
  return value === "short_term" || value === "long_term";
}

/** Unknown / missing → short_term, so every existing job keeps today's behaviour. */
export function resolveJobLength(value: unknown): JobLength {
  return isJobLength(value) ? value : DEFAULT_JOB_LENGTH;
}

/** Maps onto the job-grading engagement naming: short_term ≈ "shift", long_term ≈ "contract". */
export function jobLengthToEngagementType(length: JobLength): EngagementType {
  return length === "long_term" ? "contract" : "shift";
}

/** Default platform share for long-term contracts: 15% (staff may still set a share at approval). */
export const LONG_TERM_DEFAULT_PLATFORM_MARGIN_PPM = 150_000;

/** Default platform share for a job length: short_term 20% (today), long_term 15%. */
export function defaultMarginPpmForJobLength(length: JobLength): number {
  return length === "long_term" ? LONG_TERM_DEFAULT_PLATFORM_MARGIN_PPM : DEFAULT_PLATFORM_MARGIN_PPM;
}

/** Whether the 6-hour minimum billing applies: yes for short_term, no for long_term. */
export function jobLengthAppliesMinimumBilling(length: JobLength): boolean {
  return length !== "long_term";
}

/** Whether the urgent/immediate surcharge applies: yes for short_term, no for long_term. */
export function jobLengthAppliesUrgentSurcharge(length: JobLength): boolean {
  return length !== "long_term";
}

// ── Plans ───────────────────────────────────────────────────────────────────────────────────────

export const EMPLOYER_PLAN_CODES = [
  "pay_per_shift",
  "shift_pro",
  "shift_business",
  "pay_per_contract",
  "contract_plus"
] as const;
export type EmployerPlanCode = (typeof EMPLOYER_PLAN_CODES)[number];
export const PAID_EMPLOYER_PLAN_CODES = ["shift_pro", "shift_business", "contract_plus"] as const;
export type PaidEmployerPlanCode = (typeof PAID_EMPLOYER_PLAN_CODES)[number];

/** Free trial length, once per organization per track, no card needed. */
export const EMPLOYER_PLAN_TRIAL_DAYS = 14;

/** The platform always keeps at least 5% of the contract rate, whatever the plan. */
export const EMPLOYER_PLAN_MIN_PLATFORM_KEEP_PPM = 50_000;

const PPM = 1_000_000;

export type EmployerPlanDefinition = Readonly<{
  code: EmployerPlanCode;
  track: JobLength;
  /** Monthly price before taxes, minor units. 0 for the free default plan of a track. */
  monthlyPriceMinor: number;
  /** Currency of the monthly price. Mirrors Worker Pro (CAD) until a country profile overrides it. */
  currency: string;
  /** Discount off the contract hourly rate, ppm (before the platform-keep clamp). */
  employerDiscountPpm: number;
  /** Multiplier applied to the urgent/immediate surcharge, ppm (1_000_000 = unchanged). */
  urgentSurchargeFactorPpm: number;
}>;

export const EMPLOYER_PLAN_CATALOG: Readonly<Record<EmployerPlanCode, EmployerPlanDefinition>> = Object.freeze({
  pay_per_shift: Object.freeze({
    code: "pay_per_shift",
    track: "short_term",
    monthlyPriceMinor: 0,
    currency: "CAD",
    employerDiscountPpm: 0,
    urgentSurchargeFactorPpm: PPM
  }),
  shift_pro: Object.freeze({
    code: "shift_pro",
    track: "short_term",
    monthlyPriceMinor: 4_900,
    currency: "CAD",
    employerDiscountPpm: 50_000,
    urgentSurchargeFactorPpm: 500_000
  }),
  shift_business: Object.freeze({
    code: "shift_business",
    track: "short_term",
    monthlyPriceMinor: 14_900,
    currency: "CAD",
    employerDiscountPpm: 80_000,
    urgentSurchargeFactorPpm: 500_000
  }),
  pay_per_contract: Object.freeze({
    code: "pay_per_contract",
    track: "long_term",
    monthlyPriceMinor: 0,
    currency: "CAD",
    employerDiscountPpm: 0,
    urgentSurchargeFactorPpm: PPM
  }),
  contract_plus: Object.freeze({
    code: "contract_plus",
    track: "long_term",
    monthlyPriceMinor: 9_900,
    currency: "CAD",
    employerDiscountPpm: 50_000,
    // Long-term jobs carry no urgent surcharge at all, so there is nothing to halve.
    urgentSurchargeFactorPpm: PPM
  })
});

/** The free plan every organization is on for a track until it takes a paid plan. */
export function defaultPlanForTrack(track: JobLength): EmployerPlanCode {
  return track === "long_term" ? "pay_per_contract" : "pay_per_shift";
}

/** Plans offered for a track, free plan first. */
export function plansForTrack(track: JobLength): readonly EmployerPlanDefinition[] {
  return EMPLOYER_PLAN_CODES.map((code) => EMPLOYER_PLAN_CATALOG[code]).filter((plan) => plan.track === track);
}

export function employerPlanTrack(plan: EmployerPlanCode): JobLength {
  return EMPLOYER_PLAN_CATALOG[plan].track;
}

export function isEmployerPlanCode(value: unknown): value is EmployerPlanCode {
  return typeof value === "string" && (EMPLOYER_PLAN_CODES as readonly string[]).includes(value);
}

export function isPaidEmployerPlanCode(value: unknown): value is PaidEmployerPlanCode {
  return typeof value === "string" && (PAID_EMPLOYER_PLAN_CODES as readonly string[]).includes(value);
}

function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

function planOrDefault(plan: string | null | undefined): EmployerPlanDefinition {
  return isEmployerPlanCode(plan) ? EMPLOYER_PLAN_CATALOG[plan] : EMPLOYER_PLAN_CATALOG.pay_per_shift;
}

/**
 * The discount (ppm of the contract rate) a plan gives at this margin, clamped so the platform keeps
 * at least 5%: never more than (margin − 5%), and 0 when the margin is 5% or less. Unknown plans → 0.
 */
export function resolveEmployerPlanDiscountPpm(plan: string | null | undefined, marginPpm?: number | null): number {
  const base = planOrDefault(plan).employerDiscountPpm;
  if (base <= 0) return 0;
  const cap = resolveMarginPpm(marginPpm) - EMPLOYER_PLAN_MIN_PLATFORM_KEEP_PPM;
  if (cap <= 0) return 0;
  return Math.min(base, cap);
}

export type EmployerPlanHourlyPricing = Readonly<{
  plan: EmployerPlanCode;
  marginPpm: number;
  discountPpm: number;
  /** Discount per hour, minor units (what the employer saves; comes out of the platform share). */
  discountMinor: number;
  /** What the employer pays per hour after the plan discount. */
  employerHourlyRateMinor: number;
  /** What the worker is paid per hour — identical to the no-plan worker rate. */
  workerHourlyRateMinor: number;
  /** Platform share per hour after the discount (= employer − worker). */
  platformHourlyMarginMinor: number;
}>;

/**
 * Apply a plan to the contract hourly rate (E). The worker rate is computed from the UNDISCOUNTED E
 * exactly as today, so it is unchanged by any plan; the discount is subtracted from the employer
 * rate and therefore only from the platform share. The discount in minor units is also bounded so
 * the platform share never falls below 5% of E (rounded half-up) and never goes negative.
 * pay_per_shift is the identity.
 */
export function applyEmployerPlan(input: {
  employerHourlyRateMinor: number;
  marginPpm?: number | null;
  plan: string | null | undefined;
}): EmployerPlanHourlyPricing {
  const definition = planOrDefault(input.plan);
  const marginPpm = resolveMarginPpm(input.marginPpm);
  const baseEmployer = Number.isFinite(input.employerHourlyRateMinor)
    ? Math.max(0, Math.trunc(input.employerHourlyRateMinor))
    : 0;
  const workerHourlyRateMinor = workerAmountMinor(baseEmployer, marginPpm);
  const basePlatform = baseEmployer - workerHourlyRateMinor;
  const discountPpm = resolveEmployerPlanDiscountPpm(definition.code, marginPpm);
  const minimumKeepMinor = roundHalfUp((baseEmployer * EMPLOYER_PLAN_MIN_PLATFORM_KEEP_PPM) / PPM);
  const rawDiscount = discountPpm > 0 ? roundHalfUp((baseEmployer * discountPpm) / PPM) : 0;
  const discountMinor = Math.max(0, Math.min(rawDiscount, basePlatform - minimumKeepMinor));
  return {
    plan: definition.code,
    marginPpm,
    discountPpm: discountMinor > 0 ? discountPpm : 0,
    discountMinor,
    employerHourlyRateMinor: baseEmployer - discountMinor,
    workerHourlyRateMinor,
    platformHourlyMarginMinor: basePlatform - discountMinor
  };
}

/** Urgent/immediate surcharge multiplier for a plan, ppm. Paid plans halve it; unknown → unchanged. */
export function planUrgentSurchargeFactorPpm(plan: string | null | undefined): number {
  return planOrDefault(plan).urgentSurchargeFactorPpm;
}

/** Apply the plan's urgent-surcharge factor to a per-hour surcharge (half-up to whole minor units). */
export function applyPlanToUrgentSurchargeMinor(surchargeMinor: number, plan: string | null | undefined): number {
  const base = Number.isFinite(surchargeMinor) ? Math.max(0, Math.trunc(surchargeMinor)) : 0;
  const factor = planUrgentSurchargeFactorPpm(plan);
  if (factor >= PPM) return base;
  return roundHalfUp((base * factor) / PPM);
}

/** What an employer saves in a month of `hoursPerMonth` hours at this contract rate (minor units). */
export function employerPlanMonthlySavingMinor(input: {
  plan: string | null | undefined;
  employerHourlyRateMinor: number;
  hoursPerMonth: number;
  marginPpm?: number | null;
}): number {
  const hours = Number.isFinite(input.hoursPerMonth) && input.hoursPerMonth > 0 ? input.hoursPerMonth : 0;
  const { discountMinor } = applyEmployerPlan({
    employerHourlyRateMinor: input.employerHourlyRateMinor,
    marginPpm: input.marginPpm ?? DEFAULT_PLATFORM_MARGIN_PPM,
    plan: input.plan
  });
  return roundHalfUp(discountMinor * hours);
}

/**
 * Hours a month after which the plan pays for itself: monthly price ÷ hourly saving, rounded up.
 * Returns 0 for a free plan and null when the plan saves nothing at this rate (never pays back).
 */
export function planBreakEvenHours(
  plan: string | null | undefined,
  employerHourlyRateMinor: number,
  marginPpm?: number | null
): number | null {
  const definition = planOrDefault(plan);
  if (definition.monthlyPriceMinor <= 0) return 0;
  const { discountMinor } = applyEmployerPlan({
    employerHourlyRateMinor,
    marginPpm: marginPpm ?? DEFAULT_PLATFORM_MARGIN_PPM,
    plan: definition.code
  });
  if (discountMinor <= 0) return null;
  return Math.ceil(definition.monthlyPriceMinor / discountMinor);
}
