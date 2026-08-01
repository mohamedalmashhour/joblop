import { randomUUID, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  authorizeTrustedCall,
  readTrustedCallEnvelope,
  type IdentityTokenVerifier,
  type TrustedService
} from "@rwos/service-auth";
import { normalizeResetRequest, ResetRequestError, type ResetOperation } from "./command";
import type { QaResetCaller, QaResetCallerAlias, QaResetConfig } from "./config";
import type { ResetControlStore } from "./control";
import type { QaResetLogger } from "./logger";
import type { ResetManifest } from "./manifest";
import type { ResetLock, ResetRepository } from "./repository";
import { createQaResetService } from "./service";
import { checksumValue } from "./manifest";
import {
  QaResetRecordMutationError,
  type PostgresQaResetRepository
} from "./postgresRepository";

const paths: Record<string, ResetOperation> = {
  "/v1/qa-reset/dry-run": "dry-run",
  "/v1/qa-reset/prepare": "prepare",
  "/v1/qa-reset/cleanup": "cleanup"
};

export function buildQaResetHttpServer(options: {
  config: QaResetConfig;
  manifest: ResetManifest;
  repository: ResetRepository;
  lock: ResetLock;
  control: ResetControlStore;
  logger: QaResetLogger;
  now?: () => Date;
  identityVerifier?: IdentityTokenVerifier;
  durableDependencyReady?: () => boolean | Promise<boolean>;
  durableRepository?: PostgresQaResetRepository;
}) {
  const service = createQaResetService(options);
  return createServer(async (request, response) => {
    const started = process.hrtime.bigint();
    const correlationId = safeCorrelationId(request.headers["x-request-id"]);
    response.setHeader("x-request-id", correlationId);
    let operation: ResetOperation | "unknown" = "unknown";
    let scope = "unknown";
    try {
      if (request.method === "GET" && request.url === "/health") {
        return send(response, 200, {
          ok: true,
          service: "resident-workforce-os-qa-reset",
          check: "liveness"
        });
      }
      if (request.method === "GET" && request.url === "/ready") {
        const repositoryReady = options.durableRepository
          ? await service.readyDurable()
          : service.ready();
        const ready =
          repositoryReady &&
          Boolean(options.identityVerifier) &&
          Boolean(options.durableDependencyReady) &&
          (await dependencyReady(options.durableDependencyReady));
        return send(response, ready ? 200 : 503, {
          ready,
          service: "resident-workforce-os-qa-reset",
          check: "readiness"
        });
      }
      if (request.method === "GET" && request.url === "/v1/qa-reset/status") {
        await authorizeCaller(request, options, "qa-reset:status", "monitoring");
        const durableReady = await dependencyReady(options.durableDependencyReady);
        const repositoryReady = options.durableRepository
          ? await service.readyDurable()
          : service.ready();
        return send(response, 200, {
          ready: repositoryReady && durableReady,
          service: "resident-workforce-os-qa-reset",
          check: "authenticated-readiness"
        });
      }
      operation = paths[request.url ?? ""] ?? "unknown";
      if (request.method !== "POST" || operation === "unknown") {
        return sendError(response, 404, "RWOS_QA_RESET_UNAVAILABLE");
      }
      const authenticated = await authorizeCaller(request, options, `qa-reset:${operation}`);
      const caller = authenticated.caller;
      if (!authorizedHeaders(request, options.config, operation)) {
        return sendError(response, 403, "RWOS_QA_RESET_ACCESS_DENIED");
      }
      const command = normalizeResetRequest(await readJson(request), operation, options.config);
      if (!callerScopeAllowed(caller, command.scope, operation)) {
        return sendError(response, 403, "RWOS_QA_RESET_ACCESS_DENIED");
      }
      scope = command.scope;
      const durableCaller = {
        callerAlias: caller.alias,
        callerPrincipalDigest: authenticated.principalDigest,
        correlationId
      };
      const result =
        operation === "dry-run"
          ? options.durableRepository
            ? await service.dryRun(command, durableCaller)
            : service.dryRun(command)
          : operation === "prepare"
            ? options.durableRepository
              ? await service.prepare(command, durableCaller)
              : service.prepare(command)
            : options.durableRepository
              ? await service.cleanup(command, durableCaller)
              : service.cleanup(command);
      options.logger.info("qa_reset.operation_completed", {
        correlationId,
        operation,
        scope,
        tenantCount: command.tenantIds.length,
        manifestId: options.manifest.manifestId,
        manifestChecksum: options.manifest.checksum,
        releaseSha: options.manifest.releaseSha,
        result: "completed",
        status: 200
      });
      return send(response, 200, result);
    } catch (error) {
      if (error instanceof ResetRequestError || error instanceof RequestBodyError) {
        const status = error instanceof ResetRequestError ? error.status : 400;
        const code =
          error instanceof ResetRequestError ? error.code : "RWOS_QA_RESET_REQUEST_INVALID";
        return sendError(response, status, code);
      }
      if (error instanceof QaResetAuthorizationError) {
        options.logger.info("qa_reset.authorization_denied", {
          correlationId,
          operation,
          result: "blocked",
          status: 403
        });
        return sendError(response, 403, "RWOS_QA_RESET_ACCESS_DENIED");
      }
      options.logger.error("qa_reset.operation_failed", {
        correlationId,
        operation,
        scope,
        result: "blocked",
        status: 503,
        ...(error instanceof QaResetRecordMutationError
          ? { failedOperation: error.operation, failedEntityType: error.entityType }
          : {})
      });
      return sendError(response, 503, "RWOS_QA_RESET_UNAVAILABLE");
    } finally {
      options.logger.info("qa_reset.request_completed", {
        correlationId,
        operation,
        scope,
        durationMs: Number(process.hrtime.bigint() - started) / 1_000_000
      });
    }
  });
}

async function dependencyReady(check: (() => boolean | Promise<boolean>) | undefined) {
  if (!check) return false;
  try {
    return await check();
  } catch {
    return false;
  }
}

function authorizedHeaders(
  request: IncomingMessage,
  config: QaResetConfig,
  operation: ResetOperation
) {
  const approval =
    operation === "dry-run"
      ? config.dryRunApprovalReference
      : operation === "prepare"
        ? config.prepareApprovalReference
        : config.cleanupApprovalReference;
  return (
    request.headers["x-rwos-operation"] === `qa-reset:${operation}` &&
    request.headers["x-rwos-project-id"] === config.projectId &&
    request.headers["x-rwos-cluster-id"] === config.clusterId &&
    request.headers["x-rwos-database-id"] === config.databaseId &&
    request.headers["x-rwos-authority-id"] === config.authorityId &&
    request.headers["x-rwos-namespace"] === config.namespace &&
    request.headers["x-rwos-release-sha"] === config.releaseSha &&
    request.headers["x-rwos-manifest-id"] === config.manifestId &&
    request.headers["x-rwos-manifest-checksum"] === config.manifestChecksum &&
    request.headers["x-rwos-approval-reference"] === approval
  );
}

async function authorizeCaller(
  request: IncomingMessage,
  options: { config: QaResetConfig; identityVerifier?: IdentityTokenVerifier; now?: () => Date },
  operation: string,
  requiredCaller?: QaResetCallerAlias
) {
  try {
    rejectAmbiguousAuthorization(request);
    const alias = single(request.headers["x-rwos-service-id"]);
    if (!isCallerAlias(alias) || (requiredCaller && alias !== requiredCaller)) throw denied();
    if (
      (alias === "manual-qa" && operation !== "qa-reset:dry-run") ||
      (alias === "monitoring" && operation !== "qa-reset:status") ||
      (alias !== "manual-qa" &&
        alias !== "monitoring" &&
        !["qa-reset:dry-run", "qa-reset:prepare", "qa-reset:cleanup"].includes(operation))
    ) {
      throw denied();
    }
    const caller = options.config.callers[alias];
    if (
      !options.identityVerifier ||
      !authorized(
        single(request.headers["x-rwos-app-authorization"]),
        caller.applicationCredential
      ) ||
      request.headers["x-rwos-environment"] !== "staging" ||
      (caller.operatorIdentity !== null &&
        request.headers["x-rwos-operator-id"] !== caller.operatorIdentity) ||
      (caller.operatorIdentity === null && request.headers["x-rwos-operator-id"] !== undefined)
    ) {
      throw denied();
    }
    const token = bearer(request.headers.authorization);
    if (!token) throw denied();
    const identity = await options.identityVerifier.verify({
      token,
      audience: options.config.audience
    });
    if (identity.audience !== options.config.audience) throw denied();
    const envelope = readTrustedCallEnvelope({
      "x-rwos-service-id": alias,
      "x-rwos-operation": single(request.headers["x-rwos-operation"]),
      "x-rwos-environment": single(request.headers["x-rwos-environment"]),
      "x-rwos-release-sha": single(request.headers["x-rwos-release-sha"]),
      "x-rwos-manifest-id": single(request.headers["x-rwos-manifest-id"]),
      "x-rwos-manifest-checksum": single(request.headers["x-rwos-manifest-checksum"])
    });
    authorizeTrustedCall(
      identity,
      envelope,
      {
        caller: alias as TrustedService,
        serviceAccountEmail: caller.serviceAccountEmail,
        operations: [operation],
        environment: "staging",
        releaseSha: options.config.releaseSha,
        manifest: {
          id: options.config.manifestId,
          checksum: options.config.manifestChecksum
        }
      },
      options.now?.() ?? new Date()
    );
    return {
      caller,
      principalDigest: checksumValue({
        subject: identity.subject,
        serviceAccountEmail: identity.serviceAccountEmail,
        audience: identity.audience
      })
    };
  } catch {
    throw denied();
  }
}

function authorized(header: string | undefined, expected: string) {
  if (!header?.startsWith("Bearer ")) return false;
  const actual = Buffer.from(header.slice(7));
  const target = Buffer.from(expected);
  return actual.length === target.length && timingSafeEqual(actual, target);
}

function callerScopeAllowed(
  caller: QaResetCaller,
  scope: "browser" | "native",
  operation: ResetOperation
) {
  if (caller.alias === "browser-e2e") return scope === "browser";
  if (caller.alias === "ios-e2e" || caller.alias === "android-e2e") return scope === "native";
  if (caller.alias === "manual-qa") return scope === "browser" && operation === "dry-run";
  return false;
}

function rejectAmbiguousAuthorization(request: IncomingMessage) {
  for (const name of [
    "authorization",
    "x-rwos-app-authorization",
    "x-rwos-service-id",
    "x-rwos-operator-id",
    "x-rwos-operation",
    "x-rwos-environment",
    "x-rwos-release-sha",
    "x-rwos-manifest-id",
    "x-rwos-manifest-checksum"
  ]) {
    const value = request.headers[name];
    if (Array.isArray(value) || (typeof value === "string" && value.includes(","))) throw denied();
    let count = 0;
    for (let index = 0; index < request.rawHeaders.length; index += 2) {
      if (request.rawHeaders[index]?.toLowerCase() === name) count += 1;
    }
    if (count > 1) throw denied();
  }
}

function bearer(value: string | undefined) {
  if (!value?.startsWith("Bearer ")) return null;
  const token = value.slice(7);
  return token && !/\s/.test(token) ? token : null;
}

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function isCallerAlias(value: string | undefined): value is QaResetCallerAlias {
  return (
    value === "browser-e2e" ||
    value === "ios-e2e" ||
    value === "android-e2e" ||
    value === "manual-qa" ||
    value === "monitoring"
  );
}

function denied() {
  return new QaResetAuthorizationError();
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
  return send(response, status, { error: code, message: "Resource unavailable." });
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
class QaResetAuthorizationError extends Error {}
