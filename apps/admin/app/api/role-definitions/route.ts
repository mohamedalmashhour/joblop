import { sessionBoundary, sessionFailure } from "../sessionBoundary";

// The role-definition catalogue, for the admin market-wage role picker.
export async function GET() {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request("/role-definitions", "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
