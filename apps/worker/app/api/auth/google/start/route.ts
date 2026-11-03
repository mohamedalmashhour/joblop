import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { sessionBoundary } from "../../../sessionBoundary";
import { GOOGLE_STATE_COOKIE, GOOGLE_STATE_PATH } from "../state";

// Begin Google OAuth: mint a CSRF `state`, stash it (with the calendar choice) in a short-lived
// cookie, then redirect the browser to Google's consent screen. The state cookie is SameSite=Lax
// so it survives the top-level return navigation from Google (a Strict cookie would be dropped).

function publicOrigin(request: Request): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return site && /^https?:\/\//.test(site) ? site.replace(/\/$/, "") : new URL(request.url).origin;
}

export async function GET(request: Request) {
  const origin = publicOrigin(request);
  const url = new URL(request.url);
  const withCalendar = url.searchParams.get("calendar") === "1";
  const { gateway } = await sessionBoundary();
  const state = randomBytes(18).toString("base64url");
  const redirectUri = `${origin}/api/auth/google/callback`;
  const authUrl = await gateway.googleAuthorizeUrl({ redirectUri, state, withCalendar });
  if (!authUrl) {
    return NextResponse.redirect(`${origin}/?google=unavailable`, 302);
  }
  // Set the CSRF-state cookie ON the redirect response. A bare Response.redirect() drops any cookie
  // set via next/headers, so the callback would never see the state and would fail with ?google=error.
  const response = NextResponse.redirect(authUrl, 302);
  response.cookies.set(GOOGLE_STATE_COOKIE, JSON.stringify({ state, withCalendar }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: GOOGLE_STATE_PATH,
    maxAge: 600
  });
  return response;
}
