import type { Prisma } from "@rwos/database";
import { isEmployerPlansEnabled } from "./employerPlanRepository";

// "A job offer is not listed if not paid" (owner decision; behind EMPLOYER_PLANS_ENABLED). Every
// WORKER-FACING job query (public jobs, open jobs calendar, marketplace search/detail/interest/claim,
// employer public profile, job alerts, calendar hub, jobscanner stats) wraps its `where` with
// listedJobWhere: a long_term job request is visible only while its listing's listedUntil is in the
// future (trial or paid month). Short-term jobs are untouched. Staff approval still applies as today
// (the status filters of each query stay), so a long-term job must be both approved AND listed.
//
// Flag OFF: listedJobWhere returns the SAME where object, so every query is byte-identical to today.

/** Prisma condition: not a long-term job, or a long-term job listed at `now`. */
export function listedCondition(now: Date): Prisma.JobRequestWhereInput {
  return {
    OR: [{ jobLength: { not: "long_term" } }, { jobListing: { is: { listedUntil: { gt: now } } } }]
  };
}

/** Add the listing condition to a worker-facing job query (identity when the flag is off). */
export function listedJobWhere<T extends Prisma.JobRequestWhereInput>(
  where: T,
  now: Date = new Date(),
  enabled: boolean = isEmployerPlansEnabled()
): T | Prisma.JobRequestWhereInput {
  if (!enabled) return where;
  const existing = where.AND === undefined ? [] : Array.isArray(where.AND) ? where.AND : [where.AND];
  return { ...where, AND: [...existing, listedCondition(now)] };
}

/** Extra select needed to evaluate listing visibility in code (empty when the flag is off). */
export function listingVisibilitySelect(enabled: boolean = isEmployerPlansEnabled()) {
  return enabled ? ({ jobLength: true, jobListing: { select: { listedUntil: true } } } as const) : ({} as const);
}

/** In-code twin of listedCondition for rows read with listingVisibilitySelect. */
export function isListedForWorkers(
  row: Readonly<{ jobLength?: string | null; jobListing?: Readonly<{ listedUntil: Date | null }> | null }>,
  now: Date = new Date(),
  enabled: boolean = isEmployerPlansEnabled()
): boolean {
  if (!enabled || row.jobLength !== "long_term") return true;
  return !!row.jobListing?.listedUntil && row.jobListing.listedUntil.getTime() > now.getTime();
}
