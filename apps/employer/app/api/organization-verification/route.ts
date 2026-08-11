import { resolveClientOrganizationId, sessionBoundary, isSameOriginMutation, sessionFailure } from "../sessionBoundary";

// The signed-in employer's organization verification state.
export async function GET() {
  const { gateway, organizationId, token } = await sessionBoundary();
  const context = await resolveClientOrganizationId(gateway, token, organizationId);
  if (context.status === "context_required") {
    return Response.json({ status: "organization_required", organizations: context.organizations }, { status: 409, headers: { "cache-control": "private, no-store" } });
  }
  if (context.status !== "ok") return sessionFailure(context.status);
  const result = await gateway.request(`/organizations/${encodeURIComponent(context.organizationId)}/verification`, "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}

// Request organization verification (owner/administrator; enforced by the API).
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, organizationId, token } = await sessionBoundary();
  const context = await resolveClientOrganizationId(gateway, token, organizationId);
  if (context.status !== "ok") return sessionFailure(context.status === "context_required" ? "denied" : context.status);
  const result = await gateway.request(`/organizations/${encodeURIComponent(context.organizationId)}/verification/request`, "POST", token, {});
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
