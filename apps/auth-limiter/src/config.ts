import {
  readTrustedReceiverAuthorization,
  type TrustedReceiverAuthorization
} from "@rwos/service-auth";

export const previousKeyMaximumOverlapSeconds = 65;
export const stagingResetConfirmation = "authorized-staging-limiter-reset";
export const approvedReleaseSha = "a31fa96f52247bb684032c6a8d3d379c098c2603";

export type LimiterConfig = Readonly<{
  port: number;
  environment: "local" | "test" | "staging" | "production";
  redisUrl: string;
  serviceToken: string;
  releaseSha: string;
  namespace: string;
  currentKeyId: string;
  previousKeyId: string | null;
  previousKeyAcceptUntil: Date | null;
  resetEnabled: boolean;
  resetToken: string | null;
  projectId: string | null;
  clusterId: string | null;
  trustedAuthorization?: TrustedReceiverAuthorization;
}>;

export function readLimiterConfig(
  env: NodeJS.ProcessEnv = process.env,
  now: Date = new Date()
): LimiterConfig {
  const environment = readEnvironment(env.RWOS_ENV);
  const port = readPort(env.PORT);
  const redisUrl = requiredUrl(env.AUTH_LIMITER_REDIS_URL, "AUTH_LIMITER_REDIS_URL");
  const serviceToken = requiredSecret(env.AUTH_LIMITER_SERVICE_TOKEN, "AUTH_LIMITER_SERVICE_TOKEN");
  const releaseSha = env.AUTH_LIMITER_RELEASE_SHA;
  if (!releaseSha) throw new Error("AUTH_LIMITER_RELEASE_SHA_REQUIRED");
  if (releaseSha !== approvedReleaseSha) throw new Error("AUTH_LIMITER_RELEASE_MISMATCH");
  const trustedAuthorization = readTrustedReceiverAuthorization({
    env,
    prefix: "AUTH_LIMITER",
    environment,
    applicationCredential: serviceToken,
    releaseSha
  });
  const namespace = requiredNamespace(env.AUTH_LIMITER_NAMESPACE, environment);
  const currentKeyId = requiredKeyId(
    env.AUTH_LIMITER_CURRENT_KEY_ID,
    "AUTH_LIMITER_CURRENT_KEY_ID"
  );
  const previousKeyId = optionalKeyId(
    env.AUTH_LIMITER_PREVIOUS_KEY_ID,
    "AUTH_LIMITER_PREVIOUS_KEY_ID"
  );
  const previousKeyAcceptUntil = readPreviousKeyExpiry(
    env.AUTH_LIMITER_PREVIOUS_KEY_ACCEPT_UNTIL,
    previousKeyId,
    now
  );
  if (previousKeyId === currentKeyId) {
    throw new Error("AUTH_LIMITER_KEY_IDS_MUST_DIFFER");
  }

  const resetEnabled = env.AUTH_LIMITER_RESET_ENABLED === "true";
  const resetToken = resetEnabled
    ? requiredSecret(env.AUTH_LIMITER_RESET_TOKEN, "AUTH_LIMITER_RESET_TOKEN")
    : null;
  const projectId = resetEnabled
    ? requiredIdentifier(env.AUTH_LIMITER_PROJECT_ID, "AUTH_LIMITER_PROJECT_ID")
    : null;
  const clusterId = resetEnabled
    ? requiredIdentifier(env.AUTH_LIMITER_CLUSTER_ID, "AUTH_LIMITER_CLUSTER_ID")
    : null;
  if (resetEnabled && environment !== "staging") {
    throw new Error("AUTH_LIMITER_RESET_REQUIRES_STAGING");
  }
  if (resetToken === serviceToken) {
    throw new Error("AUTH_LIMITER_RESET_TOKEN_MUST_BE_DISTINCT");
  }

  return {
    port,
    environment,
    redisUrl,
    serviceToken,
    releaseSha,
    namespace,
    currentKeyId,
    previousKeyId,
    previousKeyAcceptUntil,
    resetEnabled,
    resetToken,
    projectId,
    clusterId,
    trustedAuthorization
  };
}

export function isAcceptedKeyId(config: LimiterConfig, keyId: string, now = new Date()) {
  if (keyId === config.currentKeyId) return true;
  return Boolean(
    config.previousKeyId === keyId &&
    config.previousKeyAcceptUntil &&
    now.getTime() <= config.previousKeyAcceptUntil.getTime()
  );
}

function readEnvironment(value: string | undefined): LimiterConfig["environment"] {
  const environment = value ?? "local";
  if (!["local", "test", "staging", "production"].includes(environment)) {
    throw new Error("AUTH_LIMITER_ENVIRONMENT_INVALID");
  }
  return environment as LimiterConfig["environment"];
}

function readPort(value: string | undefined) {
  const port = Number(value ?? "8080");
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("AUTH_LIMITER_PORT_INVALID");
  }
  return port;
}

function requiredUrl(value: string | undefined, key: string) {
  if (!value) throw new Error(`${key}_REQUIRED`);
  const url = new URL(value);
  if (!["redis:", "rediss:"].includes(url.protocol)) throw new Error(`${key}_INVALID`);
  return url.toString();
}

function requiredSecret(value: string | undefined, key: string) {
  if (!value || value.length < 32) throw new Error(`${key}_REQUIRED`);
  return value;
}

function requiredNamespace(value: string | undefined, environment: LimiterConfig["environment"]) {
  if (!value || !/^rwos:authrl:(?:local|test|staging|production):v1$/.test(value)) {
    throw new Error("AUTH_LIMITER_NAMESPACE_INVALID");
  }
  if (!value.includes(`:${environment}:`)) {
    throw new Error("AUTH_LIMITER_NAMESPACE_ENVIRONMENT_MISMATCH");
  }
  return value;
}

function requiredKeyId(value: string | undefined, key: string) {
  if (!value || !/^[a-z0-9][a-z0-9_-]{0,31}$/.test(value)) throw new Error(`${key}_INVALID`);
  return value;
}

function optionalKeyId(value: string | undefined, key: string) {
  return value ? requiredKeyId(value, key) : null;
}

function readPreviousKeyExpiry(value: string | undefined, previousKeyId: string | null, now: Date) {
  if (!previousKeyId && !value) return null;
  if (!previousKeyId || !value) throw new Error("AUTH_LIMITER_PREVIOUS_KEY_PAIR_REQUIRED");
  const expiry = new Date(value);
  if (!Number.isFinite(expiry.getTime())) {
    throw new Error("AUTH_LIMITER_PREVIOUS_KEY_ACCEPT_UNTIL_INVALID");
  }
  if (expiry.getTime() - now.getTime() > previousKeyMaximumOverlapSeconds * 1000) {
    throw new Error("AUTH_LIMITER_PREVIOUS_KEY_OVERLAP_TOO_LONG");
  }
  return expiry;
}

function requiredIdentifier(value: string | undefined, key: string) {
  if (
    !value ||
    value.length > 200 ||
    !/^[a-z0-9][a-z0-9._:/-]+$/i.test(value) ||
    /(?:unknown|placeholder|production|\*|current|latest)/i.test(value)
  ) {
    throw new Error(`${key}_INVALID`);
  }
  return value;
}
