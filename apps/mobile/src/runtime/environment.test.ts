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
    // The calendar is now mounted by the navigator; the production build must still never enable
    // fixture previews there.
    // The worker calendar panel (which owns the fixture preview) must never be mounted with previews
    // on. Production offers now use OffersScreen, which has no fixture path at all.
    const navigator = readFileSync(new URL("../navigation/WorkerNavigator.tsx", import.meta.url), "utf8");
    if (navigator.includes("<WorkerCalendarPanel")) expect(navigator).toContain("allowFixturePreview={false}");
    expect(navigator).not.toMatch(/allowFixturePreview(?!=\{false\})/);
    expect(navigator).not.toMatch(/fixture/i);
  });
});
