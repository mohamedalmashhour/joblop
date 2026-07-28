import { parseAdminDispatchReview, readDispatchTransitionInput } from "../../dispatchBoundary";
import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";

export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ dispatchReviewId: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const input = readDispatchTransitionInput(await request.json().catch(() => null));
  if (!input) {
    return Response.json(
      { status: "invalid", message: "A current dispatch version is required." },
      { status: 400, headers: privateHeaders }
    );
  }
  const { dispatchReviewId } = await context.params;
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request(
    `/platform/dispatches/${encodeURIComponent(dispatchReviewId)}/candidate-review`,
    "POST",
    token,
    input
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    const payload = result.payload as { dispatchReview?: unknown };
    return Response.json(
      { dispatchReview: parseAdminDispatchReview(payload.dispatchReview) },
      { headers: privateHeaders }
    );
  } catch {
    return sessionFailure("error");
  }
}

const privateHeaders = { "cache-control": "private, no-store" };
