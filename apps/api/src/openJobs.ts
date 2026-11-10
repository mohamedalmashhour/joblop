import type { Prisma } from "@rwos/database";
import { LONG_TERM_LISTING_MARKER, MINIMUM_WAGE_CURRENCY, quebecMinimumWageAt } from "@rwos/shared";
import { listedJobWhere } from "./jobListingVisibility";
import { isEmployerPlansEnabled } from "./employerPlanRepository";

// ONE rule for "an open Joblop job a worker can see and take". Every worker list uses it, so the
// jobs calendar, the calendar hub, the signed-in search, the public job board and job alerts always
// show the same set of jobs:
//   - staff approved it (approved_for_dispatch) and left it open on the shared calendar (openClaim),
//   - it is priced (an approval snapshot exists, so the worker's own hourly pay is known),
//   - that pay is at least the Québec minimum wage (payMeetsMinimumWageWhere; long-term listings,
//     which hold no hourly pay, are exempt), so old below-minimum data never shows to anyone,
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
  return {
    OR: [
      { workerHourlyRateMinor: { gte: quebecMinimumWageAt(now).hourlyMinor } },
      { employerPlanCode: LONG_TERM_LISTING_MARKER },
      { currency: { not: MINIMUM_WAGE_CURRENCY } }
    ]
  };
}

export function openJobWhere(input: OpenJobWhereInput, plansEnabled: boolean = isEmployerPlansEnabled()): Prisma.JobRequestWhereInput {
  const from = input.startFrom && input.startFrom.getTime() > input.now.getTime() ? input.startFrom : input.now;
  return listedJobWhere(
    {
      ...(input.extra ?? {}),
      status: "approved_for_dispatch",
      openClaim: true,
      // "is" also requires the snapshot to exist (priced), as before.
      pricingSnapshot: { is: payMeetsMinimumWageWhere(input.now) },
      startAt: { gte: from, ...(input.startTo ? { lte: input.startTo } : {}) },
      residence: { ...(input.residence ?? {}), status: "active" }
    },
    input.now,
    plansEnabled
  );
}
