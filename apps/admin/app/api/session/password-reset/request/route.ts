import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const body = await request.json().catch(() => null);
  if (isEmailRequest(body)) {
    const { gateway } = await sessionBoundary();
    await gateway.publicRequest("/auth/password-reset/request", { email: body.email });
  }
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
    typeof input.email === "string"
  );
}
