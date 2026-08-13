import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../../sessionBoundary";

// Worker ACCEPTS a governed offer. Optimistic-concurrency (`expectedVersion`) + terms binding
// (`expectedTermsVersionId`) are enforced by the API; a version/terms drift returns 409 (stale),
// prompting the UI to reload. This route never mutates offer terms — it only relays the decision.
export async function POST(request: Request, context: { params: Promise<{ workerOfferId: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { workerOfferId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const payload: Record<string, unknown> = {
    expectedVersion: typeof body?.expectedVersion === "number" ? body.expectedVersion : 0,
    expectedTermsVersionId: typeof body?.expectedTermsVersionId === "string" ? body.expectedTermsVersionId : ""
  };
  if (typeof body?.reason === "string") payload.reason = body.reason;
  const result = await gateway.request(
    `/worker/offers/${encodeURIComponent(workerOfferId)}/accept`,
    "POST",
    token,
    payload
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
