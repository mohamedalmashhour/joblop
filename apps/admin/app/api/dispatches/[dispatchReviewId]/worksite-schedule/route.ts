import { sessionBoundary, sessionFailure } from "../../../sessionBoundary";

// Admin worksite + day-by-day schedule proxy. Authoritative internal view (exact worksite
// allowed); worker pins are the contract worksite per day, never worker home locations.
export async function GET(_request: Request, context: Readonly<{ params: Promise<{ dispatchReviewId: string }> }>) {
  const { dispatchReviewId } = await context.params;
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request(
    `/platform/dispatches/${encodeURIComponent(dispatchReviewId)}/worksite-schedule`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
