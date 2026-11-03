import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";

/**
 * Worker "forgot password" — request a reset link. Same-origin only. Delegates to the backend
 * `/auth/password-reset/request` via the shared session gateway. Always returns the same generic
 * 202 whether or not the email matches an account (no account enumeration).
 */
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const body = await request.json().catch(() => null);
  if (!isEmailRequest(body)) return genericResponse();
  const { gateway } = await sessionBoundary();
  await gateway.publicRequest("/auth/password-reset/request", { email: body.email });
  return genericResponse();
}

function genericResponse() {
  return Response.json(
    {
      status: "accepted",
      message: "If an account matches that email, password reset instructions will be sent."
    },
    { status: 202, headers: { "cache-control": "private, no-store" } }
  );
}

function isEmailRequest(input: unknown): input is { email: string } {
  return (
    typeof input === "object" &&
    input !== null &&
    "email" in input &&
    typeof (input as { email: unknown }).email === "string"
  );
}
