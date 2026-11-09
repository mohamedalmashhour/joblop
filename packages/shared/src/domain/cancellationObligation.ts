// Late-cancellation obligation calculator.
//
// Owner policy: when a CLIENT cancels within 24h of the shift start, the client is
// billed 6 hours for each confirmed worker. Owner decision 2026-11-09: there is NO automatic
// cancellation pay to workers — Joblop keeps the charge and decides case by case with each worker,
// so the worker-compensation side is always 0.
// It moves no money and marks nothing paid — it produces truthful amounts for later
// governed Finance handling. See docs/design/cancellation-obligation.md.

import { createContractMoney, type Currency, type MoneyAmount } from "./moneyEngine";

// The distinct cancellation causes. The employer late-cancellation obligation
// applies ONLY to specifically-approved employer-caused cases.
export type CancellationCause =
  | "EMPLOYER_CANCELLED"
  | "WORKER_CANCELLED"
  | "WORKER_NO_SHOW"
  | "PLATFORM_UNABLE_TO_FILL"
  | "PLATFORM_CANCELLED"
  | "MUTUALLY_CANCELLED";

export const CANCELLATION_CAUSES: readonly CancellationCause[] = [
  "EMPLOYER_CANCELLED",
  "WORKER_CANCELLED",
  "WORKER_NO_SHOW",
  "PLATFORM_UNABLE_TO_FILL",
  "PLATFORM_CANCELLED",
  "MUTUALLY_CANCELLED"
];

// Only these causes can carry an employer late-cancellation obligation.
// MUTUALLY_CANCELLED carries none (owner-confirmed) unless a future approved rule changes it.
export const EMPLOYER_OBLIGATION_CAUSES: readonly CancellationCause[] = ["EMPLOYER_CANCELLED"];

export const LATE_CANCELLATION_CUTOFF_HOURS = 24; // owner policy: within 24h of start is "late"
export const LATE_CANCELLATION_CHARGE_HOURS = 6; // client is billed 6 hours
// Owner decision 2026-11-09: no automatic worker pay on a late employer cancellation (was 3 h).
export const LATE_CANCELLATION_WORKER_HOURS = 0;

export function isCancellationCause(value: unknown): value is CancellationCause {
  return typeof value === "string" && (CANCELLATION_CAUSES as readonly string[]).includes(value);
}

export type LateCancellationObligation = Readonly<{
  applies: boolean;
  // Why the obligation does/does not apply — an auditable, human-readable reason.
  reason:
    | "employer_late_cancellation"
    | "outside_cutoff_window"
    | "no_confirmed_workers"
    | "cause_not_employer_obligated";
  cause: CancellationCause;
  cutoffHours: number;
  chargeHours: number;
  workerCompensationHours: number;
  hoursBeforeStart: number;
  affectedConfirmedWorkers: number;
  governedHourlyRate: MoneyAmount;
  amount: MoneyAmount; // client bill: 6h × employer rate × workers. 0 when !applies.
  // Worker compensation: 3h × worker rate × workers ("admin pays 3h to workers"). 0 when !applies
  // or no worker rate was supplied. NEVER deducted from the worker — this is a payment TO them.
  workerCompensation: MoneyAmount;
}>;

// Whole/fractional hours between now and the shift start (may be negative if the
// shift has already started).
export function hoursBeforeShiftStart(shiftStartIso: string, nowIso: string): number {
  const start = Date.parse(shiftStartIso);
  const nowMs = Date.parse(nowIso);
  if (!Number.isFinite(start) || !Number.isFinite(nowMs)) {
    throw new Error("A valid shift start and current time are required.");
  }
  return (start - nowMs) / (1000 * 60 * 60);
}

// Authoritative, deterministic obligation calculation. All inputs are server-side:
// the governed rate comes from the applicable signed contract (never the browser),
// affectedConfirmedWorkers is determined server-side, and nowIso is the server clock.
export function computeLateCancellationObligation(input: {
  cause: CancellationCause;
  shiftStartIso: string;
  nowIso: string;
  governedRateMinor: number;
  currency: Currency;
  affectedConfirmedWorkers: number;
  // The worker PAY rate, for the 3h compensation. Optional for back-compat: when omitted,
  // workerCompensation is 0 (callers that only need the client obligation pass nothing).
  workerRateMinor?: number;
}): LateCancellationObligation {
  if (!Number.isInteger(input.governedRateMinor) || input.governedRateMinor < 0) {
    throw new Error("The governed hourly rate must be a non-negative integer (minor units).");
  }
  if (!Number.isInteger(input.affectedConfirmedWorkers) || input.affectedConfirmedWorkers < 0) {
    throw new Error("Affected confirmed workers must be a non-negative integer.");
  }
  const workerRateMinor = input.workerRateMinor ?? 0;
  if (!Number.isInteger(workerRateMinor) || workerRateMinor < 0) {
    throw new Error("The worker rate must be a non-negative integer (minor units).");
  }

  const governedHourlyRate = createContractMoney({
    amountMinor: input.governedRateMinor,
    currency: input.currency
  });
  const zero = createContractMoney({ amountMinor: 0, currency: input.currency });
  const hoursBeforeStart = hoursBeforeShiftStart(input.shiftStartIso, input.nowIso);

  const base = {
    cause: input.cause,
    cutoffHours: LATE_CANCELLATION_CUTOFF_HOURS,
    chargeHours: LATE_CANCELLATION_CHARGE_HOURS,
    workerCompensationHours: LATE_CANCELLATION_WORKER_HOURS,
    hoursBeforeStart,
    affectedConfirmedWorkers: input.affectedConfirmedWorkers,
    governedHourlyRate
  };

  // Cause gate: only approved employer-caused cancellations can carry an obligation.
  if (!(EMPLOYER_OBLIGATION_CAUSES as readonly string[]).includes(input.cause)) {
    return { ...base, applies: false, reason: "cause_not_employer_obligated", amount: zero, workerCompensation: zero };
  }
  // Cutoff gate: >= 24h before start carries no obligation.
  if (hoursBeforeStart >= LATE_CANCELLATION_CUTOFF_HOURS) {
    return { ...base, applies: false, reason: "outside_cutoff_window", amount: zero, workerCompensation: zero };
  }
  // Only confirmed workers create an obligation.
  if (input.affectedConfirmedWorkers <= 0) {
    return { ...base, applies: false, reason: "no_confirmed_workers", amount: zero, workerCompensation: zero };
  }

  const amountMinor =
    LATE_CANCELLATION_CHARGE_HOURS * input.governedRateMinor * input.affectedConfirmedWorkers;
  const workerCompensationMinor =
    LATE_CANCELLATION_WORKER_HOURS * workerRateMinor * input.affectedConfirmedWorkers;
  return {
    ...base,
    applies: true,
    reason: "employer_late_cancellation",
    amount: createContractMoney({ amountMinor, currency: input.currency }),
    workerCompensation: createContractMoney({ amountMinor: workerCompensationMinor, currency: input.currency })
  };
}

// ── Billing a late cancellation (one charge per confirmed worker) ──────────────────────────────

/** exception_summary on the locked timesheet that carries a late-cancellation charge to the invoice. */
export const LATE_CANCELLATION_TIMESHEET_MARKER = "late_cancellation";

export function isLateCancellationTimesheet(exceptionSummary: string | null | undefined): boolean {
  return exceptionSummary === LATE_CANCELLATION_TIMESHEET_MARKER;
}

/** Who caused the cancellation. Only an employer's own cancellation is charged. */
export type LateCancellationInitiator = "employer" | "staff" | "platform" | "worker";

export type LateCancellationChargePlan = Readonly<{
  applies: boolean;
  reason:
    | "employer_late_cancellation"
    | "not_employer_cancellation"
    | "outside_cutoff_window"
    | "long_term_job"
    | "no_bill_rate"
    | "no_confirmed_workers";
  minutesBeforeStart: number;
  chargeHours: number;
  employerHourlyRateMinor: number;
  /** Charged workers only (confirmed at cancel time). Empty when the plan does not apply. */
  charges: readonly Readonly<{ assignmentId: string; workerIdentityId: string; subtotalMinor: number }>[];
  /** Pre-tax total for every charged worker. GST and QST are added by the invoice engine. */
  subtotalMinor: number;
}>;

/**
 * Pure decision for a late employer cancellation. Canceled 24 hours or more before the start: free.
 * Less than 24 hours: 6 hours x the employer's bill rate for each worker confirmed at that moment.
 * Unfilled places, long-term jobs and cancellations not made by the employer are never charged.
 */
export function planLateCancellationCharge(input: {
  initiator: LateCancellationInitiator;
  shiftStartAt: Date;
  cancelledAt: Date;
  jobLength: string | null | undefined;
  employerHourlyRateMinor: number | null;
  confirmedAssignments: readonly Readonly<{ assignmentId: string; workerIdentityId: string }>[];
}): LateCancellationChargePlan {
  const minutesBeforeStart = Math.floor((input.shiftStartAt.getTime() - input.cancelledAt.getTime()) / 60_000);
  const rate = input.employerHourlyRateMinor;
  const none = (reason: LateCancellationChargePlan["reason"]): LateCancellationChargePlan => ({
    applies: false,
    reason,
    minutesBeforeStart,
    chargeHours: LATE_CANCELLATION_CHARGE_HOURS,
    employerHourlyRateMinor: rate ?? 0,
    charges: [],
    subtotalMinor: 0
  });
  if (input.initiator !== "employer") return none("not_employer_cancellation");
  if (input.jobLength === "long_term") return none("long_term_job");
  // Exactly 24 h (or more) before the start is free; any time later than that is charged.
  const msBefore = input.shiftStartAt.getTime() - input.cancelledAt.getTime();
  if (msBefore >= LATE_CANCELLATION_CUTOFF_HOURS * 60 * 60 * 1000) return none("outside_cutoff_window");
  if (rate === null || !Number.isInteger(rate) || rate <= 0) return none("no_bill_rate");
  const unique = new Map(input.confirmedAssignments.map((a) => [a.assignmentId, a]));
  if (unique.size === 0) return none("no_confirmed_workers");
  const perWorker = LATE_CANCELLATION_CHARGE_HOURS * rate;
  const charges = [...unique.values()].map((a) => ({
    assignmentId: a.assignmentId,
    workerIdentityId: a.workerIdentityId,
    subtotalMinor: perWorker
  }));
  return {
    applies: true,
    reason: "employer_late_cancellation",
    minutesBeforeStart,
    chargeHours: LATE_CANCELLATION_CHARGE_HOURS,
    employerHourlyRateMinor: rate,
    charges,
    subtotalMinor: perWorker * charges.length
  };
}
