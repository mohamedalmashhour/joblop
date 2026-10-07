import { parseAdminDispatchReview } from "../../dispatchBoundary";
import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";

// Advance a dispatch review to offer_preparation, the governed state in which worker offers can be
// created. The authoritative path is candidate_review → shortlist_ready → offer_preparation, so
// this chains markShortlistReady then moveToOfferPreparation, reading the fresh version from each
// response. It never creates an offer, assignment, or notification.
type Dr = { state?: string; versionToken?: number };

export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ dispatchReviewId: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { dispatchReviewId } = await context.params;
  const id = encodeURIComponent(dispatchReviewId);
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");

  const current = await gateway.request(`/platform/dispatches/${id}`, "GET", token);
  if (current.status !== "ok") return sessionFailure(current.status);
  const currentDr = (current.payload as { dispatchReview?: Dr }).dispatchReview ?? {};
  let version = typeof currentDr.versionToken === "number" ? currentDr.versionToken : 0;
  let state = currentDr.state;

  if (state === "candidate_review" || state === "active") {
    const ready = await gateway.request(
      `/platform/dispatches/${id}/shortlist-ready`,
      "POST",
      token,
      { expectedVersion: version }
    );
    if (ready.status !== "ok") return sessionFailure(ready.status);
    const readyDr = (ready.payload as { dispatchReview?: Dr }).dispatchReview ?? {};
    version = typeof readyDr.versionToken === "number" ? readyDr.versionToken : version + 1;
    state = readyDr.state;
  }

  const moved = await gateway.request(
    `/platform/dispatches/${id}/offer-preparation`,
    "POST",
    token,
    { expectedVersion: version }
  );
  if (moved.status !== "ok") return sessionFailure(moved.status);
  try {
    const payload = moved.payload as { dispatchReview?: unknown };
    return Response.json(
      { dispatchReview: parseAdminDispatchReview(payload.dispatchReview, dispatchReviewId) },
      { headers: privateHeaders }
    );
  } catch {
    return sessionFailure("error");
  }
}

const privateHeaders = { "cache-control": "private, no-store" };
