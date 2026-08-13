import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../../sessionBoundary";

// Worker DECLINES a governed offer. Same optimistic-concurrency + terms binding as accept.
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
    `/worker/offers/${encodeURIComponent(workerOfferId)}/decline`,
    "POST",
    token,
    payload
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
