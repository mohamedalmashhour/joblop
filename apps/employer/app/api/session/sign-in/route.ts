import {
  isSameOriginMutation,
  organizationContextCookieName,
  sessionBoundary,
  sessionCookieName,
  sessionCookieOptions,
  sessionFailure
} from "../../sessionBoundary";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const credentials = await request.json().catch(() => null);
  if (!validCredentials(credentials)) return sessionFailure("denied");
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
  cookieStore.set(organizationContextCookieName, "", {
    ...sessionCookieOptions,
    maxAge: 0
  });
  const result = await gateway.signIn(credentials, (token) => {
    cookieStore.set(sessionCookieName, token, sessionCookieOptions);
  });
  if (result.status === "rate_limited") {
    return Response.json(
      { status: "rate_limited", message: "Sign-in is temporarily limited. Try again later." },
      {
        status: 429,
        headers: {
          "cache-control": "private, no-store",
          "retry-after": String(result.retryAfterSeconds)
        }
      }
    );
  }
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}

function validCredentials(input: unknown): input is { email: string; password: string } {
  return (
    typeof input === "object" &&
    input !== null &&
    "email" in input &&
    typeof input.email === "string" &&
    "password" in input &&
    typeof input.password === "string"
  );
}
