import { resolveClientOrganizationId, sessionBoundary, sessionFailure } from "../../../sessionBoundary";

// The PDF of one of this company's payment receipts (plans and long-term listings). The API checks
// the receipt belongs to the company and that the caller is an owner or administrator of it.
const ID = /^[0-9a-f-]{36}$/i;

export async function GET(_request: Request, context: Readonly<{ params: Promise<{ receiptId: string }> }>) {
  const { receiptId } = await context.params;
  if (!ID.test(receiptId)) return sessionFailure("not_found");
  const { gateway, organizationId, token } = await sessionBoundary();
  const organization = await resolveClientOrganizationId(gateway, token, organizationId);
  if (organization.status !== "ok") return sessionFailure(organization.status === "context_required" ? "denied" : organization.status);
  const result = await gateway.requestPdf(
    `/employer/receipts/${encodeURIComponent(receiptId)}/pdf?organizationId=${encodeURIComponent(organization.organizationId)}`,
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return new Response(result.bytes as BodyInit, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="receipt-${receiptId.slice(0, 8)}.pdf"`,
      "cache-control": "private, no-store"
    }
  });
}
