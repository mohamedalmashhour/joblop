// Job bonus — a bonus that helps fill an approved job that is still not filled.
//
// Pure, deterministic rules (no outside AI, no I/O):
//   - suggestJobBonus: the system suggestion (about 10% of the worker hourly wage, 15% when the shift
//     starts within 12 hours, rounded UP to the nearest 25 cents, at least $1/h).
//   - validateJobBonusAmount: allowed amounts per kind (integer cents).
//   - platform cap: a platform-funded bonus may not exceed the platform's share (margin per hour; for a
//     fixed bonus, margin x scheduled shift hours) unless staff record an urgent override.
//   - jobBonusWorkerPayMinor: what the worker earns for one timesheet (actual hours for hourly).
//   - jobBonusInvoiceMinor: what the employer is billed for one timesheet (billed hours for hourly,
//     i.e. with the 6-hour minimum, the same hours as the labour line).

import { billableHours } from "./platformPricing";

export const JOB_BONUS_KINDS = ["hourly", "transport", "one_time"] as const;
export type JobBonusKind = (typeof JOB_BONUS_KINDS)[number];

export const JOB_BONUS_FUNDING = ["employer", "platform"] as const;
export type JobBonusFunding = (typeof JOB_BONUS_FUNDING)[number];

export const JOB_BONUS_STATUSES = [
  "offered_to_employer",
  "employer_accepted",
  "employer_declined",
  "approved",
  "cancelled"
] as const;
export type JobBonusStatus = (typeof JOB_BONUS_STATUSES)[number];

/** A bonus in one of these states is paid to workers (at most one per job). */
export const ACTIVE_JOB_BONUS_STATUSES = ["employer_accepted", "approved"] as const satisfies readonly JobBonusStatus[];

export function isActiveJobBonusStatus(status: string): boolean {
  return (ACTIVE_JOB_BONUS_STATUSES as readonly string[]).includes(status);
}

export function isJobBonusKind(value: unknown): value is JobBonusKind {
  return typeof value === "string" && (JOB_BONUS_KINDS as readonly string[]).includes(value);
}

export function isJobBonusFunding(value: unknown): value is JobBonusFunding {
  return typeof value === "string" && (JOB_BONUS_FUNDING as readonly string[]).includes(value);
}

/** Allowed amount range (inclusive, integer cents) for each kind. */
export const JOB_BONUS_AMOUNT_LIMITS: Readonly<Record<JobBonusKind, Readonly<{ min: number; max: number }>>> = {
  hourly: { min: 25, max: 50_000 },
  transport: { min: 100, max: 200_000 },
  one_time: { min: 100, max: 200_000 }
};

export function validateJobBonusAmount(kind: JobBonusKind, amountMinor: unknown): "ok" | "invalid_amount" {
  const limits = JOB_BONUS_AMOUNT_LIMITS[kind];
  if (typeof amountMinor !== "number" || !Number.isSafeInteger(amountMinor)) return "invalid_amount";
  return amountMinor >= limits.min && amountMinor <= limits.max ? "ok" : "invalid_amount";
}

/** Suggestion rule constants (basis points of the worker hourly wage). */
export const JOB_BONUS_SUGGESTION_BPS = 1_000; // 10%
export const JOB_BONUS_URGENT_SUGGESTION_BPS = 1_500; // 15% when the shift starts within 12 hours
export const JOB_BONUS_URGENT_WINDOW_HOURS = 12;
export const JOB_BONUS_SUGGESTION_STEP_MINOR = 25;
export const JOB_BONUS_SUGGESTION_MIN_MINOR = 100;

/** Scheduled shift length in hours (never negative). */
export function scheduledShiftHours(startAt: Date, endAt: Date): number {
  const ms = endAt.getTime() - startAt.getTime();
  return Number.isFinite(ms) && ms > 0 ? ms / 3_600_000 : 0;
}

/** The most the platform may fund from its own share, per hour and per shift. */
export function jobBonusPlatformCap(input: {
  platformHourlyMarginMinor: number;
  startAt: Date;
  endAt: Date;
}): Readonly<{ hourlyMinor: number; shiftMinor: number }> {
  const hourlyMinor = Math.max(0, Math.trunc(input.platformHourlyMarginMinor));
  const shiftMinor = Math.floor(hourlyMinor * scheduledShiftHours(input.startAt, input.endAt));
  return { hourlyMinor, shiftMinor };
}

/** True when a platform-funded bonus of this kind and amount fits inside the platform's share. */
export function isWithinPlatformShare(
  kind: JobBonusKind,
  amountMinor: number,
  cap: Readonly<{ hourlyMinor: number; shiftMinor: number }>
): boolean {
  return kind === "hourly" ? amountMinor <= cap.hourlyMinor : amountMinor <= cap.shiftMinor;
}

export type JobBonusSuggestion = Readonly<{
  kind: "hourly";
  amountMinor: number;
  oneTimeEquivalentMinor: number;
  platformCapHourlyMinor: number;
  platformCapShiftMinor: number;
  reason: string;
}>;

/**
 * The system bonus suggestion: about 10% of the worker hourly wage (15% when the shift starts within
 * 12 hours), rounded up to the nearest 25 cents, at least 100 cents ($1/h). Also returns the one-time
 * equivalent (hourly x scheduled shift hours) and the platform's share as a cap reference.
 */
export function suggestJobBonus(input: {
  workerHourlyRateMinor: number;
  platformHourlyMarginMinor: number;
  startAt: Date;
  endAt: Date;
  now: Date;
}): JobBonusSuggestion {
  const wage = Math.max(0, Math.trunc(input.workerHourlyRateMinor));
  const hoursToStart = (input.startAt.getTime() - input.now.getTime()) / 3_600_000;
  const urgent = hoursToStart <= JOB_BONUS_URGENT_WINDOW_HOURS;
  const bps = urgent ? JOB_BONUS_URGENT_SUGGESTION_BPS : JOB_BONUS_SUGGESTION_BPS;
  const raw = (wage * bps) / 10_000;
  const step = JOB_BONUS_SUGGESTION_STEP_MINOR;
  const rounded = Math.ceil(raw / step) * step;
  const amountMinor = Math.min(
    JOB_BONUS_AMOUNT_LIMITS.hourly.max,
    Math.max(JOB_BONUS_SUGGESTION_MIN_MINOR, rounded)
  );
  const hours = scheduledShiftHours(input.startAt, input.endAt);
  const oneTimeEquivalentMinor = Math.min(
    JOB_BONUS_AMOUNT_LIMITS.one_time.max,
    Math.max(JOB_BONUS_AMOUNT_LIMITS.one_time.min, Math.round(amountMinor * hours))
  );
  const cap = jobBonusPlatformCap({
    platformHourlyMarginMinor: input.platformHourlyMarginMinor,
    startAt: input.startAt,
    endAt: input.endAt
  });
  const pct = bps / 100;
  const reason = urgent
    ? `Shift starts within ${JOB_BONUS_URGENT_WINDOW_HOURS} hours and is not filled: about ${pct}% of the worker wage.`
    : `Job is not filled yet: about ${pct}% of the worker wage.`;
  return {
    kind: "hourly",
    amountMinor,
    oneTimeEquivalentMinor,
    platformCapHourlyMinor: cap.hourlyMinor,
    platformCapShiftMinor: cap.shiftMinor,
    reason
  };
}

export type JobBonusTerms = Readonly<{ kind: JobBonusKind; amountMinor: number }>;

/** Worker earnings for one timesheet: hourly x ACTUAL hours worked; fixed kinds once per timesheet. */
export function jobBonusWorkerPayMinor(bonus: JobBonusTerms, payableMinutes: number): number {
  if (bonus.kind !== "hourly") return Math.max(0, Math.trunc(bonus.amountMinor));
  const minutes = Number.isFinite(payableMinutes) && payableMinutes > 0 ? payableMinutes : 0;
  return Math.round((bonus.amountMinor * minutes) / 60);
}

/** Employer charge for one timesheet: hourly x BILLED hours (6-hour minimum); fixed kinds as is. */
export function jobBonusInvoiceMinor(bonus: JobBonusTerms, billableMinutes: number): number {
  if (bonus.kind !== "hourly") return Math.max(0, Math.trunc(bonus.amountMinor));
  return Math.round(bonus.amountMinor * billableHours(billableMinutes / 60));
}
