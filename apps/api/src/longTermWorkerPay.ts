import { payOfferedFromColumns, payOfferedSentence, toPayOfferedView, type PayOfferedView } from "@rwos/shared";
import { isEmployerPlansEnabled } from "./employerPlanRepository";

// Worker-facing pay for LONG-TERM jobs (owner decision; behind EMPLOYER_PLANS_ENABLED). A long-term
// job is a paid listing: the employer pays the worker directly and Joblop's pricing snapshot holds
// zero money. So a worker screen must never show that zero as "$0/h". Instead it shows the pay the
// employer typed in the request ("pay offered"), marked as paid by the employer.
//
// Flag OFF, or a short-term job: the rate passes through untouched and NO extra key is added, so every
// worker response stays byte-identical to today. Flag ON + long-term: the rate becomes null and a
// `payOffered` key carries the employer's offer (or null when it was not stated).
//
// Only the employer-entered offer is exposed: never Joblop's share, never the employer contract rate.

/** Columns needed to decide a job's worker-facing pay (select them next to the pricing snapshot). */
export const WORKER_PAY_SELECT = {
  jobLength: true,
  payOfferedMinMinor: true,
  payOfferedMaxMinor: true,
  payOfferedUnit: true
} as const;

export type WorkerPayRow = Readonly<{
  jobLength?: string | null;
  payOfferedMinMinor?: number | null;
  payOfferedMaxMinor?: number | null;
  payOfferedUnit?: string | null;
}>;

/** True when the job is a long-term listing and the employer-plans flag is on. */
export function isLongTermListingJob(row: WorkerPayRow | null | undefined, enabled: boolean = isEmployerPlansEnabled()): boolean {
  return enabled && row?.jobLength === "long_term";
}

/** The employer's pay offer for a long-term job (null when not stated). */
export function payOfferedViewOf(row: WorkerPayRow): PayOfferedView | null {
  const pay = payOfferedFromColumns(row);
  return pay ? toPayOfferedView(pay) : null;
}

export type WorkerPay = Readonly<{
  /** The rate to put where the response already carries one (null for a long-term listing). */
  rateMinor: number | null;
  /** Spread into the response: `{}` (flag off / short-term) or `{ payOffered }` (long-term). */
  extra: Readonly<{ payOffered: PayOfferedView | null }> | Readonly<Record<string, never>>;
}>;

/** Worker-facing pay for one job row. */
export function workerPay(
  row: WorkerPayRow | null | undefined,
  rateMinor: number | null,
  enabled: boolean = isEmployerPlansEnabled()
): WorkerPay {
  if (!row || !isLongTermListingJob(row, enabled)) return { rateMinor, extra: {} };
  return { rateMinor: null, extra: { payOffered: payOfferedViewOf(row) } };
}

/** Plain sentence for emails / offer terms of a long-term job ("$22–$25/h, paid directly by the employer"). */
export function longTermPaySentence(row: WorkerPayRow, locale: string): string {
  return payOfferedSentence(payOfferedFromColumns(row), locale);
}
