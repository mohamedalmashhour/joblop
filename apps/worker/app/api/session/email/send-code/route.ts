import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";

/**
 * Request (or resend) an email-verification code for the signed-in worker. Proxies to the backend
 * `/auth/email/send-code` via the session gateway using the httpOnly session token. In local/dev the
 * backend may return the code in the payload; in production it only emails it.
 */
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request("/auth/email/send-code", "POST", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload ?? { status: "sent" }, { headers: { "cache-control": "private, no-store" } });
}
