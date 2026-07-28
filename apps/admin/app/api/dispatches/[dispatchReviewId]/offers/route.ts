import { parseAdminWorkerOffers } from "../../offerAssignmentBoundary";
import { sessionBoundary, sessionFailure } from "../../../sessionBoundary";

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ dispatchReviewId: string }> }>
) {
  const { dispatchReviewId } = await context.params;
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request(
    `/platform/worker-offers?dispatchReviewId=${encodeURIComponent(dispatchReviewId)}`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    const payload = result.payload as { workerOffers?: unknown };
    return Response.json(
      { workerOffers: parseAdminWorkerOffers(payload.workerOffers, dispatchReviewId) },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch {
    return sessionFailure("error");
  }
}
