import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../../../../sessionBoundary";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["contact", "shortlist", "hire", "not_selected"]);

// Long-term job: the employer's choice on one applicant (contact, shortlist, hire, not selected).
// The API checks the job is this employer's long-term listing and tells the worker.
export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ jobRequestId: string; interestId: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { jobRequestId, interestId } = await context.params;
  const input = (await request.json().catch(() => null)) as { action?: unknown } | null;
  if (!uuid.test(jobRequestId) || !uuid.test(interestId) || typeof input?.action !== "string" || !ACTIONS.has(input.action)) {
    return sessionFailure("not_found");
  }
  const { gateway, organizationId, token } = await sessionBoundary();
  const organization = await resolveClientOrganizationId(gateway, token, organizationId);
  if (organization.status === "context_required") return sessionFailure("stale");
  if (organization.status !== "ok") return sessionFailure(organization.status);
  const result = await gateway.request(
    `/organizations/${encodeURIComponent(organization.organizationId)}/job-requests/${encodeURIComponent(jobRequestId)}/applicants/${encodeURIComponent(interestId)}/decision`,
    "POST",
    token,
    { action: input.action }
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
