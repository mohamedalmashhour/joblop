import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../../sessionBoundary";

const privateHeaders = { "cache-control": "private, no-store" };

// Puts a site on the map from its postal code. Worker search only finds sites with a location.
export async function POST(request: Request, context: { params: Promise<{ residenceId: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { residenceId } = await context.params;
  const input = (await request.json().catch(() => null)) as { postalCode?: unknown } | null;
  const postalCode = typeof input?.postalCode === "string" ? input.postalCode.trim() : "";
  if (!postalCode || postalCode.length > 12) {
    return Response.json({ status: "invalid" }, { status: 400, headers: privateHeaders });
  }
  const { gateway, organizationId, token } = await sessionBoundary();
  const organization = await resolveClientOrganizationId(gateway, token, organizationId);
  if (organization.status === "context_required") {
    return Response.json(
      { status: "organization_required", organizations: organization.organizations },
      { status: 409, headers: privateHeaders }
    );
  }
  if (organization.status !== "ok") return sessionFailure(organization.status);
  const result = await gateway.request(
    `/organizations/${encodeURIComponent(organization.organizationId)}/residences/${encodeURIComponent(residenceId)}/geocode`,
    "POST",
    token,
    { postalCode }
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: privateHeaders });
}
