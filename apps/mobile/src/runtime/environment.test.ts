import { describe, expect, it } from "vitest";
import { isProductionWorkerBuild } from "./environment";

describe("worker production fixture gate", () => {
  it("fails closed to production and permits fixtures only in an explicit development demo", () => {
    expect(isProductionWorkerBuild({ EXPO_PUBLIC_RWOS_ENV: "production" }, false)).toBe(true);
    expect(isProductionWorkerBuild({}, false)).toBe(true);
    expect(isProductionWorkerBuild({ EXPO_PUBLIC_RWOS_DEMO_MODE: "enabled" }, false)).toBe(true);
    expect(isProductionWorkerBuild({ EXPO_PUBLIC_RWOS_DEMO_MODE: "enabled" }, true)).toBe(false);
    expect(isProductionWorkerBuild({}, true)).toBe(true);
  });
});
