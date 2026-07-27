import { describe, expect, it } from "vitest";
import {
  workerCalendarDisplay,
  workerCalendarPrivacy,
  workerArrivalInstructions,
  workerAttendanceHandoff,
  workerConfirmedCalendarFixture,
  workerOfferCalendarFixture
} from "./workerCalendarContent";

describe("worker connected calendar fixture", () => {
  it("shows worker-authorized job and economics details", () => {
    expect(workerOfferCalendarFixture).toMatchObject({
      audience: "worker",
      eventType: "published_offer",
      roleLabel: expect.any(String),
      dutiesSummary: expect.any(String),
      qualifications: expect.any(Array),
      workerEconomics: {
        hourlyRate: { amountMinor: 3000, currency: "CAD" },
        transportationCompensation: { amountMinor: 500, currency: "CAD" }
      }
    });
    expect(workerCalendarDisplay).toMatchObject({
      hours: expect.any(String),
      estimatedEarnings: "$245.00 CAD estimated worker earnings",
      distance: expect.any(String),
      mapPlaceholder: expect.stringContaining("no map provider")
    });
  });

  it("contains no client commercial rate, payment method, or admin-note fields", () => {
    const payload = JSON.stringify({
      workerOfferCalendarFixture,
      workerConfirmedCalendarFixture,
      workerCalendarDisplay
    });

    expect(payload).not.toMatch(/client.*(?:bill|commercial).*rate|paymentMethod|internalAdminNotes|margin/iu);
  });

  it("moves accepted work to a worker confirmed-calendar projection", () => {
    expect(workerConfirmedCalendarFixture).toMatchObject({
      audience: "worker",
      eventType: "confirmed_assignment",
      assignmentId: "assignment_calendar_001",
      status: "confirmed"
    });
    expect(workerCalendarPrivacy).toContain(
      "Acceptance is local fixture state until an authoritative Assignment exists."
    );
  });

  it("provides arrival instructions and an attendance handoff without execution", () => {
    expect(workerArrivalInstructions).toMatchObject({
      meetingPoint: expect.any(String),
      contactRole: expect.any(String),
      timing: expect.any(String)
    });
    expect(workerAttendanceHandoff).toEqual({
      eventType: "attendance_handoff",
      assignmentId: "assignment_calendar_001",
      eligibility: "ready",
      authority: "handoff_only",
      attendanceExecution: "not_started"
    });
  });
});
