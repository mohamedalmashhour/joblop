import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { sessionBoundary } from "../../../sessionBoundary";
import { GOOGLE_STATE_COOKIE, GOOGLE_STATE_PATH, publicOrigin } from "../state";

// Begin Google OAuth for the employer app. CSRF `state` is stashed in a SameSite=Lax cookie so it
// survives the top-level return from Google; the session cookie (Strict) is set in the callback.

export async function GET(request: Request) {
  const origin = publicOrigin(request);
  const url = new URL(request.url);
  const withCalendar = url.searchParams.get("calendar") === "1";
  const { gateway } = await sessionBoundary();
  const state = randomBytes(18).toString("base64url");
  const redirectUri = `${origin}/api/auth/google/callback`;
  const authUrl = await gateway.googleAuthorizeUrl({ redirectUri, state, withCalendar });
  if (!authUrl) {
    return NextResponse.redirect(`${origin}/signin?google=unavailable`, 302);
  }
  // Set the cookie ON the redirect: a bare Response.redirect() drops cookies set via next/headers, so
  // the callback would never see the state.
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
