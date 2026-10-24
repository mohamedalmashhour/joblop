import { sessionBoundary, sessionFailure } from "../../sessionBoundary";

// Worker JobScanner: read external leads ranked for the signed-in worker. Read-only (no live scan).
export async function GET(request: Request) {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const url = new URL(request.url);
  const result = await gateway.request(`/worker/jobscanner/leads${url.search}`, "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
