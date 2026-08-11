import { sessionBoundary, sessionFailure } from "../sessionBoundary";

// The worker's own HR profile (standing + credentials only — never HR case notes).
export async function GET() {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request("/hr/worker", "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
