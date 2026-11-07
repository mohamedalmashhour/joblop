import { randomBytes } from "node:crypto";

import {
  isSameOriginMutation,
  organizationContextCookieName,
  sessionBoundary,
  sessionCookieName,
  sessionCookieOptions,
  sessionFailure
} from "../../sessionBoundary";

/**
 * Employer sign-up route. Same-origin only. Delegates to the backend `/auth/register` via the shared
 * session gateway, which the API gates to non-production — so this returns a plain "registration
 * closed" in production rather than pretending to create an account. On success the gateway persists
 * the token into the httpOnly employer session cookie, exactly like sign-in.
 */
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const body = await request.json().catch(() => null);
  if (!validRegistration(body)) return sessionFailure("denied");
  const { cookieStore, gateway, token } = await sessionBoundary();
  // Only a live session blocks this. An expired one is cleared, or the person would be told they
  // are signed in while every page refuses them.
  if (token && (await gateway.validate(token)).status !== "denied") {
    return Response.json(
      { status: "sign_out_required", message: "Sign out before creating another account." },
      { status: 409, headers: { "cache-control": "private, no-store" } }
    );
  }
  if (token) cookieStore.set(sessionCookieName, "", { ...sessionCookieOptions, maxAge: 0 });
  cookieStore.set(organizationContextCookieName, "", { ...sessionCookieOptions, maxAge: 0 });

  const result = await gateway.register(
    {
      email: body.email,
      // Employers sign in by texted code. The account still stores a password nobody ever sees.
      password: `${randomBytes(32).toString("base64url")}a1`,
      displayName: body.displayName ?? null,
      phone: body.phone,
      referralCode: body.referralCode ?? null
    },
    (issuedToken) => {
      cookieStore.set(sessionCookieName, issuedToken, sessionCookieOptions);
    }
  );

  if (result.status === "registration_closed") {
    return Response.json(
      {
        status: "registration_closed",
        message: "Account creation is not open in this environment yet."
      },
      { status: 404, headers: { "cache-control": "private, no-store" } }
    );
  }
  if (result.status === "rate_limited") {
    return Response.json(
      { status: "rate_limited", message: "Sign-up is temporarily limited. Try again later." },
      {
        status: 429,
        headers: {
          "cache-control": "private, no-store",
          "retry-after": String(result.retryAfterSeconds)
        }
      }
    );
  }
  if (result.status === "conflict") {
    return Response.json(
      { status: "conflict", message: "That email is already registered. Try signing in instead." },
      { status: 409, headers: { "cache-control": "private, no-store" } }
    );
  }
  if (result.status === "invalid") {
    return Response.json(
      { status: "invalid", message: "Check your details and try again." },
      { status: 400, headers: { "cache-control": "private, no-store" } }
    );
  }
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}

function validRegistration(
  input: unknown
): input is {
  email: string;
  confirmEmail: string;
  acceptedNotices: true;
  displayName?: string | null;
  phone: string;
  referralCode?: string | null;
} {
  if (typeof input !== "object" || input === null) return false;
  const record = input as Record<string, unknown>;
  return (
    typeof record.email === "string" &&
    typeof record.confirmEmail === "string" &&
    record.email.trim().toLowerCase() === record.confirmEmail.trim().toLowerCase() &&
    record.acceptedNotices === true &&
    (record.displayName === undefined ||
      record.displayName === null ||
      typeof record.displayName === "string") &&
    typeof record.phone === "string" &&
    record.phone.replace(/\D/g, "").length >= 10
  );
}
