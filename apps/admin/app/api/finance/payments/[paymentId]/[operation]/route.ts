import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../../../sessionBoundary";
import { readOrganizationId } from "../../../financeBoundary";

// Payment operation proxy (authorize/capture/void/refund) against the local fake provider.
// Session-gated, same-origin CSRF; the API enforces authority, state machine and idempotency.
// org via ?organizationId=.
export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ paymentId: string; operation: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const organizationId = readOrganizationId(request);
  if (!organizationId) {
    return Response.json({ status: "invalid", message: "A valid organization reference is required." }, { status: 400, headers: { "cache-control": "private, no-store" } });
  }
  const { paymentId, operation } = await context.params;
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = await request.json().catch(() => ({}));
  const result = await gateway.request(
    `/organizations/${encodeURIComponent(organizationId)}/payments/${encodeURIComponent(paymentId)}/${encodeURIComponent(operation)}`,
    "POST",
    token,
    body
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
