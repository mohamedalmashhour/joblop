import type { PublicCalendarJob } from "@rwos/shared";
import { workerPay, type WorkerPayRow } from "./longTermWorkerPay";

// PUBLIC jobs calendar (signed-out front door, website and app). One open Joblop job as the public
// calendar shows it. Built field by field from a whitelist: role, city and province, start and end,
// places left and the WORKER's own pay. Never the address, coordinates, the employer, the employer
// rate, Joblop's share or the internal job id.

/** At most this many days per request (a month grid plus slack). */
export const PUBLIC_CALENDAR_MAX_DAYS = 42;
/** At most this many jobs per request. */
export const PUBLIC_CALENDAR_MAX_JOBS = 500;

export type PublicCalendarRow = WorkerPayRow &
  Readonly<{
    jobRequestNumber: string;
    title: string;
    startAt: Date;
    endAt: Date;
    timezone: string | null;
    roleDefinition: { displayLabel: string } | null;
    residence: { city: string | null; province: string | null } | null;
    pricingSnapshot: { workerHourlyRateMinor: number | null } | null;
  }>;

/** The window asked for, clamped: never before now, at most PUBLIC_CALENDAR_MAX_DAYS long. */
export function publicCalendarRange(fromRaw: string | null | undefined, toRaw: string | null | undefined, now: Date): { from: Date; to: Date } {
  const parsedFrom = fromRaw && !Number.isNaN(Date.parse(fromRaw)) ? new Date(fromRaw) : now;
  const from = parsedFrom.getTime() > now.getTime() ? parsedFrom : now;
  const maxTo = from.getTime() + PUBLIC_CALENDAR_MAX_DAYS * 86_400_000;
  const parsedTo = toRaw && !Number.isNaN(Date.parse(toRaw)) ? new Date(toRaw).getTime() : maxTo;
  const to = new Date(Math.max(from.getTime(), Math.min(parsedTo, maxTo)));
  return { from, to };
}

export function publicCalendarJobView(
  row: PublicCalendarRow,
  placesLeft: number,
  currency: string | null,
  plansEnabled?: boolean
): PublicCalendarJob {
  const city = row.residence?.city ?? null;
  const province = row.residence?.province ?? null;
  const pay = workerPay(row, row.pricingSnapshot?.workerHourlyRateMinor ?? null, plansEnabled);
  return {
    jobCode: row.jobRequestNumber,
    role: row.roleDefinition?.displayLabel ?? row.title,
    city,
    province,
    areaLabel: city && province ? `${city}, ${province}` : (province ?? "Canada"),
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    timezone: row.timezone,
    placesLeft,
    // The worker's own hourly pay (never the employer rate or Joblop's share).
    workerRateMinor: pay.rateMinor,
    currency,
    ...pay.extra
  };
}
