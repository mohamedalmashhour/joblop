import { describe, expect, it } from "vitest";

import { findLeakedEconomicsKeys } from "../../../../../contracts/security/economicsLeak.mjs";
import {
  clientCalendarEvent,
  clientCalendarPrimaryLinks,
  clientCalendarRows,
  clientCalendarStatuses,
  clientRequestDetail,
  clientAssignmentVisibility
} from "./clientCalendarContent";

describe("client request calendar fixture", () => {
  it("covers every approved client calendar state", () => {
    expect(clientCalendarRows.map((row) => row.status)).toEqual(clientCalendarStatuses);
  });

  it("contains the complete client-authorized request display", () => {
    expect(clientRequestDetail).toMatchObject({
      role: expect.any(String),
      date: expect.any(String),
      start: expect.any(String),
      end: expect.any(String),
      workers: 2,
      qualifications: expect.any(Array),
      duties: expect.any(String),
      clientRate: expect.any(String),
      transportation: expect.any(String),
      address: expect.any(String),
      specialInstructions: expect.any(String),
      contractVerification: "Confirmed",
      paymentVerification: expect.stringContaining("details hidden"),
      mapPlaceholder: expect.stringContaining("no map provider")
    });
  });

  it("does not expose worker pay, margin, or internal admin pricing", () => {
    const clientPayload = {
      event: clientCalendarEvent,
      detail: clientRequestDetail
    };

    expect(
      findLeakedEconomicsKeys(clientPayload, [
        "workerPay",
        "workerHourlyRate",
        "workerEconomics",
        "platformMargin",
        "internalAdminPricing"
      ])
    ).toEqual([]);
  });

  it("connects calendar, create, and detail without dead ends", () => {
    expect(clientCalendarPrimaryLinks).toEqual([
      expect.objectContaining({ from: "/employer/calendar", to: "/employer/calendar/create" }),
      expect.objectContaining({
        from: "/employer/calendar/create",
        to: "/employer/calendar/request?mode=fixture"
      }),
      expect.objectContaining({
        from: "/employer/calendar/request",
        to: "/employer/calendar/assignment"
      }),
      expect.objectContaining({
        from: "/employer/calendar/assignment",
        to: "/employer/calendar"
      })
    ]);
  });

  it("limits assigned-worker visibility to authorized display identity", () => {
    expect(clientAssignmentVisibility.assignedWorker).toEqual({
      displayName: "Amina K.",
      roleLabel: "Personal Support Worker"
    });
    expect(JSON.stringify(clientAssignmentVisibility)).not.toMatch(
      /email|phone|address|dateOfBirth|governmentId/iu
    );
  });
});
