// Transaction Control Room — read-only lifecycle + settlement aggregation for ONE job request.
// Additive, read-only. Delegates all money/parse logic to lib/controlRoomLedger so the
// settlement math has a single home (shared with the share-link mint endpoint).
import { sessionBoundary, sessionFailure } from "../../sessionBoundary";
import { assembleTransaction } from "../../../../lib/controlRoomLedger";

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ jobRequestId: string }> }>
) {
  const { jobRequestId } = await context.params;
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request(
    `/platform/calendar/requests/${encodeURIComponent(jobRequestId)}`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);

  // Enrich with the immutable pricing snapshot (finance-gated; null when unpriced) so the
  // settlement ledger shows real figures. Additive: injected into request.pricingSnapshot,
  // which assembleTransaction already reads. Failure leaves the transaction unpriced.
  let payload: unknown = result.payload;
  try {
    const pricing = await gateway.request(
      `/platform/job-requests/${encodeURIComponent(jobRequestId)}/pricing-snapshot`,
      "GET",
      token
    );
    const snap =
      pricing.status === "ok"
        ? (pricing.payload as { pricingSnapshot?: unknown } | null)?.pricingSnapshot
        : null;
    if (snap) {
      const base = (result.payload ?? {}) as Record<string, unknown>;
      const req = (base.request ?? {}) as Record<string, unknown>;
      payload = { ...base, request: { ...req, pricingSnapshot: snap } };
    }
  } catch {
    // leave unpriced
  }

  try {
    const { job, stages, ledger, checks } = assembleTransaction(payload, jobRequestId);
    return Response.json(
      { job, stages, ledger, checks },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch {
    return sessionFailure("error");
  }
}
