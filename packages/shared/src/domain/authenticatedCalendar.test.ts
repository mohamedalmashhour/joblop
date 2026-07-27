import { describe, expect, it } from "vitest";
import {
  CalendarDtoError,
  calendarFailureState,
  calendarListState,
  calendarLoadingState,
  calendarPartialState,
  parseAdminCalendarDto,
  parseClientCalendarDto,
  parseWorkerCalendarDto
} from "./authenticatedCalendar";

const common = {
  id: "request-1",
  requestNumber: "JR-1",
  organizationId: "org-1",
  title: "PSW",
  numberOfWorkers: 2,
  timezone: "America/Toronto",
  startAt: "2026-08-03T12:00:00.000Z",
  endAt: "2026-08-03T20:00:00.000Z",
  status: "submitted",
  dutiesSummary: null,
  qualifications: ["PSW"],
  addressSummary: null,
  specialInstructions: null,
  verification: { contract: "pending", location: "pending", paymentMethodReadiness: "pending" },
  versionToken: 1
};

describe("authenticated calendar DTO and state boundaries", () => {
  it("whitelists client fields and discards cross-party economics", () => {
    const dto = parseClientCalendarDto({
      ...common,
      audience: "client",
      workerPay: 3000,
      platformMargin: 1500,
      internalAdminNotes: "hidden"
    });
    expect(dto).not.toHaveProperty("workerPay");
    expect(dto).not.toHaveProperty("platformMargin");
    expect(dto).not.toHaveProperty("internalAdminNotes");
  });

  it("keeps admin review fields separated and discards payment secrets", () => {
    const dto = parseAdminCalendarDto({
      ...common,
      audience: "admin",
      authoritativeStatus: "admin_review",
      adminReviewReason: "Needs verification",
      rawPaymentSecret: "hidden"
    });
    expect(dto.authoritativeStatus).toBe("admin_review");
    expect(dto).not.toHaveProperty("rawPaymentSecret");
  });

  it("supports nullable worker terms and discards client economics", () => {
    const dto = parseWorkerCalendarDto({
      workerOfferId: "offer-1",
      jobRequestId: "request-1",
      status: "sent",
      expiresAt: "2026-08-02T12:00:00.000Z",
      title: null,
      summary: null,
      startAt: null,
      endAt: null,
      timezone: null,
      compensationSummary: null,
      policySummary: null,
      versionToken: 1,
      visibility: "worker_authorized_offer_reference",
      clientBillRate: 4500
    });
    expect(dto.title).toBeNull();
    expect(dto).not.toHaveProperty("clientBillRate");
  });

  it("rejects malformed and cross-audience records with a generic error", () => {
    expect(() => parseClientCalendarDto({ ...common, audience: "admin" })).toThrow(CalendarDtoError);
    expect(() => parseWorkerCalendarDto({ visibility: "client" })).toThrow("Calendar response is unavailable.");
  });

  it("models loading outcomes without fixture fallback", () => {
    expect(calendarListState([])).toEqual({ status: "empty" });
    expect(calendarListState(["request"])).toEqual({ status: "ready", data: ["request"] });
    expect(calendarLoadingState()).toEqual({ status: "loading" });
    expect(calendarPartialState(["request"])).toEqual({ status: "partial", data: ["request"] });
    expect(calendarFailureState(401)).toEqual({ status: "denied" });
    expect(calendarFailureState(503)).toEqual({ status: "unavailable" });
    expect(calendarFailureState(409).status).toBe("stale");
    expect(calendarFailureState(500)).toEqual({ status: "error" });
  });

  it("accepts only governed worker offer and admin lifecycle states", () => {
    const workerBase = {
      workerOfferId: "offer-1",
      jobRequestId: "request-1",
      expiresAt: "2026-08-02T12:00:00.000Z",
      title: null,
      summary: null,
      startAt: null,
      endAt: null,
      timezone: null,
      compensationSummary: null,
      policySummary: null,
      versionToken: 1,
      visibility: "worker_authorized_offer_reference"
    };
    for (const status of [
      "draft", "approved", "sent", "delivered", "viewed",
      "accepted", "declined", "expired", "withdrawn", "cancelled"
    ]) {
      expect(parseWorkerCalendarDto({ ...workerBase, status }).status).toBe(status);
    }
    expect(() => parseWorkerCalendarDto({ ...workerBase, status: "paid" })).toThrow(CalendarDtoError);
    expect(() => parseAdminCalendarDto({
      ...common,
      audience: "admin",
      authoritativeStatus: "paid",
      adminReviewReason: null
    })).toThrow(CalendarDtoError);
  });

  it("rejects invalid windows, timezone, counts, and versions", () => {
    expect(() => parseClientCalendarDto({
      ...common,
      audience: "client",
      endAt: common.startAt
    })).toThrow(CalendarDtoError);
    expect(() => parseClientCalendarDto({
      ...common,
      audience: "client",
      timezone: "Not/A_Zone"
    })).toThrow(CalendarDtoError);
    expect(() => parseClientCalendarDto({
      ...common,
      audience: "client",
      numberOfWorkers: 0
    })).toThrow(CalendarDtoError);
    expect(() => parseClientCalendarDto({
      ...common,
      audience: "client",
      versionToken: -1
    })).toThrow(CalendarDtoError);
  });
});
