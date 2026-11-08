import { describe, expect, it } from "vitest";
import type { CalendarHubItem, OpenJob } from "../../auth/secureSession";
import { isoDay } from "../calendar-month/monthGrid";
import { PAY_STATUSES, SHIFT_STATUSES, bonusLabel, claimMessage, formatBonus, formatHubTime, groupHubByDay, hubLayer, hubStatusKey, summarizeHubDay, formatHourlyRate, gridWindow, groupJobsByDay, hasBonus, humanizeReason, isUrgent, placesLeftLabel } from "./jobsCalendarContent";

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
  it("labels a bonus by kind and ignores jobs without one", () => {
    const templates = { hourly: "+ {amount}/h bonus", transport: "+ {amount} transport", oneTime: "+ {amount} bonus" };
    expect(hasBonus(job({}))).toBe(false);
    expect(bonusLabel(job({}), "en-CA", templates)).toBeNull();
    expect(bonusLabel(job({ bonus: { kind: "hourly", amountMinor: 250 } }), "en-CA", templates)).toBe("+ $2.50/h bonus");
    expect(bonusLabel(job({ bonus: { kind: "transport", amountMinor: 2000 } }), "en-CA", templates)).toBe("+ $20.00 transport");
    expect(bonusLabel(job({ bonus: { kind: "one_time", amountMinor: 3000 } }), "en-CA", templates)).toBe("+ $30.00 bonus");
  });

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

function hubItem(overrides: Partial<CalendarHubItem>): CalendarHubItem {
  return {
    id: "i1",
    type: "available_job",
    startAt: new Date(2026, 10, 10, 9, 0).toISOString(),
    endAt: new Date(2026, 10, 10, 17, 0).toISOString(),
    title: "Cook",
    subtitle: "Laval",
    status: null,
    amountMinor: 2400,
    bonus: null,
    placesLeft: 1,
    placesAsked: null,
    placesTaken: null,
    jobRequestId: "j1",
    refId: null,
    ...overrides
  };
}

describe("calendar hub content", () => {
  const all = { available: true, shift: true, pay: true, cancelled: true };

  it("maps item types to filter layers", () => {
    expect(hubLayer("available_job")).toBe("available");
    expect(hubLayer("my_shift")).toBe("shift");
    expect(hubLayer("pay_day")).toBe("pay");
    expect(hubLayer("cancelled_shift")).toBe("cancelled");
    expect(hubLayer("mystery")).toBeNull();
  });

  it("groups by local day, hides filtered layers, full jobs and unknown types", () => {
    const items = [
      hubItem({ id: "a", startAt: new Date(2026, 10, 10, 12, 0).toISOString() }),
      hubItem({ id: "b", type: "my_shift", startAt: new Date(2026, 10, 10, 7, 0).toISOString() }),
      hubItem({ id: "c", placesLeft: 0 }),
      hubItem({ id: "d", type: "pay_day", endAt: null, startAt: new Date(2026, 10, 14, 9, 0).toISOString() }),
      hubItem({ id: "e", type: "mystery" })
    ];
    const byDay = groupHubByDay(items, all);
    const day = isoDay(new Date(2026, 10, 10));
    expect(byDay.get(day)?.map((i) => i.id)).toEqual(["b", "a"]);
    expect(byDay.get(isoDay(new Date(2026, 10, 14)))?.map((i) => i.id)).toEqual(["d"]);
    const noShifts = groupHubByDay(items, { ...all, shift: false });
    expect(noShifts.get(day)?.map((i) => i.id)).toEqual(["a"]);
  });

  it("summarizes a day for the grid", () => {
    const summary = summarizeHubDay([
      hubItem({ bonus: { kind: "hourly", amountMinor: 200 } }),
      hubItem({ id: "x" }),
      hubItem({ id: "s", type: "my_shift" }),
      hubItem({ id: "p", type: "pay_day" }),
      hubItem({ id: "c", type: "cancelled_shift" })
    ]);
    expect(summary).toEqual({ available: 2, bonus: true, shift: true, pay: true, cancelled: true });
    expect(summarizeHubDay([])).toEqual({ available: 0, bonus: false, shift: false, pay: false, cancelled: false });
  });

  it("formats bonuses, times without an end and status keys", () => {
    const templates = { hourly: "+ {amount}/h bonus", transport: "+ {amount} transport", oneTime: "+ {amount} bonus" };
    expect(formatBonus(null, "en-CA", templates)).toBeNull();
    expect(formatBonus({ kind: "one_time", amountMinor: 5000 }, "en-CA", templates)).toBe("+ $50.00 bonus");
    expect(formatHubTime(new Date(2026, 10, 10, 9, 0).toISOString(), null, "en-CA")).toMatch(/9:00/);
    expect(hubStatusKey("shift", "checked_in", SHIFT_STATUSES)).toBe("hub.shift.checked_in");
    expect(hubStatusKey("shift", "weird", SHIFT_STATUSES)).toBe("hub.shift.other");
    expect(hubStatusKey("pay", null, PAY_STATUSES)).toBe("hub.pay.other");
  });
});
