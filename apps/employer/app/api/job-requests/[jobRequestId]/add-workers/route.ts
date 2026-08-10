import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../../sessionBoundary";

// Add Workers — forwards only the desired addition + expected version. The browser
// never supplies a rate or financial amount; the server derives everything.
export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ jobRequestId: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const body = await request.json().catch(() => null);
  const additionalWorkers = readPositiveInt(body, "additionalWorkers");
  const expectedVersion = readNonNegativeInt(body, "expectedVersion");
  if (additionalWorkers === null || expectedVersion === null) {
    return Response.json(
      { status: "invalid", message: "A positive worker count and current version are required." },
      { status: 400, headers: { "cache-control": "private, no-store" } }
    );
  }

  const { jobRequestId } = await context.params;
  const { gateway, organizationId, token } = await sessionBoundary();
  const organization = await resolveClientOrganizationId(gateway, token, organizationId);
  if (organization.status === "context_required") return sessionFailure("stale");
  if (organization.status !== "ok") return sessionFailure(organization.status);

  const result = await gateway.request(
    `/organizations/${encodeURIComponent(organization.organizationId)}/job-requests/${encodeURIComponent(jobRequestId)}/add-workers`,
    "POST",
    token,
    { additionalWorkers, expectedVersion }
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  const p = result.payload as {
    previousTarget?: unknown;
    addedCapacity?: unknown;
    newTarget?: unknown;
    jobRequest?: { versionToken?: unknown };
  };
  return Response.json(
    {
      previousTarget: intOrNull(p.previousTarget),
      addedCapacity: intOrNull(p.addedCapacity),
      newTarget: intOrNull(p.newTarget),
      versionToken: intOrNull(p.jobRequest?.versionToken)
    },
    { headers: { "cache-control": "private, no-store" } }
  );
}

function readPositiveInt(input: unknown, key: string): number | null {
  const v = record(input)?.[key];
  return typeof v === "number" && Number.isInteger(v) && v >= 1 ? v : null;
}
function readNonNegativeInt(input: unknown, key: string): number | null {
  const v = record(input)?.[key];
  return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null;
}
function record(input: unknown): Record<string, unknown> | null {
  return typeof input === "object" && input !== null ? (input as Record<string, unknown>) : null;
}
function intOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) ? v : null;
}
