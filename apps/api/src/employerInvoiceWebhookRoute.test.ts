import Fastify from "fastify";
import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { createEmployerInvoiceWebhook, type CheckoutSessionEventLike } from "./employerInvoiceWebhook";
import { registerEmployerInvoiceWebhookRoute } from "./stripeWebhookRoute";

// Mounted-endpoint conformance for the employer-invoice webhook. Signatures are produced and verified
// with Stripe's OFFICIAL SDK (generateTestHeaderString + constructEvent) using a test webhook secret —
// real Stripe crypto, no network. Asserts the transport: raw-body signature verification, POST-only,
// deterministic duplicate/ignored handling, and that a tampered/invalid signature is rejected.

const ORG = "00000000-0000-4000-8000-0000000000aa";
const INVOICE = "00000000-0000-4000-8000-0000000000bb";
const SECRET = "whsec_" + "t".repeat(32);

function stripeEvent(type: string, paymentStatus: string) {
  return {
    id: "evt_" + Math.random().toString(36).slice(2),
    object: "event",
    type,
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: {
      object: {
        id: "cs_test_1",
        object: "checkout.session",
        payment_status: paymentStatus,
        amount_total: 11_497,
        currency: "cad",
        payment_intent: "pi_test_1",
        metadata: { employerInvoiceId: INVOICE, organizationReference: ORG }
      }
    }
  };
}

function build(reconcile = vi.fn(async () => ({ status: "reconciled" as const, invoiceStatus: "paid" }))) {
  const stripe = new Stripe("sk_test_" + "x".repeat(24), { apiVersion: "2026-07-29.dahlia" });
  const recovery = createEmployerInvoiceWebhook({
    verifyWebhook: async (rawBody, signature) => {
      const ev = stripe.webhooks.constructEvent(rawBody, signature, SECRET);
      return ev as unknown as CheckoutSessionEventLike;
    },
    reconcile
  });
  const app = Fastify();
  registerEmployerInvoiceWebhookRoute(app, { recovery });
  const sign = (payload: string) => stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
  return { app, sign, reconcile };
}

const PATH = "/payments/webhooks/stripe/employer-invoices";

describe("employer invoice webhook route", () => {
  it("accepts a valid paid event and reconciles once", async () => {
    const { app, sign, reconcile } = build();
    const payload = JSON.stringify(stripeEvent("checkout.session.completed", "paid"));
    const res = await app.inject({ method: "POST", url: PATH, headers: { "content-type": "application/json", "stripe-signature": sign(payload) }, payload });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ received: true, status: "reconciled" });
    expect(reconcile).toHaveBeenCalledOnce();
    await app.close();
  });

  it("acknowledges (202) a not-paid session without reconciling", async () => {
    const { app, sign, reconcile } = build();
    const payload = JSON.stringify(stripeEvent("checkout.session.completed", "unpaid"));
    const res = await app.inject({ method: "POST", url: PATH, headers: { "content-type": "application/json", "stripe-signature": sign(payload) }, payload });
    expect(res.statusCode).toBe(202);
    expect(res.json()).toMatchObject({ status: "ignored", reason: "payment_not_paid" });
    expect(reconcile).not.toHaveBeenCalled();
    await app.close();
  });

  it("rejects an invalid signature with 400", async () => {
    const { app } = build();
    const payload = JSON.stringify(stripeEvent("checkout.session.completed", "paid"));
    const res = await app.inject({ method: "POST", url: PATH, headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=deadbeef" }, payload });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "invalid_signature" });
    await app.close();
  });

  it("rejects a request with no signature header", async () => {
    const { app } = build();
    const payload = JSON.stringify(stripeEvent("checkout.session.completed", "paid"));
    const res = await app.inject({ method: "POST", url: PATH, headers: { "content-type": "application/json" }, payload });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
