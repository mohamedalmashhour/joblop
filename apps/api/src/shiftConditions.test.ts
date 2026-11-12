import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { beforeYouGoEmailBlock, parseShiftConditions, plainText, workerShiftConditions } from "./shiftConditions";
import { assignedJobEmail, assignedJobSmsText } from "./notifications/workerNotifications";

// Shift conditions: break, dress code, equipment, arrival instructions, notes for workers.

const FULL = {
  breakMinutes: 30,
  dressCode: "safety_boots",
  equipmentToBring: "Gloves and a water bottle",
  arrivalInstructions: "Gate B, ask for Marie. Park on rue Saint-Jean.",
  workerNotes: "Lunch room on the 2nd floor."
};

describe("reading the employer's conditions", () => {
  it("absent leaves stored values alone; null clears them", () => {
    expect(parseShiftConditions(undefined)).toEqual({ status: "absent" });
    expect(parseShiftConditions(null)).toEqual({ status: "ok", data: { breakMinutes: null, dressCode: null, equipmentToBring: null, arrivalInstructions: null, workerNotes: null } });
  });

  it("keeps plain text, strips HTML and tidies spaces", () => {
    expect(plainText("  <b>Bring</b>   gloves<script>x</script> ")).toBe("Bring gloves x");
    const parsed = parseShiftConditions({ ...FULL, workerNotes: "<p>Lunch room</p>\n\n\n\n2nd floor" });
    expect(parsed).toEqual({ status: "ok", data: { ...FULL, workerNotes: "Lunch room\n\n2nd floor" } });
  });

  it("a break is 0 (no break) to 240 minutes; texts have length limits", () => {
    expect(parseShiftConditions({ breakMinutes: 0 })).toMatchObject({ status: "ok", data: { breakMinutes: 0 } });
    expect(parseShiftConditions({ breakMinutes: "45" })).toMatchObject({ status: "ok", data: { breakMinutes: 45 } });
    expect(parseShiftConditions({ breakMinutes: 241 })).toEqual({ status: "invalid", field: "breakMinutes" });
    expect(parseShiftConditions({ breakMinutes: 12.5 })).toEqual({ status: "invalid", field: "breakMinutes" });
    expect(parseShiftConditions({ dressCode: "x".repeat(121) })).toEqual({ status: "invalid", field: "dressCode" });
    expect(parseShiftConditions({ workerNotes: "x".repeat(501) })).toEqual({ status: "invalid", field: "workerNotes" });
    expect(parseShiftConditions({ workerNotes: "x".repeat(500) })).toMatchObject({ status: "ok" });
  });
});

describe("what a worker sees", () => {
  it("arrival instructions only for the worker who holds the shift", () => {
    expect(workerShiftConditions(FULL, true)?.arrivalInstructions).toBe(FULL.arrivalInstructions);
    expect(workerShiftConditions(FULL, false)?.arrivalInstructions).toBeNull();
    expect(workerShiftConditions({ arrivalInstructions: "Gate B" }, false)).toBeNull();
    expect(workerShiftConditions(null, true)).toBeNull();
  });

  it("the 'you got the job' email has a short Before you go block; the text message does not", () => {
    const base = { to: "w@example.test", title: "Farm help", startAt: new Date("2027-02-11T13:00:00Z"), jobUrl: "https://joblop.com/jobs/abc" };
    const en = assignedJobEmail({ ...base, language: "en", conditions: FULL }).text;
    expect(en).toContain("Before you go:\n- Break: 30 min unpaid break\n- Dress code: Safety boots\n- Bring: Gloves and a water bottle\n- When you arrive: Gate B");
    expect(assignedJobEmail({ ...base, language: "fr", conditions: FULL }).text).toContain("Avant de partir:\n- Pause : ".replace(" : ", ": ") + "Pause non payée de 30 min");
    expect(assignedJobEmail({ ...base, language: "ar", conditions: FULL }).text).toContain("قبل أن تذهب:");
    expect(assignedJobEmail({ ...base, language: "en", conditions: null }).text).not.toContain("Before you go");
    expect(assignedJobSmsText({ language: "en", title: "Farm help", startAt: base.startAt, jobUrl: base.jobUrl })).not.toContain("Before you go");
    expect(beforeYouGoEmailBlock({ ...FULL, breakMinutes: 0, dressCode: "Black pants" }, "en")).toContain("- Break: No break\n- Dress code: Black pants");
  });
});

describe("API wiring", () => {
  const app = readFileSync(new URL("./app.ts", import.meta.url), "utf8");

  it("the employer profile save validates and stores the conditions on the same profile row", () => {
    const route = app.slice(app.indexOf('    "/organizations/:organizationId/calendar/requests/:jobRequestId/profile",'), app.indexOf('  app.get("/organizations/:organizationId/calendar/requests", async'));
    expect(route).toContain("const conditions = parseShiftConditions(body.conditions);");
    expect(route).toContain('error: "RWOS_INVALID_SHIFT_CONDITIONS"');
    expect(route).toContain("where: { id: profile.id },\n          data: conditions.data,");
  });

  it("duplicate copies the conditions; edit-draft and the worker job page read them", () => {
    expect(app).toContain("await prisma.staffingRequestCalendarProfile.update({ where: { id: copied.id }, data: storedShiftConditions(sourceConditions) });");
    expect(app).toContain("conditions: workerShiftConditions(row.calendarProfile, booked)");
    expect(app.match(/\.\.\.SHIFT_CONDITIONS_SELECT/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("the admin summary and the edit-draft extras include them", () => {
    expect(readFileSync(new URL("./adminRequestSummary.ts", import.meta.url), "utf8")).toContain("conditions: storedShiftConditions(profile),");
    expect(readFileSync(new URL("./draftEditExtras.ts", import.meta.url), "utf8")).toContain("conditions: profile ? storedShiftConditions(profile) : null");
  });

  it("the break never changes pay: the timesheet engine still records no break deduction", () => {
    const engine = readFileSync(new URL("../../../packages/auth/src/index.ts", import.meta.url), "utf8");
    expect(engine).toContain('breakRule: "break_evidence_deferred"');
    // The conditions are only read for display: the timesheet engine never sees them.
    expect(engine).not.toContain("SHIFT_CONDITIONS_SELECT");
    expect(engine).not.toContain("staffingRequestCalendarProfile.breakMinutes");
  });
});
