import { publicOrigin } from "../../../auth/google/state";
import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../../sessionBoundary";
import { privateHeaders, readBody } from "../../../employer-plan/planBoundary";

// Publish a long-term job: "trial" (the company's one 2-week free trial) or "pay" (one month in
// advance by Interac e-transfer or Stripe TEST card; also used for "Renew 1 month"). The BFF adds the
// session's organization; the API checks the caller manages it and that the job is the company's own
// long-term job, and refuses everything while EMPLOYER_PLANS_ENABLED is off.
const ACTIONS = new Set(["trial", "pay"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ jobRequestId: string; action: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { jobRequestId, action } = await context.params;
  if (!ACTIONS.has(action) || !UUID.test(jobRequestId)) return sessionFailure("not_found");
  const body = readBody(await request.json().catch(() => null));
  const { gateway, organizationId, token } = await sessionBoundary();
  const organization = await resolveClientOrganizationId(gateway, token, organizationId);
  if (organization.status === "context_required") {
    return Response.json({ status: "organization_required" }, { status: 409, headers: privateHeaders });
  }
  if (organization.status !== "ok") return sessionFailure(organization.status);
  const payload: Record<string, unknown> = { organizationId: organization.organizationId };
  if (action === "pay") {
    payload.method = body.method === "stripe" ? "stripe" : "e_transfer";
    // Stripe sends the employer back to the job list, so it needs the public address.
    payload.origin = publicOrigin(request);
  }
  const result = await gateway.request(
    `/employer/job-listings/${encodeURIComponent(jobRequestId)}/${action}`,
    "POST",
    token,
    payload
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: privateHeaders });
}
