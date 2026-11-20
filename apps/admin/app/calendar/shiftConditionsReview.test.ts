import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseRequestSummary } from "./requestSummary";
import { reviewText } from "./reviewText";

// The admin request review page shows the employer's shift conditions.

const summary = {
  companyName: "Ferme Test",
  locationName: null,
  locationCity: "Laval",
  roleLabel: "Farm worker",
  workGroupLabel: "Farming",
  numberOfWorkers: 2,
  hoursPerWorker: 6,
  totalHours: 12,
  allowances: [],
  conditions: { breakMinutes: 30, dressCode: "safety_boots", equipmentToBring: "<b>x</b>", arrivalInstructions: "Gate B", workerNotes: null }
};

describe("admin review: shift conditions", () => {
  it("parses them from the staff summary (bad values become empty)", () => {
    expect(parseRequestSummary(summary)?.conditions).toEqual({ breakMinutes: 30, dressCode: "safety_boots", equipmentToBring: "<b>x</b>", arrivalInstructions: "Gate B", workerNotes: null });
    expect(parseRequestSummary({ ...summary, conditions: { breakMinutes: 999 } })?.conditions.breakMinutes).toBeNull();
    expect(parseRequestSummary({ ...summary, conditions: undefined })?.conditions).toEqual({ breakMinutes: null, dressCode: null, equipmentToBring: null, arrivalInstructions: null, workerNotes: null });
  });

  it("has a label for each in English, French and Arabic, and the page lists them", () => {
    for (const lang of ["en", "fr", "ar"] as const) {
      const rows = reviewText[lang].rows;
      for (const key of ["breakRule", "dressCode", "equipment", "arrival", "workerNotes"] as const) expect(rows[key].trim(), `${lang}:${key}`).toBeTruthy();
      expect(reviewText[lang].conditionsLang).toBe(lang);
    }
    // "Notes for workers" is the new field; the old instructions row says what it holds.
    expect(reviewText.en.rows.specialInstructions).toBe("Arrival and safety instructions");
    expect(readFileSync(new URL("./PersistedAdminReviewPanel.tsx", import.meta.url), "utf8")).toContain("...conditionRows(summary?.conditions ?? null, t)");
  });
});
