// Employer late-cancellation COMMERCIAL obligation calculator.
//
// This is an employer <-> JobLop commercial obligation ONLY. It is NEVER a
// worker-facing fee, deduction, clawback, penalty, or payment. It moves no money
// and marks nothing paid — it computes a truthful obligation amount for later
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

export const LATE_CANCELLATION_CUTOFF_HOURS = 48;
export const LATE_CANCELLATION_CHARGE_HOURS = 6;

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
  hoursBeforeStart: number;
  affectedConfirmedWorkers: number;
  governedHourlyRate: MoneyAmount;
  amount: MoneyAmount; // 0 when !applies
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
}): LateCancellationObligation {
  if (!Number.isInteger(input.governedRateMinor) || input.governedRateMinor < 0) {
    throw new Error("The governed hourly rate must be a non-negative integer (minor units).");
  }
  if (!Number.isInteger(input.affectedConfirmedWorkers) || input.affectedConfirmedWorkers < 0) {
    throw new Error("Affected confirmed workers must be a non-negative integer.");
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
    hoursBeforeStart,
    affectedConfirmedWorkers: input.affectedConfirmedWorkers,
    governedHourlyRate
  };

  // Cause gate: only approved employer-caused cancellations can carry an obligation.
  if (!(EMPLOYER_OBLIGATION_CAUSES as readonly string[]).includes(input.cause)) {
    return { ...base, applies: false, reason: "cause_not_employer_obligated", amount: zero };
  }
  // Cutoff gate: >= 48h before start carries no obligation.
  if (hoursBeforeStart >= LATE_CANCELLATION_CUTOFF_HOURS) {
    return { ...base, applies: false, reason: "outside_cutoff_window", amount: zero };
  }
  // Only confirmed workers create an obligation.
  if (input.affectedConfirmedWorkers <= 0) {
    return { ...base, applies: false, reason: "no_confirmed_workers", amount: zero };
  }

  const amountMinor =
    LATE_CANCELLATION_CHARGE_HOURS * input.governedRateMinor * input.affectedConfirmedWorkers;
  return {
    ...base,
    applies: true,
    reason: "employer_late_cancellation",
    amount: createContractMoney({ amountMinor, currency: input.currency })
  };
}
