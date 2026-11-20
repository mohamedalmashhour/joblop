import { isSameOriginMutation, sessionBoundary } from "../../../sessionBoundary";

/**
 * Confirm an email from the emailed link. Public (no sign-in needed: the link may be opened on
 * another device). The /confirm-email page posts the token here when the person taps Confirm.
 */
export async function POST(request: Request) {
  const headers = { "cache-control": "private, no-store" };
  if (!isSameOriginMutation(request)) return Response.json({ status: "failed" }, { status: 403, headers });
  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!/^[A-Za-z0-9_-]{32,256}$/u.test(token)) return Response.json({ status: "failed" }, { status: 400, headers });
  const { gateway } = await sessionBoundary();
  const result = await gateway.publicRequest("/auth/email/confirm", { token });
  if (result.status === "ok") return Response.json({ status: "confirmed" }, { headers });
  if (result.status === "unavailable") return Response.json({ status: "unavailable" }, { status: 503, headers });
  return Response.json({ status: "failed" }, { status: 400, headers });
}
