import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../../sessionBoundary";

// Live edit — forwards the PROPOSED values + expected version only. The server
// classifies (material vs non-material), applies non-material directly, and records
// material changes as a governed proposal. The browser never supplies the
// classification or a rate.
export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ jobRequestId: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const body = await request.json().catch(() => null);
  const rec = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const proposed = typeof rec.proposed === "object" && rec.proposed !== null ? (rec.proposed as Record<string, unknown>) : null;
  const expectedVersion = typeof rec.expectedVersion === "number" && Number.isInteger(rec.expectedVersion) ? rec.expectedVersion : null;
  if (!proposed || expectedVersion === null) {
    return Response.json({ status: "invalid", message: "proposed values and expectedVersion are required." }, { status: 400, headers: PRIVATE });
  }

  const { jobRequestId } = await context.params;
  const { gateway, organizationId, token } = await sessionBoundary();
  const organization = await resolveClientOrganizationId(gateway, token, organizationId);
  if (organization.status === "context_required") return sessionFailure("stale");
  if (organization.status !== "ok") return sessionFailure(organization.status);

  const result = await gateway.request(
    `/organizations/${encodeURIComponent(organization.organizationId)}/job-requests/${encodeURIComponent(jobRequestId)}/edit`,
    "POST",
    token,
    { proposed, expectedVersion, ...(typeof rec.reason === "string" ? { reason: rec.reason } : {}) }
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  const p = result.payload as {
    classification?: unknown;
    applied?: unknown;
    materialFields?: unknown;
    requiresReconfirmation?: unknown;
    proposal?: { status?: unknown } | null;
  };
  return Response.json(
    {
      classification: p.classification === "MATERIAL" ? "MATERIAL" : "NON_MATERIAL",
      applied: p.applied === true,
      materialFields: Array.isArray(p.materialFields) ? p.materialFields.filter((v): v is string => typeof v === "string") : [],
      requiresReconfirmation: p.requiresReconfirmation === true,
      proposalStatus: p.proposal && typeof p.proposal.status === "string" ? p.proposal.status : null
    },
    { headers: PRIVATE }
  );
}

const PRIVATE = { "cache-control": "private, no-store" };
