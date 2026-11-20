import { payOfferedLabel } from "./payOfferedLabel";

// The pay line a worker sees on a job (search card, job page, calendar, public board). Always the
// worker's OWN pay, never Joblop's share or the employer's rate:
//   - long-term listing → the employer's pay offer, "paid directly by the employer";
//   - short-term job with an approved rate → the worker's hourly pay ("$25.00/h");
//   - otherwise → a clear line saying when the pay is confirmed (never blank, never $0).

export type WorkerPayFields = Readonly<{ workerRateMinor?: number | null; currency?: string | null; payOffered?: unknown }>;
export type WorkerPayCopy = Readonly<{ paidByEmployer: string; employerPaysDirectly: string; pending: string }>;

export function formatHourlyRate(minor: number, currency: string, locale?: string): string {
  return `${(minor / 100).toLocaleString(locale, { style: "currency", currency })}/h`;
}

export function workerPayLabel(job: WorkerPayFields, locale: string, copy: WorkerPayCopy): string {
  if (job.payOffered !== undefined) {
    return payOfferedLabel(job.payOffered, locale, copy) ?? copy.employerPaysDirectly;
  }
  const rate = job.workerRateMinor;
  if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
    return formatHourlyRate(rate, job.currency || "CAD", locale);
  }
  return copy.pending;
}
