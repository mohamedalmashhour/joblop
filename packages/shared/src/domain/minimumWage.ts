// ONE source of truth for the Québec general minimum wage (taux général du salaire minimum).
// Every place that checks or shows the minimum reads it from here: staff approval (and the Brain,
// which uses the same approval), employer submit, the staff rate card, the public job lists and the
// mobile app's wage hint.
//
// HOW TO UPDATE: Québec changes the rate each year on May 1 (announced by the government / CNESST,
// usually in January). Add a new row at the END with its effective date and the hourly amount in
// cents. Never edit or delete an old row: past jobs are checked against the rate in force then.
//
// Sources:
//   - 2025-05-01: $16.10/h — CNESST, taux général du salaire minimum au 1er mai 2025.
//   - 2026-05-01: $16.60/h — the value the mobile app already showed ("CNESST / Gouvernement du
//     Québec", May 1, 2026). OWNER TO CONFIRM against cnesst.gouv.qc.ca before relying on it; if the
//     official 2026 rate differs, correct this row.

export type MinimumWageRate = Readonly<{
  /** First day the rate applies (Québec time), YYYY-MM-DD. */
  effectiveFrom: string;
  /** Hourly amount in cents (CAD). */
  hourlyMinor: number;
  source: string;
}>;

export const QUEBEC_MINIMUM_WAGE_RATES: readonly MinimumWageRate[] = [
  { effectiveFrom: "2025-05-01", hourlyMinor: 1610, source: "CNESST — taux général au 1er mai 2025" },
  { effectiveFrom: "2026-05-01", hourlyMinor: 1660, source: "CNESST / Gouvernement du Québec — 1er mai 2026 (owner to confirm)" }
];

/** The minimum wage applies only to jobs paid in Canadian dollars (Joblop Canada / Québec). */
export const MINIMUM_WAGE_CURRENCY = "CAD";

/** Long-term listings carry this plan marker in their pricing snapshot: no hourly pay through Joblop. */
export const LONG_TERM_LISTING_MARKER = "listing";

// Rates switch at midnight in Québec (America/Toronto). Compare calendar dates there.
function quebecDate(at: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** The Québec general minimum wage in force on a date (the earliest known rate before the table starts). */
export function quebecMinimumWageAt(at: Date = new Date()): MinimumWageRate {
  const day = quebecDate(at);
  let current = QUEBEC_MINIMUM_WAGE_RATES[0]!;
  for (const rate of QUEBEC_MINIMUM_WAGE_RATES) {
    if (rate.effectiveFrom <= day) current = rate;
  }
  return current;
}

/** "$16.10" */
export function formatMinimumWage(hourlyMinor: number): string {
  return `$${(hourlyMinor / 100).toFixed(2)}`;
}

/** The error text staff and employers see when a job pays the worker less than the minimum. */
export function belowMinimumWageMessage(at: Date = new Date()): string {
  return `Worker pay is below Québec minimum wage (${formatMinimumWage(quebecMinimumWageAt(at).hourlyMinor)}/h).`;
}

export type MinimumWageCheckInput = Readonly<{
  /** The worker's own hourly pay in cents. */
  workerHourlyRateMinor: number;
  currency: string | null | undefined;
  /** Long-term listing (the employer pays the worker directly; Joblop holds no hourly pay): exempt. */
  isLongTermListing?: boolean;
  /** When the work happens (the rate in force that day). Defaults to now. */
  at?: Date;
}>;

/** True when a short-term Joblop job would pay the worker less than the Québec minimum wage. */
export function isBelowMinimumWage(input: MinimumWageCheckInput): boolean {
  if (input.isLongTermListing) return false;
  if (input.currency !== MINIMUM_WAGE_CURRENCY) return false;
  return input.workerHourlyRateMinor < quebecMinimumWageAt(input.at ?? new Date()).hourlyMinor;
}

export class MinimumWageError extends Error {
  readonly code = "RWOS_BELOW_MINIMUM_WAGE";
  readonly minimumHourlyMinor: number;

  constructor(at: Date = new Date()) {
    super(belowMinimumWageMessage(at));
    this.name = "MinimumWageError";
    this.minimumHourlyMinor = quebecMinimumWageAt(at).hourlyMinor;
  }
}

/** Throws MinimumWageError when the worker's pay is below the minimum (long-term listings are exempt). */
export function assertWorkerPayMeetsMinimumWage(input: MinimumWageCheckInput): void {
  if (isBelowMinimumWage(input)) throw new MinimumWageError(input.at ?? new Date());
}
