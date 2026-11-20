import { describe, expect, it } from "vitest";
import { shiftOverlapNotice } from "./shiftOverlapNotice";

const body = {
  error: "RWOS_SHIFT_OVERLAP",
  message: "You already have a shift at that time (Tue, Nov 10, 9:00–17:00).",
  messages: {
    en: "You already have a shift at that time (Tue, Nov 10, 9:00–17:00).",
    fr: "Vous avez déjà un quart de travail à cette heure-là (mar. 10 nov., 9:00–17:00).",
    ar: "لديك بالفعل نوبة عمل في هذا الوقت (الثلاثاء 10 نوفمبر، 9:00–17:00)."
  }
};

describe("shiftOverlapNotice", () => {
  it("picks the page's language", () => {
    expect(shiftOverlapNotice(body, "en")).toBe(body.messages.en);
    expect(shiftOverlapNotice(body, "fr-CA")).toBe(body.messages.fr);
    expect(shiftOverlapNotice(body, "ar")).toBe(body.messages.ar);
  });

  it("falls back to the default message, and ignores any other answer", () => {
    expect(shiftOverlapNotice({ error: "RWOS_SHIFT_OVERLAP", message: "x" }, "fr")).toBe("x");
    expect(shiftOverlapNotice({ error: "RWOS_CLAIM_FULL", message: "full" }, "en")).toBeNull();
    expect(shiftOverlapNotice(null, "en")).toBeNull();
  });
});
