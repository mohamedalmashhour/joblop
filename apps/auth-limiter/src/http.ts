import { randomUUID, timingSafeEqual } from "node:crypto";
import { createServer, type ServerResponse } from "node:http";
import {
  authorizeTrustedServiceRequest,
  type IdentityTokenVerifier,
  type TrustedReceiverAuthorization
} from "@rwos/service-auth";
import { stagingResetConfirmation, type LimiterConfig } from "./config";
import type { LimiterLogger } from "./logger";
import { LimiterRequestError, createLimiterService } from "./service";
import type { LimiterStore } from "./store";

export function buildLimiterHttpServer(options: {
  config: LimiterConfig;
  store: LimiterStore;
  logger: LimiterLogger;
  now?: () => Date;
  identityVerifier?: IdentityTokenVerifier;
}) {
  const service = createLimiterService(options.config, options.store, options.now);

  return createServer(async (request, response) => {
    const started = process.hrtime.bigint();
    const correlationId = safeCorrelationId(request.headers["x-request-id"]);
    response.setHeader("x-request-id", correlationId);
    try {
      if (request.method === "GET" && request.url === "/health") {
        return send(response, 200, {
          ok: true,
          service: "resident-workforce-os-auth-limiter",
          check: "liveness"
        });
      }
      if (request.method === "GET" && request.url === "/ready") {
        const ready =
          options.config.environment !== "staging" ||
          (receiverAuthorization(options.config).mode !== "legacy-app-only" &&
            Boolean(options.identityVerifier))
            ? await service.ready()
            : false;
        return send(response, ready ? 200 : 503, {
          ready,
          service: "resident-workforce-os-auth-limiter",
          check: "readiness"
        });
      }
      if (request.method === "POST" && request.url === "/v1/auth-rate-limit/consume") {
        try {
          await authorizeTrustedServiceRequest({
            headers: request.headers,
            rawHeaders: request.rawHeaders,
            ...(options.identityVerifier ? { verifier: options.identityVerifier } : {}),
            authorization: receiverAuthorization(options.config),
            operation: "auth-rate-limit:consume"
          });
        } catch {
          options.logger.warn("auth_limiter.authorization_denied", {
            correlationId,
            operation: "auth-rate-limit:consume"
          });
          return send(response, 401, unavailable());
        }
        const decision = await service.consume(await readJson(request));
        options.logger.info("auth_limiter.decision", {
          allowed: decision.allowed,
          correlationId
        });
        return send(response, 200, decision);
      }
      if (request.method === "POST" && request.url === "/v1/staging/reset") {
        if (
          !options.config.resetEnabled ||
          !options.config.resetToken ||
          !authorized(request.headers.authorization, options.config.resetToken)
        ) {
          return send(response, 404, unavailable());
        }
        const body = asRecord(await readJson(request));
        if (
          Object.keys(body).sort().join(",") !== "clusterId,confirmation,namespace,projectId" ||
          body.confirmation !== stagingResetConfirmation ||
          body.projectId !== options.config.projectId ||
          body.clusterId !== options.config.clusterId ||
          body.namespace !== options.config.namespace ||
          options.config.environment !== "staging"
        ) {
          return send(response, 404, unavailable());
        }
        const removed = await service.reset(`${options.config.namespace}:`);
        options.logger.warn("auth_limiter.staging_reset", {
          correlationId,
          removed
        });
        return send(response, 200, { reset: true, removed });
      }
      return send(response, 404, unavailable());
    } catch (error) {
      if (error instanceof LimiterRequestError || error instanceof RequestBodyError) {
        return send(response, 400, unavailable());
      }
      options.logger.error("auth_limiter.request_failed", { correlationId });
      return send(response, 503, unavailable());
    } finally {
      options.logger.info("auth_limiter.request_completed", {
        correlationId,
        durationMs: Number(process.hrtime.bigint() - started) / 1_000_000,
        method: request.method ?? "UNKNOWN"
      });
    }
  });
}

function receiverAuthorization(config: LimiterConfig): TrustedReceiverAuthorization {
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

function authorized(header: string | undefined, expected: string) {
  if (!header?.startsWith("Bearer ")) return false;
  const actual = Buffer.from(header.slice(7));
  const target = Buffer.from(expected);
  return actual.length === target.length && timingSafeEqual(actual, target);
}

async function readJson(request: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 16_384) throw new RequestBodyError();
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new RequestBodyError();
  }
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

function unavailable() {
  return { error: "RWOS_RESOURCE_UNAVAILABLE", message: "Resource unavailable." };
}

function safeCorrelationId(value: string | string[] | undefined) {
  return typeof value === "string" && /^[a-zA-Z0-9._-]{1,100}$/.test(value)
    ? value
    : `rwos-${randomUUID()}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

class RequestBodyError extends Error {}
