import {
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../sessionBoundary";

const privateHeaders = { "cache-control": "private, no-store" };

export async function GET(_request: Request, context: { params: Promise<{ orderId: string }> }) {
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
    `/organizations/${encodeURIComponent(resolved.organizationId)}/orders/${encodeURIComponent(orderId)}`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: privateHeaders });
}
