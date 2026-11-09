import { isCanonicalOperationalId } from "../../offerAssignmentBoundary";
import { sessionBoundary, sessionFailure } from "../../../sessionBoundary";

// Staff pre-check: the required certificates a worker misses for this dispatch's job, so the offer
// and assignment screens can show them and the logged override box. Read-only.
export async function GET(request: Request, context: Readonly<{ params: Promise<{ dispatchReviewId: string }> }>) {
  const { dispatchReviewId } = await context.params;
  if (!isCanonicalOperationalId(dispatchReviewId)) return sessionFailure("not_found");
  const params = new URL(request.url).searchParams;
  const workerOfferId = params.get("workerOfferId");
  const workerIdentityId = params.get("workerIdentityId");
  const query = workerOfferId && isCanonicalOperationalId(workerOfferId)
    ? `workerOfferId=${encodeURIComponent(workerOfferId)}`
    : workerIdentityId && isCanonicalOperationalId(workerIdentityId)
      ? `workerIdentityId=${encodeURIComponent(workerIdentityId)}`
      : null;
  if (!query) return sessionFailure("not_found");
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request(`/platform/dispatches/${encodeURIComponent(dispatchReviewId)}/certificate-check?${query}`, "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
