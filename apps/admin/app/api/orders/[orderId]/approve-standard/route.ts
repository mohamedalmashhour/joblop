import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";

// Approve every AI-recommended role line in the order at once (escalated roles are left alone).
export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { orderId } = await context.params;
  const result = await gateway.request(`/platform/orders/${encodeURIComponent(orderId)}/approve-standard`, "POST", token, {});
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
