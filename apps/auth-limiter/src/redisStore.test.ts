import { describe, expect, it } from "vitest";
import { parseLimiterRedisResponse } from "./redisStore";

describe("Redis limiter response boundary", () => {
  it("accepts only a bounded atomic limiter result", () => {
    expect(parseLimiterRedisResponse([1, 60, 59], 60)).toEqual({
      allowed: true,
      retryAfterSeconds: 60
    });
    expect(parseLimiterRedisResponse([0, 10, 20], 60)).toEqual({
      allowed: false,
      retryAfterSeconds: 20
    });
  });

  it.each([
    ["unknown allowed flag", [2, 60, 60]],
    ["zero TTL", [1, 0, 60]],
    ["TTL above policy window", [1, 61, 60]],
    ["fractional value", [1, 59.5, 60]],
    ["malformed tuple", [1, 60]]
  ])("fails closed for %s", (_label, response) => {
    expect(() => parseLimiterRedisResponse(response, 60)).toThrow(
      "RWOS_LIMITER_REDIS_RESPONSE_INVALID"
    );
  });
});
