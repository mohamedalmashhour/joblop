import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../../sessionBoundary";

// Advisory AI review of the worker's OWN document. Same-origin, worker-scoped; forwards to the backend
// which enforces ownership and the sensitive-type privacy rule. Returns an advisory verdict only.
export async function POST(request: Request, context: { params: Promise<{ documentId: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { documentId } = await context.params;
  const result = await gateway.request(`/hr/documents/${encodeURIComponent(documentId)}/ai-review`, "POST", token, {});
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
