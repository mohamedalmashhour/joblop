import { sessionBoundary, sessionFailure } from "../sessionBoundary";

// Read-only proxy for the Brain page: mode, switches, open issues, action log and the daily summary.
// Session-gated; the API enforces platform administrator authority.
export async function GET() {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request("/platform/brain", "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
