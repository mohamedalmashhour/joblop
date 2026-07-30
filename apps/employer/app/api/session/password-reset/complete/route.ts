import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";

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
    typeof input.token === "string" &&
    "newPassword" in input &&
    typeof input.newPassword === "string"
  );
}
