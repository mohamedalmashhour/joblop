import { parseAdminAssignments } from "../../offerAssignmentBoundary";
import { sessionBoundary, sessionFailure } from "../../../sessionBoundary";

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ dispatchReviewId: string }> }>
) {
  const { dispatchReviewId } = await context.params;
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request(
    `/platform/assignments?dispatchReviewId=${encodeURIComponent(dispatchReviewId)}`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    const payload = result.payload as { assignments?: unknown };
    return Response.json(
      { assignments: parseAdminAssignments(payload.assignments, dispatchReviewId) },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch {
    return sessionFailure("error");
  }
}
