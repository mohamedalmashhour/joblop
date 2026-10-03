import { sessionBoundary, sessionFailure } from "../sessionBoundary";

// Admin order-review queue: orders with at least one role line awaiting review. Platform-wide.
export async function GET() {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request("/platform/orders", "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
