import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../../sessionBoundary";

// Withdraw the worker's own still-open dispute. Path-scoped to the dispute id; nothing else is sent.
export async function POST(request: Request, context: { params: Promise<{ disputeId: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { disputeId } = await context.params;
  if (!disputeId) return sessionFailure("not_found");
  const result = await gateway.request(`/worker/disputes/${encodeURIComponent(disputeId)}/withdraw`, "POST", token, {});
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
