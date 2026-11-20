const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export type FinanceInvoice = Readonly<{
  id: string;
  organizationId: string;
  invoiceNumber: string | null;
  status: string;
  version: number;
  currency: string;
  totalMinor: number;
  issuedAt: string | null;
  dueAt: string | null;
}>;

export type FinancePayment = Readonly<{
  id: string;
  organizationId: string;
  invoiceId: string;
  state: string;
  currency: string;
  amountMinor: number;
  allocatedMinor: number;
  refundedMinor: number;
}>;

export function readOrganizationId(request: Request) {
  const params = new URL(request.url).searchParams;
  const values = params.getAll("organizationId");
  if ([...params.keys()].some((key) => key !== "organizationId") || values.length !== 1) {
    return null;
  }
  return uuidPattern.test(values[0] ?? "") ? values[0]! : null;
}

export function parseFinanceInvoices(payload: unknown): readonly FinanceInvoice[] {
  const invoices = record(payload).invoices;
  if (!Array.isArray(invoices)) throw new Error("Invoice list is unavailable.");
  return invoices.map((value) => {
    const item = record(value);
    return {
      id: requiredText(item.id),
      organizationId: requiredText(item.organizationId),
      invoiceNumber: nullableText(item.invoiceNumber),
      status: requiredText(item.status),
      version: safeInteger(item.version),
      currency: requiredText(item.currency),
      totalMinor: safeInteger(item.totalMinor),
      issuedAt: nullableText(item.issuedAt),
      dueAt: nullableText(item.dueAt)
    };
  });
}

export function parseFinancePayments(payload: unknown): readonly FinancePayment[] {
  const payments = record(payload).payments;
  if (!Array.isArray(payments)) throw new Error("Payment list is unavailable.");
  return payments.map((value) => {
    const item = record(value);
    return {
      id: requiredText(item.id),
      organizationId: requiredText(item.organizationId),
      invoiceId: requiredText(item.invoiceId),
      state: requiredText(item.state),
      currency: requiredText(item.currency),
      amountMinor: safeInteger(item.amountMinor),
      allocatedMinor: safeInteger(item.allocatedMinor),
      refundedMinor: safeInteger(item.refundedMinor)
    };
  });
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Finance response is invalid.");
  }
  return value as Record<string, unknown>;
}

function requiredText(value: unknown) {
  if (typeof value !== "string" || !value) throw new Error("Finance response is invalid.");
  return value;
}

function nullableText(value: unknown) {
  if (value === null) return null;
  return requiredText(value);
}

function safeInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error("Finance response is invalid.");
  }
  return value;
}
