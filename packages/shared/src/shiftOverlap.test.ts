import { describe, expect, it } from "vitest";
import {
  SHIFT_OVERLAP_ERROR_CODE,
  formatHeldShift,
  shiftOverlapLanguageFromHeader,
  shiftOverlapMessage,
  shiftOverlapResponseBody,
  shiftsOverlap
} from "./shiftOverlap";

const at = (iso: string) => new Date(iso);
// Tue Nov 10 2026, 9:00–17:00 in Montréal (EST, UTC-5).
const held = { startAt: at("2026-11-10T14:00:00.000Z"), endAt: at("2026-11-10T22:00:00.000Z"), timezone: "America/Toronto" };

describe("shiftsOverlap", () => {
  it("is true when the ranges intersect", () => {
    expect(shiftsOverlap(held, { startAt: at("2026-11-10T21:00:00.000Z"), endAt: at("2026-11-11T01:00:00.000Z") })).toBe(true);
    expect(shiftsOverlap(held, { startAt: at("2026-11-10T15:00:00.000Z"), endAt: at("2026-11-10T16:00:00.000Z") })).toBe(true);
    expect(shiftsOverlap(held, { startAt: at("2026-11-10T13:00:00.000Z"), endAt: at("2026-11-10T23:00:00.000Z") })).toBe(true);
    expect(shiftsOverlap(held, held)).toBe(true);
  });

  it("allows shifts that only touch end-to-start (9–17 then 17–21)", () => {
    expect(shiftsOverlap(held, { startAt: at("2026-11-10T22:00:00.000Z"), endAt: at("2026-11-11T02:00:00.000Z") })).toBe(false);
    expect(shiftsOverlap({ startAt: at("2026-11-10T10:00:00.000Z"), endAt: at("2026-11-10T14:00:00.000Z") }, held)).toBe(false);
  });

  it("is false for shifts on other days", () => {
    expect(shiftsOverlap(held, { startAt: at("2026-11-11T14:00:00.000Z"), endAt: at("2026-11-11T22:00:00.000Z") })).toBe(false);
  });
});

describe("shift overlap message", () => {
  it("names the held shift in the shift's own time zone, in EN / FR / AR", () => {
    expect(formatHeldShift(held, "en")).toContain("9:00–17:00");
    expect(shiftOverlapMessage(held, "en")).toMatch(/^You already have a shift at that time \(Tue.*9:00–17:00\)\.$/);
    expect(shiftOverlapMessage(held, "fr")).toMatch(/^Vous avez déjà un quart de travail à cette heure-là \(mar\..*9:00–17:00\)\.$/);
    expect(shiftOverlapMessage(held, "ar")).toMatch(/^لديك بالفعل نوبة عمل في هذا الوقت \(.*9:00–17:00\)\.$/);
  });

  it("falls back to Montréal time for an unknown time zone", () => {
    expect(formatHeldShift({ ...held, timezone: "Not/AZone" }, "en")).toContain("9:00–17:00");
  });

  it("picks the language from Accept-Language", () => {
    expect(shiftOverlapLanguageFromHeader("fr-CA,fr;q=0.9,en;q=0.8")).toBe("fr");
    expect(shiftOverlapLanguageFromHeader("ar")).toBe("ar");
    expect(shiftOverlapLanguageFromHeader("de-DE, en;q=0.5")).toBe("en");
    expect(shiftOverlapLanguageFromHeader(undefined)).toBe("en");
  });

  it("builds a 409 body with the code, all three languages and no pay", () => {
    const body = shiftOverlapResponseBody(held, "fr");
    expect(body.error).toBe(SHIFT_OVERLAP_ERROR_CODE);
    expect(body.message).toBe(body.messages.fr);
    expect(body.heldShift).toEqual({
      startAt: "2026-11-10T14:00:00.000Z",
      endAt: "2026-11-10T22:00:00.000Z",
      timezone: "America/Toronto"
    });
    expect(JSON.stringify(body)).not.toMatch(/rate|margin|pay/i);
  });
});
