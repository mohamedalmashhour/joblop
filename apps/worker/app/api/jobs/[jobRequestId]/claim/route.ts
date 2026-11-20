import { getRuntimeConfig } from "@rwos/config";
import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../../sessionBoundary";

// Direct-claim proxy (hybrid auto-offer). Unlike express-interest, the claim's distinct outcomes
// — assigned (201), full (409), ineligible (422), needs-election (409) — carry structured bodies
// the CTA needs, so this route forwards the API status + JSON verbatim rather than collapsing them
// through the coarse gateway result. The body is never trusted to carry eligibility; the API is
// server-authoritative.
export async function POST(request: Request, context: { params: Promise<{ jobRequestId: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { jobRequestId } = await context.params;

  let apiResponse: Response;
  try {
    apiResponse = await fetch(
      `${getRuntimeConfig().internalApiOrigin}/marketplace/jobs/${encodeURIComponent(jobRequestId)}/claim`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: "{}",
        cache: "no-store"
      }
    );
  } catch {
    return sessionFailure("unavailable");
  }

  const payload = await apiResponse.json().catch(() => ({}));
  return Response.json(payload, {
    status: apiResponse.status,
    headers: { "cache-control": "private, no-store" }
  });
}
