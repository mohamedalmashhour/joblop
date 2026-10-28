import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../../../sessionBoundary";

// Money-flow Phase 1 — finalize a Stripe TEST checkout after the hosted page returns. The API RETRIEVES
// the session from Stripe and verifies it was actually paid for this invoice before flipping it to
// `paid`; the client is never trusted. Idempotent. No money moves (TEST path, FINANCE_LIVE stays off).
export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ invoiceId: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { invoiceId } = await context.params;
  const { gateway, organizationId, token } = await sessionBoundary();
  const organization = await resolveClientOrganizationId(gateway, token, organizationId);
  if (organization.status === "context_required") {
    return Response.json(
      { status: "organization_required", organizations: organization.organizations },
      { status: 409, headers: privateHeaders }
    );
  }
  if (organization.status !== "ok") return sessionFailure(organization.status);
  const result = await gateway.request(
    `/organizations/${encodeURIComponent(organization.organizationId)}/invoices/${encodeURIComponent(invoiceId)}/checkout/complete`,
    "POST",
    token,
    {}
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: privateHeaders });
}

const privateHeaders = { "cache-control": "private, no-store" };
