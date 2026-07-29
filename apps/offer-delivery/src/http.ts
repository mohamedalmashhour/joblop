import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  authorizeTrustedServiceRequest,
  type IdentityTokenVerifier,
  type TrustedReceiverAuthorization
} from "@rwos/service-auth";
import type { OfferDeliveryConfig } from "./config";
import type { DeliveryLogger } from "./logger";
import { manifestReady, type DeliveryManifest } from "./manifest";
import { DeliveryRateLimiter } from "./rateLimit";
import { DeliveryRequestError, createOfferDeliveryService } from "./service";
import {
  ControlledDurableDeliveryStore,
  type DurableDeliveryTransactionStore
} from "./durableStore";

const serviceId = "rwos-api";
const operation = "worker-offers:deliver";

export function buildOfferDeliveryHttpServer(options: {
  config: OfferDeliveryConfig;
  manifest: DeliveryManifest;
  logger: DeliveryLogger;
  store?: DurableDeliveryTransactionStore;
  limiter?: Readonly<{
    ready?(): Promise<boolean>;
    consume(
      tenantId: string,
      serviceId: string
    ):
      | Readonly<{ allowed: boolean; retryAfterSeconds: number }>
      | Promise<Readonly<{ allowed: boolean; retryAfterSeconds: number }>>;
  }>;
  now?: () => Date;
  identityVerifier?: IdentityTokenVerifier;
  idempotencyKeyDigest?: (key: string) => string;
}) {
  const store =
    options.store ??
    (options.config.environment === "test" ? new ControlledDurableDeliveryStore() : null);
  const service =
    store && (options.config.environment === "test" || options.idempotencyKeyDigest)
    ? createOfferDeliveryService({
        config: options.config,
        manifest: options.manifest,
        store,
        ...(options.now ? { now: options.now } : {}),
        ...(options.idempotencyKeyDigest
          ? { idempotencyKeyDigest: options.idempotencyKeyDigest }
          : {})
      })
    : null;
  const limiter =
    options.limiter ??
    (options.config.environment === "test"
      ? new DeliveryRateLimiter(
          options.config.tenantLimitPerMinute,
          options.config.serviceLimitPerMinute
        )
      : null);

  return createServer(async (request, response) => {
    const started = process.hrtime.bigint();
    const correlationId = safeCorrelationId(request.headers["x-request-id"]);
    response.setHeader("x-request-id", correlationId);
    let organizationId = "unknown";
    try {
      if (request.method === "GET" && request.url === "/health") {
        return send(response, 200, {
          ok: true,
          service: "resident-workforce-os-offer-delivery",
          check: "liveness"
        });
      }
      if (request.method === "GET" && request.url === "/ready") {
        const limiterReady =
          options.config.environment === "staging"
            ? Boolean(limiter?.ready && (await limiter.ready()))
            : Boolean(limiter);
        const ready =
          manifestReady(options.manifest, options.config) &&
          Boolean(store) &&
          Boolean(service) &&
          Boolean(await store?.ready()) &&
          limiterReady &&
          (options.config.environment !== "staging" ||
            (receiverAuthorization(options.config).mode !== "legacy-app-only" &&
              Boolean(options.identityVerifier)));
        return send(response, ready ? 200 : 503, {
          ready,
          service: "resident-workforce-os-offer-delivery",
          check: "readiness"
        });
      }
      if (request.method !== "POST" || request.url !== "/v1/worker-offers/deliver") {
        return sendError(response, 404, "RWOS_DELIVERY_UNAVAILABLE");
      }
      const tenantHeader = singleHeader(request, "x-rwos-tenant-id");
      const idempotencyKey = singleHeader(request, "idempotency-key", 200);
      try {
        await authorizeTrustedServiceRequest({
          headers: request.headers,
          rawHeaders: request.rawHeaders,
          ...(options.identityVerifier ? { verifier: options.identityVerifier } : {}),
          authorization: receiverAuthorization(options.config),
          operation,
          ...(tenantHeader ? { tenantId: tenantHeader } : {}),
          allowedTenants: options.config.tenants.map((tenant) => tenant.organizationId),
          ...(idempotencyKey ? { idempotencyKey } : {}),
          requireIdempotencyKey: true
        });
      } catch {
        audit(options.logger, "denial", { correlationId, status: 403 });
        return sendError(response, 403, "RWOS_DELIVERY_ACCESS_DENIED");
      }
      if (!tenantHeader) return sendError(response, 403, "RWOS_DELIVERY_ACCESS_DENIED");
      organizationId = tenantHeader;
      if (!idempotencyKey) {
        return sendError(response, 400, "RWOS_DELIVERY_REQUEST_INVALID");
      }
      if (!limiter) throw new Error("RWOS_DISTRIBUTED_RATE_LIMIT_REQUIRED");
      const limit = await limiter.consume(organizationId, serviceId);
      if (!limit.allowed) {
        response.setHeader("retry-after", String(limit.retryAfterSeconds));
        return sendError(response, 429, "RWOS_DELIVERY_RATE_LIMITED");
      }
      if (!service) throw new Error("RWOS_DURABLE_DELIVERY_STATE_REQUIRED");
      const outcome = await service.deliver(
        await readJson(request),
        organizationId,
        idempotencyKey
      );
      audit(options.logger, outcome.audit.event, {
        ...outcome.audit,
        correlationId,
        tenantScoped: true,
        status: 200
      });
      if (outcome.audit.cleanupCount > 0) {
        audit(options.logger, "cleanup", {
          cleanupCount: outcome.audit.cleanupCount,
          correlationId,
          tenantScoped: true
        });
      }
      return send(response, 200, outcome.response);
    } catch (error) {
      if (error instanceof DeliveryRequestError) {
        audit(options.logger, error.auditEvent, {
          correlationId,
          tenantScoped: organizationId !== "unknown",
          status: error.status
        });
        return sendError(response, error.status, error.code);
      }
      if (error instanceof RequestBodyError) {
        return sendError(response, 400, "RWOS_DELIVERY_REQUEST_INVALID");
      }
      options.logger.error("offer_delivery.request_failed", {
        correlationId,
        tenantScoped: organizationId !== "unknown",
        operation,
        status: 503
      });
      return sendError(response, 503, "RWOS_DELIVERY_UNAVAILABLE");
    } finally {
      options.logger.info("offer_delivery.request_completed", {
        correlationId,
        tenantScoped: organizationId !== "unknown",
        operation,
        durationMs: Number(process.hrtime.bigint() - started) / 1_000_000
      });
    }
  });
}

function receiverAuthorization(config: OfferDeliveryConfig): TrustedReceiverAuthorization {
  return (
    config.trustedAuthorization ?? {
      mode: "legacy-app-only",
      audience: null,
      callerServiceAccount: null,
      applicationCredential: config.serviceToken,
      environment: "test",
      releaseSha: config.releaseSha
    }
  );
}

function audit(logger: DeliveryLogger, eventType: string, fields: Record<string, unknown>) {
  logger.info("offer_delivery.audit", { eventType, operation, ...fields });
}

function singleHeader(request: IncomingMessage, name: string, maximum = 100) {
  const value = request.headers[name];
  return typeof value === "string" && value.length >= 1 && value.length <= maximum ? value : null;
}

async function readJson(request: IncomingMessage) {
  const contentLength = request.headers["content-length"];
  if (contentLength && Number(contentLength) > 8_192) throw new RequestBodyError();
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 8_192) throw new RequestBodyError();
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new RequestBodyError();
  }
}

function sendError(response: ServerResponse, status: number, code: string) {
  return send(response, status, {
    error: code,
    message: status === 429 ? "Request rate limited." : "Resource unavailable."
  });
}

function send(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status;
  response.setHeader("cache-control", "no-store");
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("content-security-policy", "default-src 'none'; frame-ancestors 'none'");
  response.setHeader("permissions-policy", "camera=(), geolocation=(), microphone=(), payment=()");
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("x-frame-options", "DENY");
  response.setHeader("referrer-policy", "no-referrer");
  response.end(JSON.stringify(body));
}

function safeCorrelationId(value: string | string[] | undefined) {
  return typeof value === "string" && /^[a-zA-Z0-9._-]{1,100}$/.test(value)
    ? value
    : `rwos-${randomUUID()}`;
}

class RequestBodyError extends Error {}
