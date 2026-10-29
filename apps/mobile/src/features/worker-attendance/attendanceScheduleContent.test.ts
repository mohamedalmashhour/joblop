import { describe, expect, it } from "vitest";
import { attendanceAction, attendanceStatusLabel, attendanceStatusTone } from "./attendanceScheduleContent";

describe("attendance schedule content", () => {
  it("labels + tones statuses (pass-through unknowns)", () => {
    expect(attendanceStatusLabel("checked_in")).toBe("Checked in");
    expect(attendanceStatusTone("checked_in")).toBe("success");
    expect(attendanceStatusLabel("missed")).toBe("Missed");
    expect(attendanceStatusTone("missed")).toBe("danger");
    expect(attendanceStatusLabel("weird")).toBe("weird");
  });

  it("gates the action from timestamps", () => {
    expect(attendanceAction({ status: "pending_start", checkInAt: null, checkOutAt: null })).toBe("check_in");
    expect(attendanceAction({ status: "checked_in", checkInAt: "2026-07-10T12:00:00Z", checkOutAt: null })).toBe("check_out");
    expect(attendanceAction({ status: "checked_out", checkInAt: "x", checkOutAt: "y" })).toBe("none");
    expect(attendanceAction({ status: "cancelled", checkInAt: null, checkOutAt: null })).toBe("none");
    expect(attendanceAction({ status: "completed", checkInAt: "x", checkOutAt: "y" })).toBe("none");
  });
});
