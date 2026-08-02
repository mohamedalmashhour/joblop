import { describe, expect, it } from "vitest";
import { assertBootstrapBoundary, parseCredential } from "./stagingE2eCredentialBootstrap";

describe("staging E2E credential bootstrap boundary", () => {
  it("accepts only a staging approval bound to a full release SHA", () => {
    expect(() =>
      assertBootstrapBoundary({
        environment: "staging",
        releaseSha: "a".repeat(40),
        approvalReference: "RWOS-STAGING-E2E-001"
      })
    ).not.toThrow();
    expect(() =>
      assertBootstrapBoundary({
        environment: "production",
        releaseSha: "a".repeat(40),
        approvalReference: "RWOS-STAGING-E2E-001"
      })
    ).toThrow("RWOS_STAGING_E2E_ENVIRONMENT_DENIED");
  });

  it("rejects malformed, short, or non-synthetic credentials", () => {
    expect(() => parseCredential(undefined, "WORKER")).toThrow(
      "RWOS_STAGING_E2E_WORKER_CREDENTIAL_MISSING"
    );
    expect(() => parseCredential("not-json", "WORKER")).toThrow(
      "RWOS_STAGING_E2E_WORKER_CREDENTIAL_INVALID"
    );
    expect(() =>
      parseCredential(JSON.stringify({ email: "worker@example.com", password: "short" }), "WORKER")
    ).toThrow("RWOS_STAGING_E2E_WORKER_CREDENTIAL_INVALID");
  });
});
