import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const result = await gateway.request(`/contact/worker/conversations/${encodeURIComponent(id)}/messages`, "POST", token, body);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
