import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../sessionBoundary";

// Unsave (remove a bookmark). Idempotent server-side.
export async function DELETE(request: Request, context: { params: Promise<{ jobRequestId: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { jobRequestId } = await context.params;
  if (!jobRequestId) return sessionFailure("not_found");
  const result = await gateway.request(
    `/marketplace/saved-jobs/${encodeURIComponent(jobRequestId)}`,
    "DELETE",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
