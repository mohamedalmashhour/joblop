import { sessionBoundary, sessionFailure } from "../../sessionBoundary";

// One order with its child role lines, for admin review.
export async function GET(_request: Request, context: { params: Promise<{ orderId: string }> }) {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { orderId } = await context.params;
  const result = await gateway.request(`/platform/orders/${encodeURIComponent(orderId)}`, "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
