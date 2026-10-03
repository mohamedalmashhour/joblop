import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../../sessionBoundary";

const privateHeaders = { "cache-control": "private, no-store" };

// Submit the whole order for admin review (every still-draft child role line).
export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
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
    `/organizations/${encodeURIComponent(resolved.organizationId)}/orders/${encodeURIComponent(orderId)}/submit`,
    "POST",
    token,
    {}
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: privateHeaders });
}
