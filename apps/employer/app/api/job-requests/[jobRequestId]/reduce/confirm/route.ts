import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../../../sessionBoundary";
import { parseReduceConfirmation } from "../../../reduceBoundary";

// Reduce confirm — forwards ONLY newTarget + selectedAssignmentIds + expectedVersion
// + idempotencyKey. Any browser-supplied rate/amount/confirmed-count/obligation is
// dropped; the server recalculates authoritatively.
export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ jobRequestId: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const body = await request.json().catch(() => null);
  const rec = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const newTarget = int(rec.newTarget);
  const expectedVersion = int(rec.expectedVersion);
  const idempotencyKey = typeof rec.idempotencyKey === "string" && rec.idempotencyKey.trim() ? rec.idempotencyKey.trim() : null;
  const selectedAssignmentIds = Array.isArray(rec.selectedAssignmentIds)
    ? rec.selectedAssignmentIds.filter((v): v is string => typeof v === "string")
    : [];
  if (newTarget === null || expectedVersion === null || !idempotencyKey) {
    return Response.json(
      { status: "invalid", message: "newTarget, expectedVersion and idempotencyKey are required." },
      { status: 400, headers: PRIVATE }
    );
  }

  const { jobRequestId } = await context.params;
  const { gateway, organizationId, token } = await sessionBoundary();
  const organization = await resolveClientOrganizationId(gateway, token, organizationId);
  if (organization.status === "context_required") return sessionFailure("stale");
  if (organization.status !== "ok") return sessionFailure(organization.status);

  const result = await gateway.request(
    `/organizations/${encodeURIComponent(organization.organizationId)}/job-requests/${encodeURIComponent(jobRequestId)}/reduce/confirm`,
    "POST",
    token,
    // Whitelist — no financial values cross the boundary.
    { newTarget, selectedAssignmentIds, expectedVersion, idempotencyKey }
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    return Response.json(parseReduceConfirmation(result.payload), { headers: PRIVATE });
  } catch {
    return sessionFailure("error");
  }
}

const PRIVATE = { "cache-control": "private, no-store" };
function int(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) ? v : null;
}
