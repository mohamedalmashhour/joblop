import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../sessionBoundary";

// Staff pressed Confirm on an assistant action card (Contact desk "Ask"). The API checks the signed card,
// the switches and the staff member's own permissions again before anything runs.
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await gateway.request("/platform/assistant/confirm", "POST", token, {
    token: typeof body.token === "string" ? body.token : "",
    locale: typeof body.locale === "string" ? body.locale : "en"
  });
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
