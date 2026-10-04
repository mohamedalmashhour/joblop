import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../../../sessionBoundary";

const privateHeaders = { "cache-control": "private, no-store" };

// Raise an owner escalation for one role line in an order.
export async function POST(request: Request, context: { params: Promise<{ orderId: string; jobRequestId: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const reason = typeof body?.reason === "string" && body.reason.trim().length >= 4 ? body.reason.trim() : null;
  if (!reason) return Response.json({ status: "invalid", message: "A reason of at least four characters is required." }, { status: 400, headers: privateHeaders });
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { orderId, jobRequestId } = await context.params;
  const result = await gateway.request(
    `/platform/orders/${encodeURIComponent(orderId)}/roles/${encodeURIComponent(jobRequestId)}/escalate`,
    "POST",
    token,
    { reason }
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { status: 201, headers: privateHeaders });
}
