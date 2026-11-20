import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkInView, torontoClock } from "./attendanceScheduleContent";

// The phone app's Check in / Check out box: same rules as the website (ShiftCheckIn.tsx).

const record = (over: Partial<{ status: string; checkInAt: string | null; checkOutAt: string | null; clockInAllowed: boolean }> = {}) => ({
  status: "pending_start",
  scheduledStartAt: "2027-02-11T13:00:00.000Z", // 08:00 Toronto
  checkInAt: null,
  checkOutAt: null,
  ...over
});

describe("phone app check-in box", () => {
  it("opens 30 minutes before the start (7:30 for an 8:00 shift, Toronto time)", () => {
    const view = checkInView(record(), new Date("2027-02-11T12:00:00.000Z").getTime());
    expect(view).toEqual({ kind: "opens_later", opensAt: "2027-02-11T12:30:00.000Z" });
    if (view.kind === "opens_later") expect(torontoClock(view.opensAt, "en")).toMatch(/^7:30/);
    expect(checkInView(record(), new Date("2027-02-11T12:30:00.000Z").getTime())).toEqual({ kind: "check_in" });
  });

  it("then Check out, then both times; nothing for cancelled or long-term", () => {
    expect(checkInView(record({ status: "checked_in", checkInAt: "2027-02-11T12:58:00.000Z" })).kind).toBe("checked_in");
    expect(checkInView(record({ status: "checked_out", checkInAt: "2027-02-11T12:58:00.000Z", checkOutAt: "2027-02-11T19:00:00.000Z" })).kind).toBe("done");
    expect(checkInView(record({ status: "cancelled" })).kind).toBe("none");
    expect(checkInView(record({ clockInAllowed: false })).kind).toBe("none");
  });

  it("the job screen shows it for the worker's own shift, with the exact address", () => {
    const screen = readFileSync(new URL("../marketplace/MarketplaceJobScreen.tsx", import.meta.url), "utf8");
    expect(screen).toContain("<ShiftCheckInCard record={myRecord} transport={transport} onChanged={onShiftChanged} />");
    expect(screen).toContain("<JobLocationLink address={myRecord.worksiteAddress} />");
    expect(screen).toContain("}, [loadMine, claim.state]);");
  });
});
