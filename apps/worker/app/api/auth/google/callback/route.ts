import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  sessionBoundary,
  sessionCookieName,
  sessionCookieOptions
} from "../../../sessionBoundary";
import { GOOGLE_STATE_COOKIE, GOOGLE_STATE_PATH } from "../state";

// Build a redirect that actually carries its Set-Cookie. A bare Response.redirect() drops cookies set
// via next/headers, so the session cookie (and state clear) must ride on a NextResponse instead.
function redirectTo(url: string, setCookies: (res: NextResponse) => void = () => {}): NextResponse {
  const res = NextResponse.redirect(url, 302);
  setCookies(res);
  return res;
}

function publicOrigin(request: Request): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return site && /^https?:\/\//.test(site) ? site.replace(/\/$/, "") : new URL(request.url).origin;
}

// Google redirects back here with ?code&state. Validate state against the cookie, exchange the code
// via the API (which provisions/links the user and issues a session), set our own session cookie,
// then send the worker into the app. On any failure we redirect home with a reason, never a stack.
export async function GET(request: Request) {
  const origin = publicOrigin(request);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  const store = await cookies();
  const raw = store.get(GOOGLE_STATE_COOKIE)?.value ?? null;
  // Clear the one-time state cookie on every outgoing response.
  const clearState = (res: NextResponse) =>
    res.cookies.set(GOOGLE_STATE_COOKIE, "", { path: GOOGLE_STATE_PATH, maxAge: 0 });

  let expected: { state?: unknown; withCalendar?: unknown } | null;
  try {
    expected = raw ? (JSON.parse(raw) as { state?: unknown; withCalendar?: unknown }) : null;
  } catch {
    expected = null;
  }

  if (
    url.searchParams.get("error") ||
    !code ||
    !returnedState ||
    !expected ||
    typeof expected.state !== "string" ||
    expected.state !== returnedState
  ) {
    return redirectTo(`${origin}/?google=error`, clearState);
  }

  const { gateway, token } = await sessionBoundary();
  if (token) {
    // Already signed in. If this was a "Connect Google Calendar" grant, link it to the current
    // account; otherwise don't silently swap accounts.
    if (expected.withCalendar === true) {
      const link = await gateway.googleLinkCalendar(
        { code, redirectUri: `${origin}/api/auth/google/callback` },
        token
      );
      return redirectTo(
        `${origin}/schedule?calendar=${link.status === "ok" ? "connected" : "error"}`,
        clearState
      );
    }
    return redirectTo(`${origin}/?google=already`, clearState);
  }

  let issuedToken: string | null = null;
  const result = await gateway.googleExchange(
    {
      code,
      redirectUri: `${origin}/api/auth/google/callback`,
      withCalendar: expected.withCalendar === true
    },
    (issued) => {
      issuedToken = issued;
    }
  );

  if (result.status !== "ok") {
    return redirectTo(`${origin}/?google=failed`, clearState);
  }
  // Set the session cookie ON the redirect response so it actually persists.
  return redirectTo(`${origin}/`, (res) => {
    clearState(res);
    if (issuedToken) res.cookies.set(sessionCookieName, issuedToken, sessionCookieOptions);
  });
}
