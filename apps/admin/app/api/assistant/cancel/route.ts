import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../sessionBoundary";

// Staff pressed Cancel on an assistant action card: nothing runs, and the card can't be used again.
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await gateway.request("/platform/assistant/cancel", "POST", token, {
    token: typeof body.token === "string" ? body.token : "",
    locale: typeof body.locale === "string" ? body.locale : "en"
  });
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
