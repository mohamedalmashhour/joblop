import { describe, expect, it } from "vitest";
import { hasPlatformAdminAuthorization, isConnectedRuntimeEnvironment } from "./middleware";

describe("admin middleware authorization boundary", () => {
  it("uses persisted authenticated boundaries in staging and production only", () => {
    expect(isConnectedRuntimeEnvironment("staging")).toBe(true);
    expect(isConnectedRuntimeEnvironment("production")).toBe(true);
    expect(isConnectedRuntimeEnvironment("development")).toBe(false);
  });

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
