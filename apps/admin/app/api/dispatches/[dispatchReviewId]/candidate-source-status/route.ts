import { parseCandidateSourceStatus } from "../../dispatchBoundary";
import { sessionBoundary, sessionFailure } from "../../../sessionBoundary";

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ dispatchReviewId: string }> }>
) {
  const { dispatchReviewId } = await context.params;
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request(
    `/platform/dispatches/${encodeURIComponent(dispatchReviewId)}/candidate-source-status`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    return Response.json(parseCandidateSourceStatus(result.payload), {
      headers: { "cache-control": "private, no-store" }
    });
  } catch {
    return sessionFailure("error");
  }
}
