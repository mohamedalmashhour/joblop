import { describe, expect, it } from "vitest";
import type { OpenJob } from "../../auth/secureSession";
import { isoDay } from "../calendar-month/monthGrid";
import { claimMessage, formatHourlyRate, gridWindow, groupJobsByDay, humanizeReason, isUrgent, placesLeftLabel } from "./jobsCalendarContent";

function job(overrides: Partial<OpenJob>): OpenJob {
  return {
    jobRequestId: "j1",
    role: "Line cook",
    areaLabel: "Plateau",
    startAt: new Date(2026, 10, 10, 9, 0).toISOString(),
    endAt: new Date(2026, 10, 10, 17, 0).toISOString(),
    urgency: "standard",
    placesLeft: 2,
    workerRateMinor: 2250,
    ...overrides
  };
}

describe("jobs calendar content", () => {
  it("requests the whole visible grid (6 weeks) for a month", () => {
    const { from, to } = gridWindow(2026, 10); // November 2026 starts on a Sunday
    expect(isoDay(new Date(from))).toBe("2026-11-01");
    expect(isoDay(new Date(to))).toBe("2026-12-13");
  });

  it("groups jobs by local start day, sorted by time", () => {
    const late = job({ jobRequestId: "late", startAt: new Date(2026, 10, 10, 15, 0).toISOString() });
    const early = job({ jobRequestId: "early" });
    const other = job({ jobRequestId: "other", startAt: new Date(2026, 10, 12, 8, 0).toISOString() });
    const byDay = groupJobsByDay([late, other, early]);
    expect(byDay.get("2026-11-10")?.map((j) => j.jobRequestId)).toEqual(["early", "late"]);
    expect(byDay.get("2026-11-12")).toHaveLength(1);
  });

  it("shows pay only when known, flags non-standard urgency, and pluralizes places", () => {
    expect(formatHourlyRate(null, "en", "/h")).toBeNull();
    expect(formatHourlyRate(2250, "en-CA", "/h")).toBe("$22.50/h");
    expect(isUrgent(job({}))).toBe(false);
    expect(isUrgent(job({ urgency: "urgent" }))).toBe(true);
    expect(placesLeftLabel(1, "1 place left", "{n} places left")).toBe("1 place left");
    expect(placesLeftLabel(3, "1 place left", "{n} places left")).toBe("3 places left");
  });

  it("maps every accept outcome to a message", () => {
    expect(claimMessage({ status: "assigned" }).key).toBe("jobs.msg.assigned");
    expect(claimMessage({ status: "full" }).key).toBe("jobs.msg.full");
    expect(claimMessage({ status: "not_open" }).key).toBe("jobs.msg.notOpen");
    expect(claimMessage({ status: "offline" }).key).toBe("jobs.msg.offline");
    expect(claimMessage({ status: "denied" }).key).toBe("jobs.msg.denied");
    expect(claimMessage({ status: "error" }).key).toBe("jobs.msg.error");
    const ineligible = claimMessage({ status: "ineligible", reasons: ["pay_channel_election_required"] });
    expect(ineligible.key).toBe("jobs.msg.ineligible");
    expect(ineligible.reasons).toEqual(["Pay channel election required"]);
    expect(humanizeReason("")).toBe("");
  });
});
