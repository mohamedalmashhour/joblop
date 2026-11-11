import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatWhen } from "./MarketplaceExplorer";
import { dictionaries } from "./i18n/messages";

// 13:00–19:00 UTC on 12 Nov 2026 is 8:00–14:00 in Montréal (EST).
const START = "2026-11-12T13:00:00.000Z";
const END = "2026-11-12T19:00:00.000Z";

describe("job detail date line", () => {
  it("is shown in Eastern time in each language", () => {
    expect(formatWhen(START, END, "en-CA")).toBe("Thu, Nov 12 · 8:00 a.m. – 2:00 p.m.");
    expect(formatWhen(START, END, "fr-CA")).toBe("jeu. 12 nov. · 8 h 00 – 14 h 00");
    const ar = formatWhen(START, END, "ar");
    expect(ar).toContain("الخميس");
    expect(ar).toContain("12");
    expect(ar).not.toMatch(/Thu|Nov/u);
  });
});

describe("job detail words", () => {
  const keys = [
    "job.getDirections",
    "job.mapApproxNotice",
    "job.allowancesTitle",
    "job.allowancesNone",
    "job.interestedTitle",
    "job.interestedBody",
    "job.expressInterest",
    "job.print",
    "job.interestSubmittedTitle",
    "job.interestSubmittedBody",
    "job.withdrawInterest"
  ] as const;

  it("exist in French and Arabic, so Arabic never falls back to English", () => {
    for (const key of keys) {
      expect(dictionaries["fr-CA"][key], key).toBeTruthy();
      expect(dictionaries.ar[key], key).toBeTruthy();
      expect(dictionaries.ar[key], key).not.toBe(dictionaries["en-CA"][key]);
    }
  });

  it("say it in plain words, without 'dispatch'", () => {
    for (const locale of ["en-CA", "fr-CA", "ar"] as const) {
      expect(dictionaries[locale]["job.interestedBody"]).not.toMatch(/dispatch|répartition/iu);
    }
    expect(dictionaries["en-CA"]["job.interestedBody"]).toContain("Joblop will review your interest");
  });

  it("uses the print label from the dictionary", () => {
    const source = readFileSync(join(__dirname, "jobs", "[jobRequestId]", "JobDetail.tsx"), "utf8");
    expect(source).toContain('t("job.print")');
    expect(source).not.toContain("Print details");
  });
});
