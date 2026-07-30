const invoiceStatuses = new Set([
  "draft",
  "approved",
  "issued",
  "sent",
  "viewed",
  "partially_paid",
  "paid",
  "overdue",
  "disputed",
  "voided",
  "refunded"
]);

export type EmployerInvoiceSummary = Readonly<{
  id: string;
  invoiceNumber: string | null;
  status: string;
  currency: "CAD";
  subtotalMinor: number;
  taxMinor: number;
  creditMinor: number;
  totalMinor: number;
  issuedAt: string | null;
  dueAt: string | null;
  createdAt: string;
}>;

export function parseEmployerInvoices(input: unknown): readonly EmployerInvoiceSummary[] {
  if (!isRecord(input) || !Array.isArray(input.invoices)) throw new Error("RWOS_INVALID_INVOICES");
  return input.invoices.map((invoice) => {
    if (!isRecord(invoice)) throw new Error("RWOS_INVALID_INVOICE");
    const status = requiredString(invoice.status);
    const currency = requiredString(invoice.currency);
    if (!invoiceStatuses.has(status) || currency !== "CAD") throw new Error("RWOS_INVALID_INVOICE");
    return {
      id: requiredString(invoice.id),
      invoiceNumber: nullableString(invoice.invoiceNumber),
      status,
      currency,
      subtotalMinor: nonNegativeInteger(invoice.subtotalMinor),
      taxMinor: nonNegativeInteger(invoice.taxMinor),
      creditMinor: nonNegativeInteger(invoice.creditMinor),
      totalMinor: nonNegativeInteger(invoice.totalMinor),
      issuedAt: nullableDate(invoice.issuedAt),
      dueAt: nullableDate(invoice.dueAt),
      createdAt: requiredDate(invoice.createdAt)
    };
  });
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
function requiredString(input: unknown) {
  if (typeof input !== "string" || !input.trim()) throw new Error("RWOS_INVALID_INVOICE");
  return input;
}
function nullableString(input: unknown) {
  return input === null ? null : requiredString(input);
}
function nonNegativeInteger(input: unknown) {
  if (!Number.isSafeInteger(input) || (input as number) < 0)
    throw new Error("RWOS_INVALID_INVOICE");
  return input as number;
}
function requiredDate(input: unknown) {
  const value = requiredString(input);
  if (!Number.isFinite(Date.parse(value))) throw new Error("RWOS_INVALID_INVOICE");
  return value;
}
function nullableDate(input: unknown) {
  return input === null ? null : requiredDate(input);
}
