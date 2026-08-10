import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../../sessionBoundary";

// Duplicate a request into a new DRAFT. The browser supplies nothing authoritative;
// the API copies governed fields from the source and reprices from the current
// contract. Returns the new draft id so the UI can send the employer to review the
// date/time + current rate before submitting.
export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ jobRequestId: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { jobRequestId } = await context.params;
  const { gateway, organizationId, token } = await sessionBoundary();
  const organization = await resolveClientOrganizationId(gateway, token, organizationId);
  if (organization.status === "context_required") return sessionFailure("stale");
  if (organization.status !== "ok") return sessionFailure(organization.status);

  const result = await gateway.request(
    `/organizations/${encodeURIComponent(organization.organizationId)}/job-requests/${encodeURIComponent(jobRequestId)}/duplicate`,
    "POST",
    token,
    {}
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  const payload = result.payload as {
    jobRequest?: { id?: unknown };
    duplicatedFromRequestNumber?: unknown;
  };
  const newId = typeof payload.jobRequest?.id === "string" ? payload.jobRequest.id : null;
  if (!newId) return sessionFailure("error");
  return Response.json(
    {
      draftId: newId,
      duplicatedFrom:
        typeof payload.duplicatedFromRequestNumber === "string"
          ? payload.duplicatedFromRequestNumber
          : null
    },
    { headers: { "cache-control": "private, no-store" } }
  );
}
