import {
  isSameOriginMutation,
  sessionBoundary,
  sessionCookieName,
  sessionCookieOptions,
  sessionFailure
} from "../../sessionBoundary";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { cookieStore, gateway, token } = await sessionBoundary();
  if (token) {
    await gateway.request("/auth/sign-out", "POST", token).catch(() => undefined);
  }
  cookieStore.set(sessionCookieName, "", { ...sessionCookieOptions, maxAge: 0 });
  return Response.json({ status: "ok" }, { headers: { "cache-control": "private, no-store" } });
}
