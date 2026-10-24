import { sessionBoundary, sessionFailure } from "../../sessionBoundary";

// The signed-in worker's own Pro orders.
export async function GET() {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request("/worker/cv/orders", "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
