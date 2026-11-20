import type { RequestPricingSnapshotCapture } from "@rwos/auth";

// STAFF-ONLY. The staff coverage calendar shows worker pay and the employer rate for each job. Before
// approval there is no saved price yet, so for requests still waiting (submitted / in review /
// waiting for the employer's answer) we add the contract estimate: the same read-only resolver the
// request page and approval use, with the default margin. Nothing is saved. The rate is final only
// once the request is approved (then it comes from the saved snapshot, as before).

const PENDING_STATUSES = new Set(["submitted", "admin_review", "information_required"]);
/** At most this many estimates per calendar read (each one reads the contract). */
export const MAX_COVERAGE_ESTIMATES = 25;

export type CoverageEstimate = Readonly<{ workerRateMinor: number; employerRateMinor: number }>;

type Row = Readonly<{ id: string; status: string; pricingSnapshot: unknown }>;

export async function pendingRateEstimates(
  rows: readonly Row[],
  capture: Pick<RequestPricingSnapshotCapture, "resolveAtApproval"> | null,
  limit = MAX_COVERAGE_ESTIMATES
): Promise<Map<string, CoverageEstimate>> {
  const out = new Map<string, CoverageEstimate>();
  if (!capture) return out;
  const pending = rows.filter((r) => PENDING_STATUSES.has(r.status) && !r.pricingSnapshot).slice(0, limit);
  for (const row of pending) {
    try {
      const resolved = await capture.resolveAtApproval({ jobRequestId: row.id, marginPpm: null });
      out.set(row.id, {
        workerRateMinor: resolved.snapshot.workerHourlyRateMinor,
        employerRateMinor: resolved.snapshot.employerHourlyRateMinor
      });
    } catch {
      // No contract or no rate for the role yet: the calendar says "Price set on approval".
    }
  }
  return out;
}
