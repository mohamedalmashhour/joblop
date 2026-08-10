import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../../../sessionBoundary";
import { parseReducePreview } from "../../../reduceBoundary";

// Reduce preview — forwards only the desired newTarget. The server derives
// confirmed/unfilled/obligation authoritatively.
export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ jobRequestId: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const body = await request.json().catch(() => null);
  const newTarget = readInt(body, "newTarget");
  if (newTarget === null) {
    return Response.json({ status: "invalid", message: "A new target is required." }, { status: 400, headers: PRIVATE });
  }
  const { jobRequestId } = await context.params;
  const { gateway, organizationId, token } = await sessionBoundary();
  const organization = await resolveClientOrganizationId(gateway, token, organizationId);
  if (organization.status === "context_required") return sessionFailure("stale");
  if (organization.status !== "ok") return sessionFailure(organization.status);

  const result = await gateway.request(
    `/organizations/${encodeURIComponent(organization.organizationId)}/job-requests/${encodeURIComponent(jobRequestId)}/reduce/preview`,
    "POST",
    token,
    { newTarget }
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    return Response.json({ preview: parseReducePreview((result.payload as { preview?: unknown })?.preview) }, { headers: PRIVATE });
  } catch {
    return sessionFailure("error");
  }
}

const PRIVATE = { "cache-control": "private, no-store" };
function readInt(input: unknown, key: string): number | null {
  const v = typeof input === "object" && input !== null ? (input as Record<string, unknown>)[key] : undefined;
  return typeof v === "number" && Number.isInteger(v) ? v : null;
}
