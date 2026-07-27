import { describe, expect, it } from "vitest";
import {
  adminAiRecommendation,
  adminCalendarBoundaries,
  adminCalendarEvent,
  adminAssignmentVisibility,
  adminCalendarRequests,
  adminReviewActions,
  adminReviewChecks
} from "./adminCalendarContent";

describe("admin connected calendar fixture", () => {
  it("shows every review check and route", () => {
    expect(adminReviewChecks.map((check) => check.label)).toEqual([
      "Required fields",
      "Contract",
      "Payment method",
      "Location",
      "Qualifications",
      "Client pricing",
      "Transportation"
    ]);
    expect(adminCalendarRequests.every((request) => request.route === "/calendar/request")).toBe(true);
  });

  it("separates client and worker-offer economics", () => {
    expect(adminCalendarEvent.clientEconomics).toEqual({
      billRate: { amountMinor: 4500, currency: "CAD" },
      termsVersion: "client-terms-v1"
    });
    expect(adminCalendarEvent.workerOfferEconomics).toEqual({
      hourlyRate: { amountMinor: 3000, currency: "CAD" },
      transportationCompensation: { amountMinor: 500, currency: "CAD" },
      termsVersion: "worker-terms-v1"
    });
  });

  it("contains no raw payment secrets", () => {
    expect(JSON.stringify({ adminCalendarEvent, adminReviewChecks })).not.toMatch(
      /cardNumber|accountNumber|routingNumber|paymentToken|clientSecret/u
    );
  });

  it("keeps controls local and AI advisory", () => {
    expect(adminReviewActions).toEqual([
      "approve",
      "reject",
      "return",
      "publish",
      "pause",
      "cancel",
      "reprice"
    ]);
    expect(adminAiRecommendation.authority).toBe("advisory_only");
    expect(adminCalendarBoundaries).toContain("AI cannot approve, publish, assign, reprice, or notify.");
  });

  it("shows operational assignment state while attendance remains a handoff", () => {
    expect(adminAssignmentVisibility).toMatchObject({
      status: "confirmed",
      operationalStatus: "Ready for worker arrival",
      attendance: {
        authority: "handoff_only",
        execution: "not_started"
      }
    });
  });
});
