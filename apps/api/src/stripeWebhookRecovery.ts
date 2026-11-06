import { createHash } from "node:crypto";
import type { PaymentRepository } from "./paymentRepository";

// Stage 2b.4-C3-G-d1 — Stripe webhook-FIRST recovery for the indeterminate no-response/no-ID create case.
//
// Stripe cannot be reconciled by a read for a create that returned no PaymentIntent id (no lookup by
// idempotency key; Search is eventually consistent). The authoritative resolution is Stripe's own webhook
// for the terminal PaymentIntent event. This handler ingests ONE verified test-mode event and, ONLY when
// it is an authoritative SETTLED terminal, drives it through the EXISTING idempotent, version-guarded
// processProviderEvent path. It NEVER calls execute/authorize/capture/refund/void, never re-POSTs, and
// never uses Stripe Search. Correlation uses OUR provider metadata + the persisted record — never a
// client-supplied identifier. Money movement is impossible from here.

// The minimal Stripe event shape we depend on (a subset of Stripe.Event).
export type StripeEventLike = Readonly<{
  id: string;
  type: string;
  created: number;
  livemode?: boolean;
  data: { object: Readonly<{ id?: string; status?: string; amount?: number; currency?: string; metadata?: Record<string, string> | null }> };
}>;

export type StripeWebhookRecoveryResult = Readonly<{
  status: "terminalized" | "processing_unchanged" | "already_resolved" | "ignored";
  eventType: string;
  paymentId?: string;
  newState?: string;
}>;

// Safe, non-sensitive rejection. Carries only a stable code — never the raw provider payload.
export class StripeWebhookRejection extends Error {
  constructor(readonly code:
    | "uncorrelated_metadata"
    | "unknown_reference"
    | "metadata_mismatch"
    | "livemode_rejected") {
    super(`stripe_webhook_rejected:${code}`);
    this.name = "StripeWebhookRejection";
  }
}

// Authoritative terminals: settled outcomes (succeeded/failed) PLUS an authoritative manual-capture
// AUTHORIZATION (requires_capture → `authorized`), which resolves the indeterminate attempt WITHOUT
// capturing money. Pending / action / created states stay `processing`.
function classify(event: StripeEventLike): { kind: "terminal"; newState: "succeeded" | "failed" | "authorized" } | { kind: "processing" } | { kind: "ignored" } {
  const status = event.data.object.status;
  switch (event.type) {
    case "payment_intent.succeeded":
      return status === "succeeded" ? { kind: "terminal", newState: "succeeded" } : { kind: "processing" };
    case "payment_intent.payment_failed":
      return status === "requires_payment_method" ? { kind: "terminal", newState: "failed" } : { kind: "processing" };
    case "payment_intent.canceled":
      return status === "canceled" ? { kind: "terminal", newState: "failed" } : { kind: "processing" };
    case "payment_intent.amount_capturable_updated":
      // Manual-capture authorization succeeded (funds held, NOT captured). Resolve to `authorized`; a
      // later capture/void acts on this held authorization (its id is persisted as authorizationReference).
      return status === "requires_capture" ? { kind: "terminal", newState: "authorized" } : { kind: "processing" };
    case "payment_intent.processing":
    case "payment_intent.requires_action":
    case "payment_intent.created":
      return { kind: "processing" };
    default:
      return { kind: "ignored" };
  }
}

export function createStripeWebhookRecovery(deps: {
  // Verifies the Stripe signature and enforces test-mode (livemode=false). Returns the parsed event or
  // throws. Reuse the Stripe test provider's verifyWebhook — this handler adds no signature logic itself.
  // Defaults to false (test mode). Live deployments pass true; any mismatch is rejected.
  expectLivemode?: boolean;
  verifyWebhook(rawBody: Buffer, signature: string): Promise<StripeEventLike>;
  repository: Pick<PaymentRepository, "get" | "processProviderEvent">;
}) {
  return {
    async resolve(rawBody: Buffer, signature: string): Promise<StripeWebhookRecoveryResult> {
      const event = await deps.verifyWebhook(rawBody, signature); // signature + test-mode enforced here
      if ((event.livemode === true) !== (deps.expectLivemode ?? false)) throw new StripeWebhookRejection("livemode_rejected"); // defence-in-depth

      const classification = classify(event);
      if (classification.kind === "ignored") return { status: "ignored", eventType: event.type };

      // Correlate using OUR provider metadata only (set at PaymentIntent create), never client input.
      const intent = event.data.object;
      const paymentId = intent.metadata?.payment_reference;
      const organizationId = intent.metadata?.organization_reference;
      if (!paymentId || !organizationId) throw new StripeWebhookRejection("uncorrelated_metadata");

      const current = await deps.repository.get(paymentId, organizationId);
      if (!current) throw new StripeWebhookRejection("unknown_reference"); // wrong tenant / unknown attempt

      // The event's amount/currency MUST match the persisted attempt — a mismatch is an uncorrelated or
      // spoofed event. CAD-only (single active currency).
      if (current.currency !== "CAD" || intent.currency !== "cad" || intent.amount !== current.amountMinor) {
        throw new StripeWebhookRejection("metadata_mismatch");
      }

      // Already resolved (a prior webhook / reconcile terminalized it) → no-op. This guarantees duplicate
      // and out-of-order deliveries can never reopen a terminal attempt.
      if (current.state !== "processing") {
        return { status: "already_resolved", eventType: event.type, paymentId, newState: current.state };
      }
      if (classification.kind === "processing") {
        return { status: "processing_unchanged", eventType: event.type, paymentId };
      }

      // Authoritative settled terminal → apply through the EXISTING idempotent, version-guarded path.
      // processProviderEvent: (org, eventId) idempotency + optimistic version+state guard + amount check.
      const payloadDigest = createHash("sha256").update(rawBody).digest("hex");
      const result = await deps.repository.processProviderEvent({
        eventId: event.id,
        paymentId,
        organizationId,
        expectedVersion: current.version,
        newState: classification.newState,
        amountMinor: current.amountMinor,
        payloadDigest,
        occurredAt: new Date(event.created * 1000),
        // On an authorization, persist the Stripe PaymentIntent id so a later capture/void can reference
        // the held authorization. Opaque provider id — no PAN/secret.
        ...(classification.newState === "authorized" && intent.id ? { authorizationReference: intent.id } : {})
      });
      return { status: "terminalized", eventType: event.type, paymentId, newState: result.state };
    }
  };
}
