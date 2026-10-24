import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";

/**
 * Verify the email code the worker entered. Proxies to the backend `/auth/email/verify-code` with the
 * httpOnly session token. Only the numeric code crosses the boundary.
 */
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const body = await request.json().catch(() => null);
  const code = body && typeof body === "object" && typeof (body as Record<string, unknown>).code === "string" ? (body as Record<string, string>).code : null;
  if (!code) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request("/auth/email/verify-code", "POST", token, { code });
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload ?? { status: "verified" }, { headers: { "cache-control": "private, no-store" } });
}
