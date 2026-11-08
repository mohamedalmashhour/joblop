import { publicOrigin } from "../../auth/google/state";
import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../sessionBoundary";
import { privateHeaders, readBody } from "../planBoundary";

// Start a free trial, subscribe (Interac e-transfer or Stripe TEST card), or cancel. The BFF adds the
// session's organization; the API checks the caller manages it and refuses everything while
// EMPLOYER_PLANS_ENABLED is off.
const ACTIONS = new Set(["trial", "subscribe", "cancel"]);

export async function POST(request: Request, context: Readonly<{ params: Promise<{ action: string }> }>) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { action } = await context.params;
  if (!ACTIONS.has(action)) return sessionFailure("not_found");
  const body = readBody(await request.json().catch(() => null));
  const { gateway, organizationId, token } = await sessionBoundary();
  const organization = await resolveClientOrganizationId(gateway, token, organizationId);
  if (organization.status === "context_required") {
    return Response.json({ status: "organization_required" }, { status: 409, headers: privateHeaders });
  }
  if (organization.status !== "ok") return sessionFailure(organization.status);
  const payload: Record<string, unknown> = { organizationId: organization.organizationId };
  if (action === "trial" || action === "subscribe") payload.plan = typeof body.plan === "string" ? body.plan : "";
  if (action === "subscribe") {
    payload.method = body.method === "stripe" ? "stripe" : "e_transfer";
    // Stripe sends the employer back to /plans, so it needs the public address.
    payload.origin = publicOrigin(request);
  }
  if (action === "cancel") payload.track = typeof body.track === "string" ? body.track : "";
  const result = await gateway.request(`/employer/plan/${action}`, "POST", token, payload);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: privateHeaders });
}
