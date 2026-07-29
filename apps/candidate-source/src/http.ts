import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  authorizeTrustedServiceRequest,
  type IdentityTokenVerifier,
  type TrustedReceiverAuthorization
} from "@rwos/service-auth";
import type { CandidateSourceConfig } from "./config";
import type { CandidateLogger } from "./logger";
import { manifestIsReady, type SyntheticManifest } from "./manifest";
import { CandidateRateLimiter } from "./rateLimit";
import { CandidateRequestError, createCandidateSourceService } from "./service";

const serviceId = "rwos-api";
const operations = {
  "/v1/candidates/search": "candidates:search",
  "/v1/candidates/evaluate": "candidates:evaluate"
} as const;

export function buildCandidateSourceHttpServer(options: {
  config: CandidateSourceConfig;
  manifest: SyntheticManifest;
  logger: CandidateLogger;
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
}) {
  const service = createCandidateSourceService(options.config, options.manifest, options.now);
  const limiter =
    options.limiter ??
    (options.config.environment === "test"
      ? new CandidateRateLimiter(
          options.config.tenantLimitPerMinute,
          options.config.serviceLimitPerMinute
        )
      : null);

  return createServer(async (request, response) => {
    const started = process.hrtime.bigint();
    const correlationId = safeCorrelationId(request.headers["x-request-id"]);
    response.setHeader("x-request-id", correlationId);
    let operation = "unknown";
    let organizationId = "unknown";
    try {
      if (request.method === "GET" && request.url === "/health") {
        return send(response, 200, {
          ok: true,
          service: "resident-workforce-os-candidate-source",
          check: "liveness"
        });
      }
      if (request.method === "GET" && request.url === "/ready") {
        const limiterReady =
          options.config.environment === "staging"
            ? Boolean(limiter?.ready && (await limiter.ready()))
            : Boolean(limiter);
        const ready =
          manifestIsReady(options.manifest, options.config) &&
          limiterReady &&
          (options.config.environment !== "staging" ||
            (receiverAuthorization(options.config).mode !== "legacy-app-only" &&
              Boolean(options.identityVerifier)));
        return send(response, ready ? 200 : 503, {
          ready,
          service: "resident-workforce-os-candidate-source",
          check: "readiness"
        });
      }
      const expectedOperation = operations[request.url as keyof typeof operations];
      if (request.method !== "POST" || !expectedOperation) {
        return sendError(response, 404, "RWOS_CANDIDATE_UNAVAILABLE");
      }
      operation = expectedOperation;
      const tenantHeader = singleHeader(request, "x-rwos-tenant-id");
      try {
        await authorizeTrustedServiceRequest({
          headers: request.headers,
          rawHeaders: request.rawHeaders,
          ...(options.identityVerifier ? { verifier: options.identityVerifier } : {}),
          authorization: receiverAuthorization(options.config),
          operation: expectedOperation,
          ...(tenantHeader ? { tenantId: tenantHeader } : {}),
          allowedTenants: options.config.tenants.map((tenant) => tenant.organizationId)
        });
      } catch {
        options.logger.warn("candidate_source.authorization_denied", {
          correlationId,
          operation
        });
        return sendError(response, 403, "RWOS_CANDIDATE_ACCESS_DENIED");
      }
      organizationId = tenantHeader ?? "unknown";

      if (!limiter) throw new Error("RWOS_DISTRIBUTED_RATE_LIMIT_REQUIRED");
      const decision = await limiter.consume(organizationId, serviceId);
      if (!decision.allowed) {
        response.setHeader("retry-after", String(decision.retryAfterSeconds));
        return sendError(response, 429, "RWOS_CANDIDATE_RATE_LIMITED");
      }

      const body = await readJson(request);
      const result =
        expectedOperation === "candidates:search"
          ? service.search(body, organizationId)
          : service.evaluate(body, organizationId);
      const resultCount = "candidates" in result ? result.candidates.length : 1;
      options.logger.info("candidate_source.request_succeeded", {
        correlationId,
        operation,
        tenantScoped: true,
        releaseSha: options.config.releaseSha,
        manifestVersion: options.manifest.version,
        resultCount,
        status: 200
      });
      return send(response, 200, result);
    } catch (error) {
      if (error instanceof CandidateRequestError) {
        return sendError(response, error.status, error.code);
      }
      if (error instanceof RequestBodyError) {
        return sendError(response, 400, "RWOS_CANDIDATE_REQUEST_INVALID");
      }
      options.logger.error("candidate_source.request_failed", {
        correlationId,
        operation,
        tenantScoped: organizationId !== "unknown",
        status: 503
      });
      return sendError(response, 503, "RWOS_CANDIDATE_UNAVAILABLE");
    } finally {
      options.logger.info("candidate_source.request_completed", {
        correlationId,
        operation,
        tenantScoped: organizationId !== "unknown",
        durationMs: Number(process.hrtime.bigint() - started) / 1_000_000
      });
    }
  });
}

function receiverAuthorization(config: CandidateSourceConfig): TrustedReceiverAuthorization {
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

function singleHeader(request: IncomingMessage, name: string) {
  const value = request.headers[name];
  return typeof value === "string" && value.length <= 100 ? value : null;
}

async function readJson(request: IncomingMessage) {
  const contentLength = request.headers["content-length"];
  if (contentLength && Number(contentLength) > 16_384) throw new RequestBodyError();
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
