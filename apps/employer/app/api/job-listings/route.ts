import { resolveClientOrganizationId, sessionBoundary, sessionFailure } from "../sessionBoundary";
import { fetchPublicPlanStatus, privateHeaders } from "../employer-plan/planBoundary";

// GET the company's long-term job listings (paid in advance): each long-term job with its listing
// status (not listed / free trial / listed until), the next month's price with GST + QST, and open
// orders. While EMPLOYER_PLANS_ENABLED is off this answers { enabled: false } and the page shows
// nothing.
export async function GET() {
  const status = await fetchPublicPlanStatus();
  if (!status.enabled) return Response.json({ enabled: false }, { headers: privateHeaders });
  const { gateway, organizationId, token } = await sessionBoundary();
  if (!token) return Response.json({ enabled: true, signedIn: false }, { headers: privateHeaders });
  const organization = await resolveClientOrganizationId(gateway, token, organizationId);
  if (organization.status === "denied") return Response.json({ enabled: true, signedIn: false }, { headers: privateHeaders });
  if (organization.status === "context_required") {
    return Response.json({ enabled: true, signedIn: true, companyRequired: true }, { headers: privateHeaders });
  }
  if (organization.status !== "ok") return sessionFailure(organization.status);
  const result = await gateway.request(
    `/employer/job-listings?organizationId=${encodeURIComponent(organization.organizationId)}`,
    "GET",
    token
  );
  if (result.status === "not_found" || result.status === "denied") {
    return Response.json({ enabled: true, signedIn: true, manager: false }, { headers: privateHeaders });
  }
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(
    { ...(result.payload as Record<string, unknown>), signedIn: true, manager: true },
    { headers: privateHeaders }
  );
}
