import type { Prisma } from "@rwos/database";
import {
  LONG_TERM_LISTING_MARKER,
  MINIMUM_WAGE_CURRENCY,
  isBelowMinimumWage,
  minimumWagePeriods,
  quebecMinimumWageAt
} from "@rwos/shared";
import { listedJobWhere } from "./jobListingVisibility";
import { isEmployerPlansEnabled } from "./employerPlanRepository";

// ONE rule for "an open Joblop job a worker can see and take". Every worker list uses it, so the
// jobs calendar, the calendar hub, the signed-in search, the public job board and job alerts always
// show the same set of jobs:
//   - staff approved it (approved_for_dispatch) and left it open on the shared calendar (openClaim),
//   - it is priced (an approval snapshot exists, so the worker's own hourly pay is known),
//   - that pay is at least the Québec minimum wage in force ON THE JOB'S DATE (payMeetsMinimumWageOnJobDateWhere;
//     long-term listings, which hold no hourly pay, are exempt), so a job starting after a May 1
//     increase is held to the new rate even when searched before it,
//   - it has not started yet,
//   - its site is active,
//   - and, for long-term jobs with employer plans on, it is listed (listedJobWhere).
// Places left are counted in code afterwards (remainingOpenings), the same way everywhere.

export type OpenJobWhereInput = Readonly<{
  now: Date;
  /** Earliest start to include (never earlier than now). */
  startFrom?: Date | null;
  /** Latest start to include. */
  startTo?: Date | null;
  /** Extra conditions on the site (merged with status: "active"). */
  residence?: Prisma.ResidenceWhereInput;
  /** Extra narrowing conditions (role, headcount…). They can only narrow, never widen. */
  extra?: Prisma.JobRequestWhereInput;
}>;

/**
 * Pricing-snapshot condition: the worker's hourly pay is at least the Québec minimum wage in force at
 * `now`. Long-term listings (no hourly pay through Joblop) and non-CAD jobs are not held to it.
 */
export function payMeetsMinimumWageWhere(now: Date): Prisma.RequestPricingSnapshotWhereInput {
  return payAtLeastWhere(quebecMinimumWageAt(now).hourlyMinor);
}

function payAtLeastWhere(hourlyMinor: number): Prisma.RequestPricingSnapshotWhereInput {
  return {
    OR: [
      { workerHourlyRateMinor: { gte: hourlyMinor } },
      { employerPlanCode: LONG_TERM_LISTING_MARKER },
      { currency: { not: MINIMUM_WAGE_CURRENCY } }
    ]
  };
}

/**
 * Job condition: the worker's pay meets the minimum wage in force on the day the job STARTS (one
 * branch per rate period of the shared table). Periods that end before `from` are left out.
 */
export function payMeetsMinimumWageOnJobDateWhere(from: Date): Prisma.JobRequestWhereInput {
  const periods = minimumWagePeriods().filter((period) => period.to === null || period.to.getTime() > from.getTime());
  return {
    OR: periods.map((period) => ({
      startAt: { ...(period.from ? { gte: period.from } : {}), ...(period.to ? { lt: period.to } : {}) },
      pricingSnapshot: { is: payAtLeastWhere(period.hourlyMinor) }
    }))
  };
}

export type ClaimBlockReason = "job_started" | "below_minimum_wage";

/**
 * Why a worker may not take this job right now, or null. Used by the claim itself and by the job
 * page's claimable flag, so the two never disagree: a job that has started, or that pays the worker
 * less than the minimum wage in force on its date, is never claimable (long-term listings are exempt
 * from the wage rule; they are never claimed anyway).
 */
export function claimBlockReason(
  job: Readonly<{
    startAt: Date;
    jobLength?: string | null;
    pricingSnapshot: Readonly<{ workerHourlyRateMinor: number; currency: string | null; employerPlanCode?: string | null }> | null;
  }>,
  now: Date
): ClaimBlockReason | null {
  if (job.startAt.getTime() <= now.getTime()) return "job_started";
  const snapshot = job.pricingSnapshot;
  if (
    snapshot &&
    isBelowMinimumWage({
      workerHourlyRateMinor: snapshot.workerHourlyRateMinor,
      currency: snapshot.currency,
      isLongTermListing: job.jobLength === "long_term" || snapshot.employerPlanCode === LONG_TERM_LISTING_MARKER,
      at: job.startAt
    })
  ) {
    return "below_minimum_wage";
  }
  return null;
}

export function openJobWhere(input: OpenJobWhereInput, plansEnabled: boolean = isEmployerPlansEnabled()): Prisma.JobRequestWhereInput {
  const from = input.startFrom && input.startFrom.getTime() > input.now.getTime() ? input.startFrom : input.now;
  const extra = input.extra ?? {};
  const extraAnd = extra.AND === undefined ? [] : Array.isArray(extra.AND) ? extra.AND : [extra.AND];
  return listedJobWhere(
    {
      ...extra,
      status: "approved_for_dispatch",
      openClaim: true,
      // Priced (the snapshot exists); the wage branch below also requires it.
      pricingSnapshot: { isNot: null },
      startAt: { gte: from, ...(input.startTo ? { lte: input.startTo } : {}) },
      residence: { ...(input.residence ?? {}), status: "active" },
      AND: [...extraAnd, payMeetsMinimumWageOnJobDateWhere(from)]
    },
    input.now,
    plansEnabled
  );
}
