import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../../../sessionBoundary";
import { parseOrderLateCancellation } from "../../../lateCancellationBoundary";

const privateHeaders = { "cache-control": "private, no-store" };

// Read-only: what canceling the whole order now would bill (shown before the employer confirms).
export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, organizationId, token } = await sessionBoundary();
  const resolved = await resolveClientOrganizationId(gateway, token, organizationId);
  if (resolved.status === "context_required") {
    return Response.json(
      { status: "organization_required", organizations: resolved.organizations },
      { status: 409, headers: privateHeaders }
    );
  }
  if (resolved.status !== "ok") return sessionFailure(resolved.status);
  const { orderId } = await context.params;
  const result = await gateway.request(
    `/organizations/${encodeURIComponent(resolved.organizationId)}/orders/${encodeURIComponent(orderId)}/cancel/preview`,
    "POST",
    token,
    {}
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  const lateCancellation = parseOrderLateCancellation(result.payload);
  if (!lateCancellation) return sessionFailure("unavailable");
  return Response.json({ lateCancellation }, { headers: privateHeaders });
}
