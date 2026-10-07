import { parseAdminDispatchReview } from "../../dispatchBoundary";
import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";

// Advance a dispatch review from candidate_review / shortlist_ready to offer_preparation,
// the governed state in which worker offers can be created. Proxies to the platform
// transition; it never creates an offer, assignment, or notification.
export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ dispatchReviewId: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { dispatchReviewId } = await context.params;
  const body = (await request.json().catch(() => null)) as { expectedVersion?: unknown } | null;
  const expectedVersion =
    body && typeof body.expectedVersion === "number" ? body.expectedVersion : 0;

  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request(
    `/platform/dispatches/${encodeURIComponent(dispatchReviewId)}/offer-preparation`,
    "POST",
    token,
    { expectedVersion }
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    const payload = result.payload as { dispatchReview?: unknown };
    return Response.json(
      { dispatchReview: parseAdminDispatchReview(payload.dispatchReview, dispatchReviewId) },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch {
    return sessionFailure("error");
  }
}
