import { describe, expect, it } from "vitest";
import { JOBLOP_ACTION_KEYS, DAILY_SUMMARY_SWITCH } from "./joblopActions";
import { JOBLOP_BRAIN_RULES } from "./joblopRules";
import { ACTION_TITLES, RULE_TITLES, checkInReminderSmsText, summaryCopy, timesheetReminderEmail } from "./brainText";

const MONEY = /\$|\d+[.,]\d{2}|rate|taux|share|margin|marge|salaire|wage/i;

describe("brain text", () => {
  it("worker and employer messages exist in English and French and never mention money", () => {
    const startAt = new Date("2026-11-10T14:00:00Z");
    for (const language of ["en", "fr", "ar"] as const) {
      const text = checkInReminderSmsText({ language, title: "Cook", startAt, timezone: "America/Toronto" });
      expect(text).toContain("Cook");
      expect(text).not.toMatch(MONEY);
      expect(text.length).toBeLessThan(200);
    }
    for (const language of ["en", "fr"] as const) {
      const m = timesheetReminderEmail({ to: "a@example.com", language, jobCode: "JR-1", title: "Cook", shiftStart: startAt, timezone: "America/Toronto" });
      expect(`${m.subject}\n${m.text}`).not.toMatch(MONEY);
    }
    expect(checkInReminderSmsText({ language: "fr", title: "Cook", startAt, timezone: "America/Toronto" })).toContain("arrivée");
  });

  it("every rule, action and switch has an English and French title", () => {
    for (const rule of JOBLOP_BRAIN_RULES) expect(RULE_TITLES[rule.key]?.fr, rule.key).toBeTruthy();
    for (const key of [...JOBLOP_ACTION_KEYS, DAILY_SUMMARY_SWITCH]) {
      expect(ACTION_TITLES[key]?.en, key).toBeTruthy();
      expect(ACTION_TITLES[key]?.fr, key).toBeTruthy();
    }
    expect(summaryCopy("fr").ruleTitle("invoice_overdue")).toBe("Facture en retard");
  });
});
