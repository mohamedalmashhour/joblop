import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";

const privateHeaders = { "cache-control": "private, no-store" };

// Owner closes an escalation: resolve (handled) or dismiss (no action needed).
export async function POST(request: Request, context: { params: Promise<{ escalationId: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { escalationId } = await context.params;
  const result = await gateway.request(
    `/platform/escalations/${encodeURIComponent(escalationId)}/resolve`,
    "POST",
    token,
    { resolution: typeof body?.resolution === "string" ? body.resolution : null, dismiss: body?.dismiss === true }
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: privateHeaders });
}
