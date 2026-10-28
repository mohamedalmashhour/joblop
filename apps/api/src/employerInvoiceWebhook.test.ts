import { describe, expect, it, vi } from "vitest";
import {
  createEmployerInvoiceWebhook,
  EmployerInvoiceWebhookRejection,
  type CheckoutSessionEventLike
} from "./employerInvoiceWebhook";

// Unit tests for the employer-invoice Stripe TEST webhook reconcile. Signature verification is injected
// (exercised against real Stripe crypto at the route level); here we assert classification, OUR-metadata
// correlation, the payment_status gate, live-mode rejection, and idempotent reconcile delegation.

const ORG = "00000000-0000-4000-8000-0000000000aa";
const INVOICE = "00000000-0000-4000-8000-0000000000bb";

function event(overrides: Partial<CheckoutSessionEventLike["data"]["object"]> = {}, type = "checkout.session.completed"): CheckoutSessionEventLike {
  return {
    id: "evt_test_1",
    type,
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: {
      object: {
        id: "cs_test_1",
        payment_status: "paid",
        amount_total: 11_497,
        currency: "cad",
        payment_intent: "pi_test_1",
        metadata: { employerInvoiceId: INVOICE, organizationReference: ORG },
        ...overrides
      }
    }
  };
}

function handler(ev: CheckoutSessionEventLike, reconcile = vi.fn(async () => ({ status: "reconciled" as const, invoiceStatus: "paid" }))) {
  const verifyWebhook = vi.fn(async () => ev);
  return { recovery: createEmployerInvoiceWebhook({ verifyWebhook, reconcile }), verifyWebhook, reconcile };
}

const RAW = Buffer.from("{}");

describe("employer invoice webhook", () => {
  it("reconciles a paid checkout.session.completed via OUR metadata", async () => {
    const { recovery, reconcile } = handler(event());
    const result = await recovery.resolve(RAW, "sig");
    expect(result.status).toBe("reconciled");
    expect(result.invoiceId).toBe(INVOICE);
    expect(reconcile).toHaveBeenCalledWith({ organizationId: ORG, invoiceId: INVOICE, paymentRef: "pi_test_1" });
  });

  it("also handles the delayed-settlement async_payment_succeeded event", async () => {
    const { recovery, reconcile } = handler(event({}, "checkout.session.async_payment_succeeded"));
    const result = await recovery.resolve(RAW, "sig");
    expect(result.status).toBe("reconciled");
    expect(reconcile).toHaveBeenCalledOnce();
  });

  it("ignores unrelated event types without reconciling", async () => {
    const { recovery, reconcile } = handler(event({}, "checkout.session.expired"));
    const result = await recovery.resolve(RAW, "sig");
    expect(result.status).toBe("ignored");
    expect(reconcile).not.toHaveBeenCalled();
  });

  it("rejects an uncorrelated event (missing our metadata)", async () => {
    const { recovery } = handler(event({ metadata: {} }));
    await expect(recovery.resolve(RAW, "sig")).rejects.toMatchObject({ code: "uncorrelated_metadata" });
  });

  it("rejects a not-yet-paid session", async () => {
    const { recovery, reconcile } = handler(event({ payment_status: "unpaid" }));
    await expect(recovery.resolve(RAW, "sig")).rejects.toBeInstanceOf(EmployerInvoiceWebhookRejection);
    expect(reconcile).not.toHaveBeenCalled();
  });

  it("rejects a live-mode event (defence in depth)", async () => {
    const { recovery } = handler(event({}));
    const live = { ...event(), livemode: true };
    const h = createEmployerInvoiceWebhook({ verifyWebhook: async () => live, reconcile: vi.fn() });
    await expect(h.resolve(RAW, "sig")).rejects.toMatchObject({ code: "livemode_rejected" });
    void recovery;
  });

  it("reads the PaymentIntent id from an expanded object", async () => {
    const { recovery, reconcile } = handler(event({ payment_intent: { id: "pi_expanded" } }));
    await recovery.resolve(RAW, "sig");
    expect(reconcile).toHaveBeenCalledWith(expect.objectContaining({ paymentRef: "pi_expanded" }));
  });
});
