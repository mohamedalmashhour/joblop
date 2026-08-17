import {
  isCanonicalOperationalId,
  parseAdminWorkerOffer,
  parseAdminWorkerOffers,
  readOfferCreateInput
} from "../../offerAssignmentBoundary";
import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ dispatchReviewId: string }> }>
) {
  const { dispatchReviewId } = await context.params;
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request(
    `/platform/worker-offers?dispatchReviewId=${encodeURIComponent(dispatchReviewId)}`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    const payload = result.payload as { workerOffers?: unknown };
    return Response.json(
      { workerOffers: parseAdminWorkerOffers(payload.workerOffers, dispatchReviewId) },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch {
    return sessionFailure("error");
  }
}

// Round 2b: create a governed worker offer (draft) for a shortlisted worker. Reuses the existing
// worker-offer service (POST /platform/worker-offers) — no new API, no parallel state machine.
export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ dispatchReviewId: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return sessionFailure("error");
  }
  const { dispatchReviewId } = await context.params;
  if (!isCanonicalOperationalId(dispatchReviewId)) return sessionFailure("error");
  const input = readOfferCreateInput(await request.json().catch(() => null));
  if (!input) return sessionFailure("error");

  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request("/platform/worker-offers", "POST", token, {
    dispatchReviewId,
    workerIdentityId: input.workerIdentityId,
    expiresAt: input.expiresAt,
    ...(input.workerVisibleTitle ? { workerVisibleTitle: input.workerVisibleTitle } : {}),
    ...(input.workerVisibleSummary ? { workerVisibleSummary: input.workerVisibleSummary } : {}),
    ...(input.compensationSummary ? { compensationSummary: input.compensationSummary } : {}),
    ...(input.policySummary ? { policySummary: input.policySummary } : {})
  });
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    const payload = result.payload as { workerOffer?: unknown };
    return Response.json(
      { workerOffer: parseAdminWorkerOffer(payload.workerOffer, dispatchReviewId) },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch {
    return sessionFailure("error");
  }
}
