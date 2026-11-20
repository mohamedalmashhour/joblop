import { describe, expect, it } from "vitest";
import { canWorkerReview, formatMinutes, timesheetCopyFor, timesheetStatusLabel, timesheetStatusTone } from "./timesheetListContent";

describe("timesheet list content", () => {
  it("labels + tones statuses (pass-through unknowns)", () => {
    expect(timesheetStatusLabel("worker_review")).toBe("Your review");
    expect(timesheetStatusTone("worker_review")).toBe("warning");
    expect(timesheetStatusLabel("locked")).toBe("Finalised");
    expect(timesheetStatusTone("locked")).toBe("success");
    expect(timesheetStatusLabel("rejected")).toBe("Rejected");
    expect(timesheetStatusTone("rejected")).toBe("danger");
    expect(timesheetStatusLabel("mystery")).toBe("mystery");
  });

  it("only allows review in worker_review", () => {
    expect(canWorkerReview("worker_review")).toBe(true);
    expect(canWorkerReview("employer_review")).toBe(false);
    expect(canWorkerReview("locked")).toBe(false);
  });

  it("formats payable minutes", () => {
    expect(formatMinutes(null)).toBe("—");
    expect(formatMinutes(-5)).toBe("—");
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(450)).toBe("7h 30m");
  });

  it("localizes labels + screen copy (FR/AR)", () => {
    expect(timesheetStatusLabel("worker_review", "fr")).toBe("Votre examen");
    expect(timesheetStatusLabel("worker_review", "ar")).toBe("مراجعتك");
    expect(timesheetCopyFor("en").title).toBe("My timesheets");
    expect(timesheetCopyFor("fr").title).toBe("Mes feuilles de temps");
    expect(timesheetCopyFor("ar").title).toBe("كشوف دوامي");
  });
});
