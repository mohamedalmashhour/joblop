import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../../sessionBoundary";

// Worker removes their OWN document (revoke + audit). Same-origin, worker-scoped; the backend enforces
// ownership. The worker can re-upload afterwards.
export async function POST(request: Request, context: { params: Promise<{ documentId: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { documentId } = await context.params;
  const result = await gateway.request(`/hr/documents/${encodeURIComponent(documentId)}/remove`, "POST", token, {});
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
