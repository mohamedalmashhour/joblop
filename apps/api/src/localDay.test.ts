import { describe, expect, it } from "vitest";
import { localDayEnd, localDayStart, searchDateBound } from "./localDay";

const TORONTO = "America/Toronto";

describe("local calendar days", () => {
  it("a Toronto day starts at local midnight, in winter and in summer", () => {
    expect(localDayStart("2027-01-22", TORONTO)?.toISOString()).toBe("2027-01-22T05:00:00.000Z");
    expect(localDayStart("2027-07-22", TORONTO)?.toISOString()).toBe("2027-07-22T04:00:00.000Z");
  });

  it("the end day is inclusive (its last millisecond), also across a daylight-saving change", () => {
    expect(localDayEnd("2027-01-22", TORONTO)?.toISOString()).toBe("2027-01-23T04:59:59.999Z");
    // 2027-03-14 is 23 hours long in Toronto (clocks go forward).
    expect(localDayStart("2027-03-14", TORONTO)?.toISOString()).toBe("2027-03-14T05:00:00.000Z");
    expect(localDayEnd("2027-03-14", TORONTO)?.toISOString()).toBe("2027-03-15T03:59:59.999Z");
  });

  it("'tomorrow' as both first and last day keeps a job at 08:00 that day", () => {
    const from = searchDateBound("2027-01-22", "from", TORONTO)!;
    const to = searchDateBound("2027-01-22", "to", TORONTO)!;
    const job = new Date("2027-01-22T08:00:00-05:00");
    expect(job >= from && job <= to).toBe(true);
    expect(new Date("2027-01-23T08:00:00-05:00") <= to).toBe(false);
  });

  it("a full date-time is taken as given; junk and impossible days are ignored", () => {
    expect(searchDateBound("2027-01-22T10:00:00Z", "to", TORONTO)?.toISOString()).toBe("2027-01-22T10:00:00.000Z");
    expect(searchDateBound("soon", "from", TORONTO)).toBeNull();
    expect(searchDateBound("2027-02-30", "from", TORONTO)).toBeNull();
    expect(searchDateBound(null, "from", TORONTO)).toBeNull();
  });
});
