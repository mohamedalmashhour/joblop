import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";

/**
 * "Add your email": put an email on the signed-in worker's account and send a confirmation link.
 * Proxies to the backend `/auth/email/add` with the httpOnly session token. A 409 from the backend
 * means the email belongs to another account.
 */
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().slice(0, 254) : "";
  const headers = { "cache-control": "private, no-store" };
  if (!email) return Response.json({ status: "invalid" }, { status: 400, headers });
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request("/auth/email/add", "POST", token, { email });
  if (result.status === "stale") {
    return Response.json(
      { status: "in_use", message: "This email is already used by another account" },
      { status: 409, headers }
    );
  }
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload ?? { status: "sent" }, { headers });
}
