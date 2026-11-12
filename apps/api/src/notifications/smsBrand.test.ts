import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkInReminderSmsText, workerTimesheetReminderSmsText } from "../brain/brainText";
import { planEndingSmsText } from "../planReminderSweep";
import { codeSms, noticeSms, SMS_BRAND_PREFIX, SMS_OPT_OUT, smsSegmentCount } from "./smsBrand";
import { assignedJobSmsText, shiftCancelledSmsText, shiftChangedSmsText, shiftReminderSmsText } from "./workerNotifications";

// Toll-free SMS registration (2026-11-11): every text starts "Joblop:", every notice ends with the
// opt-out line in the person's language, and codes stay short with no opt-out line.
const startAt = new Date("2027-02-12T13:00:00.000Z");
const jobUrl = "https://joblop.com/jobs/0f8c2b7e-1d2a-4c3b-9e8f-123456789abc";
const shift = { role: "Farm worker", startAt, endAt: new Date("2027-02-12T19:00:00.000Z"), timeZone: "America/Toronto", area: "Laval, QC" };
const newTime = { newStartAt: new Date("2027-02-12T14:00:00Z"), newEndAt: new Date("2027-02-12T20:00:00Z") };

/** The argument object of every `.send({ … })` call in a source file (braces matched). */
function sendCalls(source: string): string[] {
  const calls: string[] = [];
  let from = 0;
  for (;;) {
    const start = source.indexOf(".send({", from);
    if (start < 0) return calls;
    let depth = 0;
    let end = start + ".send(".length;
    for (; end < source.length; end += 1) {
      if (source[end] === "{") depth += 1;
      else if (source[end] === "}" && --depth === 0) break;
    }
    calls.push(source.slice(start, end + 1));
    from = end;
  }
}

/** Every notice template with a realistic Laval shift, per language, and its segment budget. */
function notices(language: "en" | "fr" | "ar"): Array<[string, string, number]> {
  // Budgets: never more segments than before this change (2 where it was 1 or 2; 3 where a link already made it 3).
  const link = language === "ar" ? 3 : 2;
  return [
    ["assigned", assignedJobSmsText({ language, title: "Farm worker", startAt, jobUrl }), link],
    ["assigned (no link)", assignedJobSmsText({ language, title: "Farm worker", startAt }), 2],
    ["shift reminder", shiftReminderSmsText({ language, title: "Farm worker", startAt, jobUrl }), link],
    ["shift cancelled", shiftCancelledSmsText({ language, shift }), language === "ar" ? 2 : 1],
    ["offered shift cancelled", shiftCancelledSmsText({ language, shift, offerOnly: true }), language === "ar" ? 2 : 1],
    ["shift changed", shiftChangedSmsText({ language, shift, summary: newTime }), 2],
    ["no check-in (Brain)", checkInReminderSmsText({ language, title: "Farm worker", startAt, timezone: "America/Toronto" }), 2],
    ["hours reminder (Brain)", workerTimesheetReminderSmsText({ language, title: "Farm worker", shiftStart: startAt, timezone: "America/Toronto" }), 2]
  ];
}

describe("every SMS: brand, opt-out, length", () => {
  for (const language of ["en", "fr", "ar"] as const) {
    it(`${language}: each notice starts with "Joblop:", ends with the opt-out line, and keeps its segment budget`, () => {
      for (const [name, text, budget] of notices(language)) {
        expect(text.startsWith(`${SMS_BRAND_PREFIX} `), name).toBe(true);
        expect(text.endsWith(SMS_OPT_OUT[language]), name).toBe(true);
        expect(text, name).not.toMatch(/JobLop|Joblop :/);
        expect(smsSegmentCount(text), `${name}: ${text}`).toBeLessThanOrEqual(budget);
      }
    });
  }

  it("employer plan and listing reminders follow the same rule (EN/FR)", () => {
    for (const language of ["en", "fr"] as const) {
      for (const subject of [{ kind: "plan" as const, plan: "shift_pro" }, { kind: "listing" as const, jobTitle: "Farm worker" }]) {
        const text = planEndingSmsText({ language, subject, endsAt: startAt });
        expect(text.startsWith("Joblop: ")).toBe(true);
        expect(text.endsWith(SMS_OPT_OUT[language])).toBe(true);
        expect(smsSegmentCount(text)).toBeLessThanOrEqual(2);
      }
    }
  });

  it("English and French notices stay in the GSM-7 alphabet (one typographic character would halve each segment)", () => {
    for (const language of ["en", "fr"] as const) {
      for (const [name, text] of notices(language)) {
        expect(text, name).not.toMatch(/[«»—–“”‘’\u00A0\u202F]/);
      }
    }
  });

  it("codes get the prefix but no opt-out line, and fit one segment", () => {
    const code = codeSms("your sign-in code is 123456. It expires in 10 minutes. Never share it.");
    expect(code).toBe("Joblop: your sign-in code is 123456. It expires in 10 minutes. Never share it.");
    for (const line of Object.values(SMS_OPT_OUT)) expect(code).not.toContain(line);
    expect(smsSegmentCount(code)).toBe(1);
  });

  it("the opt-out lines are exactly the registered wording", () => {
    expect(SMS_OPT_OUT).toEqual({
      en: "Reply STOP to opt out.",
      fr: "Répondez STOP pour vous désabonner.",
      ar: "أرسل STOP لإيقاف الرسائل."
    });
    expect(noticeSms("fr", "test")).toBe("Joblop: test Répondez STOP pour vous désabonner.");
  });

  it("counts segments the way carriers do", () => {
    expect(smsSegmentCount("a".repeat(160))).toBe(1);
    expect(smsSegmentCount("a".repeat(161))).toBe(2);
    expect(smsSegmentCount("€".repeat(80))).toBe(1); // extension characters count twice
    expect(smsSegmentCount("ع".repeat(70))).toBe(1);
    expect(smsSegmentCount("ع".repeat(71))).toBe(2);
    expect(smsSegmentCount("ع".repeat(135))).toBe(3);
  });

  it("every place that sends a text builds it with the brand helper (no hand-written SMS text left)", () => {
    // Code and staff-alert senders that build their text inline (the notice templates are covered above).
    const senders = ["../staffPhoneSignIn.ts", "../emailVerification.ts", "../passwordReset.ts", "../instantContactRoutes.ts"];
    let checked = 0;
    for (const file of senders) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");
      // Every `.send({ to, text })` without a subject is a text message (emails always carry a subject).
      for (const call of sendCalls(source)) {
        if (!/\btext:/.test(call) || /\bsubject:/.test(call)) continue;
        checked += 1;
        expect(call, file).toMatch(/codeSms\(|noticeSms\(|signInCodeSms\(|verificationCodeSms\(|passwordResetSms\(/);
      }
    }
    expect(checked).toBeGreaterThanOrEqual(4);
  });
});
