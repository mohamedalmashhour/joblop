// Card payment for an issued invoice goes through Stripe's hosted page, so card details never touch
// Joblop. These only start the page and ask the server to confirm the result; the server checks with
// Stripe, so the browser is never trusted to say an invoice is paid.
type Fetcher = (url: string, init: RequestInit) => Promise<Pick<Response, "ok" | "json">>;

const post = { method: "POST", headers: { "content-type": "application/json" }, body: "{}" };

// Mirrors what the API will accept, so the button only shows when it can work.
export function isInvoicePayable(status: string): boolean {
  return ["issued", "sent", "viewed", "overdue"].includes(status);
}

export async function startCardPayment(invoiceId: string, fetcher: Fetcher): Promise<string | null> {
  try {
    const response = await fetcher(`/api/invoices/${encodeURIComponent(invoiceId)}/checkout`, post);
    if (!response.ok) return null;
    const payload = (await response.json()) as { checkoutUrl?: unknown };
    return typeof payload.checkoutUrl === "string" && payload.checkoutUrl.startsWith("https://") ? payload.checkoutUrl : null;
  } catch {
    return null;
  }
}

export async function confirmCardPayment(invoiceId: string, fetcher: Fetcher): Promise<boolean> {
  try {
    const response = await fetcher(`/api/invoices/${encodeURIComponent(invoiceId)}/checkout/complete`, post);
    return response.ok;
  } catch {
    return false;
  }
}

export type CardPaymentStep = Readonly<{ kind: "paid" } | { kind: "open"; url: string } | { kind: "unavailable" }>;

// A payment can finish at Stripe without the employer coming back to Joblop. Pressing Pay checks that
// first, so a paid invoice is recorded instead of reopening a Stripe page that has already closed.
export async function nextCardPaymentStep(invoiceId: string, fetcher: Fetcher): Promise<CardPaymentStep> {
  if (await confirmCardPayment(invoiceId, fetcher)) return { kind: "paid" };
  const url = await startCardPayment(invoiceId, fetcher);
  return url ? { kind: "open", url } : { kind: "unavailable" };
}
