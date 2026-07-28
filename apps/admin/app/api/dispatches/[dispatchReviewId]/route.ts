import { parseAdminDispatchReview } from "../dispatchBoundary";
import { sessionBoundary, sessionFailure } from "../../sessionBoundary";

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ dispatchReviewId: string }> }>
) {
  const { dispatchReviewId } = await context.params;
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request(
    `/platform/dispatches/${encodeURIComponent(dispatchReviewId)}`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    const payload = result.payload as { dispatchReview?: unknown };
    return Response.json(
      { dispatchReview: parseAdminDispatchReview(payload.dispatchReview) },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch {
    return sessionFailure("error");
  }
}
