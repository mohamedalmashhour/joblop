import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";

// Asks for a texted sign-in code. Always answers the same way.
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const input = (await request.json().catch(() => null)) as { phone?: unknown } | null;
  if (typeof input?.phone !== "string" || input.phone.length > 30) return sessionFailure("denied");
  const { gateway } = await sessionBoundary();
  await gateway.phoneRequest("staff", { phone: input.phone });
  return Response.json({ status: "code_requested" }, { status: 202, headers: { "cache-control": "private, no-store" } });
}
