import { sessionBoundary, sessionFailure } from "../../sessionBoundary";

// Job detail proxy. Forwards the optional postalCode (for server-computed distance) but
// nothing authoritative — the API resolves everything. Privacy-safe payload passes through.
export async function GET(request: Request, context: { params: Promise<{ jobRequestId: string }> }) {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { jobRequestId } = await context.params;
  const postalCode = new URL(request.url).searchParams.get("postalCode");
  const path = `/marketplace/jobs/${encodeURIComponent(jobRequestId)}${
    postalCode ? `?postalCode=${encodeURIComponent(postalCode)}` : ""
  }`;
  const result = await gateway.request(path, "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
