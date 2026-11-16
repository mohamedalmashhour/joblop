import {
  isSameOriginMutation,
  sessionBoundary,
  sessionCookieName,
  sessionCookieOptions,
  sessionFailure
} from "../../../sessionBoundary";

// Checks the texted code and, if it is right, sets the CRM session cookie (httpOnly, sameSite=strict,
// secure + __Host- in production). Authority is still checked server-side on every CRM API call.
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const input = (await request.json().catch(() => null)) as { phone?: unknown; code?: unknown } | null;
  if (typeof input?.phone !== "string" || typeof input.code !== "string") return sessionFailure("denied");
  const { cookieStore, gateway } = await sessionBoundary();
  const result = await gateway.phoneVerify("staff", { phone: input.phone, code: input.code }, (token) => {
    cookieStore.set(sessionCookieName, token, sessionCookieOptions);
  });
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
