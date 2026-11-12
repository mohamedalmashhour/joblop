import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { breakRuleLabel, dressCodeLabel, DRESS_CODE_PRESETS, BEFORE_YOU_GO_LABELS } from "@rwos/shared";
import { beforeYouGoLines, conditionsLanguage } from "./BeforeYouGo";
import { beforeYouGoLines as appLines } from "../../../../mobile/src/features/marketplace/jobDetailContent";

// "Before you go" on the worker shift page and the phone app job screen.

const conditions = {
  breakMinutes: 30,
  dressCode: "closed_shoes",
  equipmentToBring: "Gloves",
  arrivalInstructions: "Gate B, ask for Marie",
  workerNotes: "Lunch room upstairs"
};

describe("Before you go", () => {
  it("lists only what the employer stated, in the worker's language", () => {
    expect(beforeYouGoLines(conditions, "en")).toEqual([
      ["Break", "30 min unpaid break"],
      ["Dress code", "Closed shoes"],
      ["Bring", "Gloves"],
      ["When you arrive", "Gate B, ask for Marie"],
      ["Notes from the employer", "Lunch room upstairs"]
    ]);
    expect(beforeYouGoLines({ ...conditions, breakMinutes: null, equipmentToBring: null, arrivalInstructions: null, workerNotes: null }, "fr")).toEqual([["Tenue", "Chaussures fermées"]]);
    expect(beforeYouGoLines(null, "ar")).toEqual([]);
    expect(conditionsLanguage("fr-CA")).toBe("fr");
    expect(conditionsLanguage("ar")).toBe("ar");
  });

  it("the phone app shows the same lines", () => {
    for (const lang of ["en", "fr", "ar"] as const) expect(appLines({ conditions }, lang)).toEqual(beforeYouGoLines(conditions, lang));
  });

  it("every label and dress-code choice exists in English, French and Arabic", () => {
    for (const lang of ["en", "fr", "ar"] as const) {
      for (const value of Object.values(BEFORE_YOU_GO_LABELS[lang])) expect(value.trim()).toBeTruthy();
      for (const preset of DRESS_CODE_PRESETS) expect(dressCodeLabel(preset, lang)).not.toBe(preset);
      expect(breakRuleLabel(0, lang)).toBeTruthy();
    }
    expect(breakRuleLabel(null, "en")).toBeNull();
  });

  it("the shift page and the phone job screen render it", () => {
    expect(readFileSync(new URL("./JobDetail.tsx", import.meta.url), "utf8")).toContain("<BeforeYouGo conditions={job.conditions} />");
    expect(readFileSync(new URL("../../../../mobile/src/features/marketplace/MarketplaceJobScreen.tsx", import.meta.url), "utf8")).toContain('testID="before-you-go"');
  });
});
