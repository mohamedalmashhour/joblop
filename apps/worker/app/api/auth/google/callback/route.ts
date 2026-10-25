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
    return Response.redirect(`${origin}/?google=error`, 302);
  }

  const { cookieStore, gateway, token } = await sessionBoundary();
  if (token) {
    // Already signed in. If this was a "Connect Google Calendar" grant, link it to the current
    // account; otherwise don't silently swap accounts.
    if (expected.withCalendar === true) {
      const link = await gateway.googleLinkCalendar(
        { code, redirectUri: `${origin}/api/auth/google/callback` },
        token
      );
      return Response.redirect(
        `${origin}/schedule?calendar=${link.status === "ok" ? "connected" : "error"}`,
        302
      );
    }
    return Response.redirect(`${origin}/?google=already`, 302);
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
    return Response.redirect(`${origin}/?google=failed`, 302);
  }
  return Response.redirect(`${origin}/`, 302);
}
