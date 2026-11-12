import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { conditionsFormFrom, conditionsPayload, emptyConditionsForm } from "./shiftConditionsForm";
import { readEmployerCalendarProfileInput } from "../../../api/job-requests/jobRequestBoundary";
import { en, fr, ar } from "../../../i18n/messages";

// "Before the worker goes" on the request form (new request, edit draft, duplicate).

describe("shift conditions on the request form", () => {
  it("sends nothing stated by default, and round-trips saved values", () => {
    expect(conditionsPayload(emptyConditionsForm())).toEqual({ breakMinutes: null, dressCode: null, equipmentToBring: null, arrivalInstructions: null, workerNotes: null });
    const saved = { breakMinutes: 30, dressCode: "Black pants", equipmentToBring: "Gloves", arrivalInstructions: "Gate B", workerNotes: "Lunch at noon" };
    expect(conditionsPayload(conditionsFormFrom(saved))).toEqual(saved);
    expect(conditionsPayload(conditionsFormFrom({ ...saved, breakMinutes: 0, dressCode: "safety_boots" }))).toMatchObject({ breakMinutes: 0, dressCode: "safety_boots" });
  });

  it("refuses a break outside 1 to 240 minutes when minutes are chosen", () => {
    const form = { ...emptyConditionsForm(), breakChoice: "minutes" as const };
    expect(conditionsPayload({ ...form, breakMinutes: "" })).toBe("invalid");
    expect(conditionsPayload({ ...form, breakMinutes: "241" })).toBe("invalid");
    expect(conditionsPayload({ ...form, breakMinutes: "45" })).toMatchObject({ breakMinutes: 45 });
  });

  it("the save proxy forwards conditions and allowances (allowances were dropped before)", () => {
    const base = { dutiesSummary: null, qualifications: [], addressSummary: null, specialInstructions: null, expectedVersion: null };
    const conditions = { breakMinutes: 30, dressCode: "casual", equipmentToBring: null, arrivalInstructions: "Gate B", workerNotes: null };
    const allowances = { transport: { provision: "allowance", amountMinor: 2000, note: "Bus" }, meal: { provision: "provided", amountMinor: null, note: null }, lodging: null };
    expect(readEmployerCalendarProfileInput({ ...base, conditions, allowances })).toMatchObject({ conditions, allowances });
    expect(readEmployerCalendarProfileInput({ ...base, conditions: { breakMinutes: 999 } })).toBeNull();
    expect(readEmployerCalendarProfileInput({ ...base, conditions: { workerNotes: "x".repeat(501) } })).toBeNull();
    expect(readEmployerCalendarProfileInput({ ...base, allowances: { transport: { provision: "bogus" } } })).toBeNull();
    expect(readEmployerCalendarProfileInput(base)).not.toHaveProperty("conditions");
  });

  it("the form, the review and the request detail page show them, in English, French and Arabic", () => {
    for (const key of ["create.conditionsTitle", "create.breakLabel", "create.dressCode", "create.equipment", "create.arrival", "create.workerNotes", "create.breakInfoNote"] as const) {
      for (const dict of [en, fr, ar] as Record<string, string | undefined>[]) expect(dict[key]?.trim(), key).toBeTruthy();
    }
    const panel = readFileSync(new URL("./CreatePersistedRequestPanel.tsx", import.meta.url), "utf8");
    expect(panel).toContain("<ShiftConditionsFields value={form.conditions}");
    expect(panel).toContain("conditions: conditionsFormFrom(edit?.conditions)");
    expect(panel).toContain("...conditionRows(form.conditions, langOf(locale), t)");
    const detail = readFileSync(new URL("../request/ClientRequestDetailPanel.tsx", import.meta.url), "utf8");
    expect(detail).toContain("...conditionFields(conditions, langOf(locale))");
  });
});
