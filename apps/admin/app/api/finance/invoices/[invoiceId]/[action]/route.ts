import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../../../sessionBoundary";
import { readOrganizationId } from "../../../financeBoundary";

// Invoice lifecycle action proxy (approve/issue/view/overdue/dispute/void). Session-gated,
// same-origin CSRF; the API enforces the authority + state machine. org via ?organizationId=.
export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ invoiceId: string; action: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const organizationId = readOrganizationId(request);
  if (!organizationId) {
    return Response.json({ status: "invalid", message: "A valid organization reference is required." }, { status: 400, headers: { "cache-control": "private, no-store" } });
  }
  const { invoiceId, action } = await context.params;
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = await request.json().catch(() => ({}));
  const result = await gateway.request(
    `/organizations/${encodeURIComponent(organizationId)}/invoices/${encodeURIComponent(invoiceId)}/${encodeURIComponent(action)}`,
    "POST",
    token,
    body
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
