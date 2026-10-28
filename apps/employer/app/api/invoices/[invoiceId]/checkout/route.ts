import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../../sessionBoundary";

// Money-flow Phase 1 — start a Stripe TEST hosted-checkout for an issued invoice. BFF only forwards the
// session's organization + the invoice id to the API, which fail-closes unless INVOICE_TEST_MODE is on.
// No card data passes through here; the browser is redirected to Stripe's hosted test page.
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
  const origin = new URL(request.url).origin;
  const result = await gateway.request(
    `/organizations/${encodeURIComponent(organization.organizationId)}/invoices/${encodeURIComponent(invoiceId)}/checkout`,
    "POST",
    token,
    { origin }
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: privateHeaders });
}

const privateHeaders = { "cache-control": "private, no-store" };
