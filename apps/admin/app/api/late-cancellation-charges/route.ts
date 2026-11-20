import { sessionBoundary, sessionFailure } from "../sessionBoundary";

// Read-only proxy for the staff late-cancellation list. Session-gated; the API enforces platform
// administrator authority.
export async function GET(request: Request) {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const search = new URL(request.url).search;
  const result = await gateway.request(`/platform/late-cancellation-charges${search}`, "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
