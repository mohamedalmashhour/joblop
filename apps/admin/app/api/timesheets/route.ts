import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../sessionBoundary";

// Root of the scoped /platform/timesheets proxy (the sibling [...segments] route handles sub-paths).
// Session-gated; mutations require same-origin. The API enforces authority + state machine.
export async function GET(request: Request) {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const url = new URL(request.url);
  const result = await gateway.request(`/platform/timesheets${url.search}`, "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = await request.json().catch(() => ({}));
  const result = await gateway.request(`/platform/timesheets`, "POST", token, body);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
