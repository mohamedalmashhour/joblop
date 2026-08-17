import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { PaymentProviderPort } from "@rwos/shared";
import { createPrismaPaymentRepository } from "./paymentRepository";
import {
  createStripeWebhookRecovery,
  StripeWebhookRejection,
  type StripeEventLike
} from "./stripeWebhookRecovery";

// Stage 2b.4-C3-G-d1 — Stripe webhook-first recovery. Uses the REAL repository (createPrismaPaymentRepository)
// against a small STATEFUL in-memory prisma, so the genuine processProviderEvent guards (idempotent event
// id, optimistic version+state, amount match) actually execute. Test-mode only; no live keys; the provider
// stub is never invoked by recovery (it only reads + applies a webhook).

const organizationId = "00000000-0000-4000-8000-00000000000a";
const paymentId = "00000000-0000-4000-8000-000000000040";

// A tiny in-memory prisma supporting exactly what get() + processProviderEvent() touch.
function inMemoryPrisma(initialState: string) {
  const attempt: Record<string, unknown> = {
    id: paymentId, organizationId,
    assignmentId: "00000000-0000-4000-8000-000000000011",
    timesheetId: "00000000-0000-4000-8000-000000000010",
    invoiceId: "00000000-0000-4000-8000-000000000020",
    paymentMethodId: null, policyVersion: "v1", policyMode: "manual_collection",
    state: initialState, amountMinor: 10_500n, allocatedMinor: 0n, refundedMinor: 0n,
    currency: "CAD", authorizationReference: null, version: 2, requestDigest: ""
  };
  const events: Array<Record<string, unknown>> = [];
  const allocations: Array<Record<string, unknown>> = [];
  const match = (w: Record<string, unknown>) =>
    (w.id === undefined || w.id === attempt.id) && (w.organizationId === undefined || w.organizationId === attempt.organizationId);
  const db = {
    employerPaymentAttempt: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => (match(where) ? { ...attempt } : null),
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        if (!(match(where) && attempt.version === where.version && attempt.state === where.state)) return { count: 0 };
        attempt.state = data.state;
        attempt.version = (attempt.version as number) + 1;
        if ((data as { allocatedMinor?: unknown }).allocatedMinor !== undefined) attempt.allocatedMinor = (data as { allocatedMinor: bigint }).allocatedMinor;
        if ((data as { authorizationReference?: unknown }).authorizationReference !== undefined) attempt.authorizationReference = (data as { authorizationReference: string }).authorizationReference;
        return { count: 1 };
      }
    },
    employerPaymentEvent: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) =>
        events.find((e) => e.organizationId === where.organizationId && e.providerEventReference === where.providerEventReference) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => { events.push(data); return { id: `evt-${events.length}` }; }
    },
    employerPaymentAllocation: {
      create: async ({ data }: { data: Record<string, unknown> }) => { allocations.push(data); return data; }
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(db)
  };
  return { db, attempt, events, allocations };
}

const providerStub: PaymentProviderPort = {
  id: "stripe_test",
  execute: vi.fn(async () => { throw new Error("execute must NOT be called from webhook recovery"); })
};

const piEvent = (over: Partial<StripeEventLike> & { status?: string; amount?: number; currency?: string; metadata?: Record<string, string> | null; type?: string; id?: string; livemode?: boolean } = {}): StripeEventLike => ({
  id: over.id ?? "evt_test_1",
  type: over.type ?? "payment_intent.succeeded",
  created: 1_785_000_000,
  livemode: over.livemode ?? false,
  data: { object: {
    status: over.status ?? "succeeded",
    amount: over.amount ?? 10_500,
    currency: over.currency ?? "cad",
    metadata: "metadata" in over ? over.metadata ?? null : { payment_reference: paymentId, organization_reference: organizationId }
  } }
});

// verifyWebhook fake that mirrors the real provider: rejects a bad signature and enforces test-mode.
const verifierFor = (event: StripeEventLike, opts?: { enforceLivemode?: boolean }) =>
  async (_raw: Buffer, signature: string): Promise<StripeEventLike> => {
    if (signature !== "good-signature") throw new Error("Stripe signature verification failed.");
    if ((opts?.enforceLivemode ?? true) && event.livemode === true) throw new Error("Live-mode Stripe object rejected.");
    return event;
  };

const setup = (initialState = "processing") => {
  const mem = inMemoryPrisma(initialState);
  const repository = createPrismaPaymentRepository(mem.db, providerStub);
  return { mem, repository };
};
const raw = (event: StripeEventLike) => Buffer.from(JSON.stringify(event));

describe("Stripe webhook-first recovery (Stage 2b.4-C3-G-d1)", () => {
  it("[1] a valid signed test-mode webhook resolves an indeterminate (processing) payment", async () => {
    const { mem, repository } = setup("processing");
    const event = piEvent({ type: "payment_intent.succeeded", status: "succeeded" });
    const rec = createStripeWebhookRecovery({ verifyWebhook: verifierFor(event), repository });
    const result = await rec.resolve(raw(event), "good-signature");
    expect(result).toMatchObject({ status: "terminalized", newState: "succeeded", paymentId });
    expect(mem.attempt.state).toBe("succeeded");
    expect(mem.allocations).toHaveLength(1); // exactly one allocation on succeeded
  });

  it("[2] duplicate Stripe event is idempotent (no double-apply, no reopen)", async () => {
    const { mem, repository } = setup("processing");
    const event = piEvent({ id: "evt_dup", type: "payment_intent.succeeded", status: "succeeded" });
    const rec = createStripeWebhookRecovery({ verifyWebhook: verifierFor(event), repository });
    await rec.resolve(raw(event), "good-signature");
    const second = await rec.resolve(raw(event), "good-signature");
    expect(second.status).toBe("already_resolved"); // attempt already terminal → no-op
    expect(mem.attempt.state).toBe("succeeded");
    expect(mem.attempt.version).toBe(3); // bumped exactly once
    expect(mem.allocations).toHaveLength(1);
  });

  it("[3] a wrong signature is rejected (no state change)", async () => {
    const { mem, repository } = setup("processing");
    const event = piEvent();
    const rec = createStripeWebhookRecovery({ verifyWebhook: verifierFor(event), repository });
    await expect(rec.resolve(raw(event), "bad-signature")).rejects.toThrow(/signature/i);
    expect(mem.attempt.state).toBe("processing");
  });

  it("[4] a livemode=true event is rejected", async () => {
    const { mem, repository } = setup("processing");
    const live = piEvent({ livemode: true });
    // real verifier enforces test-mode
    const recViaVerifier = createStripeWebhookRecovery({ verifyWebhook: verifierFor(live), repository });
    await expect(recViaVerifier.resolve(raw(live), "good-signature")).rejects.toThrow(/live-mode/i);
    // and the handler's own defence-in-depth guard rejects even if a verifier let it through
    const recDefence = createStripeWebhookRecovery({ verifyWebhook: verifierFor(live, { enforceLivemode: false }), repository });
    await expect(recDefence.resolve(raw(live), "good-signature")).rejects.toBeInstanceOf(StripeWebhookRejection);
    expect(mem.attempt.state).toBe("processing");
  });

  it("[5] an unknown tenant/payment reference is rejected", async () => {
    const { repository } = setup("processing");
    const event = piEvent({ metadata: { payment_reference: "00000000-0000-4000-8000-0000000000ff", organization_reference: organizationId } });
    const rec = createStripeWebhookRecovery({ verifyWebhook: verifierFor(event), repository });
    await expect(rec.resolve(raw(event), "good-signature")).rejects.toMatchObject({ code: "unknown_reference" });
  });

  it("[6] mismatched provider metadata (amount/currency) is rejected", async () => {
    const { mem, repository } = setup("processing");
    const wrongAmount = piEvent({ amount: 999 });
    const rec = createStripeWebhookRecovery({ verifyWebhook: verifierFor(wrongAmount), repository });
    await expect(rec.resolve(raw(wrongAmount), "good-signature")).rejects.toMatchObject({ code: "metadata_mismatch" });
    // missing metadata → uncorrelated
    const noMeta = piEvent({ metadata: null });
    const rec2 = createStripeWebhookRecovery({ verifyWebhook: verifierFor(noMeta), repository });
    await expect(rec2.resolve(raw(noMeta), "good-signature")).rejects.toMatchObject({ code: "uncorrelated_metadata" });
    expect(mem.attempt.state).toBe("processing");
  });

  it("[7] a payment_intent.succeeded event terminalizes correctly", async () => {
    const { mem, repository } = setup("processing");
    const event = piEvent({ type: "payment_intent.succeeded", status: "succeeded" });
    const rec = createStripeWebhookRecovery({ verifyWebhook: verifierFor(event), repository });
    expect((await rec.resolve(raw(event), "good-signature")).newState).toBe("succeeded");
    expect(mem.attempt.state).toBe("succeeded");
  });

  it("[8] authoritative failed/canceled events terminalize to failed", async () => {
    for (const [type, status] of [["payment_intent.payment_failed", "requires_payment_method"], ["payment_intent.canceled", "canceled"]] as const) {
      const { mem, repository } = setup("processing");
      const event = piEvent({ type, status });
      const rec = createStripeWebhookRecovery({ verifyWebhook: verifierFor(event), repository });
      expect((await rec.resolve(raw(event), "good-signature")).newState).toBe("failed");
      expect(mem.attempt.state).toBe("failed");
    }
  });

  it("[9] processing / requires_action leave the attempt processing", async () => {
    for (const [type, status] of [
      ["payment_intent.processing", "processing"],
      ["payment_intent.requires_action", "requires_action"]
    ] as const) {
      const { mem, repository } = setup("processing");
      const event = piEvent({ type, status });
      const rec = createStripeWebhookRecovery({ verifyWebhook: verifierFor(event), repository });
      expect((await rec.resolve(raw(event), "good-signature")).status).toBe("processing_unchanged");
      expect(mem.attempt.state).toBe("processing"); // not terminalized
    }
  });

  it("[gc3e3-authorize] a manual-capture authorization (requires_capture) → authorized + PI id persisted, NO money captured", async () => {
    const { mem, repository } = setup("processing");
    const event = piEvent({ id: "evt_auth", type: "payment_intent.amount_capturable_updated", status: "requires_capture" });
    // attach the PaymentIntent id to the event object (recovery persists it as authorizationReference)
    (event.data.object as { id?: string }).id = "pi_manualcap_123";
    const rec = createStripeWebhookRecovery({ verifyWebhook: verifierFor(event), repository });
    const result = await rec.resolve(raw(event), "good-signature");
    expect(result).toMatchObject({ status: "terminalized", newState: "authorized" });
    expect(mem.attempt.state).toBe("authorized");
    expect(mem.attempt.authorizationReference).toBe("pi_manualcap_123"); // capture/void can now reference it
    expect(mem.attempt.allocatedMinor).toBe(0n); // NO money captured on authorization
    // idempotent: a duplicate authorization event is a no-op (already resolved out of processing)
    const second = await rec.resolve(raw(event), "good-signature");
    expect(second.status).toBe("already_resolved");
    expect(mem.attempt.version).toBe(3); // bumped exactly once
  });

  it("[10] a webhook arriving AFTER a manual reconcile already terminalized stays race-safe (no reopen)", async () => {
    const { mem, repository } = setup("failed"); // a prior manual/reconcile path resolved it to failed
    const event = piEvent({ type: "payment_intent.succeeded", status: "succeeded" });
    const rec = createStripeWebhookRecovery({ verifyWebhook: verifierFor(event), repository });
    const result = await rec.resolve(raw(event), "good-signature");
    expect(result.status).toBe("already_resolved"); // exactly-once: cannot override the terminal state
    expect(mem.attempt.state).toBe("failed");
  });

  it("[11] a stale/out-of-order webhook cannot reopen a terminal attempt", async () => {
    const { mem, repository } = setup("succeeded");
    const late = piEvent({ type: "payment_intent.payment_failed", status: "requires_payment_method" });
    const rec = createStripeWebhookRecovery({ verifyWebhook: verifierFor(late), repository });
    expect((await rec.resolve(raw(late), "good-signature")).status).toBe("already_resolved");
    expect(mem.attempt.state).toBe("succeeded"); // terminal is not downgraded
  });

  it("[12] no money-moving provider API is reachable from the recovery handler", () => {
    const src = readFileSync(fileURLToPath(new URL("./stripeWebhookRecovery.ts", import.meta.url)), "utf8");
    // No money-moving CALL syntax and no provider money-object access.
    expect(src).not.toMatch(/\.execute\(|\.authorize\(|\.capture\(|\.refund\(|\.cancel\(/);
    expect(src).not.toMatch(/paymentIntents\.\w|refunds\.\w|setupIntents\.\w/);
    expect(providerStub.execute).not.toHaveBeenCalled(); // never invoked across the whole suite
  });

  it("[13] no secrets / PAN / raw provider payload leak into results or the persisted event", async () => {
    const { mem, repository } = setup("processing");
    const event = piEvent({ type: "payment_intent.succeeded", status: "succeeded", metadata: { payment_reference: paymentId, organization_reference: organizationId } });
    const rec = createStripeWebhookRecovery({ verifyWebhook: verifierFor(event), repository });
    const result = await rec.resolve(raw(event), "good-signature");
    const serialized = JSON.stringify(result) + JSON.stringify(mem.events);
    expect(serialized).not.toMatch(/sk_(test|live)|whsec_|4111|pan|client_secret/i);
    // the persisted webhook event stores only a sha256 payload DIGEST, never the raw body
    const webhookEvent = mem.events.find((e) => e.eventType === "provider_webhook")!;
    expect(webhookEvent.payloadDigest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("[14] the recovery path never uses Stripe Search as proof", () => {
    const src = readFileSync(fileURLToPath(new URL("./stripeWebhookRecovery.ts", import.meta.url)), "utf8");
    expect(src).not.toMatch(/\.search\(|paymentIntents\.search|search\s*:/i);
  });

  it("[15] once the webhook terminalizes, the manual_or_webhook_required condition is resolved (attempt no longer processing)", async () => {
    const { mem, repository } = setup("processing"); // an attempt carrying an open manual/webhook signal
    const event = piEvent({ type: "payment_intent.succeeded", status: "succeeded" });
    const rec = createStripeWebhookRecovery({ verifyWebhook: verifierFor(event), repository });
    await rec.resolve(raw(event), "good-signature");
    // Resolution is signalled by the attempt leaving `processing`; a later query for open manual cases
    // (attempt still processing) would no longer include it.
    expect(mem.attempt.state).not.toBe("processing");
    expect(mem.attempt.state).toBe("succeeded");
  });
});
