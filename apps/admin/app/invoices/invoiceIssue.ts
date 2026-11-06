// Issuing gives an invoice its number. The API needs the numbering series each time, and staff should
// not have to enter it, so the screen supplies the standard yearly series.
export const INVOICE_NUMBER_PREFIX = "JL";
export const INVOICE_NUMBERING_VERSION = "joblop-v1";

export function invoiceIssueBody(organizationId: string, expectedVersion: number, now: Date) {
  const scopeYear = now.getUTCFullYear();
  return {
    expectedVersion,
    numbering: {
      organizationId,
      scopeYear,
      prefix: INVOICE_NUMBER_PREFIX,
      version: INVOICE_NUMBERING_VERSION,
      effectiveFrom: `${scopeYear}-01-01T00:00:00.000Z`,
      effectiveUntil: null
    }
  };
}

export type InvoiceStaffAction = "approve" | "issue" | "send";

// Sending the same version twice is one send, so a double-click cannot email the employer twice.
export function invoiceSendBody(invoiceId: string, expectedVersion: number) {
  return { expectedVersion, recipientAlias: "employer-contact", idempotencyKey: `send-${invoiceId}-v${expectedVersion}` };
}

export function invoiceActionPath(action: InvoiceStaffAction): string {
  return action === "send" ? "deliveries" : action;
}

// The next step staff can take. Anything already issued has no action here.
export function nextInvoiceAction(status: string): InvoiceStaffAction | null {
  if (status === "draft") return "approve";
  if (status === "approved") return "issue";
  if (status === "issued") return "send";
  return null;
}
