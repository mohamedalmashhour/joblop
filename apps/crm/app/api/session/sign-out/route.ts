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
  const result = await gateway.signOut(token);
  cookieStore.set(sessionCookieName, "", { ...sessionCookieOptions, maxAge: 0 });
  if (result.status !== "ok") {
    return Response.json(
      { status: "local_session_cleared", remoteRevocation: "unavailable" },
      { status: 202, headers: { "cache-control": "private, no-store" } }
    );
  }
  return new Response(null, { status: 204, headers: { "cache-control": "private, no-store" } });
}
