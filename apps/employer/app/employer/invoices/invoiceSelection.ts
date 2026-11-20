// Which invoice the detail and breakdown pages show. The page must name the invoice: guessing one
// would show an employer a total that is not the invoice they opened.
export function findSelectedInvoice<T extends { id: string }>(invoices: readonly T[], invoiceId: string | null): T | null {
  if (!invoiceId) return null;
  return invoices.find((invoice) => invoice.id === invoiceId) ?? null;
}

export function readInvoiceParam(value: string | readonly string[] | undefined): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export const invoiceDetailHref = (invoiceId: string) => `/employer/invoices/detail?invoice=${encodeURIComponent(invoiceId)}`;
export const invoiceBreakdownHref = (invoiceId: string) => `/employer/invoices/breakdown?invoice=${encodeURIComponent(invoiceId)}`;
