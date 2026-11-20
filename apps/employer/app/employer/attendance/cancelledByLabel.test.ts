import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { attendanceText } from "../recordListText";

// A cancelled shift on the employer's attendance page says who cancelled it, never the reason staff
// typed (internal; it can name other jobs, rates or approvals).

describe("employer attendance: who cancelled", () => {
  it("has the three labels in English, French and Arabic", () => {
    expect(attendanceText.en.cancelledBy).toEqual({ joblop: "Cancelled by Joblop", company: "Cancelled by your company", worker: "The worker cancelled" });
    for (const lang of ["fr", "ar"] as const) {
      const labels = attendanceText[lang].cancelledBy;
      for (const key of ["joblop", "company", "worker"] as const) {
        expect(labels[key]?.trim(), `${lang}:${key}`).toBeTruthy();
        expect(labels[key], `${lang}:${key}`).not.toBe(attendanceText.en.cancelledBy[key]);
      }
    }
  });

  it("the card shows the label and never the staff reason field", () => {
    const panel = readFileSync(new URL("./EmployerAttendancePanel.tsx", import.meta.url), "utf8");
    expect(panel).toContain("tx.cancelledBy[record.cancelledBy]");
    expect(panel).not.toContain("exceptionCategory");
  });
});
