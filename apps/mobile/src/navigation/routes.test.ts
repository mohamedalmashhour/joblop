import { describe, expect, it } from "vitest";
import { mobileRouteNames, mobileTabs } from "./routes";

describe("mobile foundation navigation", () => {
  it("preserves the approved worker mobile tabs", () => {
    expect(mobileTabs.map((tab) => tab.id)).toEqual([
      "home",
      "available",
      "my-shifts",
      "billing",
      "profile",
      "notifications"
    ]);
  });

  it("keeps Shift Details and Filters route names deep-link ready", () => {
    expect(mobileRouteNames.shiftDetails).toBe("rwos://worker/available/:shiftId");
    expect(mobileRouteNames.filters).toBe("rwos://worker/available/filters");
  });
});
