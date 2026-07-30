import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";

/**
 * Verify an email-verification code for the signed-in employer. Proxies to the backend
 * `/auth/email/verify-code` via the session gateway. The backend remains fail-closed until its
 * generated durable repository is available. A malformed code is rejected before any network call.
 */
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const body = await request.json().catch(() => null);
  const code = typeof (body as { code?: unknown } | null)?.code === "string"
    ? (body as { code: string }).code.trim()
    : "";
  if (!/^\d{6}$/.test(code)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request("/auth/email/verify-code", "POST", token, { code });
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload ?? { status: "verified" }, {
    headers: { "cache-control": "private, no-store" }
  });
}
