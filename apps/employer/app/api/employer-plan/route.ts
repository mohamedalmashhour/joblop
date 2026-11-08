import { resolveClientOrganizationId, sessionBoundary, sessionFailure } from "../sessionBoundary";
import { fetchPublicPlanStatus, privateHeaders } from "./planBoundary";

// GET the employer's plans. Signed out → only the public status/catalog. Signed in with a company →
// both tracks' current plan, trial availability and recent orders. `?only=status` returns just
// { enabled } (used by the job form to decide whether to ask for the job length).
export async function GET(request: Request) {
  const status = await fetchPublicPlanStatus();
  const url = new URL(request.url);
  if (!status.enabled || url.searchParams.get("only") === "status") {
    return Response.json({ enabled: status.enabled }, { headers: privateHeaders });
  }
  const { gateway, organizationId, token } = await sessionBoundary();
  if (!token) return Response.json({ ...status, signedIn: false }, { headers: privateHeaders });
  const organization = await resolveClientOrganizationId(gateway, token, organizationId);
  if (organization.status === "denied") {
    return Response.json({ ...status, signedIn: false }, { headers: privateHeaders });
  }
  if (organization.status === "context_required") {
    return Response.json({ ...status, signedIn: true, companyRequired: true }, { headers: privateHeaders });
  }
  if (organization.status !== "ok") return sessionFailure(organization.status);
  const result = await gateway.request(
    `/employer/plan?organizationId=${encodeURIComponent(organization.organizationId)}`,
    "GET",
    token
  );
  if (result.status === "not_found" || result.status === "denied") {
    // Not an owner/administrator of the company: show the plans, but no account actions.
    return Response.json({ ...status, signedIn: true, manager: false }, { headers: privateHeaders });
  }
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(
    { ...(result.payload as Record<string, unknown>), signedIn: true, manager: true },
    { headers: privateHeaders }
  );
}
