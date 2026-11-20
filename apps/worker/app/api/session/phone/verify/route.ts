import {
  isSameOriginMutation,
  sessionBoundary,
  sessionCookieName,
  sessionCookieOptions,
  sessionFailure
} from "../../../sessionBoundary";

// Checks the texted code and, if it is right, sets the worker session cookie.
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const input = (await request.json().catch(() => null)) as { phone?: unknown; code?: unknown } | null;
  if (typeof input?.phone !== "string" || typeof input.code !== "string") return sessionFailure("denied");
  const { cookieStore, gateway, token } = await sessionBoundary();
  // Only a live session blocks this. An expired one is cleared, or the person would be told they
  // are signed in while every page refuses them.
  if (token && (await gateway.validate(token)).status !== "denied") {
    return Response.json(
      { status: "sign_out_required", message: "Sign out before changing accounts." },
      { status: 409, headers: { "cache-control": "private, no-store" } }
    );
  }
  if (token) cookieStore.set(sessionCookieName, "", { ...sessionCookieOptions, maxAge: 0 });
  const result = await gateway.phoneVerify("worker", { phone: input.phone, code: input.code }, (issued) => {
    cookieStore.set(sessionCookieName, issued, sessionCookieOptions);
  });
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
