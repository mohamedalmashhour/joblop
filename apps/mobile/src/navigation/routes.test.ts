import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mobileRouteNames, mobileTabs, productName } from "./routes";

const appConfig = JSON.parse(
  readFileSync(new URL("../../app.json", import.meta.url), "utf8")
) as { expo: { name: string; scheme: string } };

describe("mobile foundation navigation", () => {
  it("presents the worker experience as Joblop", () => {
    expect(productName).toBe("Joblop");
    expect(appConfig.expo.name).toBe("Joblop");
    expect(appConfig.expo.scheme).toBe("rwos");
  });

  it("preserves the approved worker mobile tabs", () => {
    expect(mobileTabs.map((tab) => tab.id)).toEqual([
      "home",
      "available",
      "my-shifts",
      "calendar",
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
    expect(mobileRouteNames.workerSignup).toBe("rwos://worker/signup");
    expect(mobileRouteNames.workerProfileSetup).toBe("rwos://worker/onboarding/profile");
    expect(mobileRouteNames.workerQualificationsSetup).toBe(
      "rwos://worker/onboarding/qualifications"
    );
    expect(mobileRouteNames.workerAvailabilitySetup).toBe(
      "rwos://worker/onboarding/availability"
    );
    expect(mobileRouteNames.workerOnboardingReview).toBe("rwos://worker/onboarding/review");
    expect(mobileRouteNames.workerAttendance).toBe(
      "rwos://worker/assignments/:assignmentId/attendance"
    );
    expect(mobileRouteNames.workerTimesheet).toBe(
      "rwos://worker/assignments/:assignmentId/timesheet"
    );
    expect(mobileRouteNames.workerEarnings).toBe("rwos://worker/earnings");
    expect(mobileRouteNames.workerRatings).toBe("rwos://worker/ratings");
    expect(mobileRouteNames.workerMessages).toBe("rwos://worker/messages");
    expect(mobileRouteNames.workerSupport).toBe("rwos://worker/support");
    expect(mobileRouteNames.workerOwnerReview).toBe("rwos://worker/owner-review");
    expect(mobileRouteNames.filters).toBe("rwos://worker/available/filters");
  });
});
