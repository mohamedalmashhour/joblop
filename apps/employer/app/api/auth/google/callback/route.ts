import { cookies } from "next/headers";
import {
  sessionBoundary,
  sessionCookieName,
  sessionCookieOptions
} from "../../../sessionBoundary";
import { GOOGLE_STATE_COOKIE, GOOGLE_STATE_PATH } from "../state";

function publicOrigin(request: Request): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return site && /^https?:\/\//.test(site) ? site.replace(/\/$/, "") : new URL(request.url).origin;
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
  store.set(GOOGLE_STATE_COOKIE, "", { path: GOOGLE_STATE_PATH, maxAge: 0 });

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
    return Response.redirect(`${origin}/signin?google=error`, 302);
  }

  const { cookieStore, gateway, token } = await sessionBoundary();
  if (token) {
    return Response.redirect(`${origin}/signin?google=already`, 302);
  }

  const result = await gateway.googleExchange(
    {
      code,
      redirectUri: `${origin}/api/auth/google/callback`,
      withCalendar: expected.withCalendar === true
    },
    (issued) => {
      cookieStore.set(sessionCookieName, issued, sessionCookieOptions);
    }
  );

  if (result.status !== "ok") {
    return Response.redirect(`${origin}/signin?google=failed`, 302);
  }
  return Response.redirect(`${origin}/`, 302);
}
