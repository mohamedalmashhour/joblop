import { describe, expect, it } from "vitest";
import { hasPlatformAdminAuthorization } from "./middleware";

describe("admin middleware authorization boundary", () => {
  it("accepts the explicit platform-admin authorization contract", () => {
    expect(hasPlatformAdminAuthorization({ authorized: true })).toBe(true);
  });

  it.each([
    ["explicit denial", { authorized: false }],
    ["missing authorization", { status: "ok" }],
    ["truthy non-boolean authorization", { authorized: "true" }],
    ["array payload", [{ authorized: true }]],
    ["null payload", null]
  ])("fails closed for %s", (_label, payload) => {
    expect(hasPlatformAdminAuthorization(payload)).toBe(false);
  });
});
