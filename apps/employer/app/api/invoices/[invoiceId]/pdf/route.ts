import { resolveClientOrganizationId, sessionBoundary, sessionFailure } from "../../../sessionBoundary";

// The PDF of one of this company's issued invoices. The API checks the invoice belongs to the
// company and is visible to the employer.
export async function GET(_request: Request, context: Readonly<{ params: Promise<{ invoiceId: string }> }>) {
  const { invoiceId } = await context.params;
  const { gateway, organizationId, token } = await sessionBoundary();
  const organization = await resolveClientOrganizationId(gateway, token, organizationId);
  if (organization.status !== "ok") return sessionFailure(organization.status === "context_required" ? "denied" : organization.status);
  const result = await gateway.requestPdf(
    `/organizations/${encodeURIComponent(organization.organizationId)}/invoices/${encodeURIComponent(invoiceId)}/pdf`,
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  const name = `invoice-${invoiceId.replace(/[^A-Za-z0-9-]/g, "").slice(0, 40)}.pdf`;
  return new Response(result.bytes as BodyInit, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "private, no-store"
    }
  });
}
