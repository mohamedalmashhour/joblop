import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { WEB_AR_FROM_APP, WEB_COPY } from "./webCopy";
import { translate } from "./strings";
import { formatWorkerRate } from "../features/marketplace/marketplaceContent";

// Owner rule: "the phone app copies the website's design and words". Every line the app borrows from
// the worker website must still be the website's exact line, in English, French and (where the
// website has it) Arabic.
const webMessages = readFileSync(join(__dirname, "../../../worker/app/i18n/messages.ts"), "utf8");

/** True when the website file defines `"key": "text"` (the value may sit on the next line). */
function defines(section: string, key: string, text: string): boolean {
  const escape = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`"${escape(key)}":\\s*${escape(JSON.stringify(text))}`).test(section);
}

function webSection(name: "en" | "fr" | "ar"): string {
  const start = webMessages.indexOf(`export const ${name}`);
  const end = webMessages.indexOf("\n};", start);
  return webMessages.slice(start, end);
}

describe("website words reused in the app", () => {
  const sections = { en: webSection("en"), fr: webSection("fr"), ar: webSection("ar") };

  it("copies each English and French line verbatim from the worker website", () => {
    for (const [key, copy] of Object.entries(WEB_COPY)) {
      expect(defines(sections.en, key, copy.en), key).toBe(true);
      expect(defines(sections.fr, key, copy.fr), key).toBe(true);
    }
  });

  it("uses the website's Arabic wherever the website has it", () => {
    for (const [key, copy] of Object.entries(WEB_COPY)) {
      if (WEB_AR_FROM_APP.has(key)) {
        expect(sections.ar, key).not.toContain(`"${key}":`);
      } else {
        expect(defines(sections.ar, key, copy.ar), key).toBe(true);
      }
      expect(copy.ar.length, key).toBeGreaterThan(0);
    }
  });

  it("translates the signed-in job screens in French and Arabic, not English only (audit S9)", () => {
    for (const key of ["job.applyButton", "job.claimButton", "job.certsTitle", "offers.acceptOffer", "doc.uploadDocument", "hr.save"]) {
      expect(translate("fr", key)).not.toBe(translate("en", key));
      expect(translate("ar", key)).not.toBe(translate("en", key));
    }
    // The pending-pay line is the website's "pay.pending" in every language.
    for (const locale of ["en", "fr", "ar"] as const) {
      expect(defines(sections[locale], "pay.pending", formatWorkerRate(null, "CAD", locale))).toBe(true);
    }
    expect(translate("en", "doc.fileTooLarge", { name: "a.pdf" })).toBe("a.pdf is over the 10 MB limit.");
  });
});
