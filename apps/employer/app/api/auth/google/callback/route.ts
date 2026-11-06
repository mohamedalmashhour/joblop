import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  sessionBoundary,
  sessionCookieName,
  sessionCookieOptions
} from "../../../sessionBoundary";
import { GOOGLE_STATE_COOKIE, GOOGLE_STATE_PATH, publicOrigin } from "../state";

// Build a redirect that carries its Set-Cookie: a bare Response.redirect() drops cookies set via
// next/headers, so the state clear and the session cookie must ride on a NextResponse.
function redirectTo(url: string, issuedToken: string | null = null): NextResponse {
  const response = NextResponse.redirect(url, 302);
  response.cookies.set(GOOGLE_STATE_COOKIE, "", { path: GOOGLE_STATE_PATH, maxAge: 0 });
  if (issuedToken) response.cookies.set(sessionCookieName, issuedToken, sessionCookieOptions);
  return response;
}

// Google returns here with ?code&state. Validate state, exchange via the API (provision/link +
// issue session), set the employer session cookie, then route into the app (onboarding if new).
export async function GET(request: Request) {
  const origin = publicOrigin(request);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  const store = await cookies();
  const raw = store.get(GOOGLE_STATE_COOKIE)?.value ?? null;

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
    return redirectTo(`${origin}/signin?google=error`);
  }

  const { gateway, token } = await sessionBoundary();
  if (token) {
    return redirectTo(`${origin}/signin?google=already`);
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
    return redirectTo(`${origin}/signin?google=failed`);
  }
  return redirectTo(`${origin}/`, issuedToken);
}
