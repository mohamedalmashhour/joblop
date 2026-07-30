export type InvoiceDeliveryRequest = Readonly<{
  invoiceId: string;
  organizationId: string;
  documentDigest: string;
  recipientAlias: string;
  idempotencyKey: string;
}>;

export type InvoiceDeliveryReceipt = Readonly<{
  receiptId: string;
  invoiceId: string;
  organizationId: string;
  provider: "local_fake";
  status: "accepted";
  recipientAlias: string;
  documentDigest: string;
  idempotencyKey: string;
  acceptedAt: string;
}>;

export interface InvoiceDeliveryPort {
  deliver(
    request: InvoiceDeliveryRequest,
    authorizedOrganizationId: string
  ): Promise<InvoiceDeliveryReceipt>;
}

export function createLocalFakeInvoiceDelivery(options: {
  now: () => string;
}): InvoiceDeliveryPort {
  const receipts = new Map<string, InvoiceDeliveryReceipt>();

  return {
    async deliver(request, authorizedOrganizationId) {
      if (request.organizationId !== authorizedOrganizationId) {
        throw new Error("Invoice delivery is outside the authorized organization.");
      }
      for (const [field, value] of Object.entries(request)) {
        if (!value || typeof value !== "string") {
          throw new Error(`Invoice delivery ${field} is required.`);
        }
      }
      const scope = `${request.organizationId}:${request.idempotencyKey}`;
      const existing = receipts.get(scope);
      if (existing) {
        if (
          existing.invoiceId !== request.invoiceId ||
          existing.documentDigest !== request.documentDigest ||
          existing.recipientAlias !== request.recipientAlias
        ) {
          throw new Error("Invoice delivery idempotency conflict.");
        }
        return existing;
      }
      const receipt: InvoiceDeliveryReceipt = {
        receiptId: `local:${request.organizationId}:${request.idempotencyKey}`,
        invoiceId: request.invoiceId,
        organizationId: request.organizationId,
        provider: "local_fake",
        status: "accepted",
        recipientAlias: request.recipientAlias,
        documentDigest: request.documentDigest,
        idempotencyKey: request.idempotencyKey,
        acceptedAt: options.now()
      };
      receipts.set(scope, receipt);
      return receipt;
    }
  };
}
