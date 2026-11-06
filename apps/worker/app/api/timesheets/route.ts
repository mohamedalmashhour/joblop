import { sessionBoundary, sessionFailure } from "../sessionBoundary";

// The worker's own timesheets, newest first.
export async function GET() {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request("/worker/timesheets?limit=25", "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
