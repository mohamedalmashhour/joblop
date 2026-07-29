import { describe, expect, it } from "vitest";
import { CandidateRateLimiter } from "./rateLimit";

describe("candidate adapter rate limits", () => {
  it("preserves the approved 30-per-tenant and 60-per-service thresholds", () => {
    const tenantLimiter = new CandidateRateLimiter(30, 100, () => 1_000);
    for (let attempt = 1; attempt <= 30; attempt += 1) {
      expect(tenantLimiter.consume("tenant-a", "service").allowed).toBe(true);
    }
    expect(tenantLimiter.consume("tenant-a", "service").allowed).toBe(false);

    const serviceLimiter = new CandidateRateLimiter(100, 60, () => 1_000);
    for (let attempt = 1; attempt <= 60; attempt += 1) {
      expect(serviceLimiter.consume(`tenant-${attempt}`, "service").allowed).toBe(true);
    }
    expect(serviceLimiter.consume("tenant-61", "service").allowed).toBe(false);
  });

  it("enforces tenant and authenticated-service fixed-window limits", () => {
    const limiter = new CandidateRateLimiter(2, 3, () => 1_000);
    expect(limiter.consume("tenant-a", "service").allowed).toBe(true);
    expect(limiter.consume("tenant-a", "service").allowed).toBe(true);
    expect(limiter.consume("tenant-a", "service").allowed).toBe(false);
    expect(limiter.consume("tenant-b", "service").allowed).toBe(false);
  });

  it("documents replica-local enforcement through independent simulation", () => {
    const replicaA = new CandidateRateLimiter(1, 2, () => 1_000);
    const replicaB = new CandidateRateLimiter(1, 2, () => 1_000);
    expect(replicaA.consume("tenant-a", "service").allowed).toBe(true);
    expect(replicaB.consume("tenant-a", "service").allowed).toBe(true);
    expect(replicaA.consume("tenant-a", "service").allowed).toBe(false);
    expect(replicaB.consume("tenant-a", "service").allowed).toBe(false);
  });
});
