import { sessionBoundary, sessionFailure } from "../sessionBoundary";

// Worker's own governed offers. Read-only proxy to `GET /worker/offers` (optional ?status=).
// The API serializes a worker-safe reference only (no employer internals).
export async function GET(request: Request) {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const status = new URL(request.url).searchParams.get("status");
  const path = status ? `/worker/offers?status=${encodeURIComponent(status)}` : "/worker/offers";
  const result = await gateway.request(path, "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
