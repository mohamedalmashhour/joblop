import { createHmac } from "node:crypto";

export type AuthenticationRateLimitAction =
  | "register"
  | "sign_in"
  | "email_verify_send"
  | "password_reset_request";

/**
 * Bucket keys for the sign-in rate limiter. The account (email or phone) and the network address are
 * HMAC-hashed with a server secret, so no limiter backend ever stores a raw email, phone or IP.
 * Shared by the memory, remote and Postgres limiters.
 */
export function deriveAuthenticationRateLimitKeys(
  input: Readonly<{
    action: AuthenticationRateLimitAction;
    ip: string;
    email: string;
  }>,
  secret: string,
  namespace = "rwos:authrl:test:v1",
  keyId = "memory"
) {
  const digest = (kind: "account" | "network", value: string) =>
    createHmac("sha256", secret)
      .update(`rwos:auth-rate-limit:v1:${input.action}:${kind}:${value}`)
      .digest("hex");
  return {
    accountKey: `${namespace}:${keyId}:${input.action}:account:${digest("account", input.email.trim().toLowerCase())}`,
    networkKey: `${namespace}:${keyId}:${input.action}:network:${digest("network", input.ip.trim().toLowerCase())}`
  };
}
