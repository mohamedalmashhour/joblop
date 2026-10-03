import {
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../sessionBoundary";

const privateHeaders = { "cache-control": "private, no-store" };

// Advisory market-wage references for the roles at a residence's province. Read-only.
export async function GET(request: Request) {
  const { gateway, organizationId, token } = await sessionBoundary();
  const resolved = await resolveClientOrganizationId(gateway, token, organizationId);
  if (resolved.status === "context_required") {
    return Response.json(
      { status: "organization_required", organizations: resolved.organizations },
      { status: 409, headers: privateHeaders }
    );
  }
  if (resolved.status !== "ok") return sessionFailure(resolved.status);
  const residenceId = new URL(request.url).searchParams.get("residenceId") ?? "";
  const query = residenceId ? `?residenceId=${encodeURIComponent(residenceId)}` : "";
  const result = await gateway.request(
    `/organizations/${encodeURIComponent(resolved.organizationId)}/market-wages${query}`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: privateHeaders });
}
