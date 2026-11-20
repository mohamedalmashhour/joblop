import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ar, en, fr } from "../../i18n/messages";
import { mondayFirstCells, mondayFirstWeekdays, mondayOffset } from "./requestCalendarGrid";

const panel = readFileSync(join(__dirname, "ClientCalendarPanel.tsx"), "utf8");
const css = readFileSync(join(__dirname, "..", "..", "globals.css"), "utf8");

describe("Request calendar starts the week on Monday", () => {
  it("counts blank cells from Monday", () => {
    expect(mondayOffset(new Date(2026, 5, 1))).toBe(0); // Monday 1 June 2026
    expect(mondayOffset(new Date(2026, 10, 1))).toBe(6); // Sunday 1 November 2026
    expect(mondayOffset(new Date(2026, 9, 1))).toBe(3); // Thursday 1 October 2026
  });

  it("puts day 1 under the right weekday and pads to whole weeks", () => {
    const november = mondayFirstCells(new Date(2026, 10, 1));
    expect(november.slice(0, 7)).toEqual([null, null, null, null, null, null, 1]);
    expect(november.length % 7).toBe(0);
    expect(november.filter((cell) => cell !== null)).toHaveLength(30);
    // Monday 2 November 2026 opens the second row.
    expect(november[7]).toBe(2);

    const june = mondayFirstCells(new Date(2026, 5, 1));
    expect(june[0]).toBe(1);
    expect(june.length).toBe(35);

    // February 2027 starts on a Monday and has exactly four weeks.
    expect(mondayFirstCells(new Date(2027, 1, 1))).toHaveLength(28);
  });

  it("labels the columns Monday to Sunday", () => {
    const labels = mondayFirstWeekdays("en-CA");
    expect(labels).toHaveLength(7);
    expect(labels[0]).toMatch(/^Mon/);
    expect(labels[6]).toMatch(/^Sun/);
    expect(mondayFirstWeekdays("fr-CA")[0]).toMatch(/^lun/);
  });

  it("uses the Monday-first helpers in the grid (no Sunday-first math left)", () => {
    expect(panel).toContain("mondayFirstCells(month)");
    expect(panel).toContain("mondayFirstWeekdays(locale)");
    expect(panel).not.toContain("new Date(2023, 0, 1 + i)");
    expect(panel).not.toMatch(/startWeekday\s*=\s*new Date\(year, m, 1\)\.getDay\(\)/);
  });
});

describe("Request calendar chips and sign-in line", () => {
  it("lets title and status wrap to 2 lines instead of cutting them with an ellipsis", () => {
    expect(panel).toContain('className="employer-cal-chip"');
    expect(panel).toContain('className="employer-cal-chip-status"');
    expect(panel).not.toContain('textOverflow: "ellipsis"');
    expect(css).toMatch(/\.employer-cal-chip-status \{[^}]*-webkit-line-clamp: 2/);
    expect(css).toMatch(/\.employer-cal-chip \{[^}]*min-height: 60px/);
    expect(css).toMatch(/@media \(max-width: 560px\) \{\s*\.employer-cal-chip \{/);
  });

  it("replaces the jargon session box with a small 'Signed in as' line", () => {
    expect(panel).not.toContain("Authenticated employer calendar session.");
    expect(panel).not.toContain("Switch employer account");
    expect(panel).toContain('t("calendar.signedInAs", { name })');
    expect(panel).toContain('t("calendar.switchAccount")');
    expect(panel).toContain("clearWebCalendarSession(fetch)");
  });

  it("ships the new calendar words in English, French and Arabic", () => {
    const keys = [
      "calendar.signedInAs",
      "calendar.signedIn",
      "calendar.switchAccount",
      "calendar.signingOut",
      "calendar.signOutFailed",
      "calendar.more",
      "calendar.prevMonth",
      "calendar.nextMonth"
    ] as const;
    for (const key of keys) {
      expect(en[key]).toBeTruthy();
      expect(fr[key]).toBeTruthy();
      expect(ar[key]).toBeTruthy();
    }
    expect(en["calendar.signedInAs"]).toBe("Signed in as {name}");
    expect(fr["calendar.switchAccount"]).toBe("Changer de compte");
  });
});
