import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../../sessionBoundary";

// The worker pressed Confirm on an assistant action card. The API checks the signed card, the switches
// and the worker's own permissions again before anything runs.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await gateway.request("/contact/worker/assistant/confirm", "POST", token, {
    token: typeof body.token === "string" ? body.token : "",
    locale: typeof body.locale === "string" ? body.locale : "en",
    conversationId: id
  });
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
