import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";

// Settles one worker dispute. Same-origin only; the API enforces authority and the open-only rule.
export async function POST(request: Request, context: Readonly<{ params: Promise<{ disputeId: string }> }>) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { disputeId } = await context.params;
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = await request.json().catch(() => ({}));
  const result = await gateway.request(`/platform/worker-disputes/${encodeURIComponent(disputeId)}/resolve`, "POST", token, body);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
