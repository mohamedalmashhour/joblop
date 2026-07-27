import {
  isSameOriginMutation,
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
  if (token) {
    return Response.json(
      { status: "sign_out_required", message: "Sign out before changing accounts." },
      { status: 409, headers: { "cache-control": "private, no-store" } }
    );
  }
  const result = await gateway.signIn(credentials, (token) => {
    cookieStore.set(sessionCookieName, token, sessionCookieOptions);
  });
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}

function validCredentials(input: unknown): input is { email: string; password: string } {
  return typeof input === "object" && input !== null &&
    "email" in input && typeof input.email === "string" &&
    "password" in input && typeof input.password === "string";
}
