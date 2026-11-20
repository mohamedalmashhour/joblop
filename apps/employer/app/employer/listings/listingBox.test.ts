import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ar, en, fr } from "../../i18n/messages";
import { listingBoxMode } from "./listingBox";

const panel = readFileSync(join(__dirname, "LongTermListingsPanel.tsx"), "utf8");
const calendarPage = readFileSync(join(__dirname, "..", "calendar", "page.tsx"), "utf8");

describe("Long-term listings box on the Request calendar", () => {
  const none = { listingCount: 0, perJob: false, expanded: false, hasNotice: false };

  it("collapses to one line when the employer has no long-term listings", () => {
    expect(listingBoxMode(none)).toBe("collapsed");
  });

  it("opens fully after 'Learn more'", () => {
    expect(listingBoxMode({ ...none, expanded: true })).toBe("full");
  });

  it("stays fully visible when there are listings", () => {
    expect(listingBoxMode({ ...none, listingCount: 1 })).toBe("full");
  });

  it("stays fully visible for a message and for the per-job box on the request form", () => {
    expect(listingBoxMode({ ...none, hasNotice: true })).toBe("full");
    expect(listingBoxMode({ ...none, perJob: true })).toBe("full");
  });

  it("renders the one-line 'none – Learn more' version", () => {
    expect(panel).toContain('if (mode === "collapsed")');
    expect(panel).toContain('t("listing.noneLine")');
    expect(panel).toContain('t("listing.learnMore")');
    expect(panel).toContain("setExpanded(true)");
    expect(en["listing.noneLine"]).toBe("Long-term listings: none");
    for (const key of ["listing.noneLine", "listing.learnMore"] as const) {
      expect(fr[key]).toBeTruthy();
      expect(ar[key]).toBeTruthy();
    }
  });

  it("sits below the calendar, not above it", () => {
    expect(calendarPage.indexOf("<ClientCalendarPanel />")).toBeGreaterThan(-1);
    expect(calendarPage.indexOf("<LongTermListingsPanel />")).toBeGreaterThan(calendarPage.indexOf("<ClientCalendarPanel />"));
  });
});
