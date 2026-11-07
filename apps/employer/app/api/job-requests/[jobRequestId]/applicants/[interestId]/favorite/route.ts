import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../../../../sessionBoundary";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Marks or clears a favourite: a suggestion to Joblop staff, who still send the offers.
export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ jobRequestId: string; interestId: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { jobRequestId, interestId } = await context.params;
  const input = (await request.json().catch(() => null)) as { favorite?: unknown } | null;
  if (!uuid.test(jobRequestId) || !uuid.test(interestId) || typeof input?.favorite !== "boolean") {
    return sessionFailure("not_found");
  }
  const { gateway, organizationId, token } = await sessionBoundary();
  const organization = await resolveClientOrganizationId(gateway, token, organizationId);
  if (organization.status === "context_required") return sessionFailure("stale");
  if (organization.status !== "ok") return sessionFailure(organization.status);
  const result = await gateway.request(
    `/organizations/${encodeURIComponent(organization.organizationId)}/job-requests/${encodeURIComponent(jobRequestId)}/applicants/${encodeURIComponent(interestId)}/favorite`,
    "POST",
    token,
    { favorite: input.favorite }
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
