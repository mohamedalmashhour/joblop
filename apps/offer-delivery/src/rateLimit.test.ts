import { describe, expect, it } from "vitest";
import { DeliveryRateLimiter } from "./rateLimit";

describe("offer delivery rate limits", () => {
  it("enforces 30 requests per tenant and 60 per service", () => {
    const tenants = new DeliveryRateLimiter(30, 100, () => 1_000);
    for (let attempt = 1; attempt <= 30; attempt += 1) {
      expect(tenants.consume("tenant-a", "service").allowed).toBe(true);
    }
    expect(tenants.consume("tenant-a", "service").allowed).toBe(false);

    const service = new DeliveryRateLimiter(100, 60, () => 1_000);
    for (let attempt = 1; attempt <= 60; attempt += 1) {
      expect(service.consume(`tenant-${attempt}`, "service").allowed).toBe(true);
    }
    expect(service.consume("tenant-61", "service").allowed).toBe(false);
  });

  it("makes the two-replica in-process limitation explicit", () => {
    const first = new DeliveryRateLimiter(1, 2, () => 1_000);
    const second = new DeliveryRateLimiter(1, 2, () => 1_000);
    expect(first.consume("tenant-a", "service").allowed).toBe(true);
    expect(second.consume("tenant-a", "service").allowed).toBe(true);
    expect(first.consume("tenant-a", "service").allowed).toBe(false);
    expect(second.consume("tenant-a", "service").allowed).toBe(false);
  });
});
