import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../../../sessionBoundary";
import { privateHeaders } from "../../../planBoundary";

// Employer plan order follow-ups: "claim-etransfer" (I've sent the Interac e-transfer) and "complete"
// (back from the Stripe TEST checkout; the API verifies the payment with Stripe, never trusting us).
const ACTIONS = new Set(["claim-etransfer", "complete"]);

export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ orderId: string; action: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { orderId, action } = await context.params;
  if (!ACTIONS.has(action)) return sessionFailure("not_found");
  const { gateway, organizationId, token } = await sessionBoundary();
  const organization = await resolveClientOrganizationId(gateway, token, organizationId);
  if (organization.status === "context_required") {
    return Response.json({ status: "organization_required" }, { status: 409, headers: privateHeaders });
  }
  if (organization.status !== "ok") return sessionFailure(organization.status);
  const result = await gateway.request(
    `/employer/plan/orders/${encodeURIComponent(orderId)}/${action}`,
    "POST",
    token,
    { organizationId: organization.organizationId }
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: privateHeaders });
}
