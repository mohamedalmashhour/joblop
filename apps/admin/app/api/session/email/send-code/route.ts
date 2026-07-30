import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";

/**
 * Request (or resend) an email-verification code for the signed-in employer. Proxies to the backend
 * `/auth/email/send-code` via the session gateway using the httpOnly session token. The backend
 * endpoint remains fail-closed until its generated durable repository is available. Local development
 * may expose the code only through the backend's explicit non-production opt-in.
 */
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request("/auth/email/send-code", "POST", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload ?? { status: "sent" }, {
    headers: { "cache-control": "private, no-store" }
  });
}
