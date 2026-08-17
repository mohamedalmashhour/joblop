import Fastify from "fastify";
import Stripe from "stripe";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { PaymentProviderPort } from "@rwos/shared";
import { createPrismaPaymentRepository } from "./paymentRepository";
import { createStripeWebhookRecovery, type StripeEventLike } from "./stripeWebhookRecovery";
import { registerStripeWebhookRoute } from "./stripeWebhookRoute";

// Stage 2b.4-C3-G-e1 — mounted-endpoint conformance. Signatures are produced and verified with Stripe's
// OFFICIAL SDK (generateTestHeaderString + constructEvent) using a test webhook secret — real Stripe
// crypto, no network. Event bodies use real Stripe event/PaymentIntent shapes and ids. NOTE: this is NOT
// a networked Stripe sandbox round-trip (no test API credentials in this environment); that remains a
// documented prerequisite before live activation.

const organizationId = "00000000-0000-4000-8000-00000000000a";
const paymentId = "00000000-0000-4000-8000-000000000040";
const SECRET = "whsec_" + "t".repeat(32);

function inMemoryPrisma(initialState: string) {
  const attempt: Record<string, unknown> = {
    id: paymentId, organizationId, assignmentId: "00000000-0000-4000-8000-000000000011",
    timesheetId: "00000000-0000-4000-8000-000000000010", invoiceId: "00000000-0000-4000-8000-000000000020",
    paymentMethodId: null, policyVersion: "v1", policyMode: "manual_collection",
    state: initialState, amountMinor: 10_500n, allocatedMinor: 0n, refundedMinor: 0n,
    currency: "CAD", authorizationReference: null, version: 2, requestDigest: ""
  };
  const events: Array<Record<string, unknown>> = [];
  const allocations: Array<Record<string, unknown>> = [];
  const m = (w: Record<string, unknown>) => (w.id === undefined || w.id === attempt.id) && (w.organizationId === undefined || w.organizationId === attempt.organizationId);
  const db = {
    employerPaymentAttempt: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => (m(where) ? { ...attempt } : null),
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        if (!(m(where) && attempt.version === where.version && attempt.state === where.state)) return { count: 0 };
        attempt.state = data.state; attempt.version = (attempt.version as number) + 1;
        if ((data as { allocatedMinor?: unknown }).allocatedMinor !== undefined) attempt.allocatedMinor = (data as { allocatedMinor: bigint }).allocatedMinor;
        if ((data as { authorizationReference?: unknown }).authorizationReference !== undefined) attempt.authorizationReference = (data as { authorizationReference: string }).authorizationReference;
        return { count: 1 };
      }
    },
    employerPaymentEvent: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => events.find((e) => e.organizationId === where.organizationId && e.providerEventReference === where.providerEventReference) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => { events.push(data); return { id: `evt-${events.length}` }; }
    },
    employerPaymentAllocation: { create: async ({ data }: { data: Record<string, unknown> }) => { allocations.push(data); return data; } },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(db)
  };
  return { db, attempt, events, allocations };
}

const providerStub: PaymentProviderPort = { id: "stripe_test", execute: vi.fn(async () => { throw new Error("execute must NOT be called"); }) };

async function buildRoute(opts?: { initialState?: string; bodyLimit?: number; rateLimit?: { maxPerWindow: number; windowMs: number } }) {
  const mem = inMemoryPrisma(opts?.initialState ?? "processing");
  const repository = createPrismaPaymentRepository(mem.db, providerStub);
  const verifyWebhook = async (raw: Buffer, sig: string): Promise<StripeEventLike> =>
    Stripe.webhooks.constructEvent(raw, sig, SECRET) as unknown as StripeEventLike; // REAL signature verification
  const recovery = createStripeWebhookRecovery({ verifyWebhook, repository });
  const app = Fastify();
  registerStripeWebhookRoute(app, {
    recovery,
    ...(opts?.bodyLimit !== undefined ? { bodyLimit: opts.bodyLimit } : {}),
    ...(opts?.rateLimit !== undefined ? { rateLimit: opts.rateLimit } : {})
  });
  await app.ready();
  return { app, mem };
}

const pi = (over: Record<string, unknown> = {}) => ({
  id: (over.id as string) ?? "evt_test_conformance",
  object: "event", api_version: "2026-07-29.dahlia", created: 1_785_000_000,
  livemode: over.livemode ?? false,
  type: (over.type as string) ?? "payment_intent.succeeded",
  data: { object: {
    id: "pi_3TestConformance", object: "payment_intent",
    status: (over.status as string) ?? "succeeded",
    amount: (over.amount as number) ?? 10_500, currency: (over.currency as string) ?? "cad",
    metadata: over.metadata === undefined ? { payment_reference: paymentId, organization_reference: organizationId } : over.metadata
  } }
});
const sign = (event: object) => {
  const payload = JSON.stringify(event);
  return { payload, header: Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET }) };
};
const post = (app: Awaited<ReturnType<typeof buildRoute>>["app"], payload: string, header?: string) =>
  app.inject({ method: "POST", url: "/payments/webhooks/stripe", headers: { "content-type": "application/json", ...(header ? { "stripe-signature": header } : {}) }, payload });

describe("Stripe webhook route — test-mode SDK-signature conformance (Stage 2b.4-C3-G-e1)", () => {
  it("[1] successful PaymentIntent webhook terminalizes the attempt (200)", async () => {
    const { app, mem } = await buildRoute({ initialState: "processing" });
    const { payload, header } = sign(pi({ type: "payment_intent.succeeded", status: "succeeded" }));
    const res = await post(app, payload, header);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ received: true, status: "terminalized" });
    expect(mem.attempt.state).toBe("succeeded");
  });

  it("[2] failed PaymentIntent webhook terminalizes to failed", async () => {
    const { app, mem } = await buildRoute();
    const { payload, header } = sign(pi({ id: "evt_failed", type: "payment_intent.payment_failed", status: "requires_payment_method" }));
    expect((await post(app, payload, header)).statusCode).toBe(200);
    expect(mem.attempt.state).toBe("failed");
  });

  it("[3] canceled PaymentIntent terminalizes to failed", async () => {
    const { app, mem } = await buildRoute();
    const { payload, header } = sign(pi({ id: "evt_cancel", type: "payment_intent.canceled", status: "canceled" }));
    expect((await post(app, payload, header)).statusCode).toBe(200);
    expect(mem.attempt.state).toBe("failed");
  });

  it("[4] processing / requires_action leave the attempt processing", async () => {
    for (const [type, status] of [["payment_intent.processing", "processing"], ["payment_intent.requires_action", "requires_action"]] as const) {
      const { app, mem } = await buildRoute();
      const { payload, header } = sign(pi({ id: `evt_${status}`, type, status }));
      const res = await post(app, payload, header);
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe("processing_unchanged");
      expect(mem.attempt.state).toBe("processing");
    }
  });

  it("[4b] a manual-capture authorization (requires_capture) → authorized + PI id persisted, no capture", async () => {
    const { app, mem } = await buildRoute({ initialState: "processing" });
    const { payload, header } = sign(pi({ id: "evt_auth_route", type: "payment_intent.amount_capturable_updated", status: "requires_capture" }));
    const res = await post(app, payload, header);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: "terminalized" });
    expect(mem.attempt.state).toBe("authorized");
    expect(mem.attempt.authorizationReference).toBe("pi_3TestConformance"); // held authorization referenceable
    expect(mem.attempt.allocatedMinor).toBe(0n); // no money captured
  });

  it("[5] duplicate event delivery is idempotent (no double-apply)", async () => {
    const { app, mem } = await buildRoute();
    const { payload, header } = sign(pi({ id: "evt_dup_route", status: "succeeded" }));
    await post(app, payload, header);
    const second = await post(app, payload, header);
    expect(second.statusCode).toBe(200);
    expect(second.json().status).toBe("already_resolved");
    expect(mem.attempt.version).toBe(3); // bumped once
    expect(mem.allocations).toHaveLength(1);
  });

  it("[6] invalid signature is rejected (400)", async () => {
    const { app, mem } = await buildRoute();
    const { payload } = sign(pi());
    const res = await post(app, payload, "t=1,v1=deadbeef"); // bogus signature
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_signature");
    expect(mem.attempt.state).toBe("processing");
  });

  it("[7] a tampered payload (valid signature for a different body) is rejected (400)", async () => {
    const { app, mem } = await buildRoute();
    const { header } = sign(pi({ status: "succeeded" }));
    const tampered = JSON.stringify(pi({ status: "succeeded", amount: 999999 })); // body changed after signing
    const res = await post(app, tampered, header);
    expect(res.statusCode).toBe(400);
    expect(mem.attempt.state).toBe("processing");
  });

  it("[8] a livemode=true event is rejected (400)", async () => {
    const { app, mem } = await buildRoute();
    const { payload, header } = sign(pi({ id: "evt_live", livemode: true, status: "succeeded" }));
    const res = await post(app, payload, header);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("livemode_rejected");
    expect(mem.attempt.state).toBe("processing");
  });

  it("[9] unknown payment/org metadata is safely ignored (202, no state change)", async () => {
    const { app, mem } = await buildRoute();
    const { payload, header } = sign(pi({ id: "evt_unknown", metadata: { payment_reference: "00000000-0000-4000-8000-0000000000ff", organization_reference: organizationId } }));
    const res = await post(app, payload, header);
    expect(res.statusCode).toBe(202);
    expect(res.json()).toMatchObject({ status: "ignored", reason: "unknown_reference" });
    expect(mem.attempt.state).toBe("processing");
  });

  it("[10] wrong amount/currency is safely ignored (202)", async () => {
    const { app } = await buildRoute();
    const wrong = sign(pi({ id: "evt_amt", amount: 999 }));
    expect((await post(app, wrong.payload, wrong.header)).json().reason).toBe("metadata_mismatch");
    const wrongCur = sign(pi({ id: "evt_cur", currency: "usd" }));
    const res = await post(app, wrongCur.payload, wrongCur.header);
    expect(res.statusCode).toBe(202);
    expect(res.json().reason).toBe("metadata_mismatch");
  });

  it("[11] webhook arriving after a prior terminalization stays race-safe (already_resolved, no reopen)", async () => {
    const { app, mem } = await buildRoute({ initialState: "failed" }); // reconcile/manual already resolved it
    const { payload, header } = sign(pi({ id: "evt_race", status: "succeeded" }));
    const res = await post(app, payload, header);
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("already_resolved");
    expect(mem.attempt.state).toBe("failed");
  });

  it("[12] a no-ID indeterminate create (no authorizationReference) is resolved by the webhook", async () => {
    const { app, mem } = await buildRoute({ initialState: "processing" });
    expect(mem.attempt.authorizationReference).toBeNull(); // the no-ID indeterminate case
    const { payload, header } = sign(pi({ id: "evt_noid", type: "payment_intent.succeeded", status: "succeeded" }));
    expect((await post(app, payload, header)).statusCode).toBe(200);
    expect(mem.attempt.state).toBe("succeeded");
  });

  it("[13] no money-moving provider method is called by the webhook path", async () => {
    const { app } = await buildRoute();
    const { payload, header } = sign(pi({ id: "evt_nomoney", status: "succeeded" }));
    await post(app, payload, header);
    expect(providerStub.execute).not.toHaveBeenCalled();
    const src = readFileSync(fileURLToPath(new URL("./stripeWebhookRoute.ts", import.meta.url)), "utf8");
    expect(src).not.toMatch(/\.execute\(|\.authorize\(|\.capture\(|\.refund\(|paymentIntents\.\w|\.search\(/);
  });

  // ── Route controls ──
  it("[ctrl-1] POST only — a GET is 404", async () => {
    const { app } = await buildRoute();
    expect((await app.inject({ method: "GET", url: "/payments/webhooks/stripe" })).statusCode).toBe(404);
  });

  it("[ctrl-2] a body over the size cap is rejected (413)", async () => {
    const { app } = await buildRoute({ bodyLimit: 256 });
    const big = JSON.stringify({ pad: "x".repeat(2000) });
    const res = await post(app, big, "t=1,v1=abc");
    expect(res.statusCode).toBe(413);
  });

  it("[ctrl-3] missing signature header is a 400", async () => {
    const { app } = await buildRoute();
    const { payload } = sign(pi());
    expect((await post(app, payload)).statusCode).toBe(400);
  });

  it("[ctrl-4] rate limiting returns 429 with retry-after beyond the window budget", async () => {
    const { app } = await buildRoute({ rateLimit: { maxPerWindow: 2, windowMs: 60_000 } });
    const s1 = sign(pi({ id: "evt_r1", status: "processing", type: "payment_intent.processing" }));
    const s2 = sign(pi({ id: "evt_r2", status: "processing", type: "payment_intent.processing" }));
    const s3 = sign(pi({ id: "evt_r3", status: "processing", type: "payment_intent.processing" }));
    expect((await post(app, s1.payload, s1.header)).statusCode).toBe(200);
    expect((await post(app, s2.payload, s2.header)).statusCode).toBe(200);
    const third = await post(app, s3.payload, s3.header);
    expect(third.statusCode).toBe(429);
    expect(third.headers["retry-after"]).toBeDefined();
  });

  it("[ctrl-5] the route requires no user/session authentication (no Authorization header needed)", async () => {
    const { app, mem } = await buildRoute();
    const { payload, header } = sign(pi({ id: "evt_noauth", status: "succeeded" }));
    const res = await post(app, payload, header); // no Authorization header at all
    expect(res.statusCode).toBe(200);
    expect(mem.attempt.state).toBe("succeeded");
  });
});
