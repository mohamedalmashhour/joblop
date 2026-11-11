import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../../sessionBoundary";

// The employer pressed Cancel on an assistant action card: nothing runs, and the card can't be used again.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await gateway.request("/contact/employer/assistant/cancel", "POST", token, {
    token: typeof body.token === "string" ? body.token : "",
    locale: typeof body.locale === "string" ? body.locale : "en",
    conversationId: id
  });
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
