import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../../../sessionBoundary";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { id } = await context.params;
  const result = await gateway.request(`/inbox/greetings/${encodeURIComponent(id)}/read`, "POST", token, {});
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
