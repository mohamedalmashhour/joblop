import { sessionBoundary, sessionFailure } from "../../sessionBoundary";

// Admin: upcoming holiday occasions for the active country (drives the greeting occasion picker).
export async function GET() {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request("/platform/greetings/holidays", "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
