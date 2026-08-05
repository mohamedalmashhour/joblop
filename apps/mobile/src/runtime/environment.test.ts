import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
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

describe("worker staging identity", () => {
  it("labels staging as synthetic and non-production without enabling fixtures", () => {
    const source = readFileSync(new URL("../ProductionApp.tsx", import.meta.url), "utf8");
    expect(source).toContain('process.env.EXPO_PUBLIC_RWOS_DEPLOYMENT_TIER === "staging"');
    expect(source).toContain("STAGING · SYNTHETIC DATA");
    expect(source).toContain("NO REAL PAYMENT · NO PRODUCTION CUSTOMER DATA");
    expect(source).toContain("allowFixturePreview={false}");
  });
});
