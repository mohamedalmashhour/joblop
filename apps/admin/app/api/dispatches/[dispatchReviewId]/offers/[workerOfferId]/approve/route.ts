import {
  isCanonicalOperationalId,
  parseAdminWorkerOffer,
  readOfferActionInput
} from "../../../../offerAssignmentBoundary";
import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../../../sessionBoundary";

// Round 2b: approve a draft worker offer. Reuses POST /platform/worker-offers/:id/approve
// (version-guarded on the platform service). No new API.
export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ dispatchReviewId: string; workerOfferId: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return sessionFailure("error");
  }
  const { dispatchReviewId, workerOfferId } = await context.params;
  if (!isCanonicalOperationalId(dispatchReviewId) || !isCanonicalOperationalId(workerOfferId)) {
    return sessionFailure("error");
  }
  const input = readOfferActionInput(await request.json().catch(() => null));
  if (!input) return sessionFailure("error");

  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request(
    `/platform/worker-offers/${encodeURIComponent(workerOfferId)}/approve`,
    "POST",
    token,
    { expectedVersion: input.expectedVersion }
  );
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
