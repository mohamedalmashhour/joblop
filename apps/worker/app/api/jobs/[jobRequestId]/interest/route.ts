import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../../sessionBoundary";

// Express Interest proxy. The browser only sends an optional postalCode (for the server to
// compute an audit distance). Interest is recorded as governed intent by the API — this
// route never creates an offer or assignment.
export async function POST(request: Request, context: { params: Promise<{ jobRequestId: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { jobRequestId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const postalCode = typeof body?.postalCode === "string" ? body.postalCode : undefined;
  const result = await gateway.request(
    `/marketplace/jobs/${encodeURIComponent(jobRequestId)}/interest`,
    "POST",
    token,
    postalCode ? { postalCode } : {}
  );
  if (result.status !== "ok") return forward(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}

// Withdraw interest.
export async function DELETE(request: Request, context: { params: Promise<{ jobRequestId: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { jobRequestId } = await context.params;
  const result = await gateway.request(`/marketplace/jobs/${encodeURIComponent(jobRequestId)}/interest`, "DELETE", token);
  if (result.status !== "ok") return forward(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}

// Current interest + eligibility state (for the CTA).
export async function GET(_request: Request, context: { params: Promise<{ jobRequestId: string }> }) {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { jobRequestId } = await context.params;
  const result = await gateway.request(`/marketplace/jobs/${encodeURIComponent(jobRequestId)}/interest`, "GET", token);
  if (result.status !== "ok") return forward(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}

// Map gateway statuses to responses. 'stale' isn't used here; treat everything else via the
// shared helper, but preserve a distinct 422 for ineligibility handled by the API body.
function forward(status: "denied" | "not_found" | "stale" | "unavailable" | "error") {
  return sessionFailure(status);
}
