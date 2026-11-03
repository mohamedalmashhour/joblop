import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";

/**
 * Worker "reset password" — complete with a token + new password. Same-origin only. Delegates to the
 * backend `/auth/password-reset/complete`. On success the password is changed and existing sessions
 * are invalidated server-side.
 */
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const body = await request.json().catch(() => null);
  if (!isReset(body)) return failure();
  const { gateway } = await sessionBoundary();
  const result = await gateway.publicRequest("/auth/password-reset/complete", body);
  return result.status === "ok"
    ? Response.json({ status: "reset" }, { headers: noStore })
    : failure();
}

const noStore = { "cache-control": "private, no-store" };

function failure() {
  return Response.json(
    { status: "reset_failed", message: "Password reset could not be completed." },
    { status: 400, headers: noStore }
  );
}

function isReset(input: unknown): input is { token: string; newPassword: string } {
  return (
    typeof input === "object" &&
    input !== null &&
    "token" in input &&
    typeof (input as { token: unknown }).token === "string" &&
    "newPassword" in input &&
    typeof (input as { newPassword: unknown }).newPassword === "string"
  );
}
