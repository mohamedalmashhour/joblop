export const trustedServices = [
  "api",
  "auth-limiter",
  "candidate-source",
  "offer-delivery",
  "qa-reset",
  "employer-web",
  "admin-web",
  "worker-web",
  "browser-e2e",
  "native-e2e",
  "ios-e2e",
  "android-e2e",
  "manual-qa",
  "monitoring"
] as const;

export type TrustedService = (typeof trustedServices)[number];

export type IdentityToken = Readonly<{
  value: string;
  expiresAt: Date;
}>;

export interface IdentityTokenProvider {
  getToken(input: Readonly<{ audience: string; receiver: TrustedService }>): Promise<IdentityToken>;
}

export type TrustedServiceIdentityHeaders = Readonly<{
  authorization: string;
}>;

export type VerifiedServiceIdentity = Readonly<{
  subject: string;
  serviceAccountEmail: string;
  audience: string;
  issuedAt: Date;
  expiresAt: Date;
}>;

export interface IdentityTokenVerifier {
  verify(input: Readonly<{ token: string; audience: string }>): Promise<VerifiedServiceIdentity>;
}

export type TrustedAuthorizationMode = "legacy-app-only" | "dual-required" | "iam-application";

export type TrustedReceiverAuthorization = Readonly<{
  mode: TrustedAuthorizationMode;
  audience: string | null;
  callerServiceAccount: string | null;
  applicationCredential: string;
  environment: "test" | "staging";
  releaseSha: string;
}>;

export function readTrustedReceiverAuthorization(options: {
  env: NodeJS.ProcessEnv;
  prefix: string;
  environment: "local" | "test" | "staging" | "production";
  applicationCredential: string;
  releaseSha: string;
}): TrustedReceiverAuthorization {
  if (options.environment === "production") {
    throw new Error("RWOS_TRUSTED_AUTH_PRODUCTION_UNAPPROVED");
  }
  const rawMode = options.env[`${options.prefix}_AUTH_MODE`] ?? "legacy-app-only";
  if (!["legacy-app-only", "dual-required", "iam-application"].includes(rawMode)) {
    throw new Error("RWOS_TRUSTED_AUTH_MODE_INVALID");
  }
  const mode = rawMode as TrustedAuthorizationMode;
  if (options.environment === "staging" && mode === "legacy-app-only") {
    throw new Error("RWOS_TRUSTED_AUTH_LEGACY_STAGING_DENIED");
  }
  if (options.environment !== "staging" && mode !== "legacy-app-only") {
    throw new Error("RWOS_TRUSTED_AUTH_NON_STAGING_MODE_DENIED");
  }
  if (mode === "legacy-app-only") {
    return {
      mode,
      audience: null,
      callerServiceAccount: null,
      applicationCredential: options.applicationCredential,
      environment: "test",
      releaseSha: options.releaseSha
    };
  }
  const audienceValue = options.env[`${options.prefix}_AUDIENCE`];
  const callerServiceAccount = options.env[`${options.prefix}_API_SERVICE_ACCOUNT`];
  if (
    !audienceValue ||
    !callerServiceAccount ||
    callerServiceAccount.length > 254 ||
    !/^[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9.-]*$/.test(callerServiceAccount)
  ) {
    throw new Error("RWOS_TRUSTED_AUTH_CONFIGURATION_INVALID");
  }
  return {
    mode,
    audience: validateAudience(audienceValue),
    callerServiceAccount,
    applicationCredential: options.applicationCredential,
    environment: "staging",
    releaseSha: options.releaseSha
  };
}

export async function authorizeTrustedServiceRequest(options: {
  headers: Readonly<Record<string, string | string[] | undefined>>;
  rawHeaders?: readonly string[];
  verifier?: IdentityTokenVerifier;
  authorization: TrustedReceiverAuthorization;
  operation: string;
  tenantId?: string;
  allowedTenants?: readonly string[];
  idempotencyKey?: string;
  requireIdempotencyKey?: boolean;
}) {
  rejectDuplicateOrAmbiguousHeaders(options.headers, options.rawHeaders);
  const authorization = options.authorization;
  if (authorization.mode === "legacy-app-only") {
    if (
      authorization.environment !== "test" ||
      options.headers["x-rwos-app-authorization"] !== undefined ||
      options.headers["x-rwos-caller-identity-token"] !== undefined ||
      !constantTimeBearer(options.headers.authorization, authorization.applicationCredential) ||
      options.headers["x-rwos-service-id"] !== "rwos-api" ||
      options.headers["x-rwos-operation"] !== options.operation ||
      (options.tenantId !== undefined &&
        options.headers["x-rwos-tenant-id"] !== options.tenantId) ||
      (options.allowedTenants &&
        (options.tenantId === undefined || !options.allowedTenants.includes(options.tenantId))) ||
      (options.requireIdempotencyKey && !validIdempotencyKey(options.idempotencyKey ?? null))
    ) {
      throw new Error("RWOS_TRUSTED_CALL_DENIED");
    }
    return Object.freeze({ caller: "api" as const, operation: options.operation });
  }

  if (
    authorization.environment !== "staging" ||
    !authorization.audience ||
    !authorization.callerServiceAccount ||
    !options.verifier ||
    !constantTimeBearer(
      options.headers["x-rwos-app-authorization"],
      authorization.applicationCredential
    )
  ) {
    throw new Error("RWOS_TRUSTED_CALL_DENIED");
  }
  const identityToken = bearerValue(options.headers.authorization);
  if (!identityToken) throw new Error("RWOS_TRUSTED_CALL_DENIED");
  const identity = await options.verifier
    .verify({ token: identityToken, audience: authorization.audience })
    .catch(() => {
      throw new Error("RWOS_TRUSTED_CALL_DENIED");
    });
  if (identity.audience !== authorization.audience) {
    throw new Error("RWOS_TRUSTED_CALL_DENIED");
  }
  const envelope = readTrustedCallEnvelope({
    "x-rwos-service-id": singleString(options.headers["x-rwos-service-id"]),
    "x-rwos-operation": singleString(options.headers["x-rwos-operation"]),
    "x-rwos-tenant-id": singleString(options.headers["x-rwos-tenant-id"]),
    "x-rwos-environment": singleString(options.headers["x-rwos-environment"]),
    "x-rwos-release-sha": singleString(options.headers["x-rwos-release-sha"]),
    "idempotency-key": options.idempotencyKey
  });
  if (
    envelope.operation !== options.operation ||
    (options.tenantId !== undefined && envelope.tenantId !== options.tenantId)
  ) {
    throw new Error("RWOS_TRUSTED_CALL_DENIED");
  }
  return authorizeTrustedCall(identity, envelope, {
    caller: "api",
    serviceAccountEmail: authorization.callerServiceAccount,
    operations: [options.operation],
    ...(options.allowedTenants ? { tenants: options.allowedTenants } : {}),
    environment: "staging",
    releaseSha: authorization.releaseSha,
    ...(options.requireIdempotencyKey ? { requireIdempotencyKey: true } : {})
  });
}

export type TrustedAudienceRegistry = Readonly<Partial<Record<TrustedService, string>>>;

export function createTrustedAudienceRegistry(
  entries: Readonly<Partial<Record<TrustedService, string>>>
): TrustedAudienceRegistry {
  const seen = new Set<string>();
  return Object.freeze(
    Object.fromEntries(
      Object.entries(entries).map(([receiver, value]) => {
        if (!isTrustedService(receiver) || !value) throw new Error("RWOS_TRUSTED_AUDIENCE_INVALID");
        const audience = validateAudience(value);
        if (seen.has(audience)) throw new Error("RWOS_TRUSTED_AUDIENCE_DUPLICATE");
        seen.add(audience);
        return [receiver, audience];
      })
    )
  );
}

export function requiredAudience(registry: TrustedAudienceRegistry, receiver: TrustedService) {
  const audience = registry[receiver];
  if (!audience) throw new Error("RWOS_TRUSTED_AUDIENCE_MISSING");
  return audience;
}

export function validateAudience(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("RWOS_TRUSTED_AUDIENCE_INVALID");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.hostname.includes("*") ||
    url.hostname.includes("..") ||
    !/^[a-z0-9][a-z0-9.-]*\.run\.app$/.test(url.hostname) ||
    !url.hostname.endsWith(".run.app")
  ) {
    throw new Error("RWOS_TRUSTED_AUDIENCE_INVALID");
  }
  return url.origin;
}

export async function createTrustedServiceIdentityHeaders(options: {
  provider: IdentityTokenProvider;
  registry: TrustedAudienceRegistry;
  receiver: TrustedService;
}): Promise<TrustedServiceIdentityHeaders> {
  const audience = requiredAudience(options.registry, options.receiver);
  const token = await options.provider.getToken({ audience, receiver: options.receiver });
  validateHeaderToken(token.value);
  const bearer = `Bearer ${token.value}`;
  return Object.freeze({
    authorization: bearer
  });
}

export function createCachingIdentityTokenProvider(options: {
  acquire(input: Readonly<{ audience: string; receiver: TrustedService }>): Promise<IdentityToken>;
  registry: TrustedAudienceRegistry;
  now?: () => Date;
  refreshMarginMs?: number;
}): IdentityTokenProvider {
  const now = options.now ?? (() => new Date());
  const refreshMarginMs = options.refreshMarginMs ?? 5 * 60_000;
  if (
    !Number.isInteger(refreshMarginMs) ||
    refreshMarginMs < 30_000 ||
    refreshMarginMs > 15 * 60_000
  ) {
    throw new Error("RWOS_IDENTITY_TOKEN_REFRESH_MARGIN_INVALID");
  }
  const cache = new Map<string, IdentityToken>();
  const pending = new Map<string, Promise<IdentityToken>>();

  return {
    async getToken(input) {
      const expectedAudience = requiredAudience(options.registry, input.receiver);
      if (input.audience !== expectedAudience) throw new Error("RWOS_TRUSTED_AUDIENCE_MISMATCH");
      const cached = cache.get(input.audience);
      if (cached && cached.expiresAt.getTime() - now().getTime() > refreshMarginMs) return cached;

      const current = pending.get(input.audience);
      if (current) return current;
      const acquisition = options
        .acquire(input)
        .then((token) => {
          validateAcquiredToken(token, now(), refreshMarginMs);
          cache.set(input.audience, token);
          return token;
        })
        .catch(() => {
          cache.delete(input.audience);
          throw new Error("RWOS_IDENTITY_TOKEN_UNAVAILABLE");
        })
        .finally(() => pending.delete(input.audience));
      pending.set(input.audience, acquisition);
      return acquisition;
    }
  };
}

export type TrustedCallPolicy = Readonly<{
  caller: TrustedService;
  serviceAccountEmail: string;
  operations: readonly string[];
  tenants?: readonly string[];
  environment: "staging" | "production";
  releaseSha: string;
  manifest?: Readonly<{ id: string; checksum: string }>;
  requireIdempotencyKey?: boolean;
}>;

export type TrustedCallEnvelope = Readonly<{
  claimedCaller: string;
  operation: string;
  tenantId: string | null;
  environment: string;
  releaseSha: string;
  manifestId: string | null;
  manifestChecksum: string | null;
  idempotencyKey: string | null;
}>;

export function authorizeTrustedCall(
  identity: VerifiedServiceIdentity,
  envelope: TrustedCallEnvelope,
  policy: TrustedCallPolicy,
  now = new Date()
) {
  const allowed =
    identity.serviceAccountEmail === policy.serviceAccountEmail &&
    identity.expiresAt > now &&
    identity.issuedAt <= now &&
    envelope.claimedCaller === policy.caller &&
    policy.operations.includes(envelope.operation) &&
    envelope.environment === policy.environment &&
    envelope.releaseSha === policy.releaseSha &&
    validTenant(envelope.tenantId, policy.tenants) &&
    validManifest(envelope, policy.manifest) &&
    (!policy.requireIdempotencyKey || validIdempotencyKey(envelope.idempotencyKey));
  if (!allowed) throw new Error("RWOS_TRUSTED_CALL_DENIED");
  return Object.freeze({
    caller: policy.caller,
    operation: envelope.operation,
    tenantId: envelope.tenantId,
    releaseSha: envelope.releaseSha
  });
}

export function readTrustedCallEnvelope(headers: Readonly<Record<string, string | undefined>>) {
  return {
    claimedCaller: bounded(headers["x-rwos-service-id"], 64),
    operation: bounded(headers["x-rwos-operation"], 100),
    tenantId: optionalBounded(headers["x-rwos-tenant-id"], 100),
    environment: bounded(headers["x-rwos-environment"], 20),
    releaseSha: sha(headers["x-rwos-release-sha"]),
    manifestId: optionalBounded(headers["x-rwos-manifest-id"], 100),
    manifestChecksum: optionalChecksum(headers["x-rwos-manifest-checksum"]),
    idempotencyKey: optionalBounded(headers["idempotency-key"], 200)
  } satisfies TrustedCallEnvelope;
}

function validateAcquiredToken(token: IdentityToken, now: Date, refreshMarginMs: number) {
  if (
    typeof token.value !== "string" ||
    token.value.length < 20 ||
    token.value.length > 16_384 ||
    !(token.expiresAt instanceof Date) ||
    !Number.isFinite(token.expiresAt.getTime()) ||
    token.expiresAt.getTime() - now.getTime() <= refreshMarginMs
  ) {
    throw new Error("RWOS_IDENTITY_TOKEN_INVALID");
  }
}

function validateHeaderToken(value: string) {
  if (
    value.length < 20 ||
    value.length > 16_384 ||
    !/^[A-Za-z0-9._~-]+$/.test(value) ||
    value.toLowerCase().startsWith("bearer")
  ) {
    throw new Error("RWOS_IDENTITY_TOKEN_INVALID");
  }
}

function validTenant(tenantId: string | null, tenants: readonly string[] | undefined) {
  return tenants ? tenantId !== null && tenants.includes(tenantId) : tenantId === null;
}

function validManifest(envelope: TrustedCallEnvelope, manifest: TrustedCallPolicy["manifest"]) {
  return manifest
    ? envelope.manifestId === manifest.id && envelope.manifestChecksum === manifest.checksum
    : envelope.manifestId === null && envelope.manifestChecksum === null;
}

function validIdempotencyKey(value: string | null) {
  return value !== null && /^[a-zA-Z0-9._:-]{8,200}$/.test(value);
}

function bounded(value: string | undefined, maximum: number) {
  if (!value || value.length > maximum || !/^[a-zA-Z0-9._:@/-]+$/.test(value)) {
    throw new Error("RWOS_TRUSTED_CALL_ENVELOPE_INVALID");
  }
  return value;
}

function optionalBounded(value: string | undefined, maximum: number) {
  return value === undefined ? null : bounded(value, maximum);
}

function sha(value: string | undefined) {
  if (!value || !/^[a-f0-9]{40}$/.test(value)) {
    throw new Error("RWOS_TRUSTED_CALL_ENVELOPE_INVALID");
  }
  return value;
}

function optionalChecksum(value: string | undefined) {
  if (value === undefined) return null;
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error("RWOS_TRUSTED_CALL_ENVELOPE_INVALID");
  return value;
}

function isTrustedService(value: string): value is TrustedService {
  return trustedServices.includes(value as TrustedService);
}

function rejectDuplicateOrAmbiguousHeaders(
  headers: Readonly<Record<string, string | string[] | undefined>>,
  rawHeaders: readonly string[] | undefined
) {
  const protectedNames = [
    "authorization",
    "x-rwos-app-authorization",
    "x-rwos-service-id",
    "x-rwos-operation",
    "x-rwos-tenant-id",
    "x-rwos-environment",
    "x-rwos-release-sha",
    "idempotency-key"
  ];
  for (const name of protectedNames) {
    const value = headers[name];
    if (Array.isArray(value) || (typeof value === "string" && value.includes(","))) {
      throw new Error("RWOS_TRUSTED_CALL_DENIED");
    }
    if (rawHeaders) {
      let count = 0;
      for (let index = 0; index < rawHeaders.length; index += 2) {
        if (rawHeaders[index]?.toLowerCase() === name) count += 1;
      }
      if (count > 1) throw new Error("RWOS_TRUSTED_CALL_DENIED");
    }
  }
}

function constantTimeBearer(value: string | string[] | undefined, expected: string) {
  const actual = bearerValue(value);
  if (!actual) return false;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function bearerValue(value: string | string[] | undefined) {
  if (typeof value !== "string" || !value.startsWith("Bearer ")) return null;
  const token = value.slice(7);
  return token && !/\s/.test(token) ? token : null;
}

function singleString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}
import { timingSafeEqual } from "node:crypto";
