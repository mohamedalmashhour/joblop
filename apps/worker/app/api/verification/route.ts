import { sessionBoundary, sessionFailure } from "../sessionBoundary";

// The worker's own verification state. Worker-scoped server-side.
export async function GET() {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request("/verification/worker", "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
