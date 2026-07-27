import { describe, expect, it } from "vitest";
import { readWorkerCalendarOfferId } from "./deepLink";

describe("worker calendar deep links", () => {
  it("extracts only the offer reference", () => {
    expect(readWorkerCalendarOfferId("rwos://worker/calendar?offer=offer-123&token=hidden"))
      .toBe("offer-123");
  });

  it("ignores missing and malformed links safely", () => {
    expect(readWorkerCalendarOfferId("rwos://worker/calendar")).toBeNull();
    expect(readWorkerCalendarOfferId("not a url")).toBeNull();
    expect(readWorkerCalendarOfferId(null)).toBeNull();
  });

  it("rejects unrelated routes, web links, and unbounded references", () => {
    expect(readWorkerCalendarOfferId("rwos://calendar?offer=offer-123")).toBeNull();
    expect(readWorkerCalendarOfferId("rwos://worker/profile?offer=offer-123")).toBeNull();
    expect(readWorkerCalendarOfferId("https://example.test/calendar?offer=offer-123")).toBeNull();
    expect(readWorkerCalendarOfferId(`rwos://worker/calendar?offer=${"a".repeat(129)}`)).toBeNull();
    expect(readWorkerCalendarOfferId("rwos://worker/calendar?offer=../../private")).toBeNull();
  });
});
