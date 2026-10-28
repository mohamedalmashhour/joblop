import type { FastifyInstance } from "fastify";
import { StripeWebhookRejection } from "./stripeWebhookRecovery";
import { EmployerInvoiceWebhookRejection } from "./employerInvoiceWebhook";

// Stage 2b.4-C3-G-e1 — mount the Stripe webhook-first recovery handler behind a dedicated endpoint.
// Test-mode only; no live keys; not authenticated (Stripe cannot present a user session); correlation is
// done entirely inside the recovery handler via OUR provider metadata + persisted records. This route
// only handles transport: raw body for signature verification, size cap, POST-only, rate limiting, safe
// structured logging, and deterministic responses for duplicate/replayed events. It moves no money.

const DEFAULT_PATH = "/payments/webhooks/stripe";
const DEFAULT_BODY_LIMIT = 65_536; // 64 KiB — Stripe events are small; cap hard.
const DEFAULT_RATE = { maxPerWindow: 240, windowMs: 60_000 }; // generous but bounded, per client.

type Recovery = { resolve(rawBody: Buffer, signature: string): Promise<{ status: string; eventType: string; paymentId?: string; newState?: string }> };

function fixedWindowLimiter(maxPerWindow: number, windowMs: number, now: () => number) {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return (key: string): { allowed: boolean; retryAfterSeconds: number } => {
    const t = now();
    const bucket = buckets.get(key);
    if (!bucket || t >= bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: t + windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    bucket.count += 1;
    return { allowed: bucket.count <= maxPerWindow, retryAfterSeconds: Math.ceil((bucket.resetAt - t) / 1000) };
  };
}

function isSignatureError(error: unknown): boolean {
  const e = error as { type?: string; name?: string; message?: string };
  return e?.type === "StripeSignatureVerificationError" || /signature/i.test(e?.message ?? "");
}

// Money-flow Phase 1 — mount the employer-invoice Stripe TEST webhook reconcile on its own path, reusing
// the exact same transport hardening (raw body for signature verification, size cap, POST-only, rate
// limiting, safe structured logging, deterministic duplicate/ignored responses). Test-mode only; not
// authenticated (Stripe presents no user session); correlation + the paid decision live entirely inside
// the injected handler. It moves no money.
const DEFAULT_INVOICE_PATH = "/payments/webhooks/stripe/employer-invoices";

type InvoiceRecovery = {
  resolve(
    rawBody: Buffer,
    signature: string
  ): Promise<{ status: string; eventType: string; invoiceId?: string; invoiceStatus?: string }>;
};

export function registerEmployerInvoiceWebhookRoute(app: FastifyInstance, options: {
  recovery: InvoiceRecovery;
  path?: string;
  bodyLimit?: number;
  rateLimit?: { maxPerWindow: number; windowMs: number };
  now?: () => number;
}): void {
  const path = options.path ?? DEFAULT_INVOICE_PATH;
  const bodyLimit = options.bodyLimit ?? DEFAULT_BODY_LIMIT;
  const rate = options.rateLimit ?? DEFAULT_RATE;
  const now = options.now ?? (() => Date.now());
  const limit = fixedWindowLimiter(rate.maxPerWindow, rate.windowMs, now);

  app.register(async (scoped) => {
    scoped.addContentTypeParser("application/json", { parseAs: "buffer", bodyLimit }, (_req, body, done) => {
      done(null, body);
    });

    scoped.post(path, { bodyLimit }, async (request, reply) => {
      const clientKey = request.ip || "unknown";
      const gate = limit(clientKey);
      if (!gate.allowed) {
        return reply.code(429).header("retry-after", String(gate.retryAfterSeconds)).send({ error: "rate_limited" });
      }

      const signature = request.headers["stripe-signature"];
      const rawBody = request.body;
      if (typeof signature !== "string" || !signature || !Buffer.isBuffer(rawBody)) {
        request.log.info({ evt: "stripe_invoice_webhook", outcome: "rejected", reason: "missing_signature_or_body" });
        return reply.code(400).send({ error: "invalid_request" });
      }

      try {
        const result = await options.recovery.resolve(rawBody, signature);
        request.log.info({ evt: "stripe_invoice_webhook", type: result.eventType, status: result.status, invoiceId: result.invoiceId });
        return reply.code(200).send({ received: true, status: result.status });
      } catch (error) {
        if (error instanceof EmployerInvoiceWebhookRejection) {
          if (error.code === "livemode_rejected") {
            request.log.warn({ evt: "stripe_invoice_webhook", outcome: "rejected", reason: "livemode" });
            return reply.code(400).send({ error: "livemode_rejected" });
          }
          // Uncorrelated / not-paid: acknowledge WITHOUT applying (safe no-op) so Stripe does not
          // retry-storm events that are not ours or not terminal; the decision is logged (no payload).
          request.log.info({ evt: "stripe_invoice_webhook", outcome: "ignored", reason: error.code });
          return reply.code(202).send({ received: true, status: "ignored", reason: error.code });
        }
        if (isSignatureError(error)) {
          request.log.warn({ evt: "stripe_invoice_webhook", outcome: "rejected", reason: "invalid_signature" });
          return reply.code(400).send({ error: "invalid_signature" });
        }
        request.log.error({ evt: "stripe_invoice_webhook", outcome: "error" });
        return reply.code(500).send({ error: "internal_error" });
      }
    });
  });
}

export function registerStripeWebhookRoute(app: FastifyInstance, options: {
  recovery: Recovery;
  path?: string;
  bodyLimit?: number;
  rateLimit?: { maxPerWindow: number; windowMs: number };
  now?: () => number;
}): void {
  const path = options.path ?? DEFAULT_PATH;
  const bodyLimit = options.bodyLimit ?? DEFAULT_BODY_LIMIT;
  const rate = options.rateLimit ?? DEFAULT_RATE;
  const now = options.now ?? (() => Date.now());
  const limit = fixedWindowLimiter(rate.maxPerWindow, rate.windowMs, now);

  // Encapsulated plugin: a RAW-body parser scoped to this route only, so the rest of the app keeps its
  // JSON parsing. Stripe signatures are computed over the exact raw bytes.
  app.register(async (scoped) => {
    scoped.addContentTypeParser("application/json", { parseAs: "buffer", bodyLimit }, (_req, body, done) => {
      done(null, body);
    });

    scoped.post(path, { bodyLimit }, async (request, reply) => {
      const clientKey = request.ip || "unknown";
      const gate = limit(clientKey);
      if (!gate.allowed) {
        return reply.code(429).header("retry-after", String(gate.retryAfterSeconds)).send({ error: "rate_limited" });
      }

      const signature = request.headers["stripe-signature"];
      const rawBody = request.body;
      if (typeof signature !== "string" || !signature || !Buffer.isBuffer(rawBody)) {
        request.log.info({ evt: "stripe_webhook", outcome: "rejected", reason: "missing_signature_or_body" });
        return reply.code(400).send({ error: "invalid_request" });
      }

      try {
        const result = await options.recovery.resolve(rawBody, signature);
        // Safe structured log — event type + decision + internal id only; never payload/secret/PAN.
        request.log.info({ evt: "stripe_webhook", type: result.eventType, status: result.status, paymentId: result.paymentId });
        return reply.code(200).send({ received: true, status: result.status });
      } catch (error) {
        if (error instanceof StripeWebhookRejection) {
          if (error.code === "livemode_rejected") {
            request.log.warn({ evt: "stripe_webhook", outcome: "rejected", reason: "livemode" });
            return reply.code(400).send({ error: "livemode_rejected" });
          }
          // Uncorrelated / unknown / mismatched: acknowledge WITHOUT applying (safe no-op) so Stripe does
          // not retry-storm events that are not ours; the internal decision is logged (no payload).
          request.log.info({ evt: "stripe_webhook", outcome: "ignored", reason: error.code });
          return reply.code(202).send({ received: true, status: "ignored", reason: error.code });
        }
        if (isSignatureError(error)) {
          request.log.warn({ evt: "stripe_webhook", outcome: "rejected", reason: "invalid_signature" });
          return reply.code(400).send({ error: "invalid_signature" });
        }
        // Genuine internal failure (e.g. datastore) → 500 so Stripe retries later. No detail leaked.
        request.log.error({ evt: "stripe_webhook", outcome: "error" });
        return reply.code(500).send({ error: "internal_error" });
      }
    });
  });
}
