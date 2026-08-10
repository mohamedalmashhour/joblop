import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../../../sessionBoundary";
import { parseCancellationPreview } from "../../../cancellationBoundary";

// Read-only authoritative cancellation consequence. POST (no authoritative body) —
// the browser sends nothing; the server derives count/rate/obligation.
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
    `/organizations/${encodeURIComponent(organization.organizationId)}/job-requests/${encodeURIComponent(jobRequestId)}/cancel/preview`,
    "POST",
    token,
    {}
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    return Response.json(
      { preview: parseCancellationPreview((result.payload as { preview?: unknown })?.preview) },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch {
    return sessionFailure("error");
  }
}
