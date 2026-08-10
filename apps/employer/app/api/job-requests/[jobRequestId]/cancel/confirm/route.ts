import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../../../sessionBoundary";
import { parseCancellationConfirmation } from "../../../cancellationBoundary";

// Confirm cancellation. Security: the ONLY thing forwarded to the API is the
// idempotency key + acknowledgement. Any browser-supplied rate/amount/count/cutoff
// is dropped here — the server recalculates authoritatively at confirm time.
export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ jobRequestId: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const body = await request.json().catch(() => null);
  const idempotencyKey = readIdempotencyKey(body);
  if (!idempotencyKey) {
    return Response.json(
      { status: "invalid", message: "An idempotency key is required." },
      { status: 400, headers: { "cache-control": "private, no-store" } }
    );
  }

  const { jobRequestId } = await context.params;
  const { gateway, organizationId, token } = await sessionBoundary();
  const organization = await resolveClientOrganizationId(gateway, token, organizationId);
  if (organization.status === "context_required") return sessionFailure("stale");
  if (organization.status !== "ok") return sessionFailure(organization.status);

  const result = await gateway.request(
    `/organizations/${encodeURIComponent(organization.organizationId)}/job-requests/${encodeURIComponent(jobRequestId)}/cancel/confirm`,
    "POST",
    token,
    // Whitelist: only the idempotency key crosses the boundary — never a rate,
    // amount, worker count, or cutoff result the browser might have tampered with.
    { idempotencyKey }
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    return Response.json(parseCancellationConfirmation(result.payload), {
      headers: { "cache-control": "private, no-store" }
    });
  } catch {
    return sessionFailure("error");
  }
}

function readIdempotencyKey(input: unknown): string | null {
  if (typeof input !== "object" || input === null || !("idempotencyKey" in input)) return null;
  const value = (input as { idempotencyKey?: unknown }).idempotencyKey;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
