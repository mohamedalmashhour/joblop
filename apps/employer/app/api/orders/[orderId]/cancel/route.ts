import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../../sessionBoundary";

const privateHeaders = { "cache-control": "private, no-store" };

// Cancel the whole order. A reason is forwarded; the API cascades the governed cancel to child roles.
export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const reason = typeof body?.reason === "string" && body.reason.trim() ? body.reason.trim() : null;
  if (!reason) {
    return Response.json(
      { status: "invalid", message: "A cancellation reason is required." },
      { status: 400, headers: privateHeaders }
    );
  }
  const { gateway, organizationId, token } = await sessionBoundary();
  const resolved = await resolveClientOrganizationId(gateway, token, organizationId);
  if (resolved.status === "context_required") {
    return Response.json(
      { status: "organization_required", organizations: resolved.organizations },
      { status: 409, headers: privateHeaders }
    );
  }
  if (resolved.status !== "ok") return sessionFailure(resolved.status);
  const { orderId } = await context.params;
  const result = await gateway.request(
    `/organizations/${encodeURIComponent(resolved.organizationId)}/orders/${encodeURIComponent(orderId)}/cancel`,
    "POST",
    token,
    { reason }
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: privateHeaders });
}
