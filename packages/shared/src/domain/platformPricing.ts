// Central money model for JobLop's staffing marketplace — the SINGLE source of truth for how the
// employer price (E), the platform margin, the worker rate (W), allowances, the 6-hour billing
// floor, and the card/Interac transfer-fee split are computed. Every surface (employer preview,
// admin publish, worker agreement, invoice, payroll) must derive its numbers from here so the three
// parties never disagree.
//
// Confirmed model (owner decision):
//  - Hidden markup: employer pays E, worker is paid W < E, platform keeps E - W. Neither party sees
//    the other's rate.
//  - Margin is a fixed default percentage (parts-per-million) that the admin may override per request.
//  - The margin applies to the hourly rate AND to allowances (transport / meal / lodging).
//  - Shifts have a 6-hour minimum; anything shorter is BILLED as 6 hours.
//  - The payment transfer fee (Mastercard / Interac) is split 50/50 between employer and platform.
//
// All amounts are integer minor units (e.g. cents). All margins are parts-per-million (ppm):
// 1_000_000 ppm = 100%. Rounding is half-up to the nearest minor unit, applied to the margin so the
// worker never loses a sub-cent and E = W + margin exactly.

export const MINIMUM_BILLABLE_SHIFT_HOURS = 6;

/** Default platform margin: 20% (200_000 ppm). Admin may override per request within bounds. */
export const DEFAULT_PLATFORM_MARGIN_PPM = 200_000;

/** Hard bounds so a mistaken override can never pay the worker more than the employer, or zero. */
export const MIN_PLATFORM_MARGIN_PPM = 0;
export const MAX_PLATFORM_MARGIN_PPM = 900_000; // 90% — a worker must always receive something.

const PPM = 1_000_000;

function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

/** Clamp an admin-supplied margin to the allowed range; fall back to the default when absent/invalid. */
export function resolveMarginPpm(marginPpm?: number | null): number {
  if (marginPpm === null || marginPpm === undefined || !Number.isFinite(marginPpm)) {
    return DEFAULT_PLATFORM_MARGIN_PPM;
  }
  const rounded = Math.round(marginPpm);
  if (rounded < MIN_PLATFORM_MARGIN_PPM) return MIN_PLATFORM_MARGIN_PPM;
  if (rounded > MAX_PLATFORM_MARGIN_PPM) return MAX_PLATFORM_MARGIN_PPM;
  return rounded;
}

/** The platform's cut of an employer-side amount, in minor units (margin applied, half-up). */
export function platformMarginMinor(employerMinor: number, marginPpm?: number | null): number {
  if (!Number.isFinite(employerMinor) || employerMinor <= 0) return 0;
  const margin = resolveMarginPpm(marginPpm);
  const cut = roundHalfUp((employerMinor * margin) / PPM);
  return Math.min(cut, Math.max(0, Math.trunc(employerMinor)));
}

/** The worker-facing amount = employer amount − platform margin. Never negative, never above E. */
export function workerAmountMinor(employerMinor: number, marginPpm?: number | null): number {
  if (!Number.isFinite(employerMinor) || employerMinor <= 0) return 0;
  const base = Math.trunc(employerMinor);
  return base - platformMarginMinor(base, marginPpm);
}

/** Billable hours after applying the 6-hour minimum floor. */
export function billableHours(actualHours: number): number {
  if (!Number.isFinite(actualHours) || actualHours <= 0) return MINIMUM_BILLABLE_SHIFT_HOURS;
  return Math.max(actualHours, MINIMUM_BILLABLE_SHIFT_HOURS);
}

export type ShiftPricing = Readonly<{
  marginPpm: number;
  /** What the employer pays per hour. */
  employerHourlyRateMinor: number;
  /** What the worker is paid per hour (employer rate − margin). */
  workerHourlyRateMinor: number;
  /** Platform margin per hour. */
  platformHourlyMarginMinor: number;
  billableHours: number;
  /** Totals across the billable hours. */
  employerTotalMinor: number;
  workerTotalMinor: number;
  platformMarginTotalMinor: number;
}>;

/**
 * Compute a full per-shift pricing breakdown from the employer hourly rate (E), the margin, and the
 * actual hours worked (floored to the 6-hour minimum for billing). Hourly worker rate is derived
 * once and multiplied, so per-hour and totals always reconcile (employerTotal = workerTotal + margin).
 */
export function computeShiftPricing(input: {
  employerHourlyRateMinor: number;
  actualHours: number;
  marginPpm?: number | null;
}): ShiftPricing {
  const marginPpm = resolveMarginPpm(input.marginPpm);
  const employerHourlyRateMinor = Math.max(0, Math.trunc(input.employerHourlyRateMinor));
  const workerHourlyRateMinor = workerAmountMinor(employerHourlyRateMinor, marginPpm);
  const platformHourlyMarginMinor = employerHourlyRateMinor - workerHourlyRateMinor;
  const hours = billableHours(input.actualHours);
  const employerTotalMinor = employerHourlyRateMinor * hours;
  const workerTotalMinor = workerHourlyRateMinor * hours;
  return {
    marginPpm,
    employerHourlyRateMinor,
    workerHourlyRateMinor,
    platformHourlyMarginMinor,
    billableHours: hours,
    employerTotalMinor,
    workerTotalMinor,
    platformMarginTotalMinor: employerTotalMinor - workerTotalMinor
  };
}

/** Split a payment transfer fee (Mastercard / Interac) 50/50; the odd minor unit goes to the employer. */
export function splitTransferFeeMinor(feeMinor: number): Readonly<{ employerMinor: number; platformMinor: number }> {
  const total = Number.isFinite(feeMinor) && feeMinor > 0 ? Math.trunc(feeMinor) : 0;
  const platformMinor = Math.floor(total / 2);
  return { employerMinor: total - platformMinor, platformMinor };
}

// ── Payment transfer-fee surcharge (upfront, set-rate) ───────────────────────────────────────────
// Confirmed owner model:
//  - CREDIT CARD: the processing fee is estimated at a fixed published rate and split 50/50; the
//    EMPLOYER's half is added to the invoice UPFRONT as a visible surcharge line (no later
//    reconciliation against Stripe's actual fee).
//  - INTERAC: the platform absorbs the full transfer fee — the employer is charged NOTHING extra.
// The rate below is the standard Stripe Canada domestic-card rate; admin configuration may supersede
// it later. Taxability of the surcharge is decided by the invoice engine (it is placed in the taxed
// subtotal), pending Québec tax human review before production.

/** Card processing rate: 2.9% of the charged amount (parts-per-million). */
export const CARD_TRANSFER_FEE_PERCENT_PPM = 29_000;
/** Card processing fixed component: C$0.30 per transaction, in minor units (cents). */
export const CARD_TRANSFER_FEE_FIXED_MINOR = 30;

export type PaymentMethodKind = "card" | "interac";

/**
 * Estimated card processing fee for a charged amount, at the published set rate
 * (percent · amount, half-up, plus the fixed component). Returns 0 for non-positive amounts.
 */
export function computeCardTransferFeeMinor(amountMinor: number): number {
  if (!Number.isFinite(amountMinor) || amountMinor <= 0) return 0;
  const base = Math.trunc(amountMinor);
  const percentComponent = roundHalfUp((base * CARD_TRANSFER_FEE_PERCENT_PPM) / PPM);
  return percentComponent + CARD_TRANSFER_FEE_FIXED_MINOR;
}

/**
 * The surcharge added to the employer's invoice for the chosen payment method.
 *  - "card":   the employer's 50% share of the estimated card processing fee (odd cent to employer).
 *  - "interac": 0 — the platform absorbs the full Interac fee.
 */
export function employerTransferSurchargeMinor(input: {
  amountMinor: number;
  method: PaymentMethodKind;
}): number {
  if (input.method === "interac") return 0;
  const fee = computeCardTransferFeeMinor(input.amountMinor);
  return splitTransferFeeMinor(fee).employerMinor;
}
