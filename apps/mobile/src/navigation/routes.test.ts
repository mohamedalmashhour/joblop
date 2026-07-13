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

  it("keeps Shift Details, Filters and G02 commitment route names deep-link ready", () => {
    expect(mobileRouteNames.shiftDetails).toBe("rwos://worker/available/:shiftId");
    expect(mobileRouteNames.applicationSummary).toBe("rwos://worker/available/:shiftId/apply");
    expect(mobileRouteNames.applicationSuccess).toBe(
      "rwos://worker/applications/:applicationId/success"
    );
    expect(mobileRouteNames.applicationDetails).toBe("rwos://worker/applications/:applicationId");
    expect(mobileRouteNames.offerDetails).toBe("rwos://worker/offers/:offerId");
    expect(mobileRouteNames.confirmationDetails).toBe(
      "rwos://worker/confirmations/:confirmationId"
    );
    expect(mobileRouteNames.filters).toBe("rwos://worker/available/filters");
  });
});
