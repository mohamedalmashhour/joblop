import { isAcceptedKeyId, type LimiterConfig } from "./config";
import type { ConsumeResult, LimiterStore } from "./store";

export const fixedPolicy = {
  accountMaxAttempts: 5,
  networkMaxAttempts: 30,
  windowSeconds: 60
} as const;

export type ConsumeRequest = Readonly<{
  action: "register" | "sign_in" | "email_verify_send";
  keyId: string;
  accountKey: string;
  networkKey: string;
  policy: typeof fixedPolicy;
}>;

export function createLimiterService(
  config: LimiterConfig,
  store: LimiterStore,
  now: () => Date = () => new Date()
) {
  return {
    async consume(input: unknown): Promise<ConsumeResult> {
      const request = parseConsumeRequest(config, input, now());
      return store.consume({
        accountKey: request.accountKey,
        networkKey: request.networkKey,
        accountMaximum: fixedPolicy.accountMaxAttempts,
        networkMaximum: fixedPolicy.networkMaxAttempts,
        windowSeconds: fixedPolicy.windowSeconds
      });
    },
    ready: () => store.ready(),
    reset(prefix: string) {
      if (prefix !== `${config.namespace}:`) invalid();
      return store.resetNamespace(prefix);
    }
  };
}

function parseConsumeRequest(config: LimiterConfig, input: unknown, now: Date): ConsumeRequest {
  const record = asRecord(input);
  if (Object.keys(record).sort().join(",") !== "accountKey,action,keyId,networkKey,policy") {
    invalid();
  }
  const action = record.action;
  const keyId = record.keyId;
  if (action !== "register" && action !== "sign_in" && action !== "email_verify_send") invalid();
  if (typeof keyId !== "string" || !isAcceptedKeyId(config, keyId, now)) invalid();
  if (!samePolicy(record.policy)) invalid();
  const accountKey = readKey(config, keyId, action, "account", record.accountKey);
  const networkKey = readKey(config, keyId, action, "network", record.networkKey);
  return { action, keyId, accountKey, networkKey, policy: fixedPolicy };
}

function readKey(
  config: LimiterConfig,
  keyId: string,
  action: string,
  kind: "account" | "network",
  value: unknown
) {
  const prefix = `${config.namespace}:${keyId}:${action}:${kind}:`;
  if (
    typeof value !== "string" ||
    !value.startsWith(prefix) ||
    !/^[a-f0-9]{64}$/.test(value.slice(prefix.length))
  ) {
    invalid();
  }
  return value;
}

function samePolicy(value: unknown) {
  const policy = asRecord(value);
  return (
    policy.accountMaxAttempts === fixedPolicy.accountMaxAttempts &&
    policy.networkMaxAttempts === fixedPolicy.networkMaxAttempts &&
    policy.windowSeconds === fixedPolicy.windowSeconds &&
    Object.keys(policy).length === 3
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}

function invalid(): never {
  throw new LimiterRequestError();
}

export class LimiterRequestError extends Error {
  constructor() {
    super("Limiter request invalid.");
  }
}
